import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { WavespeedNormalizedTask } from '@/core/ai/wavespeed';

import {
  reconcileImageToVideoGeneration,
  type ImageToVideoReconcileDeps,
} from './service';

type FakeTask = {
  id: string;
  userId: string;
  status: string;
  taskId: string | null;
  model: string | null;
  costCredits: number | null;
  taskResult?: string | null;
  options?: string | null;
  creditId?: string | null;
};

function baseTask(overrides: Partial<FakeTask> = {}): FakeTask {
  return {
    id: 'gen_dotd_1',
    userId: 'user_1',
    status: 'submission_unknown',
    taskId: 'req_ws_1',
    model: 'bytedance/seedance-2.0/image-to-video-turbo',
    costCredits: 12,
    taskResult: JSON.stringify({ error: 'network blip' }),
    options: null,
    creditId: 'credit_1',
    ...overrides,
  };
}

function makeDeps(opts: {
  provider: WavespeedNormalizedTask | (() => Promise<WavespeedNormalizedTask>);
  store: { task: FakeTask };
  refundCalls?: number[];
  persistCalls?: number[];
  promoteFails?: boolean;
}) {
  const refundCalls = opts.refundCalls ?? [];
  const persistCalls = opts.persistCalls ?? [];
  let refundedOnce = false;

  const deps: ImageToVideoReconcileDeps = {
    getProviderStatus: async () =>
      typeof opts.provider === 'function' ? opts.provider() : opts.provider,
    promoteUnknownToSubmitted: async () => {
      if (opts.promoteFails) return null;
      if (opts.store.task.status !== 'submission_unknown') return null;
      if (!opts.store.task.taskId) return null;
      opts.store.task = {
        ...opts.store.task,
        status: 'submitted',
        taskResult: null,
      };
      return { ...opts.store.task };
    },
    claimCompletion: async () => {
      if (opts.store.task.status === 'completed') return 'unavailable';
      if (opts.store.task.status === 'completing') return 'already_completing';
      if (opts.store.task.status !== 'submitted') return 'unavailable';
      opts.store.task = {
        ...opts.store.task,
        status: 'completing',
        taskResult: JSON.stringify({
          completionClaim: 'claim_1',
          completingClaimedAt: new Date().toISOString(),
        }),
      };
      return 'claimed';
    },
    getTaskById: async () => ({ ...opts.store.task }),
    persistResult: async () => {
      persistCalls.push(1);
      return {
        videoKey: `image-to-video/results/${opts.store.task.userId}/${opts.store.task.id}.mp4`,
      };
    },
    finalize: async ({ videoKey, providerStatus }) => {
      if (opts.store.task.status !== 'completing')
        return { ...opts.store.task };
      opts.store.task = {
        ...opts.store.task,
        status: 'completed',
        taskResult: JSON.stringify({ providerStatus, videoKey }),
      };
      return { ...opts.store.task };
    },
    refund: async ({ error, providerStatus }) => {
      refundCalls.push(1);
      if (refundedOnce) return null;
      const refundable = [
        'reserved',
        'submitting',
        'submitted',
        'submission_unknown',
      ];
      if (!refundable.includes(opts.store.task.status)) return null;
      refundedOnce = true;
      opts.store.task = {
        ...opts.store.task,
        status: 'refunded',
        taskResult: JSON.stringify({
          providerStatus: providerStatus || 'failed',
          error,
          refundedCredits: opts.store.task.costCredits || 0,
        }),
      };
      return { ...opts.store.task };
    },
    promoteStaleSubmitting: async () => null,
  };

  return { deps, refundCalls, persistCalls };
}

