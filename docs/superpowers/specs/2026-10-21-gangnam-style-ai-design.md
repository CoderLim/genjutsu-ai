# Gangnam Style AI — design

`/gangnam-style-ai`：用户上传三张参考图，依次替换固定模版视频里的三个人物。复用 `/api/genjutsu/*`（`attempt → upload-url → upload → seal-inputs → generate → status`），不新增独立产品 API，不改首页 / Crazy Frog / A2O / Coldplay 等现有页行为。

本轮交付主体功能（generator + preview）；完整 SEO 文案稍后另给。

---

## 1. Decisions (locked)

| Topic              | Choice                                                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Approach           | Clone Coldplay / A2O product-page pattern (module + panel + thin route)                                                                      |
| Route / product id | `/gangnam-style-ai` · `gangnam-style-ai`                                                                                                     |
| Mode               | `objects-swap`                                                                                                                               |
| Provider           | `resolveProductProviderTarget` (same as Coldplay / current A2O). Local env today: `seedance-wavespeed` → `bytedance/seedance-2.5/video-edit` |
| Aspect ratio       | Fixed `16:9` (source ~1276×718)                                                                                                              |
| Resolution         | `480p` \| `720p`, UI default `480p`; no 1080p                                                                                                |
| Photos             | Exactly **3** `image/*`                                                                                                                      |
| Template           | Server-owned `useDefaultTemplate` for full runs                                                                                              |
| Preview            | Yes — same as Coldplay: client trims first **4s**, upload trimmed clip + 3 images, force `480p`                                              |
| Prompt tokens      | Logical `Reference 1/2/3` only (no hard-coded `@Image` / `@图像`)                                                                            |
| SEO                | Minimal shell this round; full FAQ / HowTo / examples later                                                                                  |
| Shared framework   | Do **not** extract a FixedTemplate panel                                                                                                     |

### Photo slot order (user choice B — left → center → right)

| Slot        | UI label (provisional) | Original-cast cues (identify only)                                                        |
| ----------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| Reference 1 | Left dancer            | White ribbed tank top + gold necklace; mid-clip close-ups of this person stay Reference 1 |
| Reference 2 | Center lead            | Plaid/check short-sleeve shirt, closest to camera, most screen time                       |
| Reference 3 | Right dancer           | Dark short-sleeve shirt, grey/white hair; mid-clip close-ups stay Reference 3             |

---

## 2. Scope

### In

- Module `src/modules/gangnam-style-ai/` (`constants`, `assert`, `provider` + tests)
- `GangnamStyleAiGeneratorPanel` cloned from Coldplay (3 slots + Preview + Full)
- Route `src/routes/gangnam-style-ai.tsx` — SiteHeader + panel + short title; placeholder SEO strings
- Wire product into genjutsu allowlist / types / storage template key / attempt / upload-url / seal-inputs / generate
- Template assets: `public/videos/gangnam-style-ai-tpl.mp4` + poster; R2 key `genjutsu/templates/gangnam-style-ai-v1.mp4`
- Sitemap entry for `/gangnam-style-ai`
- Minimal `site.gangnam.*` i18n keys in all locale message files the project maintains

### Out

- Parallel `/api/gangnam-*` upload/seal/generate chain
- Custom user prompt
- 1080p
- Full marketing SEO sections / demo gallery (later)
- Changing other products’ providers or pricing

---

## 3. Product lock

`assertGangnamStyleAiInputs` runs on generate (and preview). attempt / upload-url reject illegal mode / resolution for this product early. Generate trusts **task options**, not only the request body.

| Field       | Value                                                                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| product     | `gangnam-style-ai`                                                                                                                           |
| mode        | `objects-swap`                                                                                                                               |
| aspectRatio | `16:9`                                                                                                                                       |
| resolution  | `480p` \| `720p` (full); preview **must** be `480p`                                                                                          |
| images      | Exactly 3                                                                                                                                    |
| full run    | `useDefaultTemplate: true`, no client video upload                                                                                           |
| preview     | `preview: true`, `useDefaultTemplate` not true, `videoKey` = trimmed clip, `contentTypes`/`contentLengths` length **4** (1 video + 3 images) |
| prompt      | Exact current formal prompt, or (later) entries in `LEGACY_GANGNAM_STYLE_AI_PROMPTS` (strict equality)                                       |

Provider binding: `resolveGangnamStyleAiProviderTarget()` → `resolveProductProviderTarget(GANGNAM_STYLE_AI_PRODUCT, 'objects-swap')`. Persist provider/model on attempt; upload-url / generate must not rebind from env. `assertGangnamStyleAiProviderBinding` accepts any Seedance-family objects-swap pair for the task’s provider (same as Coldplay — in-flight jobs survive provider env switches).

---

## 4. Pipeline & template

Canonical chain (homepage parity):

1. `POST /api/genjutsu/attempt`
2. `POST /api/genjutsu/upload-url`
3. Upload media
4. `POST /api/genjutsu/seal-inputs`
5. `POST /api/genjutsu/generate`
6. Poll `GET /api/genjutsu/status`

**Template**

