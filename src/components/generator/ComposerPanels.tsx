import {
  Children,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ArrowRight,
  AudioWaveform,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Film,
  LayoutGrid,
  Ratio,
} from 'lucide-react';

import type {
  FieldValue,
  GeneratorModel,
  Workflow,
} from '@/modules/generator/types';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

const ACCENT = '#b04845';
const pillClass =
  'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-[rgba(20,17,18,0.043)] px-2 text-[12px] font-medium text-[rgba(18,15,16,0.85)] transition hover:bg-[rgba(20,17,18,0.07)] outline-none';
const accentSwitchClass =
  'data-checked:bg-[#b04845] data-unchecked:bg-[rgba(20,17,18,0.14)] h-4 w-7 data-[size=default]:h-4 data-[size=default]:w-7';

type OpenPanel = 'model' | 'settings' | 'workflow' | null;

type ModelFamily = {
  id: string;
  label: string;
  blurb: string;
  badge?: string;
  models: GeneratorModel[];
};

function shortModelName(name: string) {
  return name.replace(/\s*·\s*.*$/, '').trim();
}

function modelTitleParts(name: string) {
  const [brand, ...rest] = name.split(/\s*·\s*/);
  return { brand: brand?.trim() || name, variant: rest.join(' · ').trim() };
}

function modelFamilyId(model: GeneratorModel) {
  if (model.id.startsWith('seedance')) return 'seedance';
  if (model.id.startsWith('h3') || model.name.toLowerCase().includes('minimax'))
    return 'minimax';
  if (model.id.startsWith('flux')) return 'flux';
  return model.providerName.toLowerCase().replace(/\s+/g, '-');
}

function familyMeta(
  id: string
): Pick<ModelFamily, 'label' | 'blurb' | 'badge'> {
  switch (id) {
    case 'seedance':
      return {
        label: 'Seedance',
        blurb: 'Photo / text / reference video',
        badge: 'HOT',
      };
    case 'minimax':
      return { label: 'MiniMax', blurb: 'Native stereo audio', badge: '-70%' };
    case 'flux':
      return { label: 'FLUX', blurb: 'Image generation & edit' };
    default:
      return { label: id, blurb: 'Generation model' };
  }
}

function groupModels(models: GeneratorModel[]): ModelFamily[] {
  const map = new Map<string, GeneratorModel[]>();
  for (const model of models) {
    const id = modelFamilyId(model);
    const list = map.get(id) ?? [];
    list.push(model);
    map.set(id, list);
  }
  return [...map.entries()].map(([id, familyModels]) => ({
    id,
    ...familyMeta(id),
    models: familyModels,
  }));
}

function AspectRatioGlyph({
  ratio,
  active,
}: {
  ratio: string;
  active: boolean;
}) {
  const [w, h] = ratio.split(':').map(Number);
  const safeW = Number.isFinite(w) && w > 0 ? w : 1;
  const safeH = Number.isFinite(h) && h > 0 ? h : 1;
  const max = 22;
  const scale = max / Math.max(safeW, safeH);
  const width = Math.max(8, Math.round(safeW * scale));
  const height = Math.max(8, Math.round(safeH * scale));
  return (
    <span
      className={cn(
        'block rounded-[3px] border-2',
        active ? 'border-[rgb(18,15,16)]' : 'border-[rgba(18,15,16,0.35)]'
      )}
      style={{ width, height }}
    />
  );
}

function SegmentedTrack({
  values,
  current,
  format,
  onSelect,
}: {
  values: FieldValue[];
  current: FieldValue;
  format: (value: FieldValue) => string;
  onSelect: (value: FieldValue) => void;
}) {
  return (
    <div className="flex flex-wrap gap-0.5 rounded-2xl bg-[rgba(20,17,18,0.06)] p-0.5">
      {values.map((value) => {
        const active = current === value;
        return (
          <button
            key={String(value)}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(value)}
            className={cn(
              'min-w-9 rounded-full px-2.5 py-1.5 text-xs font-medium transition',
              active
                ? 'bg-white text-[rgb(18,15,16)] shadow-[0_1px_2px_rgba(20,17,18,0.12)] ring-1 ring-[rgba(20,17,18,0.06)]'
                : 'text-[rgba(18,15,16,0.65)] hover:text-[rgb(18,15,16)]'
            )}
          >
            {format(value)}
          </button>
        );
      })}
    </div>
  );
}

