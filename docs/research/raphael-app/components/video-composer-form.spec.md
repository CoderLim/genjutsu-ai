# Video Composer Form Specification

## Overview

- **Target file:** `src/components/generator/GeneratorForm.tsx` (+ compact upload in `MediaUploader.tsx`)
- **Screenshot:** `docs/design-references/raphael-app/video-form-desktop.png`, user crop `assets/image-deec8bad-…`
- **Source:** https://raphael.app/?mode=video
- **Interaction model:** click-driven (tabs, dropdowns, toggles)
- **Scope:** Visual clone of the generator card only. Keep existing `/api/generator/*` submit/upload/poll logic unchanged. Do not restyle SiteHeader/Footer or page chrome.

## DOM Structure

```
ComposerCard (white, radius 22px, soft shadow)
├── Header row
│   ├── Tabs: Image | Video(+ Free badge) — active has terracotta underline
│   └── AI Enhance label + switch (checked = terracotta track)
├── Body row
│   ├── Reference slot (dashed vertical box, + / "Reference Optional")
│   └── Prompt textarea (borderless, placeholder muted)
└── Toolbar row (wrap)
    ├── Model pill (icon + name + chevron) → dropdown
    ├── Settings pill (aspect · duration · resolution · count) → popover groups
    ├── Workflow pill (e.g. First Frame) → dropdown of workflows
    ├── Sound switch (when generateAudio field exists)
    ├── Fast switch (when fastMode / promptExpansionMode exists)
    └── Generate CTA pill (credits; disabled = grey translucent)
```

## Computed Styles (from getComputedStyle on live page)

### Outer card

- maxWidth: 1128px
- borderRadius: 22px (`--composer-radius`)
- boxShadow: `0 24px 60px -18px rgba(24,14,16,0.09), 0 6px 18px -6px rgba(24,14,16,0.04)`
- Outer wrapper may be transparent; inner surface: `background: #fff`, `border: 1px solid rgba(20,17,18,0.086)`, padding ~`2px 8px`

### Design tokens (scoped to composer; do not rewrite global theme)

- Accent / Free badge / switch ON: `rgb(176, 72, 69)` ≈ `#b04845`
- Foreground: `rgb(18, 15, 16)`
- Muted tab: `rgb(102, 92, 95)`
- Pill bg: `rgba(20, 17, 18, 0.043)`
- Pill text: `rgba(18, 15, 16, 0.85)`
- Generate disabled bg: `rgba(20, 17, 18, 0.07)` / text `rgba(20, 17, 18, 0.34)`
- Font: Inter / system sans, 14px controls, 14px prompt

### Tabs

- height ~44px, fontWeight 500, gap 8px icons
- Active: dark text + 2px terracotta underline
- Free badge: bg `#b04845`, white, 9px bold, radius 4px, px-1 py-0.5

### AI Enhance / Sound / Fast switches

- Track ~28×16 (sm), radius full
- Checked track: accent `#b04845`
- Unchecked: grey input

### Reference slot

- ~68×96, dashed border, centered + and "Reference Optional" / "Up to N"
- Compact vertical; not a full-width uploader grid

### Toolbar pills

- height 28px, radius 9999px, padding 0 8px, bg pill, text 12–13px
- Settings summary: `{aspect} {duration}s {resolution} {count}`
- Generate: height 32px, padding 0 14px, font-semibold; enabled uses accent fill + white text; `active:scale-95`

## States & Behaviors

### Image / Video tabs

- **Trigger:** click
- Image → navigate `/ai-image-generator` (or existing image route)
- Video → stay / navigate `/photo-to-video` or `/ai-video-generator`
- Only Video pressed on this page

### Model dropdown

- Lists catalog models for current `mediaType`
- Selecting calls existing `setModel`

### Settings popover

- Groups for fields present in workflow: aspectRatio, duration, resolution, outputCount (and other enum fields except booleans)
- Clicking option calls `setParam`
- Summary pill updates immediately

### Workflow dropdown

- Shown when `Object.keys(model.workflows).length > 1`
- Labels from `workflow.label` (First Frame / Start & End / …)

### Sound

- Binds `generateAudio` boolean field when present

### Fast / AI Enhance

- If `promptExpansionMode`: Enhance ON → `balanced` (or `quality`), OFF → `disabled`; Fast ON → `fast`
- If `fastMode` boolean: bind Fast directly
- If neither field: omit toggles (no fake backend params)

### Generate

- Disabled when `!canSubmit` (empty prompt / busy / no quote)
- Shows credit count from `quote.credits`
- onClick → existing `onGenerate`

## Assets

- Lucide icons: Image, Clapperboard / Film, Plus, ChevronDown, Coins / Sparkles, Ratio / Clock etc. as needed
- No remote Raphael assets required

## Text Content (video mode)

- Tabs: `Image`, `Video`, badge `Free`
- `AI Enhance`
- Reference empty: `Reference Optional` (or slot label when required)
- Placeholder: `Describe the video you want to generate...`
- Sound / Fast labels
- Generate + credit number

## Responsive

- **Desktop:** single card, toolbar horizontal, reference left of prompt
- **Mobile (~390):** stack; generate full-width; toolbar wraps (`flex-wrap`); reference above prompt

## Backend constraint

- Do **not** change `src/modules/generator/*`, `src/routes/api/generator/*`, or submit/upload/status contracts
- Only restyle client form wiring to the same `mutate` / `setParam` / `onFiles` / `onGenerate` handlers
