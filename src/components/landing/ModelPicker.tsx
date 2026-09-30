import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/cn';
import { ChevronDownIcon, CrownIcon } from '@/components/icons';

export type GeneratorModel = {
  id: string;
  name: string;
  providerId: string;
  description: string;
  resolution?: string;
  credits: string;
  duration: string;
  badge?: string;
  sale?: string;
  loginRequired?: boolean;
  free?: boolean;
};

export type ModelProvider = {
  id: string;
  name: string;
  description: string;
  iconSrc: string;
  tryFree?: boolean;
  paid?: boolean;
};

const IMAGE_PROVIDERS: ModelProvider[] = [
  {
    id: 'seedream',
    name: 'Seedream',
    description: 'HD realism',
    iconSrc: '/images/logos/image-models/seedream.svg',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Accurate text',
    iconSrc: '/images/logos/image-models/openai.svg',
    tryFree: true,
    paid: true,
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Multi-image reference',
    iconSrc: '/images/logos/video-models/google-g.svg',
    paid: true,
  },
];

const VIDEO_PROVIDERS: ModelProvider[] = [
  {
    id: 'seedance',
    name: 'Seedance',
    description: 'Smooth motion',
    iconSrc: '/images/logos/video-models/seedance.svg',
  },
  {
    id: 'kling',
    name: 'Kling',
    description: 'Short-form video',
    iconSrc: '/images/logos/video-models/kling-official.png',
    paid: true,
  },
  {
    id: 'google',
    name: 'Google',
    description: 'Cinematic realism',
    iconSrc: '/images/logos/video-models/google-g.svg',
    paid: true,
  },
];

const IMAGE_MODELS: GeneratorModel[] = [
  {
    id: 'seedream-3.5-pro',
    providerId: 'seedream',
    name: 'Seedream 3.5 Pro',
    description: 'Higher quality · Fast queue',
    resolution: '2K',
    credits: '2+ credits',
    duration: '10-30s',
    loginRequired: true,
  },
  {
    id: 'seedream-3.5',
    providerId: 'seedream',
    name: 'Seedream 3.5',
    description: 'Standard quality · Slow queue',
    resolution: '0.5K',
    credits: '0+ credits',
    duration: '~60s',
    free: true,
  },
  {
    id: 'seedream-5.0-pro',
    providerId: 'seedream',
    name: 'Seedream 5.0 Pro',
    description:
      'Professional product visuals, text rendering, and multi-reference edits.',
    resolution: '2K',
    credits: '10+ credits',
    duration: '15-90s',
    badge: 'NEW',
    sale: '-30%',
    loginRequired: true,
  },
  {
    id: 'seedream-5.0-lite',
    providerId: 'seedream',
    name: 'Seedream 5.0 Lite',
    description: 'Cinematic realism with web-aware references.',
    resolution: '3K',
    credits: '12+ credits',
    duration: '15-90s',
    loginRequired: true,
  },
  {
    id: 'seedream-4.5',
    providerId: 'seedream',
    name: 'Seedream 4.5',
    description: '2K / 4K generation and reference editing.',
    resolution: '4K',
    credits: '12+ credits',
    duration: '15-60s',
    loginRequired: true,
  },
  {
    id: 'seedream-4.0',
    providerId: 'seedream',
    name: 'Seedream 4.0',
    description:
      'Cost-efficient 1K / 2K / 4K generation and multi-reference editing.',
    resolution: '4K',
    credits: '8+ credits',
    duration: '15-60s',
    loginRequired: true,
  },
  {
    id: 'gpt-image-2',
    providerId: 'openai',
    name: 'GPT Image 2',
    description: 'Precise prompts, clean text, product shots.',
    resolution: '4K',
    credits: '4+ credits',
    duration: '15-90s',
    loginRequired: true,
  },
  {
    id: 'gpt-image-1.5',
    providerId: 'openai',
    name: 'GPT Image 1.5',
    description: 'Fast edits with multiple references.',
    resolution: '1K',
    credits: '7+ credits',
    duration: '15-60s',
    loginRequired: true,
  },
  {
    id: 'nano-banana-2-lite',
    providerId: 'google',
    name: 'Nano Banana 2 Lite',
    description: 'Fast 1K generation and editing for high-volume iteration.',
    credits: '11+ credits',
    duration: '~4s',
    badge: 'NEW',
    loginRequired: true,
  },
  {
    id: 'nano-banana-2',
    providerId: 'google',
    name: 'Nano Banana 2',
    description: 'Multi-reference edits with fast style control.',
    resolution: '4K',
    credits: '15+ credits',
    duration: '15-30s',
    loginRequired: true,
  },
  {
    id: 'nano-banana-pro',
    providerId: 'google',
    name: 'Nano Banana Pro',
    description: '4K renders and advanced image editing.',
    resolution: '4K',
    credits: '45+ credits',
    duration: '15-30s',
    loginRequired: true,
  },
  {
    id: 'nano-banana',
    providerId: 'google',
    name: 'Nano Banana',
    description: 'Lightweight Gemini edits for quick changes.',
    credits: '9+ credits',
    duration: '15-30s',
    loginRequired: true,
  },
];