function PanelShell({
  open,
  onClose,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (ref.current?.contains(target)) return;
      // Keep open when clicking the matching toolbar trigger (handled by toggle).
      const trigger = (event.target as HTMLElement | null)?.closest?.(
        '[data-composer-trigger]'
      );
      if (trigger) return;
      onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      role="dialog"
      className={cn(
        'absolute bottom-[calc(100%+10px)] left-0 z-[80] overflow-hidden rounded-2xl border border-[rgba(20,17,18,0.08)] bg-white shadow-[0_18px_48px_-18px_rgba(24,14,16,0.28),0_4px_14px_-6px_rgba(24,14,16,0.12)]',
        className
      )}
    >
      {children}
    </div>
  );
}

function modelBlurb(model: GeneratorModel) {
  const workflow = model.workflows[model.defaultWorkflow];
  const slots = workflow?.slots ?? {};
  if (slots.startFrame && slots.endFrame)
    return 'Guide motion with start and end frames';
  if (slots.startFrame) return 'Animate a photo into video';
  if (slots.referenceImages && slots.referenceVideos)
    return 'Multimodal references with audio options';
  if (slots.referenceImages) return 'Multi-image reference control';
  if (Object.keys(slots).length === 0) return 'Text-to-video generation';
  return 'Generation model';
}

function modelMetaLine(model: GeneratorModel) {
  const fields = model.workflows[model.defaultWorkflow]?.fields ?? {};
  const resolution = fields.resolution?.options?.join(' / ') ?? '—';
  const duration = fields.duration
    ? `${fields.duration.min ?? fields.duration.default}-${fields.duration.max ?? fields.duration.default}s`
    : '—';
  return { resolution, duration };
}

