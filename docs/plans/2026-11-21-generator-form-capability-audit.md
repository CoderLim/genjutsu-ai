# Generator capability, workflow and Raphael comparison audit

Branch: `feat/unified-ai-generator-20261121`  
Reviewed: 2026-11-21  
Status: **Model and form code updated, tests authored; paid API end-to-end and live browser interactions not yet verified.**

## Evidence and scope

The user-provided Raphael screenshot confirms the **three video intent choices** and the requirement that image uploads are optional in All-in-One Reference.

The publicly indexed Raphael model catalog lists Seedance, MiniMax H3 and Kling variants, Nano Banana 2.1 / 2 Lite / 2 / Pro, etc. The dynamic `?mode=video` form does not expose its full conditional model schema through publicly accessible static HTML. Therefore this document does **not** claim an exact, visually verified clone of every Raphael interaction. Where dynamic details are unavailable, each control is bounded by the relevant Fal or WaveSpeed endpoint schema, rather than guessing.

## Video workflow dropdown

There are **at most three visible choices**, but **each specific model has its own subset**. `Text to Video` and `Multi-Image` remain internal workflow/provider profiles where needed, not user-facing dropdown choices. Raphael's supplied H3 screenshot confirms **First Frame and Start & End only**; do not assume every Fal endpoint is a Raphael UI mode.

1. **First Frame**: start frame is required. End frame and reference lists are not shown.
2. **Start & End**: both start and end images are required; hidden on versions that lack an end-image API field.
3. **All-in-One Reference**: optional image reference uploader when the model has an actual reference endpoint; without any references the task is routed to the text-to-video endpoint. Providers without a supported reference API show a text-only All-in-One (no fake image uploader). Seedance 2.0 retains the mixed image/video/audio reference slots supported by its existing WaveSpeed provider.

Changing the selected model or mode retains only compatible uploaded media and parameters. Unpriced models are not shown even in development. The server independently seals reference media, calculates credits and chooses provider identity from the actual submitted reference presence.

## Video models (current **product** limits)

| Model | First | Start & End | All-in-One ref images | Exposed duration and resolution |
| --- | --- | --- | --- | --- |
| Seedance 2.0 (WaveSpeed) | Yes | Yes | Optional up to 9 images, 3 videos, 3 audio | 4–15s · 480p/720p/1080p/4k |
| Seedance 2.0 Fast | Yes | Yes | Optional up to 9 images | 4–15s · 480p/720p |
| Seedance 2.0 Mini | Yes | Yes | Optional up to 9 images | 4–15s · 480p/720p |
| Seedance 2.5 | Yes | Yes | Optional up to 30 images | 4–30s · 480p/720p |
| Seedance 2.5 Flash | Yes | Yes | Optional up to 10 images | 4–30s · 480p/720p |
| MiniMax H3 | Yes | Yes | **Not offered** (Raphael H3 shows only two modes) | 5–15s · **768P/2K/4K** |
| MiniMax H3 Max Turbo | Yes | Yes | Optional up to 9 images | 5–15s · priced at **768P only** |
| MiniMax H3 Max | Yes | Yes | Optional up to 9 images | 5–15s · priced at **768P only** |
| Kling 4.0 | Yes | Yes | Optional up to 10 images | 3–30s · 720p/1080p |
| Kling 4.0 Flash | Yes | **No** | Optional up to 10 images | 3–20s · 720p |
| Kling 3.0 Turbo | Yes | **No** | **Not offered** | 3–15s · 720p |
| Kling 3.0 Pro | Yes | Yes | **Not offered** | 3–15s · 1080p |

Fal has additional video/audio reference capabilities on many of these reference endpoints. These are **not yet offered** in new-model All-in-One because token- and input-duration-based billing has not been reconciled with the customer credit formula. Unpriced reference combinations must not be opened just for visual parity.

Disabled: **MiniMax H3 Turbo** (not H3 Max Turbo) and the old experimental H3 Reference-to-Video profile. Neither should appear as billable, selectable models.

