# Gangnam Style AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `/gangnam-style-ai` — three-photo objects-swap against a fixed Gangnam-style template, on the shared `/api/genjutsu/*` pipeline, with Coldplay-style Preview (4s @ 480p) and Full generate.

**Architecture:** Clone the Coldplay Kiss Cam product pattern: module (`constants` / `assert` / `provider`) + generator panel + thin route. Register `gangnam-style-ai` on the Genjutsu product allowlist so attempt/upload-url/seal/generate resolve the server template and Seedance objects-swap target via `resolveProductProviderTarget` (today: WaveSpeed). Full runs upload exactly 3 images; preview uploads trimmed video + 3 images.

**Tech Stack:** TanStack Start routes, existing genjutsu modules, WaveSpeed/Higgsfield Seedance 2.5 video-edit via env router, Paraglide i18n, `node --import tsx --test`.

**Spec:** `docs/superpowers/specs/2026-10-21-gangnam-style-ai-design.md`

---

## File map

| File                                                                   | Responsibility                                        |
| ---------------------------------------------------------------------- | ----------------------------------------------------- |
| `src/modules/genjutsu/workflow.ts`                                     | Product id constant + allowlist                       |
| `src/modules/genjutsu/types.ts`                                        | `GenjutsuProductId` union                             |
| `src/modules/gangnam-style-ai/constants.ts`                            | Prompt, aspect, resolutions, duration, template paths |
| `src/modules/gangnam-style-ai/provider.ts`                             | `resolveProductProviderTarget` + binding assert       |
| `src/modules/gangnam-style-ai/assert.ts`                               | Full + preview input lock (3 images)                  |
| `src/modules/gangnam-style-ai/*.test.ts`                               | Unit tests                                            |
| `src/config/index.ts`                                                  | Optional R2 template key env                          |
| `src/modules/genjutsu/storage.ts`                                      | Template key + ensure + switch cases                  |
| `src/routes/api/genjutsu/{attempt,upload-url,seal-inputs,generate}.ts` | Product branches; **upload-url must allow 3 images**  |
| `public/videos/gangnam-style-ai-tpl.mp4` (+ poster)                    | Local template + seed source                          |
| `src/components/landing/GangnamStyleAiGeneratorPanel.tsx`              | UI (clone Coldplay → 3 slots)                         |
| `src/routes/gangnam-style-ai.tsx`                                      | Minimal page shell                                    |
| `src/routes/sitemap[.]xml.ts`                                          | Index new path                                        |
| `messages/{en,ja,ko,de,es,fr,pt-BR}.json`                              | Minimal `site.gangnam.*` keys                         |

---

### Task 1: Register product id

**Files:**

- Modify: `src/modules/genjutsu/workflow.ts`
- Modify: `src/modules/genjutsu/types.ts`
- Modify: `src/modules/genjutsu/product-provider.test.ts`
- Modify: `src/modules/genjutsu/product-template-key.test.ts` (list only — storage wired in Task 5)

- [ ] **Step 1: Add product constant and allowlist**

In `workflow.ts`, after `COLDPLAY_KISS_CAM_PRODUCT`:

```ts
export const GANGNAM_STYLE_AI_PRODUCT = 'gangnam-style-ai' as const;
```

Extend `isGenjutsuProductId`:

```ts
value === COLDPLAY_KISS_CAM_PRODUCT || value === GANGNAM_STYLE_AI_PRODUCT;
```

In `types.ts` union:

```ts
  | 'coldplay-kiss-cam'
  | 'gangnam-style-ai';
```

- [ ] **Step 2: Update product-provider allowlist test**

In `product-provider.test.ts`, add:

```ts
assert.equal(isGenjutsuProductId(GANGNAM_STYLE_AI_PRODUCT), true);
```

(import `GANGNAM_STYLE_AI_PRODUCT` from `./workflow`). Add a test mirroring Coldplay:

```ts
test('gangnam-style-ai follows the mode env router', () => {
  envConfigs.genjutsu_product_provider = '';
  envConfigs.genjutsu_object_swap_provider = 'seedance-wavespeed';
  try {
    assert.deepEqual(
      resolveProductProviderTarget(GANGNAM_STYLE_AI_PRODUCT, 'objects-swap'),
      resolveGenjutsuProviderTarget('objects-swap')
    );
  } finally {
    envConfigs.genjutsu_product_provider = originalProduct;
    envConfigs.genjutsu_object_swap_provider = originalObjectSwap;
  }
});
```

