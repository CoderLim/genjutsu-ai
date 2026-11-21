# Unified AI Image / Video Generator — Implementation handoff

> Updated: 2026-11-21  
> Branch: `feat/unified-ai-generator-20261121`  
> Base: `main@cc1ed48`  
> Design: `docs/plans/2026-11-20-unified-generator-design.md`  
> Status: **Implementation ready for user staging test; live provider charging and Cloudflare E2E verification remain deployment gates.**

## Implemented, independent of existing Genjutsu generation flow

The new routes never call the old `/api/genjutsu/*`, `/api/image-to-video/*` or `/api/h3-lab/*` business APIs. They use independent `src/modules/generator/*` components while sharing only Auth, Credits wallet, DB (`aiTask` with `scene='generic-generator'`), R2 primitives and generic provider transports.

### Routes

- `/photo-to-video` — dedicated product/test page; Seedance 2.0 Image-to-Video defaults to First Frame, with Start & End option.
- `/ai-video-generator` — shared UI for video models.
- `/ai-image-generator` — shared UI for image models.
- `GET /api/generator/models` — public enabled model capability and customer-credit pricing catalog, no internal provider costs.
- `POST /api/generator/upload-url` → `PUT /api/generator/upload/$generationId` — authenticated size/MIME/slot-limited R2 staging. Authenticated same-origin browser PUT, no R2 CORS.
- `POST /api/generator/generate` — authenticated strict validation, prompt scan, immutable R2 input sealing, server price + cap check, atomic credit reservation, provider submission and idempotent task record.
- `GET /api/generator/status` — authenticated task poll and server-side provider reconciliation.
- `GET /api/generator/result/$generationId` — authenticated redirects to short-lived R2 URLs, optional download streaming.
- `POST /api/cron/generator/reconcile` — CRON_SECRET-protected recovery endpoint.
- `POST /api/generator/webhook` — **protected notification endpoint** requiring `x-cron-secret`; it does not accept unsigned Fal/WaveSpeed push callbacks. Status polling + cron are the actual completion mechanisms.
- Admin routes: `POST /api/admin/generator/reconcile` sweeps tasks; `POST /api/admin/generator/resolve` safely reconciles, links a verified provider request ID, or refunds a verified uncharged unknown submission with an audit note.
- `/creations` — new scene renders generated videos and images; status route is isolated.

### Available paid models (before deployment, verify real billing)

| Internal ID | Provider endpoint | Workflow | Public credit tariff |
| --- | --- | --- | --- |
| `seedance-2-i2v` | WaveSpeed `bytedance/seedance-2.0/image-to-video` | First Frame / Start & End | 480p: 20.4 credits/s; 720p: 40.8 credits/s; 1080p: 102 credits/s, ceil once |
| `seedance-2-multiimage` | WaveSpeed `bytedance/seedance-2.0/text-to-video` | Multi-Image Reference (1–9 image refs only) | same video tariff (output seconds only) |
| `seedance-2-t2v` | WaveSpeed `bytedance/seedance-2.0/text-to-video` | Text-to-Video | same video tariff |
| `seedance-2-reference` | WaveSpeed `bytedance/seedance-2.0/reference-to-video` | All-in-One: up to 9 images, 3 videos and 3 WAV/M4A audio inputs (12 total) | Without videos: output-only tariff. With videos: (output seconds + billable input seconds) × 480p:12.75 / 720p:25.5 / 1080p:63.75 credits/s; 2s per-clip input minimum, rounded up sum ≤15s |
| `h3-reference` | Fal `minimax/h3/reference-to-video` | Reference-to-Video; 1 video (5-15s) + 1-9 images | 480P:8.5/s, 768P:10.2/s, 2K:22.1/s, 4K:27.2/s + 13.6/image after first 5 |
| `flux-schnell` | Fal `fal-ai/flux-1/schnell` | Text-to-Image | 4 credits/output |
| `flux2-flash-edit` | Fal `fal-ai/flux-2/flash/edit` | Image-to-Image, 1-4 refs | (9 + 2 × extra reference images) credits/output |

Prices above are **new product decisions**, not automatic reproduction of upstream billed USD or confirmation of actual merchant margins. Frontend calculates customer credits synchronously (no quote requests); server recalculates and reserves; publishing prices requires owner/provider verification. `GENERATOR_MODELS` is the independent catalog. Old Genjutsu pricing is unchanged.

### Mixed-reference implementation

- All-in-One is implemented and enabled in this test branch. The browser reads local video/audio duration for instantaneous credit display. The backend independently probes **sealed** R2 reference media to determine actual billable seconds, checks 15s input limits and prevents any extra deduction without price confirmation.
- Browser/internal `inputVideoSeconds` is never trusted for billing. Only WAV and M4A audio references are currently enabled (server duration parser supports these formats).
- Audio-only references are rejected; images and/or videos are required. H3 is a separate, narrower workflow: 1 reference video + 1–9 images, not the All-in-One model. H3 credits are still an estimate until real usage is verified.
- New routes remain `noindex, nofollow` during staged testing.

## Architecture and operational protections

