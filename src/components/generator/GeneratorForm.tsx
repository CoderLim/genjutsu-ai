import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clapperboard,
  Coins,
  Download,
  Image as ImageIcon,
  LoaderCircle,
} from 'lucide-react';

import {
  listGeneratorModels,
} from '@/modules/generator/catalog';
import {
  availableGeneratorFieldValues,
  getGeneratorExpansionControls,
  generatorReadinessError,
  getGeneratorSlotCapacity,
  isGeneratorJobActive,
  isGeneratorSlotOptional,
  shouldPollGeneratorJob,
} from '@/modules/generator/form-state';
import {
  createGeneratorState,
  normalizeGeneratorState,
  updateGeneratorState,
} from '@/modules/generator/normalize';
import { calculateGeneratorCredits } from '@/modules/generator/pricing';
import {
  assertReferenceAudioDuration,
  referenceVideoBillableSeconds,
} from '@/modules/generator/reference-metadata';
import {
  getWorkflowSpec,
  type FieldValue,
  type GeneratorInputs,
  type GeneratorModel,
  type GeneratorState,
  type MediaSlot,
  type MediaType,
  type Workflow,
} from '@/modules/generator/types';
import { assertGeneratorReady } from '@/modules/generator/validation';
import { ApiError, apiGet, apiPost, uploadToSignedUrl } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

import { ComposerFrameSlots, ComposerToolbar } from './ComposerPanels';
import { MediaUploader } from './MediaUploader';

const FIELD_ORDER = [
  'aspectRatio',
  'duration',
  'resolution',
  'outputCount',
  'quality',
  'style',
  'outputFormat',
  'promptExpansionMode',
  'generateAudio',
  'fastMode',
  'webSearch',
];

const SETTINGS_FIELD_KEYS = [
  'aspectRatio',
  'duration',
  'resolution',
  'outputCount',
] as const;

const COMPOSER_ACCENT = '#b04845';
const accentSwitchClass =
  'data-checked:bg-[#b04845] data-unchecked:bg-[rgba(20,17,18,0.14)] h-4 w-7 data-[size=default]:h-4 data-[size=default]:w-7';

function fieldValues(field: {
  options?: readonly FieldValue[];
  default: FieldValue;
  min?: number;
  max?: number;
  step?: number;
}): FieldValue[] {
  if (field.options?.length) return [...field.options];
  if (
    typeof field.default === 'number' &&
    field.min !== undefined &&
    field.max !== undefined
  ) {
    const step = field.step ?? 1;
    const values: number[] = [];
    for (let value = field.min; value <= field.max + 1e-9; value += step) {
      values.push(Number(value.toFixed(6)));
    }
    return values;
  }
  return [];
}

const SLOT_LABELS: Record<MediaSlot, string> = {
  startFrame: 'Start Frame',
  endFrame: 'End Frame',
  referenceImages: 'Reference Images',
  referenceVideos: 'Reference Videos',
  referenceAudio: 'Reference Audio',
};

const INPUT_SLOTS: MediaSlot[] = [
  'startFrame',
  'endFrame',
  'referenceImages',
  'referenceVideos',
  'referenceAudio',
];

type JobInfo = {
  generationId: string;
  status: 'processing' | 'completed' | 'failed' | 'review';
  pollable?: boolean;
  taskStatus: string;
  credits: number;
  mediaType: MediaType;
  model?: string;
  resultUrls: string[];
  error?: string | null;
};

type PriceChange = {
  credits: number;
  pricingVersion: string;
  generationId: string;
  uploadedState: GeneratorState;
};

type UploadDescriptor = {
  storageKey: string;
  uploadUrl: string;
  uploadHeaders: Record<string, string>;
};

function activeUrls(inputs: GeneratorInputs): string[] {
  return [
    inputs.startFrame,
    inputs.endFrame,
    ...inputs.referenceImages,
    ...inputs.referenceVideos,
    ...inputs.referenceAudio,
  ].filter((value): value is string => typeof value === 'string');
}

function slotUrls(inputs: GeneratorInputs, slot: MediaSlot): string[] {
  const value = inputs[slot];
  return typeof value === 'string'
    ? [value]
    : Array.isArray(value)
      ? value
      : [];
}