(Reuse the file’s existing `originalProduct` / `originalObjectSwap` restore pattern.)

- [ ] **Step 3: Run allowlist tests**

Run: `node --import tsx --test src/modules/genjutsu/product-provider.test.ts`

Expected: PASS (product-template-key test still fails until Task 5 if you add Gangnam to `ALL_PRODUCTS` early — **do not** add to `ALL_PRODUCTS` until Task 5).

- [ ] **Step 4: Commit**

```bash
git add src/modules/genjutsu/workflow.ts src/modules/genjutsu/types.ts src/modules/genjutsu/product-provider.test.ts
git commit -m "feat(gangnam): register genjutsu product id"
```

---

### Task 2: Module constants

**Files:**

- Create: `src/modules/gangnam-style-ai/constants.ts`

- [ ] **Step 1: Write constants**

```ts
import type { HiggsfieldSeedanceAspectRatio } from '@/modules/genjutsu/seedance-higgsfield';
import type { GenjutsuMode } from '@/modules/genjutsu/types';
import { GANGNAM_STYLE_AI_PRODUCT } from '@/modules/genjutsu/workflow';

export const GANGNAM_STYLE_AI_PRODUCT_ID = GANGNAM_STYLE_AI_PRODUCT;

export const GANGNAM_STYLE_AI_MODE: GenjutsuMode = 'objects-swap';

export const GANGNAM_STYLE_AI_TEMPLATE_PATH = `/api/genjutsu/template?product=${GANGNAM_STYLE_AI_PRODUCT_ID}`;
export const GANGNAM_STYLE_AI_TEMPLATE_POSTER_PATH =
  '/videos/gangnam-style-ai-tpl-poster.jpg';

/** ffprobe duration of public/videos/gangnam-style-ai-tpl.mp4 */
export const GANGNAM_STYLE_AI_TEMPLATE_DURATION_SECONDS = 19.176825;

export const GANGNAM_STYLE_AI_ASPECT_RATIO: HiggsfieldSeedanceAspectRatio =
  '16:9';

export const GANGNAM_STYLE_AI_RESOLUTIONS = ['480p', '720p'] as const;
export type GangnamStyleAiResolution =
  (typeof GANGNAM_STYLE_AI_RESOLUTIONS)[number];
export const GANGNAM_STYLE_AI_DEFAULT_RESOLUTION: GangnamStyleAiResolution =
  '480p';

export function isGangnamStyleAiResolution(
  value: unknown
): value is GangnamStyleAiResolution {
  return value === '480p' || value === '720p';
}

/**
 * Logical references only. buildSeedanceWorkflowPrompt maps Reference N
 * onto the active provider tokens. Cues identify ORIGINAL cast only.
 * Slot order: left → center → right (Reference 1/2/3).
 */
export const GANGNAM_STYLE_AI_DEFAULT_PROMPT = [
  'In the original source video, identify the three dancers by position and distinctive visual cues:',
  '',
  'Person A (left): originally wearing a white ribbed tank top and a gold necklace. Replace Person A with Reference 1.',
  '',
  'Person B (center / lead): originally wearing a plaid or check short-sleeve shirt, closest to the camera and most prominent. Replace Person B with Reference 2.',
  '',
  'Person C (right): originally wearing a dark short-sleeve shirt with grey or white hair. Replace Person C with Reference 3.',
  '',
  'These cues identify the ORIGINAL dancers only; they are NOT appearance instructions for the replacements.',
  '',
  'Replace ALL THREE original people completely with their assigned references throughout the entire video. Mid-clip solo or close-up shots of the left dancer are still Person A (Reference 1). Mid-clip solo or close-up shots of the right dancer are still Person C (Reference 3). Do not treat those close-ups as new people.',
  '',
  'Keep the three replacements visually distinct and consistent through wide shots, close-ups, occlusions, turns, and camera cuts. Never swap, merge, or confuse the three assignments.',
  '',
  'Preserve the source motion, timing, camera work, plaza/night environment, and lighting. All three original people must be visibly replaced.',
].join('\n');

export const LEGACY_GANGNAM_STYLE_AI_PROMPTS = [] as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/gangnam-style-ai/constants.ts
git commit -m "feat(gangnam): add product constants and fixed prompt"
```

