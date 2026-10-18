import { fixedTemplatePreviewPath } from '@/modules/templates/paths';

import type { HotelLobbyPresetId } from './presets';

/**
 * Same-origin proxy URL for fetch()/trim of the preset's R2 template.
 * Must match the product sealed by Full generate for that presetId.
 */
export function hotelLobbyTemplateProxyUrl(
  presetId: HotelLobbyPresetId
): string {
  return fixedTemplatePreviewPath({
    product: presetId,
    delivery: 'proxy',
  });
}
