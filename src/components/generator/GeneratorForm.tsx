import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, LoaderCircle, Sparkles } from 'lucide-react';

import { apiGet, apiPost, ApiError, uploadToSignedUrl } from '@/lib/api-client';
import { GENERATOR_MODELS, listGeneratorModels } from '@/modules/generator/catalog';
import {
  createGeneratorState,
  normalizeGeneratorState,
  updateGeneratorState,
} from '@/modules/generator/normalize';
import { calculateGeneratorCredits } from '@/modules/generator/pricing';
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
import { referenceVideoBillableSeconds, assertReferenceAudioDuration } from '@/modules/generator/reference-metadata';
import { MediaUploader } from './MediaUploader';

const FIELD_ORDER = [
  'aspectRatio', 'duration', 'resolution', 'outputCount', 'quality',
  'style', 'outputFormat', 'promptExpansionMode', 'generateAudio',
  'fastMode', 'webSearch',
];

const SLOT_LABELS: Record<MediaSlot, string> = {
  startFrame: 'Start Frame',
  endFrame: 'End Frame',
  referenceImages: 'Reference Images',
  referenceVideos: 'Reference Videos',
  referenceAudio: 'Reference Audio',
};

const INPUT_SLOTS: MediaSlot[] = [
  'startFrame', 'endFrame', 'referenceImages', 'referenceVideos', 'referenceAudio',
];

type JobInfo = {
  generationId: string;
  status: 'processing' | 'completed' | 'failed' | 'review';
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
    inputs.startFrame, inputs.endFrame,
    ...inputs.referenceImages, ...inputs.referenceVideos, ...inputs.referenceAudio,
  ].filter((value): value is string => typeof value === 'string');
}

function slotUrls(inputs: GeneratorInputs, slot: MediaSlot): string[] {
  const value = inputs[slot];
  return typeof value === 'string' ? [value]
    : Array.isArray(value) ? value : [];
}

/** Browser metadata is for instant quote only; server rechecks sealed inputs. */
function mediaDurationFromBlobUrl(url: string, slot: MediaSlot): Promise<number> {
  return new Promise((resolve, reject) => {
    const element = document.createElement(slot === 'referenceVideos' ? 'video' : 'audio');
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
      else reject(new Error('Unable to read media duration; use MP4, MOV, WAV or M4A'));
    };
    const failure = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Unable to read media duration; use MP4, MOV, WAV or M4A'));
    };
    const timer = setTimeout(failure, 12000);
    element.addEventListener('loadedmetadata', success, { once: true });
    element.addEventListener('error', failure, { once: true });
    element.src = url;
    element.load();
  });
}