Extra settings: sound only for configured sound-capable models; image-to-video aspect follows the uploaded frame; text-only aspect is exposed when supported; H3 base has no Prompt Expansion field, while the enabled H3 Max variants expose Disabled/Balanced/Quality. No invalid Fast switch should be shown for H3 Max.

**Important competitor-versus-provider discrepancy:** The supplied Raphael screenshot shows MiniMax H3 with 480P, 4s and a Sound toggle. The currently integrated `minimax/h3/image-to-video` and `text-to-video` Fal APIs enumerate 768P/2K/4K, with a 5s default and no audio on/off field. Do **not** send Raphael's 480P/4s/Sound settings to these endpoints without verifying an alternative provider. This is a confirmed *not identical* area, not a UI bug that can be safely resolved by simply adding options.

**Provider status polling:** All-in-One without references and with references may use different provider endpoints. Reserve persists the concrete provider model; result polling must query that saved model ID rather than deriving it again from the menu selection.

**Image output formats:** `png`, `jpeg` and `webp` must be persisted with their correct MIME types; WebP must not be recorded as JPEG.

## Image model variants

### Unified image composer (Raphael-style optional references)

The Image tab **does not show a Text to Image / Image Edit dropdown**. Models with
both provider endpoints always show one optional `Reference` upload tile, with
the model-specific maximum image count. Leaving it empty keeps the text-to-image
endpoint; uploading one or more references routes to the **same selected model's**
image-edit endpoint. Removing the last reference returns to text-to-image.
Neither the prompt nor settings must be reset. The server chooses and stores the
specific provider endpoint using the sealed reference inputs, so quotes,
submission, polling and old explicit edit task snapshots stay aligned.

The updated default `text-to-image` workflow carries an optional
`referenceImages: {min: 0, max: N}` slot. Legacy explicit
`image-to-image` remains supported internally for old tasks, and still requires
at least one reference. FLUX.2 Flash now also has a real Fal text endpoint
(`fal-ai/flux-2/flash`) as well as `/edit`; it no longer starts with a
mandatory upload. **FLUX.1 Schnell is an exception:** its available Redux
reference API does not accept the prompt needed for editing, so it remains
text-only and does not present a misleading image-edit upload tile.

| Family | Models in menu | Main per-model settings |
| --- | --- | --- |
| Nano Banana | **2.1, 2 Lite, 2, Pro** | 2.1: 1K/2K/4K, text/edit, up to 14 reference images. Lite: **fixed 1K**, text/edit, up to 14 reference images, no `resolution` API field. 2/Pro: existing 1K/2K/4K text/edit profiles |
| MiniMax | H3 Image, H3 Image Highspeed | 1K/2K/4K, text/edit, up to 16 reference images |
| FLUX | FLUX.1 Schnell, FLUX.2 Flash | Schnell text-only (no prompt-based reference edit); Flash: optional up to 4 image refs, text/edit API auto-selected |

New Nano Banana 2.1 and Lite use `google/nano-banana-2.1[/edit]` and `google/nano-banana-lite[/edit]`. Both are token-billed by Fal, so the provisional customer credits and per-reference surcharges require **actual Fal invoice checks before production**. Do not present these product tariffs as exact upstream costs.

## API and pricing handoff

- `src/modules/generator/model-families.ts`: visible video mode and brand menu; capability highlights.
- `src/modules/generator/catalog.ts` / `additional-models.ts`: model-specific slots, settings, price and enabled state.
- `src/modules/generator/normalize.ts`: drop incompatible assets and settings.
- `src/modules/generator/adapters.ts`: actual provider endpoints; ref/no-ref decides which endpoint to use.
- `src/modules/generator/service.ts`: seal/quote/reserve; record provider identity after checking actual reference input.
- `src/modules/generator/*.test.ts`: mode-menu assertions, provider schema, product pricing, model transitions, mandatory/optional uploads.

**Release gate:** Run `pnpm test`, `pnpm build`, browser model-switch and form interactions, and real Fal/WaveSpeed smoke requests for each enabled model and each priced mode. Verify true upstream charges, refund behavior, R2 output persistence and My Creations. No production merge/deploy was performed by this audit.

