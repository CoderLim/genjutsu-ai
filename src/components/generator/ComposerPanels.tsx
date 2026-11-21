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
  Check,
  Coins,
  ChevronDown,
  ChevronUp,
  Clock3,
  LayoutGrid,
  Monitor,
} from 'lucide-react';

import type {
  FieldValue,
  GeneratorModel,
  Workflow,
} from '@/modules/generator/types';
import { cn } from '@/lib/utils';
import {
  getGeneratorModelFamilyId,
  getGeneratorModelHighlights,
  groupGeneratorModels,
  getGeneratorModelChoices,
  generatorModelLabel,
  getGeneratorWorkflowChoices,
  isSameGeneratorModelChoice,
} from '@/modules/generator/model-families';
import { Switch } from '@/components/ui/switch';

const ACCENT = '#b04845';
const pillClass =
  'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-[rgba(20,17,18,0.043)] px-2 text-[12px] font-medium text-[rgba(18,15,16,0.85)] transition hover:bg-[rgba(20,17,18,0.07)] outline-none';
const accentSwitchClass =
  'data-checked:bg-[#b04845] data-unchecked:bg-[rgba(20,17,18,0.14)] h-4 w-7 data-[size=default]:h-4 data-[size=default]:w-7';

/**
 * Self-contained brand marks shared by the toolbar and both picker levels.
 * SVG keeps the menu fast and avoids relying on external logo URLs.
 */
function ModelBrandLogo({
  familyId,
  size = 'small',
}: {
  familyId: string;
  size?: 'small' | 'large' | 'toolbar';
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-[rgba(20,17,18,0.06)]',
        size === 'large' ? 'size-9' :
        size === 'toolbar' ? 'size-5 rounded-md shadow-none' : 'size-7 rounded-lg'
      )}
    >
      <svg viewBox="0 0 32 32" className={size === 'large' ? 'size-6' : 'size-5'} fill="none">
        {familyId === 'nano-banana' ? (
          <>
            <path d="M27.1 16.3c0-.88-.08-1.72-.23-2.54H16v4.57h6.22a5.3 5.3 0 0 1-2.31 3.48v3.02h3.93c2.3-2.11 3.26-5.17 3.26-8.53Z" fill="#4285F4" />
            <path d="M16 27.5c3.14 0 5.78-1.04 7.71-2.67l-3.8-3.02c-1.06.72-2.41 1.15-3.91 1.15-3 0-5.55-2.02-6.46-4.75H5.5v3.07A11.5 11.5 0 0 0 16 27.5Z" fill="#34A853" />
            <path d="M9.54 18.21a6.98 6.98 0 0 1 0-4.42v-3.07H5.5a11.5 11.5 0 0 0 0 10.56l4.04-3.07Z" fill="#FBBC05" />
            <path d="M16 9.04c1.69 0 3.21.58 4.4 1.73l3.5-3.5A10.94 10.94 0 0 0 16 4.5 11.5 11.5 0 0 0 5.5 10.72l4.04 3.07c.91-2.73 3.46-4.75 6.46-4.75Z" fill="#EA4335" />
          </>
        ) : familyId === 'seedance' ? (
          <>
            <path d="M5 8.5h3.8v17H5z" fill="#4068D9" />
            <path d="M11 13.5h3.8v9H11z" fill="#4B99ED" />
            <path d="M17 11h3.8v14H17z" fill="#14C9C4" />
            <path d="M23 6.5h3.8v15H23z" fill="#1AB9CD" />
          </>
        ) : familyId === 'minimax' ? (
          <>
            <path d="M5 13v6M9 8v16M13 12v8M17 4v24M21 11v10M25 8v16M29 13v6"
              stroke="#F93F7A" strokeWidth="2.35" strokeLinecap="round" />
          </>
        ) : familyId === 'kling' ? (
          <>
            <rect x="4" y="4" width="24" height="24" rx="7" fill="#1A1A25" />
            <path d="M11 10v12M21 10l-9 7 9 5"
              stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="22" cy="9" r="2.1" fill="#C1B9FF" />
          </>
        ) : familyId === 'flux' ? (
          <>
            <rect x="4" y="4" width="24" height="24" rx="7" fill="#171719" />
            <path d="M11 10h11M11 16h9M11 10v12"
              stroke="#FAFAFA" strokeWidth="3.1" strokeLinecap="square" />
          </>
        ) : (
          <circle cx="16" cy="16" r="9" stroke="#7B7580" strokeWidth="3" />
        )}
      </svg>
    </span>
  );
}

