import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Sparkles } from 'lucide-react';

import {
  createGeneratorState,
  normalizeGeneratorState,
  updateGeneratorState,
} from '@/modules/generator/normalize';
import { calculateGeneratorCredits } from '@/modules/generator/pricing';
import {
  GENERATOR_PREVIEW_MODELS,
  listEnabledGeneratorModels,
} from '@/modules/generator/registry';
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
import { MediaUploader } from './MediaUploader';

const FIELD_ORDER = [
  'aspectRatio',
  'duration',
  'resolution',
  'outputCount',
  'quality',
  'style',
  'outputFormat',
  'generateAudio',
  'fastMode',
  'webSearch',
];

const SLOT_LABELS: Record<MediaSlot, string> = {
  startFrame: 'Start Frame',
  endFrame: 'End Frame',
  referenceImages: 'Reference Images',
  referenceVideos: 'Reference Videos',
  referenceAudio: 'Reference Audio',
};

function activeUrls(inputs: GeneratorInputs) {
  return [
    inputs.startFrame,
    inputs.endFrame,
    ...inputs.referenceImages,
    ...inputs.referenceVideos,
    ...inputs.referenceAudio,
  ].filter((url): url is string => typeof url === 'string');
}

function titleForField(key: string, fallback: string) {
  return fallback || key.replace(/[A-Z]/g, (match) => ' ' + match);
}

