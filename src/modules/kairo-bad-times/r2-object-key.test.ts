import assert from 'node:assert/strict';
import test from 'node:test';

import { buildR2S3ObjectUrl, buildR2CopySourceHeader } from '@/lib/r2-signing-config';
import { getKairoBadTimesResultKey, resolveKairoBadTimesTemplateVideoKey } from './storage';

test('Kairo Bad Times template and result retain logical keys', () => {
  const templateKey = resolveKairoBadTimesTemplateVideoKey();
  const resultKey = getKairoBadTimesResultKey({ userId: 'user-x', generationId: 'task-y' });
  const config = { endpoint: 'https://r2.example.com', bucket: 'genjutsu-ai', uploadPath: 'assets/uploads' };
  for (const key of [templateKey, resultKey]) {
    assert.ok(key.startsWith('kairo-bad-times/'));
    assert.equal(
      buildR2S3ObjectUrl(config, key),
      `https://r2.example.com/genjutsu-ai/assets/uploads/${key}`
    );
    assert.equal(
      buildR2CopySourceHeader(config, key),
      `/genjutsu-ai/assets/uploads/${key}`
    );
  }
});
