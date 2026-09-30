import { envConfigs } from '@/config';
import { getUuid } from '@/lib/hash';

type E2EUpload = {
  bytes: Uint8Array;
  contentType: string;
  createdAt: number;
};

type E2EGlobal = typeof globalThis & {
  __genjutsuE2EUploads?: Map<string, E2EUpload>;
};

const MAX_E2E_UPLOAD_BYTES = 128 * 1024 * 1024;
const E2E_UPLOAD_TTL_MS = 60 * 60 * 1000;

function store() {
  const global = globalThis as E2EGlobal;
  if (!global.__genjutsuE2EUploads) {
    global.__genjutsuE2EUploads = new Map<string, E2EUpload>();
  }
  return global.__genjutsuE2EUploads;
}

function cleanupExpiredUploads() {
  const now = Date.now();
  for (const [token, upload] of store()) {
    if (now - upload.createdAt > E2E_UPLOAD_TTL_MS) {
      store().delete(token);
    }
  }
}

export function isGenjutsuE2EMockEnabled() {
  return envConfigs.genjutsu_e2e_mock === 'true';
}

export function createGenjutsuE2EUploadDescriptor(
  request: Request,
  contentType: string
) {
  if (!isGenjutsuE2EMockEnabled()) {
    throw new Error('Genjutsu E2E mock is disabled');
  }

  const token = getUuid();
  const origin = new URL(request.url).origin;
  const publicUrl = `${origin}/api/genjutsu/e2e-upload/${encodeURIComponent(token)}`;

  return {
    uploadUrl: publicUrl,
    uploadHeaders: {
      'Content-Type': contentType,
    },
    publicUrl,
  };
}

export async function saveGenjutsuE2EUpload(
  token: string,
  request: Request
) {
  if (!isGenjutsuE2EMockEnabled()) {
    throw new Error('Genjutsu E2E mock is disabled');
  }
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(token)) {
    throw new Error('Invalid E2E upload token');
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength <= 0 || bytes.byteLength > MAX_E2E_UPLOAD_BYTES) {
    throw new Error('Invalid E2E upload size');
  }

  cleanupExpiredUploads();
  store().set(token, {
    bytes,
    contentType:
      request.headers.get('content-type') || 'application/octet-stream',
    createdAt: Date.now(),
  });
}

export function getGenjutsuE2EUpload(token: string) {
  if (!isGenjutsuE2EMockEnabled()) return null;
  cleanupExpiredUploads();
  return store().get(token) ?? null;
}

export function createGenjutsuE2ERequestId() {
  return `e2e-${getUuid()}`;
}

export function readGenjutsuE2EVideoUrl(options: string | null | undefined) {
  if (!options) return null;
  try {
    const parsed = JSON.parse(options);
    return typeof parsed?.videoUrl === 'string' ? parsed.videoUrl : null;
  } catch {
    return null;
  }
}
