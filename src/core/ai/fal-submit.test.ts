import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyFalSubmitFailure,
  FalProvider,
  falQueueQueryModel,
  isDefiniteFalSubmitRejection,
  isTransientFalHttpStatus,
  parseFalHttpStatusFromError,
} from './fal';
import { AIMediaType, AITaskStatus } from './types';
import { assertFalQueueUrls, readFalQueueUrls } from './fal-queue-urls';

test('classifies definite 4xx submit rejections as refundable', () => {
  assert.equal(
    classifyFalSubmitFailure('request failed with status: 400'),
    'refund'
  );
  assert.equal(
    classifyFalSubmitFailure('request failed with status: 401'),
    'refund'
  );
  assert.equal(
    classifyFalSubmitFailure('request failed with status: 403'),
    'refund'
  );
  assert.equal(
    classifyFalSubmitFailure('request failed with status: 404'),
    'refund'
  );
  assert.equal(
    classifyFalSubmitFailure('request failed with status: 422'),
    'refund'
  );
});

test('classifies 5xx / 429 / 408 submit failures as uncertain', () => {
  assert.equal(
    classifyFalSubmitFailure('request failed with status: 500'),
    'uncertain'
  );
  assert.equal(
    classifyFalSubmitFailure('request failed with status: 502'),
    'uncertain'
  );
  assert.equal(
    classifyFalSubmitFailure('request failed with status: 429'),
    'uncertain'
  );
  assert.equal(
    classifyFalSubmitFailure('request failed with status: 408'),
    'uncertain'
  );
  assert.equal(classifyFalSubmitFailure('network down'), 'uncertain');
});

test('HTTP status helpers match Fal transport rules', () => {
  assert.equal(
    parseFalHttpStatusFromError('request failed with status: 502'),
    502
  );
  assert.equal(isTransientFalHttpStatus(502), true);
  assert.equal(isDefiniteFalSubmitRejection(502), false);
  assert.equal(isDefiniteFalSubmitRejection(404), true);
});

test('queue status/result keeps mode endpoints; truncates submit-only nests', () => {
  assert.equal(
    falQueueQueryModel('fal-ai/kling-video/o3/standard/video-to-video/edit'),
    'fal-ai/kling-video'
  );
  assert.equal(
    falQueueQueryModel('minimax/h3/reference-to-video'),
    'minimax/h3/reference-to-video'
  );
  assert.equal(
    falQueueQueryModel('minimax/h3-max-turbo/text-to-video'),
    'minimax/h3-max-turbo/text-to-video'
  );
  assert.equal(
    falQueueQueryModel('fal-ai/kling-video/v3/pro/text-to-video'),
    'fal-ai/kling-video/v3/pro/text-to-video'
  );
  assert.equal(
    falQueueQueryModel('fal-ai/flux/schnell'),
    'fal-ai/flux/schnell'
  );
  assert.equal(falQueueQueryModel('fal-ai/kling-video'), 'fal-ai/kling-video');
  assert.equal(
    falQueueQueryModel('fal-ai/bytedance/dreamactor/v2'),
    'fal-ai/bytedance'
  );
  assert.equal(
    falQueueQueryModel('bytedance/seedance-2.5/us/reference-to-video'),
    'bytedance/seedance-2.5'
  );
});

test('Fal submit response returns canonical status/result URLs for nested endpoints', () => {
  const requestId = '019a1b2c-3d4e-7f80-9a1b-2c3d4e5f6a7b';
  const responseUrl = 'https://queue.fal.run/minimax/h3-max-turbo/requests/' + requestId;
  const result = readFalQueueUrls({
    request_id: requestId,
    status_url: responseUrl + '/status',
    response_url: responseUrl,
  }, requestId);
  assert.deepEqual(result, {
    statusUrl: responseUrl + '/status', responseUrl,
  });
  assert.deepEqual(assertFalQueueUrls(result!, requestId), result);
});