---

### Task 3: Provider resolver (TDD)

**Files:**

- Create: `src/modules/gangnam-style-ai/provider.test.ts`
- Create: `src/modules/gangnam-style-ai/provider.ts`

- [ ] **Step 1: Write failing provider tests**

Copy `src/modules/coldplay-kiss-cam/provider.test.ts` → `provider.test.ts`, then rename:

- `ColdplayKissCam` → `GangnamStyleAi`
- `resolveColdplayKissCamProviderTarget` → `resolveGangnamStyleAiProviderTarget`
- `assertColdplayKissCamProviderBinding` → `assertGangnamStyleAiProviderBinding`
- `ColdplayKissCamProviderBindingError` → `GangnamStyleAiProviderBindingError`
- Import from `./provider` and keep Crazy Frog / Smalltown override comparisons unchanged

- [ ] **Step 2: Run tests — expect FAIL**

Run: `node --import tsx --test src/modules/gangnam-style-ai/provider.test.ts`

Expected: FAIL (module not found / exports missing)

- [ ] **Step 3: Implement provider**

Copy `src/modules/coldplay-kiss-cam/provider.ts` → `provider.ts`, replace names, and call:

```ts
return resolveProductProviderTarget(
  GANGNAM_STYLE_AI_PRODUCT,
  GANGNAM_STYLE_AI_MODE
);
```

Import `GANGNAM_STYLE_AI_PRODUCT` from `@/modules/genjutsu/workflow` and `GANGNAM_STYLE_AI_MODE` from `./constants`. Error messages: `Gangnam Style AI ...`.

- [ ] **Step 4: Run tests — expect PASS**

Run: `node --import tsx --test src/modules/gangnam-style-ai/provider.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/modules/gangnam-style-ai/provider.ts src/modules/gangnam-style-ai/provider.test.ts
git commit -m "feat(gangnam): add Seedance product provider binding"
```

---

### Task 4: Assert inputs (TDD) — three images + preview

**Files:**

- Create: `src/modules/gangnam-style-ai/assert.test.ts`
- Create: `src/modules/gangnam-style-ai/assert.ts`

- [ ] **Step 1: Write failing assert tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSeedanceWorkflowPrompt } from '@/modules/genjutsu/workflow';

import {
  assertGangnamStyleAiInputs,
  GangnamStyleAiPreflightError,
} from './assert';
import {
  GANGNAM_STYLE_AI_ASPECT_RATIO,
  GANGNAM_STYLE_AI_DEFAULT_PROMPT,
  GANGNAM_STYLE_AI_MODE,
  GANGNAM_STYLE_AI_PRODUCT_ID,
} from './constants';

const validOptions = {
  product: GANGNAM_STYLE_AI_PRODUCT_ID,
  mode: GANGNAM_STYLE_AI_MODE,
  prompt: GANGNAM_STYLE_AI_DEFAULT_PROMPT,
  useDefaultTemplate: true,
  aspectRatio: GANGNAM_STYLE_AI_ASPECT_RATIO,
  resolution: '480p',
  imageKeys: [
    'genjutsu/u/g/reference-01.jpg',
    'genjutsu/u/g/reference-02.jpg',
    'genjutsu/u/g/reference-03.jpg',
  ],
  contentTypes: ['image/jpeg', 'image/jpeg', 'image/jpeg'],
  contentLengths: [1000, 1200, 1100],
};

test('accepts the fixed Gangnam Style AI template binding', () => {
  assert.doesNotThrow(() => assertGangnamStyleAiInputs(validOptions));
});

test('accepts a 480p trimmed preview clip plus three images', () => {
  assert.doesNotThrow(() =>
    assertGangnamStyleAiInputs({
      ...validOptions,
      preview: true,
      useDefaultTemplate: false,
      resolution: '480p',
      videoKey: 'genjutsu/u/g/source.mp4',
      contentTypes: ['video/mp4', 'image/jpeg', 'image/jpeg', 'image/jpeg'],
      contentLengths: [400000, 1000, 1200, 1100],
    })
  );
});

