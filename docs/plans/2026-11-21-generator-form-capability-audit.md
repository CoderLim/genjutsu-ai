# Unified generator form capability audit

Branch: `feat/unified-ai-generator-20261121`  
Scope: Video and Image composer menus, workflows, upload slots, controls, credit quote and provider request mapping.  
Status: **Code corrected and contract tests added; no paid provider end-to-end run verified.**

## Principles

- The **model** menu lists enabled model variants only; workflow/mode is a different control.
- The **workflow** menu only lists actual supported modes. First Frame requires a start image; Start & End requires both images; Text to Video requires neither.
- Switching models/workflows retains only semantically compatible assets/settings. Unsupported slots are dropped.
- Settings are derived from the selected model and workflow, not shared blindly across brands.
- Client pricing uses the same catalog calculator as the server. Rates are **product credit tariffs**, not provider USD costs.
- Disabled/unpriced models are excluded even from development UI, not silently mapped to a different endpoint.

## Video capabilities available in the composer

| Model | Workflows | Duration / resolution choices | Other inputs or switches |
| --- | --- | --- | --- |
| Seedance 2.0 | First Frame, Start & End, Text, Multi-Image, All-in-One (different WaveSpeed profiles collapsed in the model menu) | 4–15s / 480p, 720p, 1080p, 4k | Sound; mixed references in All-in-One, Web Search there |
| Seedance 2.0 Fast | First Frame, Start & End, Text | 4–15s / 480p, 720p | Sound |
| Seedance 2.0 Mini | First Frame, Start & End, Text | 4–15s / 480p, 720p | Sound |
| Seedance 2.5 | First Frame, Start & End, Text | 4–30s / 480p, 720p | Sound |
| Seedance 2.5 Flash | First Frame, Start & End, Text | 4–30s / 480p, 720p | Sound |
| MiniMax H3 | First Frame, Start & End, Text | 5–15s / 480P, 768P, 2K, 4K | Prompt Expansion: disabled, fast, balanced, quality |
| MiniMax H3 Max Turbo / H3 Max | First Frame, Start & End, Text | 5–15s / **768P only in this product tariff** | Prompt Expansion: disabled, balanced, quality; no Fast switch |
| Kling 4.0 | First Frame, Start & End, Text | 3–30s / 720p, 1080p | 4k/HDR intentionally not exposed without approved pricing |
| Kling 4.0 Flash | **First Frame, Text only** | 3–20s / 720p | Image-to-Video endpoint does not accept end frame |
| Kling 3.0 Turbo | **First Frame, Text only** | 3–15s / fixed 720p | JPEG/PNG input; image-to-video uses `image_url`, no end image |
| Kling 3.0 (Pro) | First Frame, Start & End, Text | 3–15s / fixed 1080p | Sound |

MiniMax **H3 Turbo** is not MiniMax **H3 Max Turbo**. The former has no independently verified endpoint or approved pricing in this repository and is disabled/hidden; the latter is an enabled Fal integration.

For first-image workflows, the aspect ratio follows the supplied frame; the text-only workflow may expose a supported aspect-ratio setting.

## Image capabilities

| Model | Workflows | Options | References |
| --- | --- | --- | --- |
| Nano Banana 2 / Pro | Text to Image, Image Edit | 1K/2K/4K; 1–4 outputs; PNG/JPEG/WebP; model-supported aspect ratios | 1–14 images in edit mode |
| MiniMax H3 Image / Highspeed | Text to Image, Image Edit | 1K/2K/4K; 1–4 outputs; PNG/JPEG/WebP; constrained aspect ratios | 1–16 images in edit mode |
| FLUX.1 Schnell | Text to Image | Aspect ratio; 1–4 outputs; PNG/JPEG | None |
| FLUX.2 Flash | Image Edit | Aspect ratio; 1–4 outputs; PNG/JPEG | 1–4 images |

MiniMax H3 Image custom sizes are normalized to the Fal minimum area of 655,360 pixels. Actual Fal usage is token-based and customer prices still need verification on account invoices.

## Confirmed defects fixed in this audit

1. Do not show disabled MiniMax H3 Turbo or unpriced reference-preview models as normal selectable options during local development.
2. Do not offer Start & End on Kling V3 Turbo Standard or Kling V4 Flash image-to-video. The former uses `image_url`, unlike Kling V3 Pro and V4 `start_image_url`.
3. Only expose Fast prompt expansion when its allowed enum includes `fast`; H3 Max variants use disabled/balanced/quality only.
4. Show the full Prompt Expansion enum in Settings so `quality` is accessible and can be selected without normalization undoing it.
5. Scope image upload types to the selected provider (Kling V3 Turbo supports JPEG/PNG). Add 21:9 for text-video profiles where provider schemas permit it.
6. Add an enabled-model × declared-workflow contract test covering form validation, calculated credits, provider routing and request payload construction.

## Still unverified / intentionally out of scope

- No real Fal/WaveSpeed charge, complete/poll/R2 persistence, failure/refund, or Cloudflare deployment test has been run by this audit. Run controlled staging smoke tests before production.
- The `/photo-to-video` route retains its dedicated heading even when the shared composer lets the user switch to text or image generation; this is a separate route/SEO product decision.
- Provider-specific image dimension checks (e.g. Kling minimum 300px on each side) are currently enforced by the provider, not a client-side pixel-size validator.
- Upper tiers beyond the specifically priced catalog (e.g. Kling V4 4K) are intentionally not selectable. Do not display unsupported price/availability promises.
- Single-choice fixed outputs are still visible in the shared settings bar; this is informational rather than a user-selectable capability.

## References

- https://fal.ai/models/fal-ai/kling-video/v3/turbo/standard/image-to-video/api
- https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video/api
- https://fal.ai/models/kling/v4/flash/image-to-video/api
- https://fal.ai/models/kling/v4/image-to-video/api
- https://fal.ai/models/minimax/h3/image-to-video/api
- https://fal.ai/models/minimax/h3-max/image-to-video/api
- https://fal.ai/models/minimax/h3-max-turbo/image-to-video/api
- https://fal.ai/models/minimax/h3-image/edit/api
- https://fal.ai/models/fal-ai/nano-banana-2/edit/api
- https://wavespeed.ai/docs/docs-api/bytedance/bytedance-seedance-2.0-text-to-video