test('Fal rejects off-domain, cross-request, redirected or malformed privileged queue URLs', () => {
  const id = '00000000-0000-0000-0000-000000000001';
  const good = 'https://queue.fal.run/minimax/h3/requests/' + id;
  for (const bad of [
    'http://queue.fal.run/minimax/h3/requests/' + id,
    'https://evil.example/minimax/h3/requests/' + id,
    'https://queue.fal.run.evil.example/minimax/h3/requests/' + id,
    'https://queue.fal.run@evil.example/minimax/h3/requests/' + id,
    'https://queue.fal.run:8443/minimax/h3/requests/' + id,
    good + '?token=secret',
    good + '#unsafe',
    good.replace(id, 'another-request'),
    good.replace('/requests/', '/text-to-video/requests/'),
    good.replace('/minimax/h3/', '/minimax/%68%33/'),
    good.replace('/minimax/h3/', '/minimax/../'),
  ]) {
    assert.equal(readFalQueueUrls({
      status_url: good + '/status', response_url: bad,
    }, id), undefined, bad);
    assert.throws(() => assertFalQueueUrls({
      statusUrl: good + '/status', responseUrl: bad,
    }, id), /Invalid Fal queue URLs/);
  }
  assert.equal(readFalQueueUrls({
    status_url: good + '/status',
    response_url: good.replace('/minimax/h3/', '/minimax/different/'),
  }, id), undefined);
  assert.equal(readFalQueueUrls({
    status_url: good + '/status',
  }, id), undefined);
});

test('FalProvider queries exact canonical URLs from submit rather than guessing the model path', async () => {
  const requestId = '019a1b2c-3d4e-7f80-9a1b-2c3d4e5f6a7b';
  const resultUrl = 'https://queue.fal.run/minimax/h3-max-turbo/requests/' + requestId;
  const statusUrl = resultUrl + '/status';
  const model = 'minimax/h3-max-turbo/text-to-video';
  const calls: Array<{url: string; method: string; redirect?: RequestRedirect}> = [];
  const prior = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = typeof url === 'string' ? url : url.toString();
    calls.push({ url: u, method: init?.method ?? 'GET', redirect: init?.redirect });
    if (init?.method === 'POST') return new Response(JSON.stringify({
      request_id: requestId,
      status_url: statusUrl,
      response_url: resultUrl,
    }), {status: 200});
    if (u === statusUrl) return new Response(JSON.stringify({
      status: 'COMPLETED',
    }), {status: 200});
    if (u === resultUrl) return new Response(JSON.stringify({
      video: {url: 'https://cdn.example/video.mp4'},
    }), {status: 200});
    throw new Error('Unexpected queue URL: ' + u);
  }) as typeof fetch;
  try {
    const fal = new FalProvider({apiKey: 'test-key'});
    const submitted = await fal.generate({params: {
      mediaType: AIMediaType.VIDEO, model, prompt: 'A running fox',
    }});
    const urls = readFalQueueUrls(submitted.taskResult, submitted.taskId);
    assert.ok(urls);
    const complete = await fal.query({
      taskId: submitted.taskId,
      mediaType: AIMediaType.VIDEO,
      model,
      queueUrls: urls,
    });
    assert.equal(complete.taskStatus, AITaskStatus.SUCCESS);
    assert.equal(complete.taskInfo?.videos?.[0].videoUrl,
      'https://cdn.example/video.mp4');
    assert.deepEqual(calls.map(call => call.url), [
      'https://queue.fal.run/' + model,
      statusUrl,
      resultUrl,
    ]);
    assert.ok(calls.slice(1).every(call => call.redirect === 'error'));
  } finally {
    globalThis.fetch = prior;
  }
});

test('old requests without stored URLs still use the historical query-model mapping', async () => {
  const id = 'existing-request-id';
  const model = 'bytedance/seedance-2.5/flash/text-to-video';
  const wanted = 'https://queue.fal.run/bytedance/seedance-2.5/requests/' + id + '/status';
  const calls: string[] = [];
  const prior = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request) => {
    calls.push(String(url));
    return new Response(JSON.stringify({status: 'IN_PROGRESS'}), {status: 200});
  }) as typeof fetch;
  try {
    const result = await new FalProvider({apiKey: 'test-key'}).query({
      taskId: id, model, mediaType: AIMediaType.VIDEO,
    });
    assert.equal(result.taskStatus, AITaskStatus.PROCESSING);
    assert.deepEqual(calls, [wanted]);
  } finally {
    globalThis.fetch = prior;
  }
});

