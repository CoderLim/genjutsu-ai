import assert from 'node:assert/strict';
import test from 'node:test';

import {
  IMAGE_TO_VIDEO_DESCRIPTION,
  IMAGE_TO_VIDEO_FAQS,
  IMAGE_TO_VIDEO_PATH,
  IMAGE_TO_VIDEO_STEPS,
  IMAGE_TO_VIDEO_TITLE,
} from './seo';

test('Image to Video SEO metadata matches the public search intent and canonical path', () => {
  assert.equal(IMAGE_TO_VIDEO_PATH, '/image-to-video/');
  assert.equal(IMAGE_TO_VIDEO_TITLE,
    'Image to Video AI — Turn Photos Into a Video Online');
  assert.equal(IMAGE_TO_VIDEO_TITLE.length, 51);
  assert.equal(IMAGE_TO_VIDEO_DESCRIPTION,
    'Turn a photo into a moving video with AI. Upload an image, describe the motion, and download your clip for social posts, product listings, or old family photos.');
  assert.ok(!IMAGE_TO_VIDEO_DESCRIPTION.includes('['));
});

test('visible HowTo and FAQ schema copy stays complete and without fabricated placeholders', () => {
  assert.deepEqual(IMAGE_TO_VIDEO_STEPS.map(s => s.name), [
    'Upload your photo',
    'Describe the motion',
    'Generate and download',
  ]);
  assert.ok(IMAGE_TO_VIDEO_FAQS.length >= 6);
  const questions = IMAGE_TO_VIDEO_FAQS.map(item => item.question);
  assert.equal(new Set(questions).size, questions.length);
  for (const record of [...IMAGE_TO_VIDEO_STEPS, ...IMAGE_TO_VIDEO_FAQS]) {
    for (const text of Object.values(record)) {
      assert.ok(typeof text === 'string' && text.length > 10);
      assert.doesNotMatch(text, /\[[^\]]+\]|\bTODO\b|\bTBD\b/i);
    }
  }

  const freeQuestion = IMAGE_TO_VIDEO_FAQS.find(
    item => item.question === 'Are free videos watermarked?'
  );
  assert.ok(freeQuestion);
  assert.match(freeQuestion.answer, /depend on the model and provider/);
  assert.match(IMAGE_TO_VIDEO_FAQS.find(
    item => item.question === 'Can I use the videos commercially?'
  )!.answer, /Check the Genjutsu AI terms/);
});