- Source: Instagram Reel `DermA0Co6qv` (downloaded for analysis; ship copy under `public/videos/`)
- Duration constant: `19.176825` seconds (`ffprobe`)
- Local: `public/videos/gangnam-style-ai-tpl.mp4`, poster `public/videos/gangnam-style-ai-tpl-poster.jpg`
- R2 default: `genjutsu/templates/gangnam-style-ai-v1.mp4` (optional env override key, same pattern as Coldplay)
- Preview URL: `/api/genjutsu/template?product=gangnam-style-ai` (same key seal uses)
- Local Node may seed R2 from `public/videos/...`; Cloudflare Workers missing object fails loudly

**Credits**

- Full: `estimateGenjutsuCreditsForProvider({ provider, durationSeconds: 19.176825, resolution, aspectRatio: '16:9' })`
- Preview: same helper with `durationSeconds: 4`, `resolution: '480p'`, `aspectRatio: '16:9'`
- Server charges from the task-bound provider quote

**Preview client behavior** (mirror Coldplay)

- `trimVideoToFile` from template URL, `endSeconds: 4`
- Validate trimmed duration ∈ `[4 - 0.01, 4 + 0.2]`
- Upload order: trimmed video, then images 1→2→3
- UI: Preview button + Full generate; preview result labeled distinctly

---

## 5. Prompt

Product constants use logical references only. Outfit/hair cues describe the **original** cast, not replacement appearance. Generic replacement / motion preservation stay in `buildSeedanceWorkflowPrompt`.

Draft formal prompt (implement as `GANGNAM_STYLE_AI_DEFAULT_PROMPT`; refine wording only if tests/smoke need it):

```text
In the original source video, identify the three dancers by position and distinctive visual cues:

Person A (left): originally wearing a white ribbed tank top and a gold necklace. Replace Person A with Reference 1.

Person B (center / lead): originally wearing a plaid or check short-sleeve shirt, closest to the camera and most prominent. Replace Person B with Reference 2.

Person C (right): originally wearing a dark short-sleeve shirt with grey or white hair. Replace Person C with Reference 3.

These cues identify the ORIGINAL dancers only; they are NOT appearance instructions for the replacements.

Replace ALL THREE original people completely with their assigned references throughout the entire video. Mid-clip solo or close-up shots of the left dancer are still Person A (Reference 1). Mid-clip solo or close-up shots of the right dancer are still Person C (Reference 3). Do not treat those close-ups as new people.

Keep the three replacements visually distinct and consistent through wide shots, close-ups, occlusions, turns, and camera cuts. Never swap, merge, or confuse the three assignments.

Preserve the source motion, timing, camera work, plaza/night environment, and lighting. All three original people must be visibly replaced.
```

`LEGACY_GANGNAM_STYLE_AI_PROMPTS = []` at first ship.

---

## 6. UI & i18n

- Panel: clone `ColdplayKissCamGeneratorPanel` → three photo slots (left / center / right), resolution toggle, Preview + Generate, result player/download
- Page: `SiteHeader` + hero-lite title + `#generator` panel; no full SEO sections yet
- Sign-in callback: `/gangnam-style-ai#generator`
- Add `/gangnam-style-ai` to sitemap
- Messages: minimal `site.gangnam.*` (title, slot labels, need-three-photos, etc.) in every maintained locale file; reuse shared `site.generator.preview*` strings where possible

---

## 7. Wiring checklist

| Area                                                              | Change                                                                          |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `workflow.ts`                                                     | `GANGNAM_STYLE_AI_PRODUCT` + `isGenjutsuProductId`                              |
| `types.ts`                                                        | `GenjutsuProductId` union member                                                |
| `storage.ts`                                                      | get/ensure template key + switch cases                                          |
| `attempt.ts` / `upload-url.ts` / `seal-inputs.ts` / `generate.ts` | product branches (assert, prompt allow, provider binding, template)             |
| `product-provider.test.ts` / `product-template-key.test.ts`       | cover new product                                                               |
| Module tests                                                      | assert full + preview; provider binding; prompt uses `Reference N` not `@Image` |
| Route + panel + assets + sitemap + i18n                           | as above                                                                        |

---

## 8. Error handling

- Wrong image count / types → clear preflight errors (mirror Coldplay wording, “exactly three”)
- Preview without trimmed video / wrong resolution → reject
- Prompt mismatch → reject (strict equality)
- Missing R2 template on Workers → loud error with key + local path hint
- Provider not Seedance-family on persisted task → binding error

---

## 9. Testing

- Unit: assert (full 3-image; preview video+3 images @480p; reject 2 images; reject wrong aspect; reject custom prompt)
- Unit: provider follows `resolveProductProviderTarget`; binding accepts Seedance-family pairs
- Manual smoke: Preview 4s then Full at 480p with three distinct faces; confirm left/center/right mapping

---

## 10. Non-goals / follow-ups

- Full SEO copy, example gallery, OG art polish — user-supplied later
- Uploading production R2 template is an ops step if Workers deploy before local seed
- Do not rename other products or change global `GENJUTSU_*_PROVIDER` defaults in this work