export function GeneratorForm({
  mediaType,
  initialModelId,
}: {
  mediaType: MediaType;
  initialModelId?: string;
}) {
  const models = useMemo(() => (
    import.meta.env.DEV
      ? GENERATOR_MODELS.filter(item => item.mediaType === mediaType)
      : listGeneratorModels(mediaType)
  ), [mediaType]);
  const preferredModel = useMemo(
    () => models.find(item => item.id === initialModelId) ?? models[0],
    [initialModelId, models]
  );
  const [draft, setDraft] = useState<GeneratorState | null>(() =>
    preferredModel ? createGeneratorState(preferredModel) : null
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

  const model = models.find(item => item.id === draft?.modelId) ?? preferredModel;
  const form = model && draft?.modelId === model.id
    ? draft : model ? createGeneratorState(model) : null;

  useEffect(() => {
    setDraft(preferredModel ? createGeneratorState(preferredModel) : null);
    setPageError('');
    setPriceChange(null);
    setRetryAttempt(null);
  }, [preferredModel]);

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

  useEffect(() => () => {
    for (const url of localFiles.current.keys()) URL.revokeObjectURL(url);
    localFiles.current.clear();
    mediaDurations.current.clear();
  }, []);

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
    if (!job || job.status !== 'processing') return;
    let canceled = false;
    const handle = setInterval(async () => {
      try {
        const status = await apiGet<JobInfo>(
          '/api/generator/status?generationId=' + encodeURIComponent(job.generationId)
        );
        if (!canceled) setJob(current =>
          current?.generationId === status.generationId ? status : current
        );
      } catch (error) {
        if (!canceled) console.warn('Generator status retry', error);
      }
    }, 4500);
    return () => { canceled = true; clearInterval(handle); };
  }, [job?.generationId, job?.status]);

  function syncReferenceQuote(next: GeneratorState, target: GeneratorModel): GeneratorState {
    if (!target.workflows[next.workflow]?.fields.inputVideoSeconds) return next;
    const durations = next.inputs.referenceVideos.map(url => {
      const seconds = mediaDurations.current.get(url);
      if (seconds === undefined) throw new Error('Missing reference video duration');
      return seconds;
    });
    const billable = referenceVideoBillableSeconds(durations);
    return updateGeneratorState(next, target, { params: { inputVideoSeconds: billable } });
  }

  function mutate(
    patch: Partial<Omit<GeneratorState, 'modelId' | 'mediaType'>>,
    nextModel?: GeneratorModel
  ) {
    if (busy || mediaReadLock.current || submitLock.current) return;
    setPageError('');
    setPriceChange(null);
    setRetryAttempt(null);
    setDraft(prev => prev && (nextModel ?? model)
      ? syncReferenceQuote(updateGeneratorState(prev, nextModel ?? model!, patch), nextModel ?? model!)
      : prev
    );
  }

  function setWorkflow(workflow: Workflow) {
    setUploadError('');
    mutate({ workflow });
  }

  function setParam(name: string, value: FieldValue) {
    mutate({ params: { [name]: value } });
  }

  function setModel(modelId: string) {
    if (busy || mediaReadLock.current || submitLock.current) return;
    const next = models.find(item => item.id === modelId);
    if (!next) return;
    setUploadError('');
    setPageError('');
    setPriceChange(null);
    setRetryAttempt(null);
    setDraft(prev => prev
      ? syncReferenceQuote(normalizeGeneratorState(prev, next), next)
      : createGeneratorState(next)
    );
  }

  async function onFiles(slot: MediaSlot, files: File[]) {
    if (!spec || !form || busy || mediaReadLock.current || submitLock.current) return;
    const rule = spec.slots[slot];
    if (!rule) return;
    const available = rule.max - slotUrls(form.inputs, slot).length;
    if (available <= 0) return;
    const accepted = files.slice(0, available);
    const invalid = accepted.find(file =>
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
          if ((rule.minSeconds !== undefined && seconds < rule.minSeconds) ||
              (rule.maxSeconds !== undefined && seconds > rule.maxSeconds)) {
            throw new Error('Reference media duration exceeds model limits');
          }
          durations.set(url, seconds);
        }
      }
      // Validate combined durations before adding the files to the form.
      if (slot === 'referenceVideos') {
        referenceVideoBillableSeconds([
          ...form.inputs.referenceVideos.map(url => mediaDurations.current.get(url) ?? NaN),
          ...urls.map(url => durations.get(url) ?? NaN),
        ]);
      }
      if (slot === 'referenceAudio') {
        assertReferenceAudioDuration([
          ...form.inputs.referenceAudio.map(url => mediaDurations.current.get(url) ?? NaN),
          ...urls.map(url => durations.get(url) ?? NaN),
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
      setDraft(prev => {
        if (!prev) return null;
        const inputs = { ...prev.inputs };
        if (slot === 'startFrame' || slot === 'endFrame') {
          inputs[slot] = urls[0] ?? null;
        } else {
          inputs[slot] = [...inputs[slot], ...urls];
        }
        return syncReferenceQuote(updateGeneratorState(prev, model!, { inputs }), model!);
      });
    } catch (error) {
      for (const url of urls) URL.revokeObjectURL(url);
      setUploadError(error instanceof Error ? error.message : 'Could not read the uploaded media');
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
          : { [slot]: slotUrls(form!.inputs, slot).filter(x => x !== url) }),
      },
    });
  }

  async function uploadAssets(state: GeneratorState, generationId: string) {
    const inputs: GeneratorInputs = {
      startFrame: null, endFrame: null,
      referenceImages: [], referenceVideos: [], referenceAudio: [],
    };
    let lastUploadDescriptorAt = 0;
    for (const slot of INPUT_SLOTS) {
      const uploaded: string[] = [];
      for (const url of slotUrls(state.inputs, slot)) {
        const file = localFiles.current.get(url);
        if (!file) throw new Error('Reference media is missing. Please upload it again.');
        // The upload preflight API rate-limits per user/path; space rapid
        // multi-image uploads while retaining retryable signed uploads.
        const gap = 360 - (Date.now() - lastUploadDescriptorAt);
        if (gap > 0) await new Promise(resolve => setTimeout(resolve, gap));
        const descriptor = await apiPost<UploadDescriptor>(
          '/api/generator/upload-url', {
            modelId: state.modelId,
            workflow: state.workflow,
            slot, generationId,
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
      if (slot === 'startFrame' || slot === 'endFrame') inputs[slot] = uploaded[0] ?? null;
      else inputs[slot] = uploaded;
    }
    return { ...state, inputs };
  }

  async function submitGeneration(generationId: string, state: GeneratorState, credits: number, pricingVersion: string) {
    setStage('Submitting generation...');
    return apiPost<JobInfo>('/api/generator/generate', {
      generationId, state, pricingVersion, maxAcceptedCredits: credits,
    });
  }

  function handleSubmitError(error: unknown, generationId: string, uploadedState: GeneratorState) {
    if (error instanceof ApiError && error.data &&
        typeof error.data === 'object') {
      const details = error.data as Record<string, unknown>;
      if (details.code === 'PRICE_CHANGED' &&
          typeof details.credits === 'number' &&
          typeof details.pricingVersion === 'string') {
        setPriceChange({
          credits: details.credits,
          pricingVersion: details.pricingVersion,
          generationId,
          uploadedState,
        });
        setPageError('The price has changed. Review and confirm the updated credits below.');
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
    if (!form || !model || !quote || busy || mediaBusy || submitLock.current) return;
    try {
      assertGeneratorReady(form, model);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Please check your inputs');
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
        generationId, uploadedState,
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
      handleSubmitError(error, priceChange.generationId, priceChange.uploadedState);
      setStage('');
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }

  if (!model || !form || !spec) {
    return (
      <div className="bg-card rounded-2xl border p-6 text-center sm:p-10">
        <AlertCircle className="text-muted-foreground mx-auto mb-3 size-6" />
        <h2 className="font-semibold">Generator integration in progress</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          No generation models are available for this media type.
        </p>
      </div>
    );
  }

  const canSubmit = model.enabled && !!form.prompt.trim() && !!quote && !busy && !mediaBusy;
  return (
    <section className="bg-card rounded-2xl border p-4 sm:p-6">
      <nav aria-label="Generator type" className="mb-5 flex gap-2">
        <a
          href="/ai-image-generator"
          aria-current={mediaType === 'image' ? 'page' : undefined}
          className={'rounded-lg border px-4 py-2 text-sm ' +
            (mediaType === 'image' ? 'border-primary bg-primary/10 font-semibold' : 'text-muted-foreground')}
        >AI Image</a>
        <a
          href="/ai-video-generator"
          aria-current={mediaType === 'video' ? 'page' : undefined}
          className={'rounded-lg border px-4 py-2 text-sm ' +
            (mediaType === 'video' ? 'border-primary bg-primary/10 font-semibold' : 'text-muted-foreground')}
        >AI Video</a>
      </nav>

      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,1fr)]">
        <div className="space-y-5">
          {Object.keys(model.workflows).length > 1 ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Generation mode">
              {(Object.keys(model.workflows) as Workflow[]).map(workflow => (
                <button key={workflow} type="button" onClick={() => setWorkflow(workflow)}
                  aria-pressed={workflow === form.workflow}
                  className={'rounded-xl border px-3 py-2 text-sm font-medium transition ' +
                    (workflow === form.workflow
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted')}>
                  {model.workflows[workflow]?.label ?? workflow}
                </button>
              ))}
            </div>
          ) : null}

          {INPUT_SLOTS.filter(slot => !!spec.slots[slot]).map(slot => {
            const limit = spec.slots[slot]!;
            return (
              <MediaUploader key={slot} label={SLOT_LABELS[slot]}
                urls={slotUrls(form.inputs, slot)}
                max={limit.max} accept={limit.accept}
                onFiles={files => onFiles(slot, files)}
                onRemove={url => removeFile(slot, url)}
              />
            );
          })}
          {mediaBusy ? <p className="text-muted-foreground text-xs">Reading media duration for accurate credits...</p> : null}
          {uploadError ? <p role="alert" className="text-destructive text-xs">{uploadError}</p> : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="generator-prompt" className="text-sm font-semibold">Prompt</label>
              <span className="text-muted-foreground text-xs">{form.prompt.length} / 50000</span>
            </div>
            <textarea id="generator-prompt" rows={7} maxLength={50000}
              placeholder={'Describe the ' + mediaType + ' you want to create...'}
              value={form.prompt}
              onChange={event => mutate({ prompt: event.target.value })}
              className="bg-background placeholder:text-muted-foreground focus-visible:ring-ring/40 min-h-36 w-full resize-y rounded-xl border p-3 text-sm outline-none focus-visible:ring-2"
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="generator-model" className="text-sm font-semibold">Model</label>
            <select id="generator-model" className="bg-background w-full rounded-xl border p-3 text-sm"
              value={model.id} onChange={event => setModel(event.target.value)}>
              {models.map(item => <option key={item.id} value={item.id}>{item.name}{!item.enabled ? ' · Preview only' : ''}</option>)}
            </select>
          </div>

          {Object.entries(spec.fields)
            .filter(([, field]) => !field.internal)
            .sort(([left], [right]) => {
              const l = FIELD_ORDER.indexOf(left), r = FIELD_ORDER.indexOf(right);
              return (l < 0 ? 100 : l) - (r < 0 ? 100 : r);
            })
            .map(([name, field]) => {
              const current = form.params[name];
              if (typeof field.default === 'boolean') return (
                <label key={name} className="bg-muted/40 flex cursor-pointer items-center justify-between rounded-xl border p-3">
                  <span className="text-sm font-medium">{field.label}</span>
                  <input type="checkbox" checked={current === true}
                    onChange={event => setParam(name, event.target.checked)}
                    className="accent-primary size-4" />
                </label>
              );
              const values = field.options ?? [];
              return (
                <div key={name} className="space-y-2">
                  <label className="text-sm font-semibold">{field.label}</label>
                  {values.length ? (
                    <div className="flex flex-wrap gap-2">
                      {values.map(value => (
                        <button key={String(value)} type="button" aria-pressed={current === value}
                          onClick={() => setParam(name, value)}
                          className={'min-w-16 rounded-xl border px-3 py-2 text-sm transition ' +
                            (current === value
                              ? 'border-primary bg-primary/10 text-foreground font-semibold'
                              : 'text-muted-foreground hover:bg-muted')}>
                          {name === 'duration' ? String(value) + 's' : String(value)}
                        </button>
                      ))}
                    </div>
                  ) : typeof field.default === 'number' ? (
                    <div className="flex items-center gap-3">
                      <input type="range" min={field.min} max={field.max}
                        step={field.step ?? 1} value={Number(current)}
                        onChange={event => setParam(name, Number(event.target.value))}
                        className="accent-primary min-w-0 flex-1" />
                      <span className="bg-muted min-w-14 rounded-lg border px-2 py-1 text-center text-sm tabular-nums">
                        {name === 'duration' ? String(current) + 's' : String(current)}
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })}

          <div className="bg-muted/40 space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="block text-sm font-medium">Credits</span>
                {quote?.precision === 'estimate' ? (
                  <span className="text-muted-foreground text-xs">Estimated</span>
                ) : null}
              </div>
              <span className="text-2xl font-bold tabular-nums">{model.enabled && quote ? quote.credits : '—'}</span>
            </div>
            <button type="button" disabled={!canSubmit} onClick={onGenerate}
              className="bg-primary text-primary-foreground disabled:opacity-50 flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold">
              {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {busy ? stage || 'Working...' : !model.enabled ? 'Preview only · Model unavailable' : retryAttempt ? 'Retry existing generation' : 'Generate · ' + (quote?.credits ?? '—') + ' Credits'}
            </button>
            {priceChange ? (
              <button type="button" disabled={busy} onClick={onConfirmPrice}
                className="flex w-full items-center justify-center rounded-xl border border-primary px-4 py-3 text-sm font-semibold">
                Confirm updated price · {priceChange.credits} Credits
              </button>
            ) : null}
            {pageError ? <p role="alert" className="text-destructive text-xs">{pageError}</p> : null}
            <p className="text-muted-foreground text-center text-xs">
              {model.enabled
                ? 'Credits are checked and reserved by the server before generation.'
                : 'The workflow is shown for development preview. Its pricing or provider limits are not verified yet.'}
            </p>
          </div>
        </div>
      </div>

      {job ? (
        <div className="mt-7 space-y-4 rounded-xl border p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Latest generation</h2>
            <span className="text-muted-foreground text-xs">{job.generationId.slice(0, 8)}</span>
          </div>
          {job.status === 'processing' ? (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              <LoaderCircle className="size-4 animate-spin" />
              Generating and saving your {mediaType}... You can also follow it in My Creations.
            </p>
          ) : job.status === 'completed' ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-green-600" /> Generation completed
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {job.resultUrls.map((url, index) => (
                  <div key={url} className="overflow-hidden rounded-xl border">
                    {mediaType === 'video' ? (
                      <video controls playsInline preload="metadata" src={url}
                        className="aspect-video w-full bg-black object-contain" />
                    ) : (
                      <img src={url} alt={'Generated image ' + (index + 1)}
                        className="aspect-video w-full bg-muted object-contain" />
                    )}
                    <a href={url + (url.includes('?') ? '&' : '?') + 'download=1'}
                      className="flex items-center justify-center gap-2 p-3 text-sm font-medium hover:underline">
                      <Download className="size-4" /> Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p role="alert" className="text-sm">
              {job.status === 'review'
                ? 'The provider submission needs review. Do not retry with the same inputs.'
                : 'Generation failed. Reserved credits were returned.'}
              {job.error ? ' ' + job.error : ''}
            </p>
          )}
          <a href="/creations" className="text-primary text-sm underline">View My Creations</a>
        </div>
      ) : null}
    </section>
  );
}