test('legacy long-path 404 retries the owner/app queue GET once without a second submit', async () => {
  const id = 'old-request-id';
  const model = 'minimax/h3-max-turbo/text-to-video';
  const longStatus = 'https://queue.fal.run/' + model + '/requests/' + id + '/status';
  const baseResult = 'https://queue.fal.run/minimax/h3-max-turbo/requests/' + id;
  const calls: string[] = [];
  const prior = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const key = String(url);
    calls.push(key);
    assert.equal(init?.method, 'GET');
    assert.equal(init?.redirect, 'error');
    if (key === longStatus) return new Response('not found', {status: 404});
    if (key === baseResult + '/status') return new Response(
      JSON.stringify({status: 'COMPLETED'}), {status: 200}
    );
    if (key === baseResult) return new Response(
      JSON.stringify({video: {url: 'https://cdn.example/recovered.mp4'}}), {status: 200}
    );
    throw new Error('Unexpected lookup ' + key);
  }) as typeof fetch;
  try {
    const result = await new FalProvider({apiKey: 'test-key'}).query({
      taskId: id, model, mediaType: AIMediaType.VIDEO,
    });
    assert.equal(result.taskStatus, AITaskStatus.SUCCESS);
    assert.equal(result.taskInfo?.videos?.[0].videoUrl,
      'https://cdn.example/recovered.mp4');
    assert.deepEqual(calls, [longStatus, baseResult + '/status', baseResult]);
  } finally {
    globalThis.fetch = prior;
  }
});

test('canonical multi-segment queue URLs never trigger legacy fallbacks even on 404', async () => {
  const id = 'new-request-id';
  const resultUrl = 'https://queue.fal.run/minimax/h3-max-turbo/text-to-video/requests/' + id;
  const urls = {statusUrl: resultUrl + '/status', responseUrl: resultUrl};
  const called: string[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request) => {
    called.push(String(url));
    return new Response('not found', {status: 404});
  }) as typeof fetch;
  try {
    const result = await new FalProvider({apiKey: 'test-key'}).query({
      taskId: id,
      model: 'minimax/h3-max-turbo/text-to-video',
      mediaType: AIMediaType.VIDEO,
      queueUrls: urls,
    });
    assert.equal(result.taskStatus, AITaskStatus.FAILED);
    assert.equal(result.taskInfo?.status, 'QUERY_PERMANENT_ERROR');
    assert.deepEqual(called, [urls.statusUrl]);
  } finally {
    globalThis.fetch = original;
  }
});

test('Fal accepts canonical two-, three- and deeply nested queue URLs', () => {
  const requestId = '019a1b2c-3d4e-7f80-9a1b-2c3d4e5f6a7b';
  for (const prefix of [
    'minimax/h3-max-turbo',
    'minimax/h3-max-turbo/text-to-video',
    'minimax/h3-max-turbo/image-to-video',
    'fal-ai/kling-video/v3/pro/text-to-video',
    'fal-ai/kling-video/v3/pro/image-to-video',
  ]) {
    const responseUrl = 'https://queue.fal.run/' + prefix + '/requests/' + requestId;
    const urls = {
      status_url: responseUrl + '/status',
      response_url: responseUrl,
    };
    assert.deepEqual(readFalQueueUrls(urls, requestId), {
      statusUrl: urls.status_url,
      responseUrl: urls.response_url,
    }, prefix);
    assert.deepEqual(assertFalQueueUrls({
      statusUrl: urls.status_url,
      responseUrl: urls.response_url,
    }, requestId), {
      statusUrl: urls.status_url,
      responseUrl: urls.response_url,
    }, prefix);
  }
});

