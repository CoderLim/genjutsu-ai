# Bottom Sections (Testimonials, Pricing, FAQ, Footer)

## Testimonials — `src/components/landing/Testimonials.tsx`

- Interaction: time-driven horizontal/multi-row marquee
- Eyebrow "Testimonials"
- H2 "What Users Say About Raphael AI — Free AI Image Generator"
- Subtitle: See how creators use Raphael AI...
- Cards with quote, avatar (`/testimonials/*.webp`), name, role
- People (verbatim quotes from site):
  - Sophie Miller, Freelance Designer
  - Michael Chen, Creative Director
  - Sarah Wang, E-commerce Manager
  - David Liu, Brand Designer
  - Emma Zhang, Content Creator
  - Kevin Wu, Game Concept Artist
  - Jessica Li, Digital Marketing Expert
  - Tom Anderson, Ad Creative Director
  - Nina Patel, Full-stack Developer
- Duplicate rows for seamless marquee; use animate-marquee-x

## Pricing — `src/components/landing/PricingSection.tsx`

- Interaction: click Monthly / Yearly(-50%) / Credit Packs tabs
- Default: Yearly selected
- H2 "Choose Your Plan"
- Subtitle: Free images include a watermark...
- Toggle: Monthly | Yearly -50% (red badge) | Credit Packs
- 3 cards md:grid-cols-3 max-w-[1180px]:
  **Pro** -50% · $20 strikethrough · $10/month · Billed Annually · $240→$120/year · 2000 credits · Upgrade to Pro
  **Ultimate** Recommended · -50% · $40→$20 · $480→$240/year · 5000 credits · Upgrade to Ultimate
  **Max** -50% · $80→$40 · $960→$480/year · 10000 credits · Upgrade to Max
- Features bullets from live extract (models list, unlimited Seedream 3.5, priority, no watermarks, upscaling, privacy on Ultimate/Max)
- Card style: rounded-xl p-5 border; Ultimate has Recommended badge + stronger ring
- Hover: -translate-y-1 shadow-xl

## FAQ — `src/components/landing/FaqSection.tsx` id=faq

- Interaction: click accordion (can use existing Accordion UI)
- Eyebrow FAQ
- H2 "Frequently Asked Questions — Free AI Image Generator"
- Contact: support@raphael.app
- 19 Q&A verbatim from site (2-column grid on md+)
- Numbered or plain accordion items

## Footer — `src/components/landing/SiteFooter.tsx` id=footer

- Logo + brand + blurb
- Columns: About (Features, Pricing, Partners) | Tools (...) | AI Models (...)
- Bottom: © 2025 • Raphael AI All rights reserved. | Privacy | Terms
- MUST include `<BuiltWithShipAny />` from `@/components/built-with-shipany` next to copyright