export function ComposerToolbar({
  models,
  model,
  workflow,
  workflows,
  params,
  settingsFields,
  hasGenerateAudio,
  showFast,
  fastOn,
  onSelectModel,
  onSelectWorkflow,
  onSetParam,
  onFastChange,
}: {
  models: GeneratorModel[];
  model: GeneratorModel;
  workflow: Workflow;
  workflows: Workflow[];
  params: Record<string, FieldValue>;
  settingsFields: Array<{
    name: string;
    label: string;
    values: FieldValue[];
    kind: 'aspectRatio' | 'duration' | 'resolution' | 'outputCount' | 'other';
  }>;
  hasGenerateAudio: boolean;
  showFast: boolean;
  fastOn: boolean;
  onSelectModel: (id: string) => void;
  onSelectWorkflow: (workflow: Workflow) => void;
  onSetParam: (name: string, value: FieldValue) => void;
  onFastChange: (checked: boolean) => void;
}) {
  const families = useMemo(() => groupModels(models), [models]);
  const currentFamilyId = modelFamilyId(model);
  const [open, setOpen] = useState<OpenPanel>(null);
  const [familyId, setFamilyId] = useState(currentFamilyId);

  useEffect(() => {
    setFamilyId(currentFamilyId);
  }, [currentFamilyId]);

  const activeFamily =
    families.find((item) => item.id === familyId) ?? families[0];
  const aspectField = settingsFields.find(
    (item) => item.kind === 'aspectRatio'
  );
  const durationField = settingsFields.find((item) => item.kind === 'duration');
  const resolutionField = settingsFields.find(
    (item) => item.kind === 'resolution'
  );
  const outputField = settingsFields.find(
    (item) => item.kind === 'outputCount'
  );
  const otherFields = settingsFields.filter((item) => item.kind === 'other');

  function toggle(panel: OpenPanel) {
    setOpen((current) => (current === panel ? null : panel));
  }

  return (
    <div
      className="relative flex flex-wrap items-center gap-1.5 sm:gap-2"
      style={{ ['--composer-accent' as string]: ACCENT }}
    >
      {/* Model */}
      <div className="relative">
        <button
          type="button"
          data-composer-trigger="model"
          aria-expanded={open === 'model'}
          aria-label="Model"
          onClick={() => toggle('model')}
          className={pillClass}
        >
          <AudioWaveform className="size-3.5 text-[#e36c9a]" strokeWidth={2} />
          <span className="max-w-[150px] truncate">
            {shortModelName(model.name)}
          </span>
          {open === 'model' ? (
            <ChevronUp className="size-3.5 opacity-60" />
          ) : (
            <ChevronDown className="size-3.5 opacity-60" />
          )}
        </button>
        <PanelShell
          open={open === 'model'}
          onClose={() => setOpen(null)}
          className="w-[min(92vw,560px)]"
        >
          <div className="grid max-h-[min(70vh,420px)] grid-cols-[168px_minmax(0,1fr)]">
            <aside className="border-r border-[rgba(20,17,18,0.06)] bg-[rgba(20,17,18,0.02)] p-2">
              <p className="px-2 pt-1 pb-2 text-[10px] font-semibold tracking-[0.08em] text-[rgba(18,15,16,0.45)] uppercase">
                Models
              </p>
              <div className="space-y-1">
                {families.map((family) => {
                  const active = family.id === activeFamily?.id;
                  return (
                    <button
                      key={family.id}
                      type="button"
                      onClick={() => setFamilyId(family.id)}
                      className={cn(
                        'flex w-full items-start gap-2 rounded-xl px-2 py-2 text-left transition',
                        active
                          ? 'bg-[rgba(176,72,69,0.1)]'
                          : 'hover:bg-[rgba(20,17,18,0.04)]'
                      )}
                    >
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-[rgba(20,17,18,0.06)]">
                        <AudioWaveform className="size-3.5 text-[#e36c9a]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1">
                          <span className="truncate text-[13px] font-semibold text-[rgb(18,15,16)]">
                            {family.label}
                          </span>
                          {family.badge ? (
                            <span className="rounded bg-[var(--composer-accent,#b04845)] px-1 py-px text-[9px] font-bold text-white">
                              {family.badge}
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-[rgba(18,15,16,0.5)]">
                          {family.blurb}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>
            <div className="space-y-2 overflow-y-auto p-2.5">
              {(activeFamily?.models ?? []).map((item) => {
                const selected = item.id === model.id;
                const meta = modelMetaLine(item);
                const title = modelTitleParts(item.name);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectModel(item.id);
                      setOpen(null);
                    }}
                    className={cn(
                      'relative w-full rounded-2xl border px-3 py-3 text-left transition',
                      selected
                        ? 'border-[rgba(176,72,69,0.45)] bg-[rgba(176,72,69,0.06)]'
                        : 'border-transparent bg-[rgba(20,17,18,0.035)] hover:bg-[rgba(20,17,18,0.055)]'
                    )}
                  >
                    {selected ? (
                      <Check className="absolute top-3 right-3 size-4 text-[var(--composer-accent,#b04845)]" />
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2 pr-6">
                      <span className="text-sm font-semibold text-[rgb(18,15,16)]">
                        {title.brand}
                      </span>
                      {title.variant ? (
                        <span className="text-xs font-medium text-[rgba(18,15,16,0.55)]">
                          {title.variant}
                        </span>
                      ) : null}
                      {!item.enabled ? (
                        <span className="rounded bg-[rgba(20,17,18,0.75)] px-1.5 py-0.5 text-[9px] font-bold text-white">
                          PREVIEW
                        </span>
                      ) : (
                        <span className="rounded bg-[var(--composer-accent,#b04845)] px-1.5 py-0.5 text-[9px] font-bold text-white">
                          READY
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[rgba(18,15,16,0.55)]">
                      {modelBlurb(item)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[rgba(18,15,16,0.45)]">
                      <span className="inline-flex items-center gap-1">
                        <Ratio className="size-3" /> {meta.resolution}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Film className="size-3" /> {meta.duration}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="size-3" /> ~30–60s
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </PanelShell>
      </div>

      {/* Settings */}
      {settingsFields.length > 0 ? (
        <div className="relative">
          <button
            type="button"
            data-composer-trigger="settings"
            aria-expanded={open === 'settings'}
            aria-label="Video settings"
            onClick={() => toggle('settings')}
            className={cn(pillClass, 'gap-0 px-1')}
          >
            {aspectField ? (
              <span className="inline-flex items-center gap-1 px-1.5">
                <AspectRatioGlyph
                  ratio={String(params[aspectField.name] ?? '')}
                  active={false}
                />
                <span>{String(params[aspectField.name] ?? '')}</span>
              </span>
            ) : null}
            {durationField ? (
              <>
                <span className="h-3.5 w-px bg-[rgba(20,17,18,0.12)]" />
                <span className="inline-flex items-center gap-1 px-1.5">
                  <Clock3 className="size-3 opacity-70" />
                  {String(params[durationField.name])}s
                </span>
              </>
            ) : null}
            {resolutionField ? (
              <>
                <span className="h-3.5 w-px bg-[rgba(20,17,18,0.12)]" />
                <span className="px-1.5">
                  {String(params[resolutionField.name])}
                </span>
              </>
            ) : null}
            {outputField ? (
              <>
                <span className="h-3.5 w-px bg-[rgba(20,17,18,0.12)]" />
                <span className="inline-flex items-center gap-1 px-1.5">
                  <LayoutGrid className="size-3 opacity-70" />
                  {String(params[outputField.name])}
                  {open === 'settings' ? (
                    <ChevronUp className="size-3 opacity-60" />
                  ) : (
                    <ChevronDown className="size-3 opacity-60" />
                  )}
                </span>
              </>
            ) : (
              <span className="px-1.5">
                {open === 'settings' ? (
                  <ChevronUp className="size-3.5 opacity-60" />
                ) : (
                  <ChevronDown className="size-3.5 opacity-60" />
                )}
              </span>
            )}
          </button>
          <PanelShell
            open={open === 'settings'}
            onClose={() => setOpen(null)}
            className="w-[min(92vw,340px)] p-3.5"
          >
            {aspectField ? (
              <div className="mb-3.5">
                <p className="mb-2 text-xs text-[rgba(18,15,16,0.5)]">
                  {aspectField.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {aspectField.values.map((value) => {
                    const active = params[aspectField.name] === value;
                    return (
                      <button
                        key={String(value)}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onSetParam(aspectField.name, value)}
                        className={cn(
                          'flex min-w-[52px] flex-col items-center gap-1.5 rounded-xl px-2 py-2 transition',
                          active
                            ? 'bg-white shadow-[0_1px_3px_rgba(20,17,18,0.14)] ring-1 ring-[rgba(20,17,18,0.12)]'
                            : 'bg-[rgba(20,17,18,0.04)] hover:bg-[rgba(20,17,18,0.07)]'
                        )}
                      >
                        <AspectRatioGlyph
                          ratio={String(value)}
                          active={active}
                        />
                        <span className="text-[11px] font-medium text-[rgba(18,15,16,0.75)]">
                          {String(value)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {durationField ? (
              <div className="mb-3.5">
                <p className="mb-2 text-xs text-[rgba(18,15,16,0.5)]">
                  Video Length
                </p>
                <SegmentedTrack
                  values={durationField.values}
                  current={params[durationField.name]}
                  format={(value) => String(value) + 's'}
                  onSelect={(value) => onSetParam(durationField.name, value)}
                />
              </div>
            ) : null}

            {resolutionField ? (
              <div className="mb-3.5">
                <p className="mb-2 text-xs text-[rgba(18,15,16,0.5)]">
                  Resolution
                </p>
                <SegmentedTrack
                  values={resolutionField.values}
                  current={params[resolutionField.name]}
                  format={(value) => String(value)}
                  onSelect={(value) => onSetParam(resolutionField.name, value)}
                />
              </div>
            ) : null}

            {outputField ? (
              <div className={otherFields.length ? 'mb-3.5' : undefined}>
                <p className="mb-2 text-xs text-[rgba(18,15,16,0.5)]">
                  Output Count
                </p>
                <SegmentedTrack
                  values={outputField.values}
                  current={params[outputField.name]}
                  format={(value) => String(value)}
                  onSelect={(value) => onSetParam(outputField.name, value)}
                />
              </div>
            ) : null}

            {otherFields.map((field) => (
              <div key={field.name} className="mb-3 last:mb-0">
                <p className="mb-2 text-xs text-[rgba(18,15,16,0.5)]">
                  {field.label}
                </p>
                <SegmentedTrack
                  values={field.values}
                  current={params[field.name]}
                  format={(value) => String(value)}
                  onSelect={(value) => onSetParam(field.name, value)}
                />
              </div>
            ))}
          </PanelShell>
        </div>
      ) : null}

      {/* Workflow */}
      {workflows.length > 1 ? (
        <div className="relative">
          <button
            type="button"
            data-composer-trigger="workflow"
            aria-expanded={open === 'workflow'}
            aria-label="Generation mode"
            onClick={() => toggle('workflow')}
            className={pillClass}
          >
            <span>{model.workflows[workflow]?.label ?? workflow}</span>
            {open === 'workflow' ? (
              <ChevronUp className="size-3.5 opacity-60" />
            ) : (
              <ChevronDown className="size-3.5 opacity-60" />
            )}
          </button>
          <PanelShell
            open={open === 'workflow'}
            onClose={() => setOpen(null)}
            className="min-w-[160px] p-1.5"
          >
            <div className="space-y-1">
              {workflows.map((item) => {
                const active = item === workflow;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      onSelectWorkflow(item);
                      setOpen(null);
                    }}
                    className={cn(
                      'block w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition',
                      active
                        ? 'border border-[rgba(176,72,69,0.35)] bg-[rgba(176,72,69,0.08)] text-[rgb(18,15,16)]'
                        : 'border border-transparent bg-[rgba(20,17,18,0.04)] text-[rgba(18,15,16,0.8)] hover:bg-[rgba(20,17,18,0.07)]'
                    )}
                  >
                    {model.workflows[item]?.label ?? item}
                  </button>
                );
              })}
            </div>
          </PanelShell>
        </div>
      ) : null}

      {hasGenerateAudio ? (
        <label className={cn(pillClass, 'cursor-pointer gap-2 pr-1.5')}>
          <span>Sound</span>
          <Switch
            size="sm"
            checked={params.generateAudio === true}
            onCheckedChange={(checked) => onSetParam('generateAudio', checked)}
            aria-label="Sound"
            className={accentSwitchClass}
          />
        </label>
      ) : null}

      {showFast ? (
        <label className={cn(pillClass, 'cursor-pointer gap-2 pr-1.5')}>
          <span>Fast</span>
          <Switch
            size="sm"
            checked={fastOn}
            onCheckedChange={onFastChange}
            aria-label="Fast"
            className={accentSwitchClass}
          />
        </label>
      ) : null}
    </div>
  );
}

export function ComposerFrameSlots({
  showArrow,
  children,
}: {
  showArrow: boolean;
  children: ReactNode;
}) {
  const items = Children.toArray(children);
  if (!showArrow || items.length < 2) {
    return (
      <div className="flex shrink-0 gap-2 overflow-x-auto pb-0.5">
        {children}
      </div>
    );
  }
  return (
    <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto pb-0.5">
      {items.map((child, index) => (
        <div key={index} className="flex items-center gap-1.5">
          {child}
          {index < items.length - 1 ? (
            <ArrowRight className="size-3.5 shrink-0 text-[rgba(18,15,16,0.35)]" />
          ) : null}
        </div>
      ))}
    </div>
  );
}
