import {
  getGenjutsuProductTemplatePreviewUrl,
  getZombieHugTemplatePreviewUrl,
} from '@/modules/genjutsu/storage';
import { isGenjutsuProductId } from '@/modules/genjutsu/workflow';
import {
  isHotelLobbyPresetId,
  type HotelLobbyPresetId,
} from '@/modules/hotel-lobby/presets';
import { getHotelLobbyTemplatePreviewUrl } from '@/modules/hotel-lobby/storage';
import { parseKairoBadTimesSubject } from '@/modules/kairo-bad-times/constants';
import { getKairoBadTimesTemplateVideoUrl } from '@/modules/kairo-bad-times/storage';
import {
  isZombieHugAspectRatio,
  ZOMBIE_HUG_DEFAULT_ASPECT_RATIO,
  type ZombieHugAspectRatio,
} from '@/modules/zombie-hug/prompt';

/**
 * Fixed-template page previews — same R2 object the product seal/generate path uses.
 * No public `/videos/*` fallback: missing R2 fails loudly so UI matches submit.
 */
export async function resolveFixedTemplatePreviewUrl(params: {
  product: string;
  aspect?: string | null;
  subject?: string | null;
}): Promise<string> {
  const product = params.product;

  // Zombie Hug is a GenjutsuProductId but keeps selectable 16:9 | 9:16 templates.
  if (product === 'zombie-hug') {
    const aspectRatio: ZombieHugAspectRatio = isZombieHugAspectRatio(
      params.aspect
    )
      ? params.aspect
      : ZOMBIE_HUG_DEFAULT_ASPECT_RATIO;
    return getZombieHugTemplatePreviewUrl(aspectRatio);
  }

  // Genjutsu product ids (incl. crazy-frog) win over hotel-lobby legacy preset ids.
  if (isGenjutsuProductId(product)) {
    return getGenjutsuProductTemplatePreviewUrl(product);
  }

  if (product === 'kairo-bad-times') {
    const subject = parseKairoBadTimesSubject(params.subject);
    return getKairoBadTimesTemplateVideoUrl(subject);
  }

  if (isHotelLobbyPresetId(product)) {
    return getHotelLobbyTemplatePreviewUrl(product as HotelLobbyPresetId);
  }

  throw new Error(`Unknown fixed template product: ${product}`);
}