## Sources

- Raphael model listing: https://raphael.app/ai-models
- Raphael workspace static content: https://raphael.app/?mode=video
- Seedance Fast: https://fal.ai/models/bytedance/seedance-2.0/fast/reference-to-video/api
- Seedance Mini: https://fal.ai/models/bytedance/seedance-2.0/mini/reference-to-video/api
- Seedance 2.5: https://fal.ai/models/bytedance/seedance-2.5/reference-to-video/api
- MiniMax H3 base: https://fal.ai/models/minimax/h3/reference-to-video/api
- H3 Max: https://fal.ai/models/minimax/h3-max/reference-to-video/api
- Kling 4.0: https://fal.ai/models/kling/v4/reference-to-video/api
- Kling 4.0 Flash: https://fal.ai/models/kling/v4/flash/reference-to-video/api
- Nano Banana 2.1: https://fal.ai/models/google/nano-banana-2.1/api
- Nano Banana Lite: https://fal.ai/models/google/nano-banana-lite/api

## Post-review reliability fixes (2026-11-21)

### Provider query failure escalation (P1)

Fal `QUERY_PERMANENT_ERROR`, `RESULT_FETCH_PERMANENT_ERROR`, or a success status with no downloadable output is **not** evidence that the upstream generation was rejected. A `query-error` response increments `taskResult.queryFailureCount` with a compare-and-swap update to avoid concurrent poll double-counting. A successful `processing` poll clears the streak. After **3 consecutive inconclusive lookups**, the task transitions to `query_review` and is exposed as `status: review, pollable: false`; the cron reconciler will no longer select it.

`query_review` retains `aiTask.taskId`, `aiTask.model` (the concrete provider endpoint), credit reservation, provider status, and a review message. **No automatic refund or resubmission** is allowed because provider execution/charges are still uncertain.

Existing authenticated, `admin.*`-protected endpoint: `POST /api/admin/generator/resolve`. Each admin resolution requires the task `generationId`, `userId`, and an operator `note` of at least 12 characters:

- `{ "generationId": "...", "userId": "...", "action": "resume-query", "note": "Upstream result verified; retrying status lookup" }`: only for `query_review` with a saved provider request ID; resets the streak and queries the **original saved endpoint**.
- `{ "generationId": "...", "userId": "...", "action": "refund", "confirmedProviderBillingReviewed": true, "note": "Provider billing and result checked; approving refund" }`: only after manual upstream charge/outcome verification. Refund is limited to the reviewed task's status and restores credits exactly once.

Existing `submission_unknown` link-request and refund paths remain supported; admin refund there still requires `confirmedProviderNotCharged: true`. The admin route writes operator notes to the server log, not customer-visible error messages. Admins must verify provider charges and outputs before choosing between re-querying and refunding.

### Background media type changes (P2)

The composer permits Image / Video and model switching during an active job. Its Latest generation panel now takes both its status text and `video`/`img` component choice from **`job.mediaType`**, never the current draft's `mediaType`.

### Retained local upload validation (P2)

On every model/workflow change, normalize compatible media slots and then filter the retained browser `blob:` URLs against the destination slot's accepted MIME types and maximum bytes using `localFiles.current`. Unsupported and missing files are dropped immediately and revoked by the existing blob cleanup effect. Compatible local images survive. Uploaded files are still validated by the signed-upload API before submission, so this client-side check is additional protection, not a security boundary.

Regression tests cover WebP Seedance → PNG/JPEG-only Kling Turbo, oversize and missing local files, provider query error threshold, and supported media retention.

### Remaining release gates

Still required: CI/unit test and build execution, browser interactions during in-flight jobs, provider query-error staging simulation, admin `resume-query`/manual-refund exercise, Fal/WaveSpeed real generation, and D1/R2 + provider account cost reconciliation. Stationary `precision: exact` tariffs are **customer credit formulas only**, not a validated upstream cost or margin.