export function GeneratorForm({ mediaType }: { mediaType: MediaType }) {
  const models = useMemo(
    () => (import.meta.env.DEV
      ? GENERATOR_PREVIEW_MODELS
      : listEnabledGeneratorModels(mediaType)
    ).filter((model) => model.mediaType === mediaType),
    [mediaType]
  );

  const [draft, setDraft] = useState<GeneratorState | null>(() =>
    models[0] ? createGeneratorState(models[0]) : null
  );
  const [uploadError, setUploadError] = useState('');
  const ownedUrls = useRef(new Set<string>());

  const model = models.find((item) => item.id === draft?.modelId) ?? models[0];
  const activeDraft = model && draft?.modelId === model.id
    ? draft
    : model ? createGeneratorState(model) : null;

  // Clear draft when switching between image/video pages or model catalogs.
  useEffect(() => {
    setDraft(models[0] ? createGeneratorState(models[0]) : null);
    setUploadError('');
  }, [models]);

  useEffect(() => {
    const references = new Set(draft ? activeUrls(draft.inputs) : []);
    for (const url of ownedUrls.current) {
      if (references.has(url)) continue;
      URL.revokeObjectURL(url);
      ownedUrls.current.delete(url);
    }
  }, [draft]);

  useEffect(() => () => {
    for (const url of ownedUrls.current) URL.revokeObjectURL(url);
    ownedUrls.current.clear();
  }, []);

  const spec = activeDraft && model
    ? getWorkflowSpec(model, activeDraft.workflow)
    : null;

  const quote = useMemo(() => {
    if (!activeDraft || !model) return null;
    try {
      return calculateGeneratorCredits(activeDraft, model);
    } catch {
      return null;
    }
  }, [activeDraft, model]);

  if (!model || !activeDraft || !spec) {
    return (
      <div className="bg-card rounded-2xl border p-6 text-center sm:p-10">
        <AlertCircle className="text-muted-foreground mx-auto mb-3 size-6" />
        <h2 className="font-semibold">Generator integration in progress</h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-lg text-sm">
          No verified {mediaType} generation models are enabled yet. This page
          will open after provider, billing and recovery tests are complete.
        </p>
      </div>
    );
  }

  function setWorkflow(workflow: Workflow) {
    setUploadError('');
    setDraft((prev) => prev
      ? updateGeneratorState(prev, model, { workflow })
      : createGeneratorState(model)
    );
  }

  function setParam(name: string, value: FieldValue) {
    setDraft((prev) => prev
      ? updateGeneratorState(prev, model, { params: { [name]: value } })
      : createGeneratorState(model)
    );
  }

  function setModel(modelId: string) {
    const nextModel = models.find((item) => item.id === modelId);
    if (!nextModel) return;
    setUploadError('');
    setDraft((prev) => prev
      ? normalizeGeneratorState(prev, nextModel)
      : createGeneratorState(nextModel)
    );
  }

  function onFiles(slot: MediaSlot, files: File[]) {
    const rule = spec!.slots[slot];
    if (!rule) return;
    const invalid = files.find((file) =>
      !rule.accept.includes(file.type) ||
      (rule.maxBytes !== undefined && file.size > rule.maxBytes)
    );
    if (invalid) {
      setUploadError('Unsupported file type or file size: ' + invalid.name);
      return;
    }

    const urls = files.map((file) => {
      const url = URL.createObjectURL(file);
      ownedUrls.current.add(url);
      return url;
    });

    setUploadError('');
    setDraft((prev) => {
      if (!prev) return null;
      const inputs = { ...prev.inputs };
      if (slot === 'startFrame' || slot === 'endFrame') {
        inputs[slot] = urls[0] ?? null;
      } else {
        inputs[slot] = [...inputs[slot], ...urls].slice(0, rule.max);
      }
      return updateGeneratorState(prev, model, { inputs });
    });
  }

  function removeFile(slot: MediaSlot, url: string) {
    setDraft((prev) => {
      if (!prev) return null;
      const inputs = { ...prev.inputs };
      if (slot === 'startFrame' || slot === 'endFrame') {
        inputs[slot] = null;
      } else {
        inputs[slot] = inputs[slot].filter((value) => value !== url);
      }
      return updateGeneratorState(prev, model, { inputs });
    });
  }

  return (
    <section className="bg-card rounded-2xl border p-4 sm:p-6">
      {import.meta.env.DEV ? (
        <div className="mb-5 rounded-xl border border-amber-600/30 bg-amber-500/10 px-3 py-2 text-xs">
          UI preview only. Model names and prices are illustrative. No API submission or credits charged.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)]">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Generation mode">
            {(Object.keys(model.workflows) as Workflow[]).map((workflow) => (
              <button
                key={workflow}
                type="button"
                onClick={() => setWorkflow(workflow)}
                aria-pressed={workflow === activeDraft.workflow}
                className={
                  'rounded-xl border px-3 py-2 text-sm font-medium transition ' +
                  (workflow === activeDraft.workflow
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted')
                }
              >
                {model.workflows[workflow]?.label ?? workflow}
              </button>
            ))}
          </div>

          {(
            ['startFrame', 'endFrame', 'referenceImages', 'referenceVideos', 'referenceAudio'] as const
          ).filter((slot) => spec.slots[slot]).map((slot) => {
            const limit = spec.slots[slot]!;
            const value = activeDraft.inputs[slot];
            const urls = typeof value === 'string'
              ? [value]
              : Array.isArray(value) ? value : [];
            return (
              <MediaUploader
                key={slot}
                label={SLOT_LABELS[slot]}
                urls={urls}
                max={limit.max}
                accept={limit.accept}
                onFiles={(files) => onFiles(slot, files)}
                onRemove={(url) => removeFile(slot, url)}
              />
            );
          })}
          {uploadError ? (
            <p role="alert" className="text-destructive text-xs">{uploadError}</p>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="generator-prompt" className="text-sm font-semibold">Prompt</label>
              <span className="text-muted-foreground text-xs">{activeDraft.prompt.length} / 50000</span>
            </div>
            <textarea
              id="generator-prompt"
              rows={7}
              maxLength={50000}
              placeholder={'Describe the ' + mediaType + ' you want to create...'}
              value={activeDraft.prompt}
              onChange={(event) => setDraft((prev) =>
                prev ? updateGeneratorState(prev, model, { prompt: event.target.value }) : prev
              )}
              className="bg-background placeholder:text-muted-foreground focus-visible:ring-ring/40 min-h-36 w-full resize-y rounded-xl border p-3 text-sm outline-none focus-visible:ring-2"
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="generator-model" className="text-sm font-semibold">Model</label>
            <select
              id="generator-model"
              className="bg-background w-full rounded-xl border p-3 text-sm"
              value={model.id}
              onChange={(event) => setModel(event.target.value)}
            >
              {models.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>

          {Object.entries(spec.fields)
            .sort(([left], [right]) =>
              FIELD_ORDER.indexOf(left) - FIELD_ORDER.indexOf(right)
            )
            .map(([name, field]) => {
              const current = activeDraft.params[name];
              if (typeof field.default === 'boolean') {
                return (
                  <label key={name} className="bg-muted/40 flex cursor-pointer items-center justify-between rounded-xl border p-3">
                    <span className="text-sm font-medium">{titleForField(name, field.label)}</span>
                    <input
                      type="checkbox"
                      checked={current === true}
                      onChange={(event) => setParam(name, event.target.checked)}
                      className="accent-primary size-4"
                    />
                  </label>
                );
              }
              const values = field.options ?? [];
              return (
                <div key={name} className="space-y-2">
                  <label className="text-sm font-semibold">{titleForField(name, field.label)}</label>
                  {values.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {values.map((value) => (
                        <button
                          key={String(value)}
                          type="button"
                          aria-pressed={current === value}
                          onClick={() => setParam(name, value)}
                          className={
                            'min-w-16 rounded-xl border px-3 py-2 text-sm transition ' +
                            (current === value
                              ? 'border-primary bg-primary/10 text-foreground font-semibold'
                              : 'text-muted-foreground hover:bg-muted')
                          }
                        >
                          {name === 'duration' ? String(value) + 's' : String(value)}
                        </button>
                      ))}
                    </div>
                  ) : typeof field.default === 'number' ? (
                    <input
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step ?? 1}
                      value={Number(current)}
                      onChange={(event) => setParam(name, Number(event.target.value))}
                      className="bg-background w-full rounded-xl border p-2"
                    />
                  ) : null}
                </div>
              );
            })}

          <div className="bg-muted/50 space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Estimated credits</span>
              <span className="text-2xl font-bold tabular-nums">
                {quote ? quote.credits : '—'}
              </span>
            </div>
            <button
              type="button"
              disabled
              className="bg-primary text-primary-foreground flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold opacity-55"
            >
              <Sparkles className="size-4" />
              Generation not connected
            </button>
            <p className="text-muted-foreground text-center text-xs">
              Preview only. The real generator API and payment-safe task lifecycle
              must be completed before enabling this button.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
