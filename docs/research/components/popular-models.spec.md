# PopularModels (Text-to-Image) Specification

## Overview

- **Target file:** `src/components/landing/PopularModels.tsx`
- **Used by:** `src/routes/text-to-image.tsx`
- **Screenshot (live):** user attachment / `docs/design-references/text-to-image/`
- **Interaction model:** click → model page; hover lift + image scale

## DOM Structure

```
section.-mx-2.py-14.sm:-mx-6.md:py-20.lg:-mx-10...
  div.mx-auto.mb-10.max-w-4xl.text-center.md:mb-12
    h2 Popular Models
  ul.grid.grid-cols-1.gap-5.sm:grid-cols-2.lg:grid-cols-4.lg:gap-6
    li.h-full × 4
      a.block.h-full
        div.group.relative.flex.h-full.flex-col.gap-4 (hover:-translate-y-1.5)
          div.relative.aspect-[4/3]...rounded-[22px] (cover)
            img.object-cover (hover:scale-[1.04])
          div.min-h-[52px].px-1.sm:px-2
            p description
```

## Content

| Name | href | cover | caption |
| GPT Image 2 | /gpt-image-2 | /images/model-guides/gpt-image-2.webp | Precise prompts, clean text, product shots. |
| Nano Banana 2 | /nano-banana-2 | .../nano-banana-2.webp | Multi-reference edits with fast style control. |
| Seedream 5.0 | /seedream-5 | .../seedream-5.webp | Cinematic realism and dramatic lighting. |
| Seedream 3.5 Pro | /raphael-image-model | .../seedream-3-5-pro.webp | Consistent portraits and brand visuals. |
