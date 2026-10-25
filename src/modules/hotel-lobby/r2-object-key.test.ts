import assert from 'node:assert/strict';
import test from 'node:test';

import { buildR2S3ObjectUrl, buildR2CopySourceHeader } from '@/lib/r2-signing-config';
import { getHotelLobbyTemplateVideoKey } from './storage';

test('Hotel Lobby logical preset resolves to a prefixed template path', () => {
  const key = getHotelLobbyTemplateVideoKey();
  assert.ok(key.startsWith('hotel-lobby/'));
  const config = { endpoint: 'https://r2.example.com', bucket: 'genjutsu-ai', uploadPath: 'uploads' };
  assert.equal(
    buildR2S3ObjectUrl(config, key),
    `https://r2.example.com/genjutsu-ai/uploads/${key}`
  );
  assert.equal(
    buildR2CopySourceHeader(config, key),
    `/genjutsu-ai/uploads/${key}`
  );
});