test('Fal rejects percent-encoded or traversing segments even if URLs are paired', () => {
  const id = '019a1b2c-3d4e-7f80-9a1b-2c3d4e5f6a7b';
  const base = 'https://queue.fal.run/minimax/h3-max-turbo/text-to-video/requests/' + id;
  const cases = [
    base.replace('/text-to-video/', '/%74ext-to-video/'),
    base.replace('/text-to-video/', '/%2e%2e/text-to-video/'),
    base.replace('/text-to-video/', '/../text-to-video/'),
    base.replace('/text-to-video/', '/text-to-video//'),
    base.replace('/text-to-video/', '/./text-to-video/'),
    base.replace('/minimax/', '/minimax/%2Fmalicious/'),
    base.replace('/minimax/', '/minimax/%00/'),
    base.replace('/minimax/', '/minimax/%5c/'),
    base.replace('/minimax/', '/minimax/@evil/'),
    base.replace('/requests/', '/not-requests/'),
    base.replace(id, 'other-request'),
    base + '?q=1',
    base + '#fragment',
    'https://evil.example/minimax/h3-max-turbo/text-to-video/requests/' + id,
    'http://queue.fal.run/minimax/h3-max-turbo/text-to-video/requests/' + id,
    'https://queue.fal.run:8443/minimax/h3-max-turbo/text-to-video/requests/' + id,
  ];
  for (const candidate of cases) {
    assert.equal(readFalQueueUrls({
      status_url: candidate + '/status',
      response_url: candidate,
    }, id), undefined, candidate);
  }
  // Valid-looking but mismatched queue routes or request IDs are forbidden.
  assert.equal(readFalQueueUrls({
    status_url: base + '/status',
    response_url: base.replace('text-to-video', 'image-to-video'),
  }, id), undefined);
});

test('FalProvider uses supplied multi-segment URLs verbatim for submit/status/result', async () => {
  const requestId = '019a1b2c-3d4e-7f80-9a1b-2c3d4e5f6a7b';
  const models = [
    'minimax/h3-max-turbo/text-to-video',
    'fal-ai/kling-video/v3/pro/text-to-video',
  ];
  const originalFetch = globalThis.fetch;
  try {
    for (const model of models) {
      const responseUrl = 'https://queue.fal.run/' + model + '/requests/' + requestId;
      const statusUrl = responseUrl + '/status';
      const requests: string[] = [];
      globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
        const requestUrl = String(url);
        requests.push(requestUrl);
        if (requestUrl === 'https://queue.fal.run/' + model && init?.method === 'POST') {
          return new Response(JSON.stringify({
            request_id: requestId,
            status_url: statusUrl,
            response_url: responseUrl,
          }), { status: 200 });
        }
        assert.equal(init?.method, 'GET');
        assert.equal(init?.redirect, 'error');
        if (requestUrl === statusUrl) {
          return new Response(JSON.stringify({ status: 'COMPLETED' }), { status: 200 });
        }
        if (requestUrl === responseUrl) {
          return new Response(JSON.stringify({
            video: { url: 'https://media.example.test/result.mp4' },
          }), { status: 200 });
        }
        throw new Error('Unexpected endpoint ' + requestUrl);
      }) as typeof fetch;
      const fal = new FalProvider({ apiKey: 'test-key' });
      const task = await fal.generate({
        params: { model, mediaType: AIMediaType.VIDEO, prompt: 'A fox walking' },
      });
      const urls = readFalQueueUrls(task.taskResult, task.taskId);
      assert.ok(urls, model);
      const result = await fal.query({
        model, mediaType: AIMediaType.VIDEO,
        taskId: task.taskId, queueUrls: urls,
      });
      assert.equal(result.taskStatus, AITaskStatus.SUCCESS);
      assert.equal(result.taskInfo?.videos?.[0].videoUrl,
        'https://media.example.test/result.mp4');
      assert.deepEqual(requests, [
        'https://queue.fal.run/' + model, statusUrl, responseUrl,
      ]);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