test('rejects motion-transfer mode', () => {
  assert.throws(
    () =>
      assertGangnamStyleAiInputs({
        ...validOptions,
        mode: 'motion-transfer',
      }),
    GangnamStyleAiPreflightError
  );
});

test('rejects prompt tampering', () => {
  assert.throws(
    () =>
      assertGangnamStyleAiInputs({
        ...validOptions,
        prompt: 'custom prompt',
      }),
    GangnamStyleAiPreflightError
  );
});

test('rejects wrong aspect, resolution, and image count', () => {
  assert.throws(
    () => assertGangnamStyleAiInputs({ ...validOptions, aspectRatio: '4:3' }),
    GangnamStyleAiPreflightError
  );
  assert.throws(
    () => assertGangnamStyleAiInputs({ ...validOptions, resolution: '1080p' }),
    GangnamStyleAiPreflightError
  );
  assert.throws(
    () =>
      assertGangnamStyleAiInputs({
        ...validOptions,
        imageKeys: ['a.jpg', 'b.jpg'],
        contentTypes: ['image/jpeg', 'image/jpeg'],
        contentLengths: [1000, 1200],
      }),
    GangnamStyleAiPreflightError
  );
});

test('rejects preview that still uses the default template', () => {
  assert.throws(
    () =>
      assertGangnamStyleAiInputs({
        ...validOptions,
        preview: true,
        useDefaultTemplate: true,
        videoKey: 'genjutsu/u/g/source.mp4',
        contentTypes: ['video/mp4', 'image/jpeg', 'image/jpeg', 'image/jpeg'],
        contentLengths: [400000, 1000, 1200, 1100],
      }),
    GangnamStyleAiPreflightError
  );
});

test('product prompt uses Reference N, not provider image tokens', () => {
  assert.match(GANGNAM_STYLE_AI_DEFAULT_PROMPT, /Reference 1/);
  assert.match(GANGNAM_STYLE_AI_DEFAULT_PROMPT, /Reference 2/);
  assert.match(GANGNAM_STYLE_AI_DEFAULT_PROMPT, /Reference 3/);
  assert.doesNotMatch(GANGNAM_STYLE_AI_DEFAULT_PROMPT, /@Image/);
  assert.doesNotMatch(GANGNAM_STYLE_AI_DEFAULT_PROMPT, /@图像/);
});

