import assert from 'node:assert/strict';
import test from 'node:test';

import {
  falPayloadHasFace,
  REAL_HUMAN_FACE_DETECTION_PROMPT,
} from './safety';

test('Fal face detection accepts an empty objects list as safe', () => {
  assert.equal(falPayloadHasFace({ objects: [] }), false);
});

test('Fal face detection blocks when at least one face object is returned', () => {
  assert.equal(
    falPayloadHasFace({
      objects: [
        { x_min: 0.1, y_min: 0.1, x_max: 0.4, y_max: 0.4 },
      ],
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


test('face detection prompt targets real people and excludes stylized characters', () => {
  assert.match(REAL_HUMAN_FACE_DETECTION_PROMPT, /real human face/i);
  assert.match(REAL_HUMAN_FACE_DETECTION_PROMPT, /exclude anime/i);
  assert.match(REAL_HUMAN_FACE_DETECTION_PROMPT, /3D character/i);
});
