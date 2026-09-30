# Raphael.app Homepage Behaviors

## Scroll sweep

- Header does **not** become sticky/fixed; remains in document flow (`position: relative`, z-index 260).
- No scroll-snap on page.
- No Lenis / smooth-scroll library.
- **Get Inspired** masonry columns use CSS class `animate-scroll` — continuous vertical marquee.
- **Style Discovery** (`Try a style` / `Discover something new`) is a **separate sibling section below** the gallery — not an absolute overlay.
- Testimonials section uses multi-column/row marquee of quote cards (time-driven).
- **Sticky composer:** when `#hero-generator` leaves the viewport, a fixed bottom collapsed bar appears (`z-70`, max-width 820px). Click expands to full generator panel (`z-75`) at the bottom; Escape / Collapse closes it.

## Click sweep

| Element                                               | Behavior                                                                                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Nav: AI Image / Video / Photo Editor / Models / Tools | Opens mega-menu dropdown with links + descriptions                                                                          |
| Upgrade                                               | Links to pricing / upgrade flow                                                                                             |
| Sign in                                               | Auth modal or /sign-in                                                                                                      |
| Hero Image/Video toggle                               | Switches generator mode (active = bronze pill)                                                                              |
| Generator controls                                    | Model/aspect/count/resolution/quality/fast/style — dropdowns/toggles (UI mock OK)                                           |
| Generate                                              | Would submit — mock only                                                                                                    |
| Promo banner Try                                      | Navigates to model page                                                                                                     |
| Tool cards                                            | Navigate to tool routes                                                                                                     |
| Model cards                                           | Navigate to model pages                                                                                                     |
| Advanced Features tabs                                | Click switches panel (`aria-selected`); tabs: Lightning Fast Generation / Precise Creative Control / Versatile Style Engine |
| Pricing CTAs                                          | Upgrade buttons                                                                                                             |
| FAQ items                                             | Accordion expand/collapse (click)                                                                                           |

## Hover sweep

- Nav items: subtle bg / color change
- Cards (tools, models, pricing): slight lift/brightness or border accent
- Footer links: color → primary
- Buttons: primary darkens on hover (`--home-control-accent-hover`)

## Responsive

| Viewport | Changes                                                                      |
| -------- | ---------------------------------------------------------------------------- |
| 1440     | Full nav, 5 tool cards in row, 3 pricing cols, FAQ 2-col                     |
| 768      | Nav collapses (hamburger likely), tools wrap, pricing stack-ish              |
| 390      | Hamburger nav, stacked sections, promo mobile banner, single-col FAQ/pricing |

## Key CSS tokens (from live `:root`)

```
--background: 28 25% 10%;
--foreground: 48 30% 90%;
--primary: 28 52% 58%;
--primary-foreground: 42 20% 96%;
--secondary: 28 20% 20%;
--muted: 28 15% 15%;
--muted-foreground: 28 10% 60%;
--accent: 28 15% 18%;
--card: 28 25% 12%;
--border: 28 20% 15%;
--radius: 0.5rem;
--home-control-accent: hsl(30 66% 43%);
--accent-glow: rgba(255,200,120,0.4);
```

Usage pattern: `hsl(var(--background))` (space-separated HSL components).
