# Raphael.app Homepage Topology

Target: https://raphael.app/  
Captured: 2026-08-02 · Desktop ~1512×776 · Page height ~10823px  
No Lenis / Locomotive Scroll.

## Overall Layout

- Single-column dark marketing page (`color-scheme: dark`)
- Background: `rgb(32, 25, 19)` / HSL `28 25% 10%`
- Foreground: `rgb(237, 234, 222)` / HSL `48 30% 90%`
- Primary bronze: HSL `28 52% 58%`
- Font: self-hosted `fontSans` (Inter-like woff2, weights 400/500/600/700)
- Max content width ≈ 1248px for header; main sections padded

## Section Order (top → bottom)

| #   | Name                       | Interaction                               | Notes                                              |
| --- | -------------------------- | ----------------------------------------- | -------------------------------------------------- |
| 0   | **SiteHeader**             | click-driven mega-menus                   | relative z-260, not sticky; Upgrade pill + Sign in |
| 1   | **Hero**                   | click (Image/Video toggle, form controls) | H1 + badges + generator workspace (mock)           |
| 2   | **PromoBanner**            | click                                     | Seedream 5.0 Pro / GPT Image 2 promo strip         |
| 3   | **AiImageTools**           | hover/click                               | 5 tool cards horizontal                            |
| 4   | **TopModels**              | hover/click                               | Model cards with NEW/HOT badges                    |
| 5   | **GetInspired**            | time/scroll (`animate-scroll`)            | Masonry gallery of example images                  |
| 6   | **StyleDiscovery**         | click tabs                                | "Try a style" / "Discover something new"           |
| 7   | **KeyFeatures** (#feature) | static                                    | 6 feature cards in 2×3 grid                        |
| 8   | **AdvancedFeatures**       | click tabs                                | 3 tabs: Lightning / Precise / Versatile + media    |
| 9   | **Testimonials**           | time-driven marquee                       | Multi-row auto-scrolling quote cards               |
| 10  | **Pricing**                | click                                     | Pro / Ultimate / Max plan cards                    |
| 11  | **FAQ** (#faq)             | click accordion                           | 19 Q&A in 2-column layout                          |
| 12  | **Footer** (#footer)       | hover links                               | Brand + About/Tools/AI Models columns              |

## Overlays / Fixed

- One fixed toast/nprogress-like element (z-9999) — ignore for clone
- Nav dropdown panels (absolute, open on hover/click)
- Model tooltip near generator ("Switch models here…")

## Dependencies

- Header overlays hero (z-260)
- Hero generator is the visual centerpiece of first viewport
- Footer is flow content, not sticky
