import assert from 'node:assert/strict';
import test from 'node:test';

import { falPayloadHasFace } from './safety';

test('Fal face detection accepts an empty objects list as safe', () => {
  assert.equal(falPayloadHasFace({ objects: [] }), false);
});

test('Fal face detection blocks when at least one face object is returned', () => {
  assert.equal(
    falPayloadHasFace({
      objects: [{ bbox: [0.1, 0.1, 0.4, 0.4], label: 'human face' }],
    }),
    true
  );
});

test('Fal face detection fails closed on an invalid provider payload', () => {
  assert.throws(
    () => falPayloadHasFace({ output: [] }),
    /missing objects/
  );
});
