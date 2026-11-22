# Composer Spacing Align (video mode)

## Overview

- **Source:** https://raphael.app/?mode=video (live getComputedStyle, 2026-11-22)
- **Screenshot:** `docs/design-references/raphael-app/video-form-spacing-ref.png`
- **Target:** `GeneratorForm.tsx` spacing only — do not change field set or submit linkage
- **Interaction model:** N/A (layout)

## Exact spacing (desktop)

| Region      | Classes / values                                                            |
| ----------- | --------------------------------------------------------------------------- |
| Card        | radius 22px; pad `2px 8px`; shadow soft dual; border `rgba(20,17,18,0.086)` |
| Header wrap | `-mx-2 -mt-0.5`; inner `px-4`, `gap-x-3 gap-y-1`, `items-end`, `border-b`   |
| Tabs        | height 44px; pad `8px 4px`; gap between tabs `12–20px` (`gap-3 sm:gap-5`)   |
| Body shell  | pad `12px 12px 4px` (`p-2 sm:p-3` + tighter bottom)                         |
| Body row    | `min-h-[124px] sm:min-h-[144px]`; gap `8px / 12px` (`gap-2 sm:gap-3`)       |
| Upload      | `68×96`; col `pt-1 sm:pt-2`                                                 |
| Textarea    | min-height 96px; font 14/20; placeholder px-2                               |
| Toolbar     | pad `4px 8px 8px` (`pt-1 px-2 pb-2`); controls gap 8px; align end           |

## Scope guard

Keep model/settings/workflow/switches/generate behavior unchanged. Only padding, gaps, min-heights, and structural wrappers for spacing.
