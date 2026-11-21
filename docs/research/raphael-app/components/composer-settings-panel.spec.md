# Composer Settings Panel Specification

## Overview

- **Target:** `src/components/generator/ComposerPanels.tsx` (shared Image + Video)
- **Screenshot:** `docs/design-references/raphael-app/image-settings-open.png`, user crop `assets/image-9d63c40f-…`
- **Interaction model:** click-driven popover above toolbar trigger
- **Constraint:** Image and Video share the same field primitives; only field set differs by catalog

## Shared primitives (must reuse)

### `ComposerSegmentedField` (Output Number / Resolution / Format / Video Length / …)

- Row: `display:flex; align-items:center; justify-content:space-between; gap:12px`
- Label: `10px / 500 / rgb(102,92,95)` left
- Track: `bg rgb(245,243,243)`, `border-radius:11px`, `padding:2px`, `gap:2px`, inline-flex
- Option: `border-radius:9px`, `min height ~28-32px`, transparent when idle
- Selected: `bg #fff`, shadow `0 2px 8px rgba(24,14,16,0.08), 0 0 0 1px rgba(20,17,18,0.06)`

### `ComposerAspectRatioField`

- Label above (same 10px muted)
- Options: `h-9`, `rounded-[10px]`, column glyph + `11px` ratio text
- Selected: white + same shadow as segmented selected
- Idle: transparent

## Panel shell

- Width `min(100vw-2rem, 392px)`
- White surface, soft outer shadow, `rounded-2xl`, padding ~10–12px
- Opens above settings trigger (`bottom-full`)

## Per-mode fields (from our catalog, styled identically)

- **Image:** aspectRatio, outputCount, (resolution if present), outputFormat
- **Video:** aspectRatio, duration (as Video Length), resolution, outputCount

## Display labels

| field        | UI label      |
| ------------ | ------------- |
| aspectRatio  | Aspect Ratio  |
| outputCount  | Output Number |
| resolution   | Resolution    |
| outputFormat | Output Format |
| duration     | Video Length  |

## Backend

No catalog/API changes required for styling. Bind existing `onSetParam`.
