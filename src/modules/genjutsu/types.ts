export type GenjutsuMode = 'motion-transfer' | 'objects-swap';

export type GenjutsuResolution = '480p' | '720p' | '1080p';

export type GenjutsuProvider =
  | 'higgsfield'
  | 'seedance'
  | 'seedance-volcengine'
  | 'seedance-higgsfield'
  | 'seedance-seeapi'
  | 'seedance-wavespeed';

/** Allowlisted product ids that pin a provider target on attempt. */
export type GenjutsuProductId =
  | 'smalltown-boy-dance'
  | 'crazy-frog'
  | 'a2o-lite-ai'
  | 'enzo-fernandez-ai'
  | 'flying-car-ai'
  | 'coldplay-kiss-cam'
  | 'gangnam-style-ai'
  | 'gas-station-dance-ai'
  | 'burning-bridges-ai'
  | 'gta-5-goodbye-ai-video'
  | 'say-it-right-ai'
  | 'deck-the-halls-dance-ai'
  | 'can-i-ride-dance-ai'
  | 'zombie-hug'
  | 'tiny-desk-ai'
  | 'shan-shen-bu'
  | 'glow-stick'
  | 'chipmunks-dance'
  | 'bicep-heart'
  | 'wassup-in-a-minute-ai';

export type GenjutsuProviderTarget = {
  provider: GenjutsuProvider;
  model: string;
};
