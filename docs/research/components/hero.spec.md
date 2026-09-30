# Hero + Generator Specification

## Overview

- **Target files:** `src/components/landing/Hero.tsx`, `src/components/landing/GeneratorPanel.tsx`
- **Screenshot:** `docs/design-references/raphael-desktop-top.png`
- **Interaction model:** click-driven (Image/Video toggle, form controls — mock UI, no real generation)

## DOM Structure

```
Hero wrapper (centered)
  logo 48px + H1 "Free AI Image Generator - " + span.primary "Raphael AI"
  subtitle
  badge row: 100% Free | Powered by GPT Image 2 | No Login Required | Unlimited Generations
  mode toggle: AI Image (active bronze) | AI Video
  GeneratorPanel (large rounded dark card)
    Reference upload dashed box + textarea + AI Enhance switch
    toolbar: Seedream 3.5 | 1:1 | 2 | 0.5K | Low | Fast Mode | Style | Generate
  Promo banner (Seedream 5.0 Pro / GPT Image 2)
```

## Computed Styles

### H1

- fontSize 40px; fontWeight 700; lineHeight 46px; letterSpacing -1px; color rgb(237,234,222); display flex; gap 4px 8px

### Body/page

- background rgb(32,25,19)

### Badges

- outline pills, orange/primary text, small rounded-full border

### Mode toggle

- centered pill group; active = primary bronze fill

### GeneratorPanel

- large rounded-2xl card, bg card/muted, border border
- textarea placeholder: "Describe the image you want to generate..."
- Generate button: primary/home-accent

### Promo

- image `/images/promo/gpt-image-2-banner-desktop.webp` (mobile: banner-mobile)
- or text banner "Seedream 5.0 Pro is here · Limited time · 30% off" + Try button

## States

- Image vs Video toggle switches label/placeholder (mock)
- Fast Mode switch, AI Enhance switch
- Controls are visual only (dropdowns can be static buttons)

## Assets

- `/logo.webp`, promo banners, seedream.svg for model icon

## Responsive

- H1 scales down on mobile (~28–32px)
- Generator stacks; toolbar wraps / horizontal scroll
- Promo uses mobile banner < md
