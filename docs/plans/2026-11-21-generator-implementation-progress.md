# Unified Generator — isolated implementation progress

Branch: `feat/unified-ai-generator-20261121` (based on `main` at `cc1ed48`).  
Design: `docs/plans/2026-11-20-unified-generator-design.md`.

## Implemented in first milestone

- `src/modules/generator/types.ts`: shared model/workflow/field/media/pricing contracts.
- `registry.ts`: **disabled development fixtures** for image/video; no paid models exposed to public API.
- `normalize.ts`: deterministic workflow/parameter/media trimming, without shadow drafts.
- `validation.ts`: strict field/workflow/slot combination checks; submission-ready validation separate.
- `pricing.ts`: browser-safe synchronous user-credit calculation, dependent on model + form params; never contains provider margin/cost secrets.
- Node test suites for mode transitions, constraint behavior, local credit calculation and forged parameters.
- A responsive `GeneratorForm` and `MediaUploader`, with vertical mobile fields and desktop two-column layout.
- Two `noindex` routes and read-only `GET /api/generator/models` returning only enabled models.

## Explicitly not implemented — DO NOT ENABLE PRODUCTION GENERATION

- Real provider model adapters, upstream API credential handling, and verified model capabilities/rates.
- New staging upload URL / sealed media, ownership and metadata verification.
- New generator task state machine, atomic credit reserve/refund, idempotency, webhook/reconcile, R2 results and My Creations integration.
- End-to-end task generation or payment. The Generate button is intentionally **disabled**.
- Models and credit amounts visible in DEV are **synthetic interaction fixtures**, not real H3/Seedance/Kling/GPT API prices.

Never enable models merely by setting `enabled: true`; that flag must only be used after the complete dedicated service path and tests exist. No new route calls existing `/api/genjutsu/*` or other old generation routes.

## Next coding milestone

1. Choose one **verified** video model and workflow, confirm provider endpoint schema and actual cost; replace illustrative preview fixtures with public pricing specs for that model.
2. Implement new `src/modules/generator/{billing,storage,service,adapters}` and `/api/generator/{upload-url,generate,status,result}` as standalone business logic.
3. Test idempotent submission, dynamic pricing cap, unknown submission, R2 sealed input/ownership, refund and recovery before turning on an enabled model.
4. Add first image-model adapter after the video path is safe, then connect My Creations.
5. Run `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build` on a fully installed checkout before merging. The GitHub connector writes do not execute a full local build; these checks are not claimed complete.
