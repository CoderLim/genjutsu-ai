import { GENJUTSU_SCENE } from '@/modules/genjutsu/billing';
import { HOTEL_LOBBY_SCENE } from '@/modules/hotel-lobby/billing';
import { KAIRO_BAD_TIMES_SCENE } from '@/modules/kairo-bad-times/constants';

export { GENJUTSU_SCENE, HOTEL_LOBBY_SCENE, KAIRO_BAD_TIMES_SCENE };

export const LISTABLE_GENERATION_SCENES = [
  GENJUTSU_SCENE,
  HOTEL_LOBBY_SCENE,
  KAIRO_BAD_TIMES_SCENE,
] as const;

export type ListableGenerationScene =
  (typeof LISTABLE_GENERATION_SCENES)[number];

export function isListableGenerationScene(
  value: string
): value is ListableGenerationScene {
  return (LISTABLE_GENERATION_SCENES as readonly string[]).includes(value);
}

export function generationMediaBasePath(scene: string) {
  if (scene === HOTEL_LOBBY_SCENE) return '/api/hotel-lobby';
  if (scene === KAIRO_BAD_TIMES_SCENE) return '/api/kairo-bad-times';
  return '/api/genjutsu';
}
