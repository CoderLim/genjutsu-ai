import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BULIN_47_PRESET_ID,
  getHotelLobbyPresetClientDefaults,
  HOTEL_LOBBY_PRESET_ID,
  RUMPELSTILTSKIN_PRESET_ID,
} from './presets';
import { hotelLobbyTemplateProxyUrl } from './template-proxy-url';

test('Preview proxy URL product matches each preset Full seal product', () => {
  for (const presetId of [
    HOTEL_LOBBY_PRESET_ID,
    RUMPELSTILTSKIN_PRESET_ID,
    BULIN_47_PRESET_ID,
  ] as const) {
    const defaults = getHotelLobbyPresetClientDefaults(presetId);
    const proxy = hotelLobbyTemplateProxyUrl(presetId);
    const previewProduct = new URL(
      defaults.previewUrl,
      'https://example.test'
    ).searchParams.get('product');
    const proxyProduct = new URL(
      proxy,
      'https://example.test'
    ).searchParams.get('product');

    assert.equal(previewProduct, presetId);
    assert.equal(proxyProduct, presetId);
    assert.equal(proxyProduct, previewProduct);
    assert.match(proxy, /delivery=proxy/);
    // Must not collapse every preset onto hotel-lobby template-file.
    assert.doesNotMatch(proxy, /hotel-lobby\/template-file/);
  }
});

test('Rumpel and Bulin proxy URLs are distinct from Hotel Lobby', () => {
  const hotel = hotelLobbyTemplateProxyUrl(HOTEL_LOBBY_PRESET_ID);
  const rumpel = hotelLobbyTemplateProxyUrl(RUMPELSTILTSKIN_PRESET_ID);
  const bulin = hotelLobbyTemplateProxyUrl(BULIN_47_PRESET_ID);
  assert.notEqual(rumpel, hotel);
  assert.notEqual(bulin, hotel);
  assert.notEqual(rumpel, bulin);
});