test('workflow prompt still injects provider tokens around the product prompt', () => {
  const body = buildSeedanceWorkflowPrompt({
    userPrompt: GANGNAM_STYLE_AI_DEFAULT_PROMPT,
    mode: 'objects-swap',
    imageCount: 3,
  });
  assert.match(body, /Reference 1/);
  assert.match(body, /@Image1|@Image 1|@图像1/);
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `node --import tsx --test src/modules/gangnam-style-ai/assert.test.ts`

- [ ] **Step 3: Implement assert**

Copy `src/modules/coldplay-kiss-cam/assert.ts` → `assert.ts`. Rename all Coldplay symbols to Gangnam. Change counts:

- Full: `imageKeys.length !== 3`; `contentTypes.length !== 3`; loop `i < 3`
- Preview: `imageKeys.length !== 3`; `contentTypes.length !== 4` / `contentLengths.length !== 4`; image type loop `i = 1; i < 4`
- Aspect error message: `fixed 16:9 aspect ratio`
- Product label strings: `Gangnam Style AI`

Export `isAllowedGangnamStyleAiPrompt` like Coldplay.

- [ ] **Step 4: Run — expect PASS**

Run: `node --import tsx --test src/modules/gangnam-style-ai/assert.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/modules/gangnam-style-ai/assert.ts src/modules/gangnam-style-ai/assert.test.ts
git commit -m "feat(gangnam): assert three-image full and preview inputs"
```

---

### Task 5: Storage + config template key

**Files:**

- Modify: `src/config/index.ts`
- Modify: `src/modules/genjutsu/storage.ts`
- Modify: `src/modules/genjutsu/product-template-key.test.ts`

- [ ] **Step 1: Add env config**

In `src/config/index.ts` after Coldplay key:

```ts
  // Gangnam Style AI (server-only). Fixed R2 template; client uploads three images.
  gangnam_style_ai_template_video_key:
    procEnv.GANGNAM_STYLE_AI_TEMPLATE_VIDEO_KEY ??
    'genjutsu/templates/gangnam-style-ai-v1.mp4',
```

- [ ] **Step 2: Add storage helpers + switch cases**

Mirror Coldplay in `storage.ts`:

```ts
export function getGangnamStyleAiTemplateVideoKey() {
  return (
    envConfigs.gangnam_style_ai_template_video_key?.trim() ||
    'genjutsu/templates/gangnam-style-ai-v1.mp4'
  );
}

export async function ensureGangnamStyleAiTemplateInR2() {
  return ensureGenjutsuPublicTemplateInR2({
    key: getGangnamStyleAiTemplateVideoKey(),
    localRelative: 'public/videos/gangnam-style-ai-tpl.mp4',
    label: 'Gangnam Style AI',
  });
}
```

In both `getGenjutsuProductTemplateVideoKey` and `ensureGenjutsuProductTemplateInR2` switches, add:

```ts
    case 'gangnam-style-ai':
      return getGangnamStyleAiTemplateVideoKey(); // or ensureGangnamStyleAiTemplateInR2()
```

- [ ] **Step 3: Extend product-template-key tests**

Add `GANGNAM_STYLE_AI_PRODUCT` to `ALL_PRODUCTS` and:

```ts
assert.match(
  getGenjutsuProductTemplateVideoKey(GANGNAM_STYLE_AI_PRODUCT),
  /gangnam-style-ai/
);
```

- [ ] **Step 4: Run tests**

Run: `node --import tsx --test src/modules/genjutsu/product-template-key.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/config/index.ts src/modules/genjutsu/storage.ts src/modules/genjutsu/product-template-key.test.ts
git commit -m "feat(gangnam): wire R2 template key for product"
```

---

### Task 6: Wire `/api/genjutsu/*` (critical: 3-image upload counts)

**Files:**

- Modify: `src/routes/api/genjutsu/attempt.ts`
- Modify: `src/routes/api/genjutsu/upload-url.ts`
- Modify: `src/routes/api/genjutsu/seal-inputs.ts`
- Modify: `src/routes/api/genjutsu/generate.ts`

**Reference:** Copy every Coldplay branch and rename; then apply the upload-count diffs below. Do not invent a parallel API.

- [ ] **Step 1: attempt.ts**

Import Gangnam assert/constants. After Coldplay block, add identical mode / resolution / prompt checks for `isGangnamStyleAi`. `resolveProductProviderTarget(product, mode)` already covers allowlisted products — no extra target logic.

- [ ] **Step 2: upload-url.ts — three-image counts**

Add imports + `isGangnamStyleAi`. Extend flags:

```ts
const isGangnamStyleAi = product === GANGNAM_STYLE_AI_PRODUCT_ID;
const isProductPreview =
  (isCrazyFrog ||
    isA2oLiteAi ||
    isEnzoFernandezAi ||
    isFlyingCarAi ||
    isColdplayKissCam ||
    isGangnamStyleAi) &&
  body.preview === true;
const isFixedTemplateProduct =
  (isSmalltown ||
    isCrazyFrog ||
    isA2oLiteAi ||
    isEnzoFernandezAi ||
    isFlyingCarAi ||
    isColdplayKissCam ||
    isGangnamStyleAi) &&
  !isProductPreview;

const FIXED_TEMPLATE_TRIPLE_IMAGE_COUNT = 3;
const fixedTemplateImageCount = isSingleImageProduct
  ? FIXED_TEMPLATE_SINGLE_IMAGE_COUNT
  : isGangnamStyleAi
    ? FIXED_TEMPLATE_TRIPLE_IMAGE_COUNT
    : FIXED_TEMPLATE_DUAL_IMAGE_COUNT;
```

In preview validation, set:

```ts
const previewImageCount = isSingleImageProduct ? 1 : isGangnamStyleAi ? 3 : 2;
```

Update productLabel ternary to include Gangnam. Add mode/resolution/prompt guards like Coldplay. Add `assertGangnamStyleAiProviderBinding` when `existing` task. Add `GANGNAM_STYLE_AI_ASPECT_RATIO` to both `productAspectRatio` and preview `aspectRatio` ternaries.

Preview error copy for Gangnam: `one trimmed video plus three reference images`.

- [ ] **Step 3: seal-inputs.ts**

Extend `sharedTemplateKey` chain:

```ts
                : product === GANGNAM_STYLE_AI_PRODUCT_ID
                  ? getGangnamStyleAiTemplateVideoKey()
                  : getZombieHugTemplateVideoKey(templateAspectRatio);
```

(Insert before the zombie fallback; keep Coldplay branch.)

- [ ] **Step 4: generate.ts**

After Coldplay block:

```ts
if (product === GANGNAM_STYLE_AI_PRODUCT_ID) {
  if (!task) {
    throw new GangnamStyleAiPreflightError(
      'Gangnam Style AI generation must start from a saved attempt'
    );
  }
  assertGangnamStyleAiInputs(taskOptions);
  assertGangnamStyleAiProviderBinding(task.provider, task.model);
}
```

Add `GANGNAM_STYLE_AI_PRODUCT_ID` to the task-bound provider group:

```ts
(product === A2O_LITE_AI_PRODUCT_ID ||
  product === ENZO_FERNANDEZ_AI_PRODUCT_ID ||
  product === FLYING_CAR_AI_PRODUCT_ID ||
  product === COLDPLAY_KISS_CAM_PRODUCT_ID ||
  product === GANGNAM_STYLE_AI_PRODUCT_ID) &&
  task;
```

Add aspect branch:

```ts
                : product === GANGNAM_STYLE_AI_PRODUCT_ID
                  ? GANGNAM_STYLE_AI_ASPECT_RATIO
                  : undefined;
```

- [ ] **Step 5: Typecheck / unit smoke**

Run:

```bash
node --import tsx --test src/modules/gangnam-style-ai/*.test.ts src/modules/genjutsu/product-provider.test.ts src/modules/genjutsu/product-template-key.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/routes/api/genjutsu/attempt.ts src/routes/api/genjutsu/upload-url.ts src/routes/api/genjutsu/seal-inputs.ts src/routes/api/genjutsu/generate.ts
git commit -m "feat(gangnam): wire genjutsu API for three-image product"
```

---

### Task 7: Template video + poster assets

**Files:**

- Create: `public/videos/gangnam-style-ai-tpl.mp4`
- Create: `public/videos/gangnam-style-ai-tpl-poster.jpg`

- [ ] **Step 1: Install template from downloaded Reel**

If `tmp/gangnam-style-tpl.mp4` exists from design work:

```bash
cp tmp/gangnam-style-tpl.mp4 public/videos/gangnam-style-ai-tpl.mp4
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 public/videos/gangnam-style-ai-tpl.mp4
```

Confirm duration ≈ `19.176825` (already in constants). If missing, re-download:

```bash
opencli instagram download "https://www.instagram.com/reel/DermA0Co6qv/" --output public/videos/gangnam-style-ai-tpl.mp4 -f json
```

- [ ] **Step 2: Extract poster**

```bash
ffmpeg -y -ss 1 -i public/videos/gangnam-style-ai-tpl.mp4 -frames:v 1 -q:v 2 public/videos/gangnam-style-ai-tpl-poster.jpg
```

- [ ] **Step 3: Commit**

```bash
git add public/videos/gangnam-style-ai-tpl.mp4 public/videos/gangnam-style-ai-tpl-poster.jpg
git commit -m "feat(gangnam): add template video and poster assets"
```

---

### Task 8: Generator panel (clone Coldplay → 3 slots)

**Files:**

- Create: `src/components/landing/GangnamStyleAiGeneratorPanel.tsx`
- Modify: `messages/en.json` (+ other locales in Task 9 if preferred together)

- [ ] **Step 1: Copy panel**

```bash
cp src/components/landing/ColdplayKissCamGeneratorPanel.tsx \
  src/components/landing/GangnamStyleAiGeneratorPanel.tsx
```

- [ ] **Step 2: Mechanical renames**

Replace throughout the new file:

| From                                    | To                                                     |
| --------------------------------------- | ------------------------------------------------------ |
| `ColdplayKissCam`                       | `GangnamStyleAi`                                       |
| `coldplay-kiss-cam`                     | `gangnam-style-ai`                                     |
| `COLDPLAY_KISS_CAM_`                    | `GANGNAM_STYLE_AI_`                                    |
| `@/modules/coldplay-kiss-cam/constants` | `@/modules/gangnam-style-ai/constants`                 |
| `frontPhoto` / `backPhoto`              | keep temporarily — next step replaces with three slots |
| `site.kisscam.*` keys used in panel     | `site.gangnam.*` (add keys in Task 9)                  |

Keep `PREVIEW_DURATION_SECONDS = 4` and preview trim flow.

- [ ] **Step 3: Expand to three photo slots**

Replace the two-slot state with:

```ts
const [leftPhoto, setLeftPhoto] = useState<MediaItem | null>(null);
const [centerPhoto, setCenterPhoto] = useState<MediaItem | null>(null);
const [rightPhoto, setRightPhoto] = useState<MediaItem | null>(null);
```

Upload order for generate (full): `[leftPhoto.file, centerPhoto.file, rightPhoto.file]`  
Preview media: `[clipFile, left, center, right]`

`canGenerate`: all three non-null.  
`setSlotFile` / `clearSlot` union: `'left' | 'center' | 'right'`.  
UI: three upload tiles labeled via `m['site.gangnam.slot_left']()`, `slot_center`, `slot_right` (and short notes if Coldplay had them).

Credit estimate: use `GANGNAM_STYLE_AI_TEMPLATE_DURATION_SECONDS` and `GANGNAM_STYLE_AI_ASPECT_RATIO` (`16:9`).

Loader/provider prop: same pattern as Coldplay (`creditProvider` from route loader via `resolveGangnamStyleAiProviderTarget()`).

- [ ] **Step 4: Smoke TypeScript on the panel**

Run: `pnpm exec tsc --noEmit -p . 2>&1 | head -40`  
(or project’s usual typecheck). Fix any rename misses.

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/GangnamStyleAiGeneratorPanel.tsx
git commit -m "feat(gangnam): add three-slot generator panel with preview"
```

---

### Task 9: Route, i18n, sitemap

**Files:**

- Create: `src/routes/gangnam-style-ai.tsx`
- Modify: `messages/en.json`, `messages/ja.json`, `messages/ko.json`, `messages/de.json`, `messages/es.json`, `messages/fr.json`, `messages/pt-BR.json`
- Modify: `src/routes/sitemap[.]xml.ts`

- [ ] **Step 1: Minimal i18n keys (all 7 locale files)**

Add at least (English shown; other locales may use English placeholders this round — match Flying Car / Coldplay limited-locale practice for SEO-ish strings):

```json
  "site.gangnam.meta_title": "Gangnam Style AI — Dance Video Maker | Genjutsu",
  "site.gangnam.meta_description": "Upload three photos and replace the dancers in the Gangnam Style AI template. Preview in seconds, then generate the full clip.",
  "site.gangnam.hero_badge": "Gangnam Style · dance video · 3 photos",
  "site.gangnam.hero_title": "Gangnam Style AI",
  "site.gangnam.hero_description": "Upload three photos to replace the left, center, and right dancers in the template video.",
  "site.gangnam.slot_left": "Left dancer",
  "site.gangnam.slot_left_note": "Reference 1 · white tank in the original",
  "site.gangnam.slot_center": "Center lead",
  "site.gangnam.slot_center_note": "Reference 2 · plaid shirt, closest to camera",
  "site.gangnam.slot_right": "Right dancer",
  "site.gangnam.slot_right_note": "Reference 3 · dark shirt, grey hair",
  "site.gangnam.need_photos": "Add all three photos to generate",
  "site.gangnam.generator_title": "Create your clip"
```

Reuse shared `site.generator.preview*` / resolution strings — do not duplicate.

- [ ] **Step 2: Minimal route**

Create `src/routes/gangnam-style-ai.tsx` based on Coldplay but **without** full SEO sections / FAQ JSON-LD this round:

```tsx
import { createFileRoute } from '@tanstack/react-router';

import { resolveGangnamStyleAiProviderTarget } from '@/modules/gangnam-style-ai/provider';
import { absoluteUrl, localeLinks, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { GangnamStyleAiGeneratorPanel } from '@/components/landing/GangnamStyleAiGeneratorPanel';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';

const PAGE_PATH = '/gangnam-style-ai';
const OG_IMAGE = '/videos/gangnam-style-ai-tpl-poster.jpg';

export const Route = createFileRoute('/gangnam-style-ai')({
  loader: () => {
    const locale = getLocale();
    const { provider } = resolveGangnamStyleAiProviderTarget();
    return {
      title: m['site.gangnam.meta_title']({}, { locale }),
      description: m['site.gangnam.meta_description']({}, { locale }),
      creditProvider: provider,
    };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: loaderData.title },
          { name: 'description', content: loaderData.description },
          ...socialMeta({
            title: loaderData.title,
            description: loaderData.description,
            url: absoluteUrl(PAGE_PATH),
            image: absoluteUrl(OG_IMAGE),
          }),
          ...localeLinks(PAGE_PATH),
        ]
      : [],
  }),
  component: GangnamStyleAiPage,
});