test('submission_unknown + taskId + provider completed → completed via promote', async () => {
  const store = { task: baseTask() };
  const { deps, persistCalls } = makeDeps({
    store,
    provider: {
      status: 'completed',
      providerStatus: 'completed',
      videoUrl: 'https://cdn.example/video.mp4',
    },
  });

  const result = await reconcileImageToVideoGeneration(store.task, deps);

  assert.equal(result.status, 'completed');
  assert.equal(store.task.status, 'completed');
  assert.equal(persistCalls.length, 1);
  assert.match(result.videoUrl || '', /\/api\/image-to-video\/result\//);
});

test('submission_unknown + taskId + provider failed → refund once', async () => {
  const store = { task: baseTask() };
  const refundCalls: number[] = [];
  const { deps } = makeDeps({
    store,
    refundCalls,
    provider: {
      status: 'failed',
      providerStatus: 'failed',
      videoUrl: null,
      error: 'content policy',
    },
  });

  const first = await reconcileImageToVideoGeneration(store.task, deps);
  assert.equal(first.status, 'failed');
  assert.equal(first.refundedCredits, 12);
  assert.equal(store.task.status, 'refunded');
  assert.equal(refundCalls.length, 1);

  const second = await reconcileImageToVideoGeneration(store.task, deps);
  assert.equal(second.status, 'failed');
  assert.equal(second.refundedCredits, 12);
  assert.equal(refundCalls.length, 1);
});

test('submission_unknown + provider query error → no refund, stay processing', async () => {
  const store = { task: baseTask() };
  const refundCalls: number[] = [];
  const { deps } = makeDeps({
    store,
    refundCalls,
    provider: async () => {
      throw new Error('upstream timeout');
    },
  });

  const result = await reconcileImageToVideoGeneration(store.task, deps);
  assert.equal(result.status, 'processing');
  assert.equal(result.providerStatus, 'submission_unknown');
  assert.equal(store.task.status, 'submission_unknown');
  assert.equal(refundCalls.length, 0);
});

test('submission_unknown + processing promotes to submitted then keeps processing', async () => {
  const store = { task: baseTask() };
  const { deps } = makeDeps({
    store,
    provider: {
      status: 'processing',
      providerStatus: 'processing',
      videoUrl: null,
    },
  });

  // First call promotes; second provider poll inside same reconcile sees processing again.
  const result = await reconcileImageToVideoGeneration(store.task, deps);
  assert.equal(result.status, 'processing');
  assert.equal(store.task.status, 'submitted');
});

test('R2 persist failure does not refund; later reconcile can complete', async () => {
  const store = {
    task: baseTask({ status: 'submitted', taskResult: null }),
  };
  let failPersist = true;
  const refundCalls: number[] = [];
  const persistCalls: number[] = [];

  const deps: ImageToVideoReconcileDeps = {
    ...makeDeps({
      store,
      refundCalls,
      persistCalls,
      provider: {
        status: 'completed',
        providerStatus: 'completed',
        videoUrl: 'https://cdn.example/video.mp4',
      },
    }).deps,
    persistResult: async () => {
      persistCalls.push(1);
      if (failPersist) throw new Error('R2 unavailable');
      return {
        videoKey: `image-to-video/results/${store.task.userId}/${store.task.id}.mp4`,
      };
    },
  };

  const first = await reconcileImageToVideoGeneration(store.task, deps);
  assert.equal(first.status, 'processing');
  assert.equal(first.providerStatus, 'completing');
  assert.equal(refundCalls.length, 0);
  assert.notEqual(store.task.status, 'refunded');

  failPersist = false;
  // Task may still be completing from claim
  store.task = { ...store.task, status: 'completing' };
  const second = await reconcileImageToVideoGeneration(store.task, deps);
  assert.equal(second.status, 'completed');
  assert.equal(store.task.status, 'completed');
  assert.equal(refundCalls.length, 0);
  assert.ok(persistCalls.length >= 2);
});

test('concurrent already_completing may idempotently persist without double finalize race refund', async () => {
  const store = {
    task: baseTask({
      status: 'completing',
      taskResult: JSON.stringify({
        completionClaim: 'other',
        completingClaimedAt: new Date().toISOString(),
      }),
    }),
  };
  const persistCalls: number[] = [];
  const refundCalls: number[] = [];
  const { deps } = makeDeps({
    store,
    persistCalls,
    refundCalls,
    provider: {
      status: 'completed',
      providerStatus: 'completed',
      videoUrl: 'https://cdn.example/video.mp4',
    },
  });

  // claimCompletion returns already_completing for status completing
  const a = await reconcileImageToVideoGeneration(store.task, deps);
  const b = await reconcileImageToVideoGeneration(store.task, deps);

  assert.equal(a.status, 'completed');
  assert.equal(b.status, 'completed');
  assert.equal(refundCalls.length, 0);
  assert.ok(persistCalls.length >= 1);
});

test('memory-only submitted forgery is insufficient — promote must write DB status', async () => {
  // Guards the original bug: if promote fails, we must NOT claim as submitted.
  const store = { task: baseTask() };
  const { deps, persistCalls } = makeDeps({
    store,
    promoteFails: true,
    provider: {
      status: 'completed',
      providerStatus: 'completed',
      videoUrl: 'https://cdn.example/video.mp4',
    },
  });

  const result = await reconcileImageToVideoGeneration(store.task, deps);
  assert.equal(result.status, 'processing');
  assert.equal(store.task.status, 'submission_unknown');
  assert.equal(persistCalls.length, 0);
});