const VIDEO_MODELS: GeneratorModel[] = [
  {
    id: 'seedance-1.0-turbo',
    providerId: 'seedance',
    name: 'Seedance 1.0 Turbo',
    description: 'Fast drafts with natural motion.',
    resolution: '480p',
    credits: '10+ credits',
    duration: '15-45s',
    free: true,
  },
  {
    id: 'seedance-2.0-mini',
    providerId: 'seedance',
    name: 'Seedance 2.0 Mini',
    description: 'Lower-cost drafts with rich reference control.',
    credits: '12+ credits',
    duration: '20-60s',
    badge: 'NEW',
    loginRequired: true,
  },
  {
    id: 'seedance-2.0',
    providerId: 'seedance',
    name: 'Seedance 2.0',
    description: 'Smooth motion and natural choreography.',
    credits: '20+ credits',
    duration: '30-90s',
    loginRequired: true,
  },
  {
    id: 'seedance-1.5-pro',
    providerId: 'seedance',
    name: 'Seedance 1.5 Pro',
    description: 'Higher fidelity motion and camera control.',
    credits: '18+ credits',
    duration: '25-75s',
    loginRequired: true,
  },
  {
    id: 'kling-3.0-turbo',
    providerId: 'kling',
    name: 'Kling 3.0 Turbo',
    description: 'Faster short-form text and first-frame video.',
    credits: '16+ credits',
    duration: '20-60s',
    badge: 'NEW',
    loginRequired: true,
  },
  {
    id: 'kling-3.0',
    providerId: 'kling',
    name: 'Kling 3.0',
    description: 'High-quality cinematic short clips.',
    credits: '22+ credits',
    duration: '30-90s',
    loginRequired: true,
  },
  {
    id: 'veo-3.1',
    providerId: 'google',
    name: 'Veo 3.1',
    description: 'Native audio, 4K output, cinematic realism.',
    resolution: '4K',
    credits: '40+ credits',
    duration: '45-120s',
    loginRequired: true,
  },
];

const DEFAULT_IMAGE_MODEL_ID = 'seedream-3.5';
const DEFAULT_VIDEO_MODEL_ID = 'seedance-1.0-turbo';

function findModel(mode: 'image' | 'video', id: string) {
  const list = mode === 'video' ? VIDEO_MODELS : IMAGE_MODELS;
  return list.find((m) => m.id === id) ?? list[0]!;
}

function providerIcon(mode: 'image' | 'video', providerId: string) {
  const list = mode === 'video' ? VIDEO_PROVIDERS : IMAGE_PROVIDERS;
  return list.find((p) => p.id === providerId)?.iconSrc ?? '';
}

type ModelPickerProps = {
  mode: 'image' | 'video';
  className?: string;
  /** Close sibling tip when opening */
  onOpen?: () => void;
};