function GangnamStyleAiPage() {
  const { creditProvider } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-[hsl(28_25%_9%)] text-[rgb(237,234,222)]">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pt-10 pb-16">
        <p className="text-sm text-white/60">
          {m['site.gangnam.hero_badge']()}
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight md:text-5xl">
          {m['site.gangnam.hero_title']()}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-white/70">
          {m['site.gangnam.hero_description']()}
        </p>
        <section id="generator" className="mt-10">
          <h2 className="sr-only">{m['site.gangnam.generator_title']()}</h2>
          <GangnamStyleAiGeneratorPanel creditProvider={creditProvider} />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
```

Adjust `socialMeta` / `localeLinks` / `SiteFooter` import shapes to match the current Coldplay route exactly if the snippet above drifts — prefer copying Coldplay’s loader/head and deleting SEO section components.

- [ ] **Step 3: Sitemap**

In `STATIC_PATHS` add `'/gangnam-style-ai'`. In `LIMITED_STATIC_PATH_LOCALES` add:

```ts
  '/gangnam-style-ai': [baseLocale],
```

- [ ] **Step 4: Dev route tree**

Run `pnpm dev` briefly or `pnpm build` so TanStack regenerates `routeTree.gen.ts` including `/gangnam-style-ai`. Commit generated route tree if the project tracks it.

- [ ] **Step 5: Commit**

```bash
git add src/routes/gangnam-style-ai.tsx src/routes/sitemap\[.\]xml.ts messages/*.json src/routeTree.gen.ts
git commit -m "feat(gangnam): add landing route, i18n shell, and sitemap"
```

---

### Task 10: Verify build + manual smoke checklist

- [ ] **Step 1: Unit tests**

```bash
node --import tsx --test src/modules/gangnam-style-ai/*.test.ts src/modules/genjutsu/product-provider.test.ts src/modules/genjutsu/product-template-key.test.ts
```

Expected: all PASS

- [ ] **Step 2: Production build**

```bash
pnpm build
```

Expected: success

- [ ] **Step 3: Manual smoke (local)**

1. Open `/gangnam-style-ai` — template preview plays from `/api/genjutsu/template?product=gangnam-style-ai`
2. Upload 3 distinct photos (left / center / right)
3. Preview → ~4s result, 480p credit quote
4. Full → full ~19s result at chosen resolution
5. Confirm mid-clip close-ups still map to left/right refs (visual QA)

- [ ] **Step 4: Final commit if any fixups**

```bash
git add -A
git commit -m "fix(gangnam): address build or smoke follow-ups"
```

(Only if there are changes.)

---

## Spec coverage self-review

| Spec requirement                                | Task                     |
| ----------------------------------------------- | ------------------------ |
| Route `/gangnam-style-ai`, product id           | 1, 9                     |
| `objects-swap` + `resolveProductProviderTarget` | 3, 6                     |
| 16:9, 480p/720p                                 | 2, 4, 6, 8               |
| Exactly 3 images                                | 4, 6 (upload counts!), 8 |
| Preview 4s @ 480p                               | 4, 6, 8                  |
| Fixed prompt `Reference 1/2/3`                  | 2, 4                     |
| Template R2 + public assets                     | 5, 7                     |
| `/api/genjutsu/*` only                          | 6                        |
| Minimal SEO shell                               | 9                        |
| No FixedTemplate extract                        | 8 (clone file)           |

**Placeholder scan:** none intentional.  
**Type consistency:** `GANGNAM_STYLE_AI_PRODUCT` / `_PRODUCT_ID` / `GangnamStyleAi*` naming matches Coldplay pattern throughout.
