# SiteHeader Specification

## Overview

- **Target file:** `src/components/landing/SiteHeader.tsx`
- **Screenshot:** `docs/design-references/raphael-desktop-top.png`
- **Interaction model:** click/hover-driven mega-menus; mobile hamburger

## DOM Structure

```
section.relative.z-[260].py-3
  div.md:max-w-7xl.mx-auto.px-4
    nav.hidden.justify-between.lg:flex  (desktop)
      div.flex.items-center.gap-6
        Logo link (img logo-64.webp + "Raphael AI" text primary color)
        Nav triggers: AI Image, AI Video, AI Photo Editor, AI Models, AI Tools (chevron-down)
        Pricing link
      div.shrink-0.flex.gap-2.items-center
        Upgrade pill (gradient bronze, -50% red badge)
        Globe button
        Sign in button (bg home-control-accent #cc905c-ish)
    div.block.lg:hidden  (mobile bar)
```

## Computed Styles

### Container section

- padding: 12px 0; height 64px; z-index 260; position relative; color rgb(237,234,222)

### Inner

- maxWidth 1280px; padding 0 16px; display via child nav flex space-between gap 16px

### Nav trigger buttons

- fontSize 14px; fontWeight 500; padding 8px 16px; borderRadius 6px; color foreground

### Upgrade

- height 28px; borderRadius 9999px; fontSize 11px; fontWeight 600; color rgb(36,23,15)
- boxShadow: rgba(221,126,66,0.16) 0 6px 16px
- Badge -50%: red #e05256

### Sign in

- backgroundColor rgb(204,144,92); padding 8px 16px; borderRadius 10px; fontSize 14px; fontWeight 500; color rgb(247,246,243)

## States & Behaviors

### Mega menus

- **Trigger:** hover or click on nav items with ChevronDown
- **Behavior:** dropdown panel with links (title + description); chevron rotates 180° on open
- Menus content from live site (AI Image / Video / Photo Editor / Models / Tools) — see PAGE_TOPOLOGY / navigate.md

### Hover

- Nav items: subtle bg muted
- Sign in: darken to home-control-accent-hover

## Assets

- `/logo-64.webp`
- Icons: ChevronDownIcon, GlobeIcon, MenuIcon from `@/components/icons`

## Text Content (verbatim)

- Brand: Raphael AI
- Nav: AI Image, AI Video, AI Photo Editor, AI Models, AI Tools, Pricing
- Upgrade, -50%, Sign in

## Responsive

- **Desktop (≥1024):** full nav flex
- **Mobile (<1024):** hamburger + logo + Sign in; sheet/drawer for links
