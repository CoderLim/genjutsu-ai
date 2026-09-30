# WorkspaceSidebar Specification

## Overview

- **Target file:** `src/components/landing/WorkspaceSidebar.tsx`
- **Screenshots:**
  - `docs/design-references/text-to-image/live-sidebar-desktop.png`
  - `docs/design-references/text-to-image/live-sidebar-collapsed.png`
  - `docs/design-references/text-to-image/live-sidebar-expanded-all.png`
  - Clone before fix: `docs/design-references/text-to-image/clone-sidebar-desktop.png`
- **Source URL:** https://raphael.app/app/image/text-to-image
- **Interaction model:** click-driven — collapse toggle, category chevron expand/collapse; default open: `image` + `models` on text-to-image

## DOM Structure

```
aside (240px expanded / 68px collapsed)
  header.h-14 (border-b)
    Link logo 24×24 + "Raphael AI" text-[15px] font-semibold
    button Collapse/Expand (PanelLeftClose / PanelLeftOpen) h-7 w-7
  nav (overflow-y-auto py-4/lg:py-5 px-2/lg:px-3 scrollbar-hide)
    Create entry → /app  (Plus icon + "Create") h-10 mb-3
    categories space-y-1
      row: category link (icon 18px + label) + chevron toggle h-8 w-8
      nested (when open): ml-3 border-l border-white/[0.08] pl-3 space-y-0.5
        tool links text-[12px] with 14px icons
      for models category: Image Models / Video Models section labels + model links
  footer (border-t py-3 px-3)
    Upgrade gradient button h-9 + absolute -50% badge
    row: spacer | Globe locale | Sign In (primary)
```

## Computed Styles (from getComputedStyle)

### Aside

- width: 240px (expanded) / 68px (collapsed)
- height: 100dvh; position: sticky; top: 0
- background: rgba(93, 70, 56, 0.16); backdrop-filter: blur(24px)
- border-right: 1px solid rgba(46, 38, 31, 0.15)
- color: rgb(237, 234, 222)
- transition: width 200ms ease-out
- classes: `hidden h-[100dvh] flex-col border-r border-border/15 bg-[rgba(93,70,56,0.16)] backdrop-blur-xl transition-[width] duration-200 ease-out lg:sticky lg:top-0 lg:flex lg:shrink-0 lg:w-[240px]`

### Header

- h-14; border-b border-border/15; px-2 lg:px-3; justify-between
- Logo img: h-6 w-6; wordmark: text-[15px] font-semibold (hidden when collapsed)
- Collapse btn: h-7 w-7 rounded-md text-foreground/30 hover:bg-muted/40 hover:text-foreground/60

### Create entry

- h-10 w-full rounded-lg; bg-white/[0.05]; text-foreground/68; text-[13px] font-medium
- gap-2.5; Plus icon h-[18px] w-[18px] text-primary/80
- hover: bg-muted/30 text-foreground/90
- mb-3

### Category row

- Category link: h-10 flex-1 rounded-lg gap-2.5 px-2.5 py-[9px] text-[13px]
- Inactive: font-normal text-foreground (via foreground/default)
- Active (current section): `bg-primary/12 font-medium text-primary` (rgb(204,144,92))
- Icon: lucide h-[18px] w-[18px]
- Chevron toggle: h-8 w-8; inactive text-foreground/40; active text-primary; svg rotate-180 when open

### Nested tools

- Container: `ml-3 space-y-0.5 border-l border-white/[0.08] pl-3`
- Link: `flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px]`
- Inactive: text-foreground/58 hover:bg-white/[0.04] hover:text-foreground/88
- Active: `bg-primary/10 text-primary`
- Tool icons: h-3.5 w-3.5 opacity-70

### Model links

- `relative flex items-center gap-1.5 rounded-md py-1.5 pl-2 pr-2 text-[12px] text-foreground/58 hover:bg-white/[0.04] hover:text-foreground/88`
- Logo img: h-3.5 w-3.5 rounded-[3px] object-contain OR emoji span h-3.5 w-3.5 text-[13px]
- Section label: `px-2 pb-0.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-foreground/52 first:pt-0`

### Badges

- NEW: h-[17px] rounded-[4px] px-[5px] text-[8px] font-black uppercase tracking-[0.04em] bg-primary/20 text-primary + inset shadow
- Sale (-30%): same shell but `bg-[#e05256] text-white`

### Footer Upgrade