- Browser handles First Frame, Start & End and media upload slots; switching model/mode removes incompatible media without shadow draft caches; URL object references are cleaned.
- Server never trusts `credits`, `provider`, `model endpoint`, `storageKey`, unknown parameter fields or unverified workflow. Inputs are bound to authenticated `userId + generationId + slot`.
- R2 staging is immutable-sealed by copy into unique `generator/sealed/...` keys before provider submission. Provider results are streamed from verified Fal/WaveSpeed CDN hosts to R2 with byte limits; no full-video Worker memory buffering.
- `generatorRequestSignature` binds immutable task context, so duplicate generation IDs cannot submit different payloads or double-charge. Claims use CAS tokens. Unknown upstream submissions never retry blindly.
- Failure refund restores the original consumed credit transaction once, and cannot report success if wallet restoration fails. Stale-reserved refunds cannot race with a new submitting state. Provider success + storage failure stays completing and retries persistence; it does **not** refund an accepted provider job.
- H3 reference video MP4/MOV `mvhd` duration is independently probed server-side from signed R2 Range requests before credit reservation, with a 5–15s limit. Tests cover v0/v1 parser variants.
- New `My Creations` row/result access checks authenticated owner; images and videos use their appropriate preview types.
- New cron workflow `.github/workflows/generator-reconcile.yml` executes every 5 minutes **only after merge into default branch**, and only when repo variable `GENERATOR_RECONCILE_ENABLED=true`. Configure repo var `GENERATOR_SITE_URL=https://genjutsuai.net` and GitHub secret `GENERATOR_CRON_SECRET` to match the server's `CRON_SECRET`. No automatic live task cron exists in this feature branch until configured.

## Validation

The branch has a self-contained CI `.github/workflows/generator-feature-ci.yml` which runs:

1. `pnpm install --frozen-lockfile`
2. `pnpm test` (generator capabilities, transitions, customer credit prices, provider request mapping, R2 key ownership, v0/v1 media probe plus all existing repo tests)
3. `pnpm build` (generates TanStack Router types)
4. `pnpm exec tsc --noEmit` (reports all errors, fails CI on any **new generator** errors).

**Baseline debt:** The repository had ~80 TypeScript errors outside the generator after route generation in previous CI run. The workflow reports them as warnings and does not modify old business code merely to achieve a zero-warning build. Review baseline errors separately before full global typecheck can be enforced.

## Environment and release checklist

- [ ] Real Fal and WaveSpeed API keys available via existing server config; confirm each enabled model can submit, poll and persist actual output. Avoid committing credentials.
- [ ] R2 binding `R2_BUCKET` and S3 signing config available and tested on target deployment. Existing repo `wrangler.example.jsonc` has the required R2 binding template.
- [ ] Verify actual provider USD charge against public credit fees; approve effective gross margin, price versions and any H3 reference-image surcharge.
- [ ] Run 1 real `/photo-to-video` generation using 1 start image and a second using start+end image, then inspect provider task ID, R2 sealed media, credits, success/rollback, and My Creations.
- [ ] Run 1 text-to-image, 1 image-to-image multi-ref, 1 text-to-video and 1 H3 source-video reference case; check actual provider argument shape and outputCount.
- [ ] Run All-in-One image-only, video-only, image+video and image+audio cases; verify immediate preview prices, sealed-media duration recalculation, price confirmation on mismatch and over-15s input rejection.
- [ ] Force failing provider requests, timeout/unknown submission, duplicate submission, page refresh, upload size and ownership violations; confirm no unintended second provider submit, no duplicate charge, and correct refunds.
- [ ] Test under Cloudflare Workers + D1/R2 with real credentials, not only Node CI.
- [ ] Configure the GitHub scheduled reconcile env/secret only after deployment; confirm orphan staging cleanup with R2 lifecycle rule (e.g. prefix `generator/staging/`) and stuck-job alerts.
- [ ] Keep `/photo-to-video` and generic pages noindex until user-facing SEO, UX and policies are approved.
- [ ] Do not merge/deploy automatically; preserve existing Genjutsu business API and its historical task state.

## Current caveats

Live provider generation, actual charged USD/tokens and Cloudflare D1/R2 runtime have not been tested by CI. The implementation is ready for a controlled user's manual staging tests, **but merge/production should be gated on that testing**. 


## Manual testing walkthrough

1. From your local checkout run `git fetch origin && git switch feat/unified-ai-generator-20261121 && git pull`, then `pnpm install` and `pnpm dev`. Configure local authentication, a dedicated test D1/R2 environment, and provider API keys (or existing Admin Settings).
2. Open `http://localhost:3000/photo-to-video` and sign in. Upload a JPEG/PNG, type a Prompt and choose 480p / 4 seconds. The button should show **82 credits**. Note that using this costs real upstream money on submission.
3. Switch to Start & End: Start remains; add End. Switch back to First Frame: End is discarded. Model/duration/resolution changes should recalculate credits immediately, **without quote API requests**.
4. Generate: Network should show `upload-url → upload/$generationId → generate → status` only under `/api/generator/*`, never the legacy `/api/genjutsu/*`.
5. Verify one debit, provider task ID, sealed R2 objects, result in `generator/results/`, authenticated download and My Creations. Retry any failed network response using the *same* generation ID, never a duplicate ID.
6. Test `/ai-image-generator` for both image models; `/ai-video-generator` for text-to-video, image-only references, video+audio references and H3. For reference video, try 1.5s (billed as 2s), 3.2s (rounded up), and combined duration over 15s (rejected).
7. Test provider failure and refund, ambiguous unknown submission and admin reconciliation; if the provider charge cannot be confirmed, do not auto-refund an unknown task.
8. Leave `/photo-to-video` and generic routes noindex until UX review and live cost verification are complete.

## Official provider references

- WaveSpeed I2V: https://wavespeed.ai/docs/docs-api/bytedance/seedance-2.0/image-to-video
- WaveSpeed T2V + mixed reference billing: https://wavespeed.ai/docs/docs-api/bytedance/bytedance-seedance-2.0-text-to-video
- WaveSpeed Reference-to-Video: https://wavespeed.ai/docs/docs-api/bytedance/seedance-2.0/reference-to-video
- fal FLUX.2 Flash Edit: https://fal.ai/models/fal-ai/flux-2/flash/edit/api
- fal MiniMax H3: https://fal.ai/minimax-h3
