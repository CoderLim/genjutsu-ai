export type KlingMotionModel = 'kling-v2-6' | 'kling-v3';
export type KlingMotionMode = 'std' | 'pro';
export type KlingCharacterOrientation = 'image' | 'video';
export type KlingMotionTaskStatus =
  | 'submitted'
  | 'processing'
  | 'succeed'
  | 'failed';

export type KlingMotionControlInput = {
  imageUrl: string;
  videoUrl: string;
  prompt?: string;
  modelName?: KlingMotionModel;
  mode: KlingMotionMode;
  characterOrientation: KlingCharacterOrientation;
  keepOriginalSound?: boolean;
  watermarkEnabled?: boolean;
  externalTaskId?: string;
};

export type KlingMotionVideoResult = {
  id?: string;
  url?: string;
  watermarkUrl?: string;
  duration?: string | number;
};

export type KlingMotionTask = {
  taskId: string;
  taskStatus: KlingMotionTaskStatus | string;
  taskStatusMessage: string | null;
  createdAt: number | null;
  updatedAt: number | null;
  videoUrl: string | null;
  watermarkUrl: string | null;
  duration: string | number | null;
  finalUnitDeduction: string | number | null;
  finalBalanceDeduction: string | number | null;
  raw: unknown;
};

export class KlingMotionControlError extends Error {
  constructor(
    message: string,
    public status: number,
    public providerCode: number | string | null,
    public payload?: unknown
  ) {
    super(message);
    this.name = 'KlingMotionControlError';
  }
}

function readServerEnv(key: string) {
  if (typeof process === 'undefined' || !process.env) return '';
  return process.env[key]?.trim() || '';
}

function getApiKey() {
  const apiKey = readServerEnv('KLING_API_KEY');
  if (!apiKey) {
    throw new KlingMotionControlError(
      'Kling API key is not configured. Set KLING_API_KEY on the server.',
      500,
      null
    );
  }
  return apiKey;
}

function getApiBaseUrl() {
  return (
    readServerEnv('KLING_API_BASE_URL') ||
    'https://api-singapore.klingai.com'
  ).replace(/\/+$/, '');
}

function assertHttpUrl(value: string, field: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new KlingMotionControlError(`${field} must be a valid URL`, 400, null);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new KlingMotionControlError(
      `${field} must use http or https`,
      400,
      null
    );
  }
}

function assertExternalTaskId(value: string) {
  if (value.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(value)) {
    throw new KlingMotionControlError(
      'externalTaskId contains unsupported characters',
      400,
      null
    );
  }
}

export function buildKlingMotionControlPayload(input: KlingMotionControlInput) {
  assertHttpUrl(input.imageUrl, 'imageUrl');
  assertHttpUrl(input.videoUrl, 'videoUrl');

  const prompt = input.prompt?.trim() || '';
  if (prompt.length > 2500) {
    throw new KlingMotionControlError(
      'Kling Motion Control prompt must be 2500 characters or fewer',
      400,
      null
    );
  }

  if (input.mode !== 'std' && input.mode !== 'pro') {
    throw new KlingMotionControlError('Unsupported Kling mode', 400, null);
  }
  if (
    input.characterOrientation !== 'image' &&
    input.characterOrientation !== 'video'
  ) {
    throw new KlingMotionControlError(
      'Unsupported character orientation',
      400,
      null
    );
  }

  const modelName = input.modelName ?? 'kling-v2-6';
  if (modelName !== 'kling-v2-6' && modelName !== 'kling-v3') {
    throw new KlingMotionControlError('Unsupported Kling model', 400, null);
  }

  if (input.externalTaskId) assertExternalTaskId(input.externalTaskId);

  return {
    model_name: modelName,
    image_url: input.imageUrl,
    video_url: input.videoUrl,
    prompt,
    keep_original_sound: input.keepOriginalSound === false ? 'no' : 'yes',
    character_orientation: input.characterOrientation,
    mode: input.mode,
    watermark_info: {
      enabled: input.watermarkEnabled === true,
    },
    ...(input.externalTaskId
      ? { external_task_id: input.externalTaskId }
      : {}),
  };
}

async function readProviderResponse(response: Response) {
  const payload = await response.json().catch(() => null);
  const providerCode = payload?.code ?? null;
  const success =
    response.ok && (providerCode === 0 || providerCode === '0');
  if (success) return payload;

  const message =
    (typeof payload?.message === 'string' && payload.message) ||
    (typeof payload?.msg === 'string' && payload.msg) ||
    `Kling request failed with HTTP ${response.status}`;

  throw new KlingMotionControlError(
    message,
    response.status || 500,
    providerCode,
    payload
  );
}

async function klingFetch(path: string, init?: RequestInit) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  return readProviderResponse(response);
}

function normalizeTask(data: any): KlingMotionTask {
  const videos: KlingMotionVideoResult[] = Array.isArray(
    data?.task_result?.videos
  )
    ? data.task_result.videos
    : [];
  const firstVideo = videos[0];
  const taskId = typeof data?.task_id === 'string' ? data.task_id : '';
  if (!taskId) {
    throw new KlingMotionControlError(
      'Kling response did not include a task_id',
      502,
      null,
      data
    );
  }

  return {
    taskId,
    taskStatus:
      typeof data?.task_status === 'string' ? data.task_status : 'submitted',
    taskStatusMessage:
      typeof data?.task_status_msg === 'string' && data.task_status_msg
        ? data.task_status_msg
        : null,
    createdAt: Number.isFinite(Number(data?.created_at))
      ? Number(data.created_at)
      : null,
    updatedAt: Number.isFinite(Number(data?.updated_at))
      ? Number(data.updated_at)
      : null,
    videoUrl: typeof firstVideo?.url === 'string' ? firstVideo.url : null,
    watermarkUrl:
      typeof firstVideo?.watermarkUrl === 'string'
        ? firstVideo.watermarkUrl
        : typeof (firstVideo as any)?.watermark_url === 'string'
          ? (firstVideo as any).watermark_url
          : null,
    duration: firstVideo?.duration ?? null,
    finalUnitDeduction: data?.final_unit_deduction ?? null,
    finalBalanceDeduction: data?.final_balance_deduction ?? null,
    raw: data,
  };
}

export async function createKlingMotionControlTask(
  input: KlingMotionControlInput
): Promise<KlingMotionTask> {
  const payload = await klingFetch('/v1/videos/motion-control', {
    method: 'POST',
    body: JSON.stringify(buildKlingMotionControlPayload(input)),
  });
  return normalizeTask(payload?.data);
}

export async function getKlingMotionControlTask(
  taskId: string
): Promise<KlingMotionTask> {
  if (!taskId || taskId.length > 160 || !/^[A-Za-z0-9._:-]+$/.test(taskId)) {
    throw new KlingMotionControlError('Invalid Kling task id', 400, null);
  }

  const payload = await klingFetch(
    `/v1/videos/motion-control/${encodeURIComponent(taskId)}`
  );
  return normalizeTask(payload?.data);
}