/** Browser metadata is for instant quote only; server rechecks sealed inputs. */
function mediaDurationFromBlobUrl(
  url: string,
  slot: MediaSlot
): Promise<number> {
  return new Promise((resolve, reject) => {
    const element = document.createElement(
      slot === 'referenceVideos' ? 'video' : 'audio'
    );
    element.preload = 'metadata';
    let settled = false;
    const cleanup = () => {
      element.removeAttribute('src');
      element.load();
      clearTimeout(timer);
    };
    const success = () => {
      if (settled) return;
      settled = true;
      const seconds = element.duration;
      cleanup();
      if (Number.isFinite(seconds) && seconds > 0) resolve(seconds);
      else
        reject(
          new Error('Unable to read media duration; use MP4, MOV, WAV or M4A')
        );
    };
    const failure = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(
        new Error('Unable to read media duration; use MP4, MOV, WAV or M4A')
      );
    };
    const timer = setTimeout(failure, 12000);
    element.addEventListener('loadedmetadata', success, { once: true });
    element.addEventListener('error', failure, { once: true });
    element.src = url;
    element.load();
  });
}

export function GeneratorForm({
  mediaType: initialMediaType,
  initialModelId,
}: {
  mediaType: MediaType;
  initialModelId?: string;
}) {
  // Image / Video tabs switch inside the composer — no route navigation.
  const [mediaType, setMediaType] = useState<MediaType>(initialMediaType);
  useEffect(() => {
    setMediaType(initialMediaType);
  }, [initialMediaType]);

  // The model menu spans both media types. Selecting a model also switches the
  // Image/Video tab; workflow is independent, not a sidebar model category.
  // A model without a verified endpoint/price must never look selectable,
  // including in local development. Server validation remains authoritative.
  const allModels = useMemo(() => listGeneratorModels(), []);
  const initialModel = useMemo(
    () => allModels.find(item => item.id === initialModelId &&
      item.mediaType === initialMediaType) ??
      allModels.find(item => item.id === (
        initialMediaType === 'image' ? 'nano-banana-2' : 'photo-to-video-standard'
      )) ??
      allModels.find(item => item.mediaType === initialMediaType),
    [allModels, initialMediaType, initialModelId]
  );
  const [draft, setDraft] = useState<GeneratorState | null>(() =>
    initialModel ? createGeneratorState(initialModel) : null
  );
  const [uploadError, setUploadError] = useState('');
  const [pageError, setPageError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [mediaBusy, setMediaBusy] = useState(false);
  const mediaReadLock = useRef(false);
  const mediaDurations = useRef(new Map<string, number>());
  const [job, setJob] = useState<JobInfo | null>(null);
  const [priceChange, setPriceChange] = useState<PriceChange | null>(null);
  const [retryAttempt, setRetryAttempt] = useState<PriceChange | null>(null);
  // Synchronous guard; React busy state alone may not block same-tick clicks.
  const submitLock = useRef(false);

  const localFiles = useRef(new Map<string, File>());

  const model =
    allModels.find((item) => item.id === draft?.modelId) ?? initialModel;
  const form =
    model && draft?.modelId === model.id
      ? draft
      : model
        ? createGeneratorState(model)
        : null;

  // Only URL-provided defaults reset the form. Internal model switches must
  // not be overwritten by an effect watching the selected media tab.
  useEffect(() => {
    setMediaType(initialMediaType);
    setDraft(initialModel ? createGeneratorState(initialModel) : null);
    setPageError('');
    setPriceChange(null);
    setRetryAttempt(null);
  }, [initialMediaType, initialModel]);

  // Revoke stale blob URLs as soon as a model/workflow switch drops the asset.
  useEffect(() => {
    const referenced = new Set(draft ? activeUrls(draft.inputs) : []);
    for (const url of localFiles.current.keys()) {
      if (!referenced.has(url)) {
        URL.revokeObjectURL(url);
        localFiles.current.delete(url);
        mediaDurations.current.delete(url);
      }
    }
  }, [draft]);

  useEffect(
    () => () => {
      for (const url of localFiles.current.keys()) URL.revokeObjectURL(url);
      localFiles.current.clear();
      mediaDurations.current.clear();
    },
    []
  );

  const spec = model && form ? getWorkflowSpec(model, form.workflow) : null;
  const quote = useMemo(() => {
    if (!form || !model) return null;
    try {
      return calculateGeneratorCredits(form, model);
    } catch {
      return null;
    }
  }, [form, model]);

  // The result is always fetched from an authenticated, scene-scoped route.
  useEffect(() => {
    const generationId = job?.generationId;
    if (!generationId || !shouldPollGeneratorJob(job)) return;
    let canceled = false;
    const handle = setInterval(async () => {
      try {
        const status = await apiGet<JobInfo>(
          '/api/generator/status?generationId=' +
            encodeURIComponent(generationId)
        );
        if (!canceled)
          setJob((current) =>
            current?.generationId === status.generationId ? status : current
          );
      } catch (error) {
        if (!canceled) console.warn('Generator status retry', error);
      }
    }, 4500);
    return () => {
      canceled = true;
      clearInterval(handle);
    };
  }, [job?.generationId, job?.status, job?.pollable]);

  function syncReferenceQuote(
    next: GeneratorState,
    target: GeneratorModel
  ): GeneratorState {
    if (!target.workflows[next.workflow]?.fields.inputVideoSeconds) return next;
    const durations = next.inputs.referenceVideos.map((url) => {
      const seconds = mediaDurations.current.get(url);
      if (seconds === undefined)
        throw new Error('Missing reference video duration');
      return seconds;
    });
    const billable = referenceVideoBillableSeconds(durations);
    return updateGeneratorState(next, target, {
      params: { inputVideoSeconds: billable },
    });
  }

  function mutate(
    patch: Partial<Omit<GeneratorState, 'modelId' | 'mediaType'>>,
    nextModel?: GeneratorModel
  ) {
    if (busy || mediaReadLock.current || submitLock.current) return;
    setPageError('');
    setPriceChange(null);
    setRetryAttempt(null);
    setDraft((prev) =>
      prev && (nextModel ?? model)
        ? syncReferenceQuote(
            updateGeneratorState(prev, nextModel ?? model!, patch),
            nextModel ?? model!
          )
        : prev
    );
  }

  function setWorkflow(modelId: string, workflow: Workflow) {
    if (busy || mediaReadLock.current || submitLock.current) return;
    const nextModel = allModels.find(item => item.id === modelId);
    if (!nextModel || !nextModel.workflows[workflow]) return;
    setUploadError('');
    if (nextModel.id === model?.id) {
      mutate({ workflow });
      return;
    }
    setPageError('');
    setPriceChange(null);
    setRetryAttempt(null);
    setMediaType(nextModel.mediaType);
    // One atomic state transition: mode and real backend profile change
    // together, so media/params and the displayed price stay consistent.
    setDraft(prev => prev
      ? syncReferenceQuote(normalizeGeneratorState(prev, nextModel, workflow), nextModel)
      : createGeneratorState(nextModel)
    );
  }

  function setParam(name: string, value: FieldValue) {
    mutate({ params: { [name]: value } });
  }

  function setModel(modelId: string) {
    if (busy || mediaReadLock.current || submitLock.current) return;
    const next = allModels.find((item) => item.id === modelId);
    if (!next) return;
    setUploadError('');
    setPageError('');
    setPriceChange(null);
    setRetryAttempt(null);
    setMediaType(next.mediaType);
    setDraft((prev) =>
      prev
        ? syncReferenceQuote(normalizeGeneratorState(prev, next), next)
        : createGeneratorState(next)
    );
  }

  async function onFiles(slot: MediaSlot, files: File[]) {
    if (!spec || !form || busy || mediaReadLock.current || submitLock.current)
      return;
    const rule = spec.slots[slot];
    if (!rule) return;
    const available = getGeneratorSlotCapacity(spec, form.inputs, slot);
    if (available <= 0) {
      setUploadError('The reference upload limit has been reached.');
      return;
    }
    const accepted = files.slice(0, available);
    const invalid = accepted.find(
      (file) =>
        !rule.accept.includes(file.type) ||
        (rule.maxBytes !== undefined && file.size > rule.maxBytes)
    );
    if (invalid) {
      setUploadError('Unsupported file type or size: ' + invalid.name);
      return;
    }

    mediaReadLock.current = true;
    setMediaBusy(true);
    const urls: string[] = [];
    const durations = new Map<string, number>();
    try {
      for (const file of accepted) {
        const url = URL.createObjectURL(file);
        urls.push(url);
        if (slot === 'referenceVideos' || slot === 'referenceAudio') {
          const seconds = await mediaDurationFromBlobUrl(url, slot);
          if (
            (rule.minSeconds !== undefined && seconds < rule.minSeconds) ||
            (rule.maxSeconds !== undefined && seconds > rule.maxSeconds)
          ) {
            throw new Error('Reference media duration exceeds model limits');
          }
          durations.set(url, seconds);
        }
      }
      // Validate combined durations before adding the files to the form.
      if (slot === 'referenceVideos') {
        referenceVideoBillableSeconds([
          ...form.inputs.referenceVideos.map(
            (url) => mediaDurations.current.get(url) ?? NaN
          ),
          ...urls.map((url) => durations.get(url) ?? NaN),
        ]);
      }
      if (slot === 'referenceAudio') {
        assertReferenceAudioDuration([
          ...form.inputs.referenceAudio.map(
            (url) => mediaDurations.current.get(url) ?? NaN
          ),
          ...urls.map((url) => durations.get(url) ?? NaN),
        ]);
      }
      for (let i = 0; i < urls.length; i++) {
        localFiles.current.set(urls[i], accepted[i]);
        if (durations.has(urls[i])) {
          mediaDurations.current.set(urls[i], durations.get(urls[i])!);
        }
      }
      setUploadError('');
      setPageError('');
      setPriceChange(null);
      setRetryAttempt(null);
      setDraft((prev) => {
        if (!prev) return null;
        const inputs = { ...prev.inputs };
        if (slot === 'startFrame' || slot === 'endFrame') {
          inputs[slot] = urls[0] ?? null;
        } else {
          inputs[slot] = [...inputs[slot], ...urls];
        }
        return syncReferenceQuote(
          updateGeneratorState(prev, model!, { inputs }),
          model!
        );
      });
    } catch (error) {
      for (const url of urls) URL.revokeObjectURL(url);
      setUploadError(
        error instanceof Error
          ? error.message
          : 'Could not read the uploaded media'
      );
    } finally {
      mediaReadLock.current = false;
      setMediaBusy(false);
    }
  }

  function removeFile(slot: MediaSlot, url: string) {
    if (!model) return;
    mutate({
      inputs: {
        ...form!.inputs,
        ...(slot === 'startFrame' || slot === 'endFrame'
          ? { [slot]: null }
          : { [slot]: slotUrls(form!.inputs, slot).filter((x) => x !== url) }),
      },
    });
  }

  async function uploadAssets(state: GeneratorState, generationId: string) {
    const inputs: GeneratorInputs = {
      startFrame: null,
      endFrame: null,
      referenceImages: [],
      referenceVideos: [],
      referenceAudio: [],
    };
    let lastUploadDescriptorAt = 0;
    for (const slot of INPUT_SLOTS) {
      const uploaded: string[] = [];
      for (const url of slotUrls(state.inputs, slot)) {
        const file = localFiles.current.get(url);
        if (!file)
          throw new Error(
            'Reference media is missing. Please upload it again.'
          );
        // The upload preflight API rate-limits per user/path; space rapid
        // multi-image uploads while retaining retryable signed uploads.
        const gap = 360 - (Date.now() - lastUploadDescriptorAt);
        if (gap > 0) await new Promise((resolve) => setTimeout(resolve, gap));
        const descriptor = await apiPost<UploadDescriptor>(
          '/api/generator/upload-url',
          {
            modelId: state.modelId,
            workflow: state.workflow,
            slot,
            generationId,
            contentType: file.type,
            contentLength: file.size,
          }
        );
        lastUploadDescriptorAt = Date.now();
        await uploadToSignedUrl({
          url: descriptor.uploadUrl,
          file,
          headers: descriptor.uploadHeaders,
        });
        uploaded.push(descriptor.storageKey);
      }
      if (slot === 'startFrame' || slot === 'endFrame')
        inputs[slot] = uploaded[0] ?? null;
      else inputs[slot] = uploaded;
    }
    return { ...state, inputs };
  }

  async function submitGeneration(
    generationId: string,
    state: GeneratorState,
    credits: number,
    pricingVersion: string
  ) {
    setStage('Submitting generation...');
    return apiPost<JobInfo>('/api/generator/generate', {
      generationId,
      state,
      pricingVersion,
      maxAcceptedCredits: credits,
    });
  }

  function handleSubmitError(
    error: unknown,
    generationId: string,
    uploadedState: GeneratorState
  ) {
    if (
      error instanceof ApiError &&
      error.data &&
      typeof error.data === 'object'
    ) {
      const details = error.data as Record<string, unknown>;
      if (
        details.code === 'PRICE_CHANGED' &&
        typeof details.credits === 'number' &&
        typeof details.pricingVersion === 'string'
      ) {
        setPriceChange({
          credits: details.credits,
          pricingVersion: details.pricingVersion,
          generationId,
          uploadedState,
        });
        setPageError(
          'The price has changed. Review and confirm the updated credits below.'
        );
        return;
      }
      if (details.code === 'INSUFFICIENT_CREDITS') {
        setPageError('Not enough credits. Add credits in Pricing to continue.');
        return;
      }
    }
    setPageError(error instanceof Error ? error.message : 'Generation failed');
  }

  async function onGenerate() {
    if (
      !form ||
      !model ||
      !quote ||
      busy ||
      mediaBusy ||
      submitLock.current ||
      isGeneratorJobActive(job)
    )
      return;
    try {
      assertGeneratorReady(form, model);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Please check your inputs'
      );
      return;
    }
    submitLock.current = true;
    setBusy(true);
    setPageError('');
    setPriceChange(null);
    setJob(null);

    // Preserve the generation ID AND sealed-bound staging keys when a request
    // may have reached the server but the browser missed the response.
    const attempt = retryAttempt;
    const generationId = attempt?.generationId ?? crypto.randomUUID();
    let uploadedState = attempt?.uploadedState ?? form;
    try {
      if (!attempt) {
        setStage('Uploading reference media...');
        uploadedState = await uploadAssets(form, generationId);
        setRetryAttempt({
          generationId,
          uploadedState,
          credits: quote.credits,
          pricingVersion: quote.pricingVersion,
        });
      }
      const response = await submitGeneration(
        generationId,
        uploadedState,
        attempt?.credits ?? quote.credits,
        attempt?.pricingVersion ?? quote.pricingVersion
      );
      setJob(response);
      setRetryAttempt(null);
      setStage('');
    } catch (error) {
      handleSubmitError(error, generationId, uploadedState);
      setStage('');
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }

  async function onConfirmPrice() {
    if (!priceChange || busy || submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    setPageError('');
    try {
      const response = await submitGeneration(
        priceChange.generationId,
        priceChange.uploadedState,
        priceChange.credits,
        priceChange.pricingVersion
      );
      setJob(response);
      setPriceChange(null);
      setRetryAttempt(null);
      setStage('');
    } catch (error) {
      handleSubmitError(
        error,
        priceChange.generationId,
        priceChange.uploadedState
      );
      setStage('');
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }

  if (!model || !form || !spec) {
    return (
      <div className="rounded-[22px] border border-[rgba(20,17,18,0.086)] bg-white p-6 text-center shadow-[0_24px_60px_-18px_rgba(24,14,16,0.09),0_6px_18px_-6px_rgba(24,14,16,0.04)] sm:p-10">
        <AlertCircle className="mx-auto mb-3 size-6 text-[rgba(18,15,16,0.45)]" />
        <h2 className="font-semibold text-[rgb(18,15,16)]">
          Generator integration in progress
        </h2>
        <p className="mt-2 text-sm text-[rgba(18,15,16,0.55)]">
          No generation models are available for this media type.
        </p>
      </div>
    );
  }

  const readinessError = generatorReadinessError(form, model);
  // A review state may represent an upstream-accepted task with no response.
  // Never offer a new same-form submission while that task is unresolved.
  const canSubmit =
    model.enabled &&
    !!quote &&
    !readinessError &&
    !busy &&
    !mediaBusy &&
    !isGeneratorJobActive(job);
  const activeSlots = INPUT_SLOTS.filter((slot) => !!spec.slots[slot]);
  const settingsFields = [
    ...SETTINGS_FIELD_KEYS.filter((key) => {
      const field = spec.fields[key];
      return !!field && !field.internal;
    }).map((name) => {
      const field = spec.fields[name]!;
      return {
        name,
        label: field.label,
        values: availableGeneratorFieldValues(
          spec,
          form.params,
          name,
          fieldValues(field)
        ),
        kind: name as 'aspectRatio' | 'duration' | 'resolution' | 'outputCount',
      };
    }),
    ...Object.entries(spec.fields)
      .filter(
        ([name, field]) =>
          !field.internal &&
          typeof field.default !== 'boolean' &&
          !(SETTINGS_FIELD_KEYS as readonly string[]).includes(name) &&
          name !== 'promptExpansionMode' &&
          fieldValues(field).length > 0
      )
      .sort(([left], [right]) => {
        const l = FIELD_ORDER.indexOf(left);
        const r = FIELD_ORDER.indexOf(right);
        return (l < 0 ? 100 : l) - (r < 0 ? 100 : r);
      })
      .map(([name, field]) => ({
        name,
        label: field.label,
        values: availableGeneratorFieldValues(
          spec,
          form.params,
          name,
          fieldValues(field)
        ),
        kind: 'other' as const,
      })),
  ].filter((field) => field.values.length > 0);
  const hasGenerateAudio =
    !!spec.fields.generateAudio && !spec.fields.generateAudio.internal;
  const hasFastMode = !!spec.fields.fastMode && !spec.fields.fastMode.internal;
  const hasPromptExpansion =
    !!spec.fields.promptExpansionMode &&
    !spec.fields.promptExpansionMode.internal;
  const expansionOptions = spec.fields.promptExpansionMode?.options ?? [];
  const expansionControls = getGeneratorExpansionControls(spec);
  const showEnhance = hasPromptExpansion && expansionControls.enhance;
  const showFast = hasFastMode || expansionControls.fast;
  const enhanceOn =
    hasPromptExpansion && form.params.promptExpansionMode !== 'disabled';
  const fastOn = hasFastMode
    ? form.params.fastMode === true
    : form.params.promptExpansionMode === 'fast';
  const creditLabel = model.enabled && quote ? quote.credits : '—';
  const isStartEnd =
    activeSlots.includes('startFrame') && activeSlots.includes('endFrame');

  function onEnhanceChange(checked: boolean) {
    if (!hasPromptExpansion) return;
    if (!checked) {
      setParam('promptExpansionMode', 'disabled');
      return;
    }
    setParam('promptExpansionMode', 'balanced');
  }

  function onFastChange(checked: boolean) {
    if (hasFastMode) {
      setParam('fastMode', checked);
      return;
    }
    if (!hasPromptExpansion || !expansionOptions.includes('fast')) return;
    setParam(
      'promptExpansionMode',
      checked ? 'fast' : enhanceOn ? 'balanced' : 'disabled'
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1128px]">
      <section
        className="relative z-10 overflow-visible rounded-[22px] border border-[rgba(20,17,18,0.086)] bg-white px-2 pt-0.5 pb-2 text-[rgb(18,15,16)] shadow-[0_24px_60px_-18px_rgba(24,14,16,0.09),0_6px_18px_-6px_rgba(24,14,16,0.04)]"
        style={{ ['--composer-accent' as string]: COMPOSER_ACCENT }}
      >
        {/* Header: Image / Video tabs + AI Enhance */}
        <div className="flex items-center justify-between gap-3 px-1">
          <nav aria-label="Generator type" className="flex items-stretch gap-1">
            {[
              { type: 'image' as const, label: 'Image', Icon: ImageIcon },
              { type: 'video' as const, label: 'Video', Icon: Clapperboard },
            ].map(({ type, label, Icon }) => {
              const active = mediaType === type;
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={active}
                  disabled={busy || mediaBusy || submitLock.current}
                  onClick={() => {
                    if (
                      busy ||
                      mediaBusy ||
                      submitLock.current ||
                      mediaType === type
                    )
                      return;
                    const next = allModels.find(item => item.id ===
                      (type === 'image' ? 'nano-banana-2' : 'photo-to-video-standard')) ??
                      allModels.find(item => item.mediaType === type);
                    if (next) setModel(next.id);
                  }}
                  className={cn(
                    'relative inline-flex h-11 items-center gap-2 px-1 text-sm font-medium transition disabled:opacity-50',
                    active
                      ? 'text-[rgb(18,15,16)] after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5 after:rounded-full after:bg-[var(--composer-accent,#b04845)]'
                      : 'text-[rgb(102,92,95)] hover:text-[rgb(18,15,16)]'
                  )}
                >
                  <Icon className="size-4 opacity-80" strokeWidth={1.75} />
                  {label}
                </button>
              );
            })}
          </nav>

          {showEnhance ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[rgba(18,15,16,0.78)]">
              <span className="hidden sm:inline">AI Enhance</span>
              <Switch
                size="sm"
                checked={!!enhanceOn}
                onCheckedChange={onEnhanceChange}
                aria-label="AI Enhance"
                className={accentSwitchClass}
              />
            </label>
          ) : null}
        </div>

        {/* Body: reference + prompt */}
        <div className="mt-1 flex flex-col gap-3 px-1 sm:flex-row sm:items-stretch">
          {activeSlots.length > 0 ? (
            <ComposerFrameSlots showArrow={isStartEnd}>
              {activeSlots.map((slot) => {
                const limit = spec.slots[slot]!;
                const optional = isGeneratorSlotOptional(spec, slot);
                const emptyLabel = SLOT_LABELS[slot];
                const capacity = getGeneratorSlotCapacity(
                  spec,
                  form.inputs,
                  slot
                );
                return (
                  <MediaUploader
                    key={slot}
                    variant="composer"
                    optional={optional}
                    label={emptyLabel}
                    urls={slotUrls(form.inputs, slot)}
                    max={slotUrls(form.inputs, slot).length + capacity}
                    accept={limit.accept}
                    onFiles={(files) => onFiles(slot, files)}
                    onRemove={(url) => removeFile(slot, url)}
                  />
                );
              })}
            </ComposerFrameSlots>
          ) : null}

          <div className="relative min-h-[96px] min-w-0 flex-1">
            <label htmlFor="generator-prompt" className="sr-only">
              Prompt
            </label>
            <textarea
              id="generator-prompt"
              rows={4}
              maxLength={model.maxPromptChars ?? 50000}
              placeholder={
                'Describe the ' + mediaType + ' you want to generate...'
              }
              value={form.prompt}
              onChange={(event) => mutate({ prompt: event.target.value })}
              className="h-full min-h-[96px] w-full resize-none border-0 bg-transparent p-0 text-sm leading-6 text-[rgb(18,15,16)] outline-none placeholder:px-0.5 placeholder:text-[rgba(18,15,16,0.38)] focus-visible:ring-0"
            />
          </div>
        </div>

        {mediaBusy ? (
          <p className="px-1 pt-1 text-xs text-[rgba(18,15,16,0.55)]">
            Reading media duration for accurate credits...
          </p>
        ) : null}
        {uploadError ? (
          <p role="alert" className="px-1 pt-1 text-xs text-red-600">
            {uploadError}
          </p>
        ) : null}

        {/* Toolbar */}
        <div className="mt-1.5 flex flex-col gap-2 px-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:gap-2">
            <ComposerToolbar
              models={allModels.filter(item => item.mediaType === mediaType)}
              model={model}
              workflow={form.workflow}
              params={form.params}
              settingsFields={settingsFields}
              hasGenerateAudio={hasGenerateAudio}
              showFast={showFast}
              fastOn={!!fastOn}
              onSelectModel={setModel}
              onSelectWorkflow={setWorkflow}
              onSetParam={setParam}
              onFastChange={onFastChange}
            />
            {!!spec.fields.webSearch && !spec.fields.webSearch.internal ? (
              <label className="inline-flex h-7 cursor-pointer items-center gap-2 rounded-full bg-[rgba(20,17,18,0.043)] px-2 text-[12px] font-medium text-[rgba(18,15,16,0.85)]">
                <span>Web Search</span>
                <Switch
                  size="sm"
                  checked={form.params.webSearch === true}
                  onCheckedChange={(checked) => setParam('webSearch', checked)}
                  aria-label="Web Search"
                  className={accentSwitchClass}
                />
              </label>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
            {priceChange ? (
              <button
                type="button"
                disabled={busy}
                onClick={onConfirmPrice}
                className="h-8 rounded-full border border-[var(--composer-accent,#b04845)] px-3 text-xs font-semibold text-[var(--composer-accent,#b04845)]"
              >
                Confirm · {priceChange.credits}
              </button>
            ) : null}
            <button
              type="button"
              disabled={!canSubmit}
              onClick={onGenerate}
              className={cn(
                'relative inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-semibold tracking-wide transition-[transform,opacity,background-color,color] duration-150 active:scale-95 sm:w-auto',
                canSubmit
                  ? 'bg-[var(--composer-accent,#b04845)] text-white hover:brightness-95'
                  : 'cursor-not-allowed bg-[rgba(20,17,18,0.07)] text-[rgba(20,17,18,0.34)]'
              )}
            >
              {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
              <span>
                {busy
                  ? stage || 'Working...'
                  : !model.enabled
                    ? 'Preview only'
                    : retryAttempt
                      ? 'Retry'
                      : 'Generate'}
              </span>
              {!busy && model.enabled ? (
                <span className="inline-flex items-center gap-0.5 tabular-nums opacity-90">
                  <Coins className="size-3.5" />
                  {creditLabel}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {pageError ? (
          <p role="alert" className="px-1 pt-2 text-xs text-red-600">
            {pageError}
          </p>
        ) : readinessError && model.enabled && form.prompt.trim() ? (
          <p className="px-1 pt-2 text-xs text-[rgba(18,15,16,0.55)]">
            {readinessError}
          </p>
        ) : null}
      </section>

      {job ? (
        <div className="mt-5 space-y-4 rounded-[18px] border border-[rgba(20,17,18,0.086)] bg-white p-4 shadow-[0_12px_32px_-16px_rgba(24,14,16,0.08)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Latest generation</h2>
            <span className="text-xs text-[rgba(18,15,16,0.45)]">
              {job.generationId.slice(0, 8)}
            </span>
          </div>
          {job.status === 'processing' ? (
            <p className="flex items-center gap-2 text-sm text-[rgba(18,15,16,0.55)]">
              <LoaderCircle className="size-4 animate-spin" />
              Generating and saving your {mediaType}... You can also follow it
              in My Creations.
            </p>
          ) : job.status === 'completed' ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-green-600" /> Generation
                completed
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {job.resultUrls.map((url, index) => (
                  <div
                    key={url}
                    className="overflow-hidden rounded-xl border border-[rgba(20,17,18,0.086)]"
                  >
                    {mediaType === 'video' ? (
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        src={url}
                        className="aspect-video w-full bg-black object-contain"
                      />
                    ) : (
                      <img
                        src={url}
                        alt={'Generated image ' + (index + 1)}
                        className="aspect-video w-full bg-[rgba(20,17,18,0.04)] object-contain"
                      />
                    )}
                    <a
                      href={
                        url + (url.includes('?') ? '&' : '?') + 'download=1'
                      }
                      className="flex items-center justify-center gap-2 p-3 text-sm font-medium hover:underline"
                    >
                      <Download className="size-4" /> Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p role="alert" className="text-sm">
              {job.status === 'review'
                ? job.pollable
                  ? 'Checking the existing generation. Do not start another task.'
                  : 'Submission needs support review. Do not start a new generation for this request.'
                : 'Generation failed. Reserved credits were returned.'}
              {job.error ? ' ' + job.error : ''}
            </p>
          )}
          <a
            href="/creations"
            className="text-sm font-medium text-[var(--composer-accent,#b04845)] underline"
          >
            View My Creations
          </a>
        </div>
      ) : null}
    </div>
  );
}
