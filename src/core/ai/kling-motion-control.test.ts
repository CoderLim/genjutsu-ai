import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildKlingMotionControlPayload,
  KlingMotionControlError,
} from './kling-motion-control';

test('builds the official Motion Control payload', () => {
  assert.deepEqual(
    buildKlingMotionControlPayload({
      imageUrl: 'https://example.com/subject.png',
      videoUrl: 'https://example.com/motion.mp4',
      prompt: '  keep the outfit  ',
      modelName: 'kling-v3',
      mode: 'pro',
      characterOrientation: 'video',
      keepOriginalSound: false,
      watermarkEnabled: true,
      externalTaskId: 'kling-test-123',
    }),
    {
      model_name: 'kling-v3',
      image_url: 'https://example.com/subject.png',
      video_url: 'https://example.com/motion.mp4',
      prompt: 'keep the outfit',
      keep_original_sound: 'no',
      character_orientation: 'video',
      mode: 'pro',
      watermark_info: { enabled: true },
      external_task_id: 'kling-test-123',
    }
  );
});

test('uses Kling documented defaults when optional fields are omitted', () => {
  const payload = buildKlingMotionControlPayload({
    imageUrl: 'https://example.com/subject.jpg',
    videoUrl: 'https://example.com/motion.mov',
    mode: 'std',
    characterOrientation: 'image',
  });

  assert.equal(payload.model_name, 'kling-v2-6');
  assert.equal(payload.keep_original_sound, 'yes');
  assert.deepEqual(payload.watermark_info, { enabled: false });
});

test('rejects prompts longer than 2500 characters', () => {
  assert.throws(
    () =>
      buildKlingMotionControlPayload({
        imageUrl: 'https://example.com/subject.jpg',
        videoUrl: 'https://example.com/motion.mp4',
        prompt: 'x'.repeat(2501),
        mode: 'std',
        characterOrientation: 'video',
      }),
    KlingMotionControlError
  );
});