export function ModelPicker({ mode, className, onOpen }: ModelPickerProps) {
  const isVideo = mode === 'video';
  const providers = isVideo ? VIDEO_PROVIDERS : IMAGE_PROVIDERS;
  const allModels = isVideo ? VIDEO_MODELS : IMAGE_MODELS;

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(
    isVideo ? DEFAULT_VIDEO_MODEL_ID : DEFAULT_IMAGE_MODEL_ID
  );
  const selected = useMemo(
    () => findModel(mode, selectedId),
    [mode, selectedId]
  );
  const [providerId, setProviderId] = useState(selected.providerId);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    const nextId = isVideo ? DEFAULT_VIDEO_MODEL_ID : DEFAULT_IMAGE_MODEL_ID;
    setSelectedId(nextId);
    setProviderId(findModel(mode, nextId).providerId);
  }, [isVideo, mode]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const models = allModels.filter((m) => m.providerId === providerId);
  const iconSrc = providerIcon(mode, selected.providerId);

  return (
    <div className={cn('relative', className)} ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next) onOpen?.();
            return next;
          });
        }}
        className={cn(
          'inline-flex h-7 max-w-[184px] min-w-0 shrink-0 items-center gap-2 rounded-lg border border-transparent',
          'text-secondary-foreground/88 bg-[rgba(94,96,104,0.3)] px-2 text-[12px] font-medium',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl transition-all duration-200',
          'hover:bg-[rgba(109,112,121,0.36)]',
          open && 'bg-[rgba(109,112,121,0.42)]'
        )}
      >
        <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/30">
          <img
            src={iconSrc}
            alt=""
            className="size-4 object-contain"
            width={16}
            height={16}
          />
        </span>
        <span className="min-w-0 truncate">{selected.name}</span>
        <ChevronDownIcon
          className={cn(
            'size-3.5 shrink-0 opacity-70 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {open ? (
        <div
          data-generator-control-dropdown-panel
          className="animate-in fade-in slide-in-from-bottom-1 absolute bottom-full left-0 z-[1000] mb-2 w-[min(90vw,590px)] max-w-[calc(100vw-1rem)] duration-200"
        >
          <div className="overflow-hidden rounded-[22px] bg-[rgba(41,30,23,0.992)] p-2 shadow-[0_40px_80px_-12px_rgba(0,0,0,0.66)] backdrop-blur-2xl">
            <div className="text-foreground/35 px-2 pt-1 pb-2 text-[10px] font-semibold tracking-[0.16em] uppercase">
              Models
            </div>
            <div className="grid h-[300px] grid-cols-[132px_minmax(0,1fr)] gap-2 sm:grid-cols-[156px_minmax(0,1fr)] md:grid-cols-[196px_minmax(0,1fr)]">
              {/* Providers */}
              <div className="flex h-full min-h-0 flex-col rounded-[16px] bg-[rgba(72,52,38,0.22)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.018)]">
                <div className="scrollbar-ui-thin min-h-0 flex-1 space-y-1.5 overflow-y-auto">
                  {providers.map((provider) => {
                    const active = provider.id === providerId;
                    return (
                      <button
                        key={provider.id}
                        type="button"
                        onClick={() => setProviderId(provider.id)}
                        className={cn(
                          'group flex w-full items-center rounded-[13px] border border-transparent px-2 py-1.5 text-left transition-all duration-200 outline-none',
                          active
                            ? 'text-foreground bg-[rgba(110,80,56,0.54)] shadow-[0_18px_32px_-28px_rgba(57,34,19,0.4),inset_0_1px_0_rgba(255,255,255,0.038)]'
                            : 'text-foreground/76 hover:text-foreground/90 bg-transparent hover:bg-[rgba(96,69,50,0.28)]'
                        )}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-white/10 bg-black/35">
                            <img
                              src={provider.iconSrc}
                              alt=""
                              className="h-[15px] w-[15px] object-contain"
                            />
                          </span>
                          <span className="min-w-0 flex-1 pr-1">
                            <span className="flex items-center gap-1.5 leading-tight">
                              <span className="text-foreground shrink-0 text-[12.5px] font-semibold">
                                {provider.name}
                              </span>
                              {provider.paid ? (
                                <span
                                  className="bg-primary text-primary-foreground inline-flex size-4 shrink-0 items-center justify-center rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                                  title="Paid model"
                                >
                                  <CrownIcon
                                    className="size-2.5"
                                    strokeWidth={2.4}
                                  />
                                </span>
                              ) : null}
                              {provider.tryFree ? (
                                <span className="bg-primary text-primary-foreground inline-flex shrink-0 items-center rounded-[5px] px-1 py-px text-[9px] font-bold tracking-[0.06em] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                                  Try free
                                </span>
                              ) : null}
                            </span>
                            <span className="text-foreground/45 mt-0.5 block text-[10.5px] leading-[1.25] break-words whitespace-normal">
                              {provider.description}
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Models */}
              <div className="scrollbar-ui-thin min-h-0 space-y-1.5 overflow-y-auto pr-0.5">
                {models.map((model) => {
                  const active = model.id === selectedId;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(model.id);
                        setOpen(false);
                      }}
                      className={cn(
                        'relative w-full overflow-hidden rounded-[13px] border border-transparent px-2 py-1.5 text-left transition-all duration-200 outline-none',
                        active
                          ? 'text-foreground bg-[rgba(110,80,56,0.54)] shadow-[inset_0_1px_0_rgba(255,255,255,0.038)]'
                          : 'text-foreground/76 hover:text-foreground/90 bg-transparent hover:bg-[rgba(96,69,50,0.28)]'
                      )}
                    >
                      <div className="relative flex items-start gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-white/10 bg-black/40">
                          <img
                            src={providerIcon(mode, model.providerId)}
                            alt=""
                            className="h-[15px] w-[15px] object-contain"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 flex-wrap items-center gap-1.5 leading-tight">
                            <span className="text-foreground max-w-full text-[12.5px] font-semibold break-words whitespace-normal">
                              {model.name}
                            </span>
                            {model.loginRequired ? (
                              <span className="bg-primary text-primary-foreground inline-flex size-4 shrink-0 items-center justify-center rounded-full">
                                <CrownIcon
                                  className="size-2.5"
                                  strokeWidth={2.4}
                                />
                              </span>
                            ) : null}
                            {model.badge ? (
                              <span className="bg-primary text-primary-foreground inline-flex items-center rounded-[5px] px-1.5 py-0.5 text-[8px] font-bold tracking-[0.04em]">
                                {model.badge}
                              </span>
                            ) : null}
                            {model.loginRequired ? (
                              <span className="bg-primary text-primary-foreground inline-flex items-center rounded-[5px] px-1.5 py-0.5 text-[8px] font-bold tracking-[0.04em]">
                                Login Required
                              </span>
                            ) : null}
                            {model.resolution ? (
                              <span className="text-foreground/70 inline-flex items-center rounded-[5px] bg-white/8 px-1.5 py-0.5 text-[8px] font-bold tracking-[0.04em]">
                                {model.resolution}
                              </span>
                            ) : null}
                            {model.sale ? (
                              <span className="inline-flex items-center rounded-[5px] bg-[#e05256] px-1.5 py-0.5 text-[8px] font-bold tracking-[0.04em] text-white">
                                {model.sale}
                              </span>
                            ) : null}
                          </span>
                          <span className="text-foreground/55 mt-0.5 block text-[11px] leading-snug">
                            {model.description}
                          </span>
                          <span className="text-foreground/42 mt-1 flex items-center gap-1.5 text-[10px]">
                            <span>{model.credits}</span>
                            <span>·</span>
                            <span>{model.duration}</span>
                          </span>
                        </span>
                      </div>
                    </button>
                  );
                })}
                {providerId === 'google' && !isVideo ? (
                  <p className="text-foreground/40 px-2 pt-1 pb-2 text-[10px] leading-relaxed">
                    Google models apply stricter checks to prompts and reference
                    images, so some sensitive content may not be generated.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
