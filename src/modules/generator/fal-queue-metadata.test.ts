import assert from 'node:assert/strict';
import test from 'node:test';

import {
  readGeneratorFalQueueMetadata,
  serializeGeneratorFalQueueMetadata,
} from './fal-queue-metadata';

const id = '019a1b2c-3d4e-7f80-9a1b-2c3d4e5f6a7b';
const responseUrl = 'https://queue.fal.run/minimax/h3-max-turbo/requests/' + id;
const queueUrls = {
  statusUrl: responseUrl + '/status',
  responseUrl,
};

test('submitted Fal queue URLs survive DB text serialization and query-error metadata is separate', () => {
  const saved = serializeGeneratorFalQueueMetadata(id, queueUrls);
  assert.ok(saved);
  assert.deepEqual(JSON.parse(saved!), {falQueue: queueUrls});
  assert.deepEqual(readGeneratorFalQueueMetadata(saved, id), queueUrls);
});

test('legacy jobs with no submitted URLs use the existing endpoint compatibility resolver', () => {
  assert.equal(readGeneratorFalQueueMetadata(null, id), undefined);
  assert.equal(readGeneratorFalQueueMetadata('{}', id), undefined);
  assert.equal(serializeGeneratorFalQueueMetadata(id, undefined), null);
});

test('corrupted queue metadata is rejected before privileged polling', () => {
  assert.throws(() => readGeneratorFalQueueMetadata('not-json', id),
    /Invalid saved Fal queue metadata/);
  assert.throws(() => readGeneratorFalQueueMetadata(JSON.stringify({
    falQueue: {
      ...queueUrls,
      responseUrl: 'https://internal.example/requests/' + id,
    },
  }), id), /Invalid Fal queue URLs/);
  assert.throws(() => readGeneratorFalQueueMetadata(
    serializeGeneratorFalQueueMetadata(id, queueUrls), 'wrong-id'
  ), /Invalid Fal queue URLs/);
  assert.throws(() => serializeGeneratorFalQueueMetadata(id, {
    statusUrl: 'https://evil.example',
    responseUrl,
  }), /Invalid Fal queue URLs/);
});
