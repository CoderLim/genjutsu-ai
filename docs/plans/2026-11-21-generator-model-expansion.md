# Model expansion: Seedance, MiniMax, Kling and Nano Banana

Branch: `feat/unified-ai-generator-20261121`. This document is an integration
and release matrix, **not** proof of paid production readiness.

## Design

The new generic generator remains isolated from legacy `/api/genjutsu/*`.
The model picker selects the engine/version; Workflow selects text, first
frame, first+end frame, or image editing. Each Fal profile maps the selected
Workflow to its own endpoint, with server-side request validation and the
existing generator reservation/refund/idempotency pipeline.

Existing **Seedance 2.0** uses the established WaveSpeed adapter and its four
internal workflow profiles. Additional variants are wired to **Fal**.

### Model matrix

| UI model | Fal endpoints | Workflow support in this branch | Paid enabled |
| --- | --- | --- | --- |
| Seedance 2.0 | Existing WaveSpeed adapter | First frame, first + end, text, multi-image, all-in-one | Yes (unchanged) |
| Seedance 2.0 Fast | `bytedance/seedance-2.0/fast/{text-to-video,image-to-video}` | Text, first, first + end | Yes: conservative customer tariff |
| Seedance 2.0 Mini | `bytedance/seedance-2.0/mini/{text-to-video,image-to-video}` | Text, first, first + end | Yes: conservative customer tariff |
| Seedance 2.5 | `bytedance/seedance-2.5/{text-to-video,image-to-video}` | Text, first, first + end | Yes: conservative customer tariff |
| Seedance 2.5 Flash | `bytedance/seedance-2.5/flash/{text-to-video,image-to-video}` | Text, first, first + end | Yes: conservative customer tariff |
| MiniMax H3 Turbo | No distinct verified Fal endpoint | UI/capability draft | No: do not alias to base H3 |
| MiniMax H3 | `minimax/h3/reference-to-video` | Existing restricted reference workflow | No: prior estimate only |
| MiniMax H3 Max Turbo | `minimax/h3-max-turbo/{text-to-video,image-to-video}` | Text and first frame; 768P; 5–15s | Yes: 10 customer credits/sec |
| MiniMax H3 Max | `minimax/h3-max/{text-to-video,image-to-video}` | Text and first frame; 768P; 5–15s | Yes: 16 customer credits/sec |
| Kling 4.0 | `kling/v4/{text-to-video,image-to-video}` | Text, first, first + end | Yes: bounded customer tariff |
| Kling 4.0 Flash | `kling/v4/flash/{text-to-video,image-to-video}` | Text, first, first + end | Yes: bounded customer tariff |
| Kling 3.0 Turbo | `fal-ai/kling-video/v3/turbo/standard/{text-to-video,image-to-video}` | Text, first, first + end | Yes: fixed endpoint and conservative audio-inclusive tariff |
| Kling 3.0 | `fal-ai/kling-video/v3/pro/{text-to-video,image-to-video}` | Text, first, first + end | Yes: fixed endpoint and conservative audio-inclusive tariff |
| Nano Banana 2 / Pro | Existing Fal `fal-ai/nano-banana-{2,pro}` + `/edit` | Text and edit | Yes (unchanged) |
| MiniMax H3 Image | `minimax/h3-image/{text-to-image,edit}` | Text and edit (up to 16 references) | No: megapixel billing pending |
| MiniMax H3 Image Highspeed | `minimax/h3-image/highspeed/{text-to-image,edit}` | Text and edit (up to 16 references) | No: megapixel billing pending |
| FLUX.1 Schnell / FLUX.2 Flash | Existing Fal | Existing workflows | Yes (unchanged) |

**Disabled models** are available in the **development-only** chooser for
checking the form and model-specific payload without triggering a charge.
The Generate button remains disabled and the server's `getGeneratorModel`
rejects all of them even if an API request is forged.

These prices are new customer tariffs, not Fal account charges. They were derived conservatively from public Fal rate tables on November 21, 2026; confirm actual usage/margins during staging before production release.

The competitor screenshot's FREE, -70%, 10+ credits, and latency estimates
are **not** our prices or service-level commitments. Pricing decisions are
independent of the Fal API rate. Actual billing must be checked against Fal's
pricing API and a real, authorized staging run before enabling any unpriced
model in production. Promotion pricing must not be treated as permanent.

## Verified provider references

- https://fal.ai/models/bytedance/seedance-2.0/fast/image-to-video/api
- https://fal.ai/models/bytedance/seedance-2.0/mini/text-to-video/api
- https://fal.ai/models/bytedance/seedance-2.5/flash/image-to-video/api
- https://fal.ai/models/minimax/h3-max-turbo/text-to-video/api
- https://fal.ai/models/minimax/h3-max/text-to-video/api
- https://fal.ai/models/kling/v4/text-to-video/api
- https://fal.ai/models/kling/v4/flash/image-to-video/api
- https://fal.ai/models/fal-ai/kling-video/v3/turbo/standard/image-to-video/api
- https://fal.ai/models/minimax/h3-image/text-to-image/api
- https://fal.ai/models/minimax/h3-image/highspeed/edit/api
- https://fal.ai/docs/documentation/model-apis/pricing

## Release verification

1. Run all generator unit tests, production build and feature typecheck.
2. Verify Video dropdown contains Seedance variants, MiniMax H3 and Kling
   variants; Image dropdown contains Nano Banana, H3 Image and FLUX models.
3. For every paid-enabled new model, test submission, polling, R2 output,
   credits, failure/unknown status and My Creations in a controlled environment.
4. Before enabling disabled models: approve actual endpoint params, unit
   pricing and maximum charged cost. Expand duration/resolution/audio options
   only when cost and capability constraints are confirmed.
5. Do not merge/deploy based on unit tests alone; no provider calls are made
   by this implementation and the existing Genjutsu business APIs are untouched.
