# Visual QA — Raphael.app clone

Compared clone (`localhost:3002`) vs live (`raphael.app`) at ~1512px.

## Passes

- Dark bronze theme tokens match (bg ~rgb(32,25,19), primary bronze)
- Header layout: logo, mega-nav, Upgrade -50%, globe, Sign in
- Hero H1 + badges + Image/Video toggle + generator panel + promo banners
- AI Image Tools 5-card strip with real assets
- Top Models 3×3 grid with NEW/HOT/-30%/COMING badges
- Get Inspired masonry + animate-scroll (32 imgs) + Try a style overlays
- Key Features / Advanced Features tabs
- Testimonials marquee
- Pricing Monthly/Yearly/Credit Packs with Pro/Ultimate/Max yearly -50%
- FAQ accordion + Footer with BuiltWithShipAny

## Remaining gaps (non-blocking)

- Generator toolbar is a high-fidelity mock (no real model dropdown menus / queue)
- Nav mega-menus approximate live link density; some model icons vary
- Advanced Features secondary tab copy is paraphrased (only Lightning Fast verified verbatim on live)
- Pricing credit-pack details may differ slightly from live API-driven UI
- No sticky header (matches live — live also non-sticky)
- Mobile hamburger present; full mobile pixel audit not exhaustive
- Support chat widget on live not cloned (out of scope)

## Build

- `pnpm build` ✓
- `tsc --noEmit` ✓
