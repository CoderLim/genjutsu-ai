import { GENJUTSU_SCENE } from '@/modules/genjutsu/billing';
import { HOTEL_LOBBY_SCENE } from '@/modules/hotel-lobby/billing';

export { GENJUTSU_SCENE, HOTEL_LOBBY_SCENE };

export const LISTABLE_GENERATION_SCENES = [
  GENJUTSU_SCENE,
  HOTEL_LOBBY_SCENE,
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
  return '/api/genjutsu';
}
