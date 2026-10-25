import assert from 'node:assert/strict';
import test from 'node:test';

import { R2Provider } from './r2';

function createProvider(
  overrides: Partial<ConstructorParameters<typeof R2Provider>[0]> = {}
) {
  return new R2Provider({
    accountId: 'acct',
    accessKeyId: 'ak',
    secretAccessKey: 'sk',
    bucket: 'genjutsu-ai',
    uploadPath: 'uploads',
    endpoint: 'https://acct.r2.cloudflarestorage.com',
    ...overrides,
  });
}

test('R2Provider getPublicUrl resolves logical and prefixed keys the same way', () => {
  const provider = createProvider();
  assert.equal(
    provider.getPublicUrl({ key: 'hotel-lobby/templates/default-v2.mp4' }),
    'https://acct.r2.cloudflarestorage.com/genjutsu-ai/uploads/hotel-lobby/templates/default-v2.mp4'
  );
  assert.equal(
    provider.getPublicUrl({
      key: 'uploads/hotel-lobby/templates/default-v2.mp4',
    }),
    'https://acct.r2.cloudflarestorage.com/genjutsu-ai/uploads/hotel-lobby/templates/default-v2.mp4'
  );
});

test('R2Provider getPublicUrl prefers publicDomain without requiring endpoint', () => {
  const provider = createProvider({
    endpoint: undefined,
    accountId: '',
    publicDomain: 'https://cdn.example.com/',
  });
  assert.equal(
    provider.getPublicUrl({ key: 'genjutsu/results/u/t.mp4' }),
    'https://cdn.example.com/uploads/genjutsu/results/u/t.mp4'
  );
});

test('R2Provider builds default endpoint from accountId when endpoint omitted', () => {
  const provider = createProvider({ endpoint: undefined, accountId: 'xyz' });
  assert.equal(
    provider.getPublicUrl({ key: 'genjutsu/templates/a.mp4' }),
    'https://xyz.r2.cloudflarestorage.com/genjutsu-ai/uploads/genjutsu/templates/a.mp4'
  );
});

test('R2Provider uploadFile and exists use the same physical object key', async () => {
  const provider = createProvider();
  const requestedUrls: string[] = [];

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    requestedUrls.push(url);
    return new Response(null, { status: 200 });
  }) as typeof fetch;

  try {
    const upload = await provider.uploadFile({
      key: 'genjutsu/inputs/u/g/source.mp4',
      body: new Uint8Array([1, 2, 3]),
      contentType: 'video/mp4',
    });
    assert.equal(upload.success, true);
    assert.equal(upload.key, 'genjutsu/inputs/u/g/source.mp4');

    const exists = await provider.exists({
      key: 'uploads/genjutsu/inputs/u/g/source.mp4',
    });
    assert.equal(exists, true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(requestedUrls.length >= 2, true);
  for (const url of requestedUrls) {
    assert.match(
      url,
      /\/genjutsu-ai\/uploads\/genjutsu\/inputs\/u\/g\/source\.mp4$/
    );
    assert.equal(url.includes('/uploads/uploads/'), false);
  }
});