type OpenPanel = 'model' | 'settings' | 'workflow' | null;

/** Selected chip elevation — shared by aspect tiles and segmented options. */
const selectedChipShadow =
  'shadow-[0_2px_8px_rgba(24,14,16,0.08),0_0_0_1px_rgba(20,17,18,0.06)]';

function fieldDisplayLabel(name: string, fallback: string) {
  switch (name) {
    case 'aspectRatio':
      return 'Aspect Ratio';
    case 'outputCount':
      return 'Output Number';
    case 'resolution':
      return 'Resolution';
    case 'outputFormat':
      return 'Output Format';
    case 'duration':
      return 'Video Length';
    case 'quality':
      return 'Quality';
    default:
      return fallback;
  }
}

function formatFieldValue(name: string, value: FieldValue) {
  if (name === 'duration') return String(value) + 's';
  if (name === 'outputFormat') {
    const raw = String(value).toLowerCase();
    if (raw === 'jpeg' || raw === 'jpg') return 'JPG';
    if (raw === 'png') return 'PNG';
    if (raw === 'webp') return 'WebP';
  }
  return String(value);
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
  const max = 14;
  const scale = max / Math.max(safeW, safeH);
  const width = Math.max(7, Math.round(safeW * scale));
  const height = Math.max(7, Math.round(safeH * scale));
  return (
    <span
      className={cn(
        'block rounded-[2px] border-[1.5px]',
        active ? 'border-[rgb(18,15,16)]' : 'border-[rgba(18,15,16,0.35)]'
      )}
      style={{ width, height }}
    />
  );
}

/**
 * Shared Raphael-style segmented control.
 * Used for Output Number, Resolution, Output Format, Video Length, Quality —
 * identical chrome in Image and Video modes.
 */
