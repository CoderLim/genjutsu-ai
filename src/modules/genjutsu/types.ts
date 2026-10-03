export type GenjutsuMode = 'motion-transfer' | 'objects-swap';

export type GenjutsuResolution = '480p' | '720p' | '1080p';

export type GenjutsuProvider =
  | 'higgsfield'
  | 'seedance'
  | 'seedance-volcengine';

export type GenjutsuProviderTarget = {
  provider: GenjutsuProvider;
  model: string;
};