- h-9 rounded-xl; bg linear-gradient(135deg, #f0b06b, #d77b42)
- text-[#24170f] font-semibold text-[13px]; Sparkles icon h-3.5
- shadow: 0 8px 18px rgba(221,126,66,0.18)
- -50% badge: absolute -right-1.5 -top-3 h-4 min-w-[2.6rem] rounded-[5px] bg-[#e05256] text-[9px] font-black text-white

### Footer auth row

- Globe button: h-8 w-8 rounded-lg text-foreground/40
- Sign In: h-10 rounded-[10px] bg rgb(204,144,92) text rgb(247,246,243) text-sm font-medium px-4

## Categories & Children (verbatim)

### AI Image (lucide-image) → /ai-image-generator

- Text to Image → /app/image/text-to-image (lucide-type) — map local `/text-to-image`
- Image to Image → /app/image/image-to-image (lucide-image-plus)

### AI Video (lucide-video) → /ai-video-generator

- Text to Video → /app/video/text-to-video (lucide-file-video)
- Image to Video → /app/video/image-to-video (lucide-clapperboard)

### AI Image Edit (lucide-sparkles) → /ai-image-editor

- Image Templates → /app/image/templates (lucide-layout-grid)
- Image Expand → /uncrop (lucide-expand)
- Remove Background → /background-remover (lucide-eraser)
- Image Upscaler NEW → /image-upscaler (custom upscale SVG)

### AI Tools (lucide-wrench) →

- AI 3D Model Generator → https://fast3d.io (lucide-boxes, external)
- AI Voice Cloning → https://anyvoice.net (lucide-mic, external)
- AI Lip Sync Video → https://fameo.ai (lucide-clapperboard, external)

### AI Models (lucide-boxes) → /ai-models

Nested with Image Models / Video Models labels + model list (logos/emoji + badges).

## Image Models

| Label              | href                 | icon         | badge |
| ------------------ | -------------------- | ------------ | ----- |
| Nano Banana 2 Lite | /nano-banana-2-lite  | 🍌           | NEW   |
| GPT Image 2        | /gpt-image-2         | openai.svg   |       |
| Nano Banana 2      | /nano-banana-2       | 🍌           |       |
| Seedream 5.0 Pro   | /seedream-5-pro      | seedream.svg | -30%  |
| Seedream 5.0 Lite  | /seedream-5          | seedream.svg |       |
| Seedream 4.5       | /seedream-4-5        | seedream.svg |       |
| Seedream 4.0       | /seedream-4          | seedream.svg |       |
| Nano Banana Pro    | /nano-banana-pro     | 🍌           |       |
| Nano Banana        | /nano-banana         | 🍌           |       |
| Seedream 3.5 Pro   | /raphael-image-model | seedream.svg |       |

## Video Models

| Label                 | href               | icon               | badge |
| --------------------- | ------------------ | ------------------ | ----- |
| Seedance 2.0 Mini     | /seedance-2-mini   | seedance.svg       | NEW   |
| Seedance 1.5 Pro      | /seedance-1-5      | seedance.svg       |       |
| Seedance 1.0 Pro Fast | /seedance-1        | seedance.svg       |       |
| Seedance 2.0          | /seedance-2        | seedance.svg       |       |
| Veo 3.1               | /veo-3-1           | google-g.svg       |       |
| Kling 3.0 Turbo       | /kling-3-turbo     | kling-official.png | NEW   |
| Kling 3.0             | /kling-3           | kling-official.png |       |
| Seedance 1.0 Turbo    | /raphael-video-pro | seedance.svg       |       |

## States & Behaviors

### Collapse sidebar

- **Trigger:** header button title "Collapse sidebar" / "Expand sidebar"
- **Expanded:** `lg:w-[240px]`; show wordmark, labels, nested, models, full footer
- **Collapsed:** `lg:w-[68px]`; icon-only Create + categories; hide chevrons/nested/models; footer compact
- **Transition:** width 200ms ease-out

### Category expand

- **Trigger:** chevron button next to category (not the category link itself)
- **Open:** chevron `rotate-180`; nested panel visible
- **Default on /text-to-image:** `image` and `models` open

## Gaps vs previous clone (must fix)

1. Missing collapse control and 68px rail mode
2. "Create" was a section label — live site is a Plus entry button
3. Missing lucide icons on categories and nested tools
4. Missing chevron expand for Video / Edit / Tools / Models children
5. Missing nested children for Video, Image Edit, Tools
6. Model rows missing logos / banana emoji (emoji baked into label string instead)
7. Footer was History + flat Upgrade — live is gradient Upgrade + Globe + Sign In
8. Active styles wrong (brown fill vs primary/12 + primary text)
9. Nested missing left border rail

## Responsive

- Desktop ≥1024: sticky aside visible
- Below lg: aside `hidden` (mobile uses other chrome — out of this component’s expanded scope for now)