function ComposerSegmentedField({
  label,
  values,
  current,
  format,
  onSelect,
}: {
  label: string;
  values: FieldValue[];
  current: FieldValue;
  format?: (value: FieldValue) => string;
  onSelect: (value: FieldValue) => void;
}) {
  return (
    <section className="p-0.5">
      <div className="mb-0.5 px-1 text-[10px] font-medium text-[rgb(102,92,95)]">
        {label}
      </div>
      <div className="flex flex-wrap gap-0.5 rounded-[11px] bg-[rgb(245,243,243)] p-0.5">
        {values.map((value) => {
          const active = current === value;
          return (
            <button
              key={String(value)}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(value)}
              className={cn(
                'min-h-8 min-w-9 flex-1 rounded-[9px] px-2.5 text-xs font-medium transition-all duration-200',
                active
                  ? cn('bg-white text-[rgb(18,15,16)]', selectedChipShadow)
                  : 'bg-transparent text-[rgba(18,15,16,0.65)] hover:text-[rgb(18,15,16)]'
              )}
            >
              {format ? format(value) : String(value)}
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Shared Raphael-style aspect ratio glyph grid. */
function ComposerAspectRatioField({
  label,
  values,
  current,
  onSelect,
}: {
  label: string;
  values: FieldValue[];
  current: FieldValue;
  onSelect: (value: FieldValue) => void;
}) {
  return (
    <section className="p-0.5">
      <div className="mb-0.5 px-1 text-[10px] font-medium text-[rgb(102,92,95)]">
        {label}
      </div>
      <div className="grid grid-cols-5 gap-0.5 sm:grid-cols-6">
        {values.map((value) => {
          const active = current === value;
          const ratio = String(value);
          return (
            <button
              key={ratio}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(value)}
              className={cn(
                'flex h-9 flex-col items-center justify-center gap-0.5 rounded-[10px] border border-transparent px-1 transition-all duration-200',
                active
                  ? cn('bg-white', selectedChipShadow)
                  : 'bg-transparent hover:bg-[rgba(20,17,18,0.04)]'
              )}
            >
              <AspectRatioGlyph ratio={ratio} active={active} />
              <span className="text-[10px] font-medium text-[rgba(18,15,16,0.75)]">
                {ratio}
              </span>
            </button>
          );
        })}
      </div>
    </section>
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
        'animate-in fade-in slide-in-from-bottom-1 absolute bottom-full left-0 z-[80] mb-2 overflow-hidden rounded-[20px] border border-[rgba(20,17,18,0.08)] bg-white shadow-[0_18px_48px_-18px_rgba(24,14,16,0.28),0_4px_14px_-6px_rgba(24,14,16,0.12)] duration-200',
        className
      )}
    >
      {children}
    </div>
  );
}

export function ComposerToolbar({
  models,
  model,
  workflow,
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
  onSelectWorkflow: (modelId: string, workflow: Workflow) => void;
  onSetParam: (name: string, value: FieldValue) => void;
  onFastChange: (checked: boolean) => void;
}) {
  const families = useMemo(() =>
    groupGeneratorModels(getGeneratorModelChoices(models, import.meta.env.DEV)), [models]);
  const workflowChoices = useMemo(
    () => getGeneratorWorkflowChoices(models, model),
    [models, model]
  );
  const selectedWorkflow = workflowChoices.find(
    item => item.modelId === model.id && item.workflow === workflow
  );
  const currentFamilyId = getGeneratorModelFamilyId(model.id);
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
          <ModelBrandLogo familyId={currentFamilyId} size="toolbar" />
          <span className="max-w-[150px] truncate">
            {generatorModelLabel(model)}
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
          className="w-[min(94vw,640px)]"
        >
          <div className="grid max-h-[min(70vh,440px)] grid-cols-[124px_minmax(0,1fr)] sm:grid-cols-[184px_minmax(0,1fr)]">
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
                      <ModelBrandLogo familyId={family.id} />
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
                        <span className="mt-0.5 block text-[11px] leading-snug text-[rgba(18,15,16,0.55)]">
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
                const selected = isSameGeneratorModelChoice(item, model);
                const highlights = getGeneratorModelHighlights(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (!selected) onSelectModel(item.id);
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
                    <span className="flex items-start gap-2.5">
                      <ModelBrandLogo familyId={getGeneratorModelFamilyId(item.id)} size="large" />
                      <span className="min-w-0 flex-1">
                        <span className="block pr-6 text-sm font-semibold text-[rgb(18,15,16)]">
                          {generatorModelLabel(item)}
                        </span>
                        <span className="mt-1 block text-[12px] leading-snug text-[rgba(18,15,16,0.58)]">
                          {highlights.description}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[rgba(18,15,16,0.58)]">
                      {highlights.startingCredits !== null ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                          <Coins className="size-3.5" />
                          From {highlights.startingCredits} credits
                        </span>
                      ) : !item.enabled ? (
                        <span>Preview · Pricing pending</span>
                      ) : null}
                      {highlights.capability ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                          <Monitor className="size-3.5" />
                          {highlights.capability}
                        </span>
                      ) : null}
                          {highlights.maxDuration !== null ? (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                              <Clock3 className="size-3.5" />
                              Up to {highlights.maxDuration}s
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </span>
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
            aria-label="Settings"
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
            {outputField ? (
              <>
                <span className="h-3.5 w-px bg-[rgba(20,17,18,0.12)]" />
                <span className="inline-flex items-center gap-1 px-1.5">
                  <LayoutGrid className="size-3 opacity-70" />
                  {String(params[outputField.name])}
                </span>
              </>
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
            <span className="px-1.5">
              {open === 'settings' ? (
                <ChevronUp className="size-3.5 opacity-60" />
              ) : (
                <ChevronDown className="size-3.5 opacity-60" />
              )}
            </span>
          </button>
          <PanelShell
            open={open === 'settings'}
            onClose={() => setOpen(null)}
            className="w-[min(calc(100vw-2rem),392px)] p-1.5"
          >
            <div className="space-y-0">
              {aspectField ? (
                <ComposerAspectRatioField
                  label={fieldDisplayLabel(aspectField.name, aspectField.label)}
                  values={aspectField.values}
                  current={params[aspectField.name]}
                  onSelect={(value) => onSetParam(aspectField.name, value)}
                />
              ) : null}

              {/*
                Shared ComposerSegmentedField chrome for both modes.
                Image order: Output Number → Resolution → Format
                Video order: Video Length → Resolution → Output Number
              */}
              {!durationField && outputField ? (
                <ComposerSegmentedField
                  label={fieldDisplayLabel(outputField.name, outputField.label)}
                  values={outputField.values}
                  current={params[outputField.name]}
                  format={(value) => formatFieldValue(outputField.name, value)}
                  onSelect={(value) => onSetParam(outputField.name, value)}
                />
              ) : null}

              {durationField ? (
                <ComposerSegmentedField
                  label={fieldDisplayLabel(
                    durationField.name,
                    durationField.label
                  )}
                  values={durationField.values}
                  current={params[durationField.name]}
                  format={(value) =>
                    formatFieldValue(durationField.name, value)
                  }
                  onSelect={(value) => onSetParam(durationField.name, value)}
                />
              ) : null}

              {resolutionField ? (
                <ComposerSegmentedField
                  label={fieldDisplayLabel(
                    resolutionField.name,
                    resolutionField.label
                  )}
                  values={resolutionField.values}
                  current={params[resolutionField.name]}
                  format={(value) =>
                    formatFieldValue(resolutionField.name, value)
                  }
                  onSelect={(value) => onSetParam(resolutionField.name, value)}
                />
              ) : null}

              {durationField && outputField ? (
                <ComposerSegmentedField
                  label={fieldDisplayLabel(outputField.name, outputField.label)}
                  values={outputField.values}
                  current={params[outputField.name]}
                  format={(value) => formatFieldValue(outputField.name, value)}
                  onSelect={(value) => onSetParam(outputField.name, value)}
                />
              ) : null}

              {otherFields.map((field) => (
                <ComposerSegmentedField
                  key={field.name}
                  label={fieldDisplayLabel(field.name, field.label)}
                  values={field.values}
                  current={params[field.name]}
                  format={(value) => formatFieldValue(field.name, value)}
                  onSelect={(value) => onSetParam(field.name, value)}
                />
              ))}
            </div>
          </PanelShell>
        </div>
      ) : null}

      {/* Workflow */}
      {workflowChoices.length > 1 ? (
        <div className="relative">
          <button
            type="button"
            data-composer-trigger="workflow"
            aria-expanded={open === 'workflow'}
            aria-label="Generation mode"
            onClick={() => toggle('workflow')}
            className={pillClass}
          >
            <span>{selectedWorkflow?.label ?? model.workflows[workflow]?.label ?? workflow}</span>
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
              {workflowChoices.map((item) => {
                const active = item.modelId === model.id && item.workflow === workflow;
                return (
                  <button
                    key={item.modelId + ':' + item.workflow}
                    type="button"
                    onClick={() => {
                      onSelectWorkflow(item.modelId, item.workflow);
                      setOpen(null);
                    }}
                    className={cn(
                      'block w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition',
                      active
                        ? 'border border-[rgba(176,72,69,0.35)] bg-[rgba(176,72,69,0.08)] text-[rgb(18,15,16)]'
                        : 'border border-transparent bg-[rgba(20,17,18,0.04)] text-[rgba(18,15,16,0.8)] hover:bg-[rgba(20,17,18,0.07)]'
                    )}
                  >
                    {item.label}
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
