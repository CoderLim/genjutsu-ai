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
  | 'gangnam-style-ai';

export type GenjutsuProviderTarget = {
  provider: GenjutsuProvider;
  model: string;
};
