import { envConfigs } from '@/config';
import { getUuid } from '@/lib/hash';

type E2EUpload = {
  bytes: Uint8Array;
  contentType: string;
  createdAt: number;
};

type E2EGlobal = typeof globalThis & {
  __genjutsuE2EUploads?: Map<string, E2EUpload>;
  __genjutsuE2EStorageKeys?: Map<string, string>;
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

function storageKeys() {
  const global = globalThis as E2EGlobal;
  if (!global.__genjutsuE2EStorageKeys) {
    global.__genjutsuE2EStorageKeys = new Map<string, string>();
  }
  return global.__genjutsuE2EStorageKeys;
}

function cleanupExpiredUploads() {
  const now = Date.now();
  const expiredTokens = new Set<string>();

  for (const [token, upload] of store()) {
    if (now - upload.createdAt > E2E_UPLOAD_TTL_MS) {
      expiredTokens.add(token);
      store().delete(token);
    }
  }

  if (expiredTokens.size > 0) {
    for (const [key, token] of storageKeys()) {
      if (expiredTokens.has(token)) storageKeys().delete(key);
    }
  }
}

export function isGenjutsuE2EMockEnabled() {
  return envConfigs.genjutsu_e2e_mock === 'true';
}

export function createGenjutsuE2EUploadDescriptor(
  request: Request,
  params: { contentType: string; storageKey: string }
) {
  if (!isGenjutsuE2EMockEnabled()) {
    throw new Error('Genjutsu E2E mock is disabled');
  }

  const token = getUuid();
  const origin = new URL(request.url).origin;
  const publicUrl = `${origin}/api/genjutsu/e2e-upload/${encodeURIComponent(token)}`;
  storageKeys().set(params.storageKey, token);

  return {
    uploadUrl: publicUrl,
    uploadHeaders: {
      'Content-Type': params.contentType,
    },
    storageKey: params.storageKey,
  };
}

export async function saveGenjutsuE2EUpload(token: string, request: Request) {
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

/** Resolve in-memory E2E upload bytes from a public e2e-upload URL. */
export function getGenjutsuE2EUploadFromUrl(url: string) {
  if (!isGenjutsuE2EMockEnabled()) return null;
  try {
    const parsed = new URL(url);
    const match = /^\/api\/genjutsu\/e2e-upload\/([^/]+)$/.exec(
      parsed.pathname
    );
    if (!match) return null;
    return getGenjutsuE2EUpload(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function getGenjutsuE2EUrlForStorageKey(storageKey: string) {
  if (!isGenjutsuE2EMockEnabled()) return null;
  cleanupExpiredUploads();

  const token = storageKeys().get(storageKey);
  if (!token || !store().has(token)) return null;

  const origin = envConfigs.app_url.replace(/\/$/, '');
  return `${origin}/api/genjutsu/e2e-upload/${encodeURIComponent(token)}`;
}

export function resolveGenjutsuE2EInputUrls(params: {
  videoKey: string;
  imageKeys: string[];
}) {
  const videoUrl = getGenjutsuE2EUrlForStorageKey(params.videoKey);
  const imageUrls = params.imageKeys.map((key) =>
    getGenjutsuE2EUrlForStorageKey(key)
  );

  if (!videoUrl || imageUrls.some((url) => !url)) {
    throw new Error('E2E generation is missing uploaded storage objects');
  }

  return {
    videoUrl,
    imageUrls: imageUrls as string[],
  };
}

export function sealGenjutsuE2EStorageObject(
  sourceKey: string,
  destinationKey: string
) {
  if (!isGenjutsuE2EMockEnabled()) {
    throw new Error('Genjutsu E2E mock is disabled');
  }

  cleanupExpiredUploads();
  const sourceToken = storageKeys().get(sourceKey);
  const source = sourceToken ? store().get(sourceToken) : null;
  if (!sourceToken || !source) {
    throw new Error('E2E source storage object is missing');
  }

  const sealedToken = getUuid();
  store().set(sealedToken, {
    bytes: new Uint8Array(source.bytes),
    contentType: source.contentType,
    createdAt: Date.now(),
  });
  storageKeys().set(destinationKey, sealedToken);
}

export function copyGenjutsuE2EStorageObject(
  sourceKey: string,
  destinationKey: string
) {
  if (!isGenjutsuE2EMockEnabled()) {
    throw new Error('Genjutsu E2E mock is disabled');
  }

  cleanupExpiredUploads();
  const token = storageKeys().get(sourceKey);
  if (!token || !store().has(token)) {
    throw new Error('E2E source storage object is missing');
  }

  storageKeys().set(destinationKey, token);
}

export function createGenjutsuE2ERequestId() {
  return `e2e-${getUuid()}`;
}

export function readGenjutsuE2EVideoKey(options: string | null | undefined) {
  if (!options) return null;
  try {
    const parsed = JSON.parse(options);
    return typeof parsed?.videoKey === 'string' ? parsed.videoKey : null;
  } catch {
    return null;
  }
}
