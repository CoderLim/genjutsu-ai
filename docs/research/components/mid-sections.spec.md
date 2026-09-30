# Mid Sections Specification (Tools, Models, Inspired, Features, Advanced)

## AiImageTools — `src/components/landing/AiImageTools.tsx`

- Interaction: static + hover
- H2 "AI Image Tools"
- 5 cards horizontal: Image Editor, Remove Background, Image Expand, Image Upscaler, Transform Style
- Images: `/images/app-tools/*.webp`, upscaler uses `/images/comparison-high.webp`
- Cards: rounded-xl overflow, image + label below; hover slight lift
- Links: /ai-image-editor, /background-remover, /uncrop, /image-upscaler, /image-templates
- Responsive: row on md+, horizontal scroll or wrap on mobile

## TopModels — `src/components/landing/TopModels.tsx`

- H2 "Top AI Image & Video Models"
- Cards with name, badge (NEW/HOT/-30%/COMING), description, optional logo
- Models (verbatim):
  1. Seedance 2.0 Mini NEW — Lower-cost drafts with rich reference control. → /seedance-2-mini
  2. GPT Image 2 HOT — Precise prompts, clean text, product shots. → /gpt-image-2
  3. 🍌Nano Banana 2 Lite NEW — Fast 1K generation and editing for 11 credits. → /nano-banana-2-lite
  4. Seedream 5.0 Pro -30% — Professional 1K/2K generation and multi-reference editing. → /seedream-5-pro
  5. Seedance 2.0 — Smooth motion and natural choreography. → /seedance-2
  6. Veo 3.1 — Native audio, 4K output, cinematic realism. → /veo-3-1
  7. 🍌Nano Banana 2 — Multi-reference edits with fast style control. → /nano-banana-2
  8. Kling 3.0 Turbo NEW — Faster short-form text and first-frame video generation. → /kling-3-turbo
  9. Seedance 2.5 COMING — Coming soon: next-generation video model.
- Grid or horizontal scroll of rounded cards on dark bg

## GetInspired — `src/components/landing/GetInspired.tsx`

- Interaction: time-driven CSS `animate-scroll` vertical marquee
- H2 "Get Inspired" + subtitle "Get inspired by what others are creating with Raphael"
- Masonry columns of `/example-images/1.webp`…`16.webp`
- Columns use class `animate-scroll` (defined in globals.css)
- Overlay CTAs: "Try a style" / "Discover something new" → /image-templates
- min-h ~700–820px

## KeyFeatures — `src/components/landing/KeyFeatures.tsx` id=feature

- H2 "Key Features of Raphael AI Image Generator"
- Subtitle: Experience the next generation...
- 6 cards 2×3 grid:
  Zero-Cost Creation, State-of-the-Art Quality, Advanced Text Understanding,
  Lightning-Fast Generation, Enhanced Privacy Protection, Multi-Style Support
- Full verbatim descriptions from live site (see navigate.md)

## AdvancedFeatures — `src/components/landing/AdvancedFeatures.tsx`

- Interaction: click tabs (aria-selected)
- Tabs: Lightning Fast Generation | Precise Creative Control | Versatile Style Engine
- Active tab shows title, description, CTA "Try Raphael AI", image `/imgs/feature108-1-v2.webp`
- For non-active tabs reuse same image with different copy (from site or matching tone)
