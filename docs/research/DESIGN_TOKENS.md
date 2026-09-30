# Raphael Design Tokens

## Colors (live `:root`, space-separated HSL → used as `hsl(var(--token))`)

| Token               | Value                 | Approx RGB               |
| ------------------- | --------------------- | ------------------------ |
| background          | 28 25% 10%            | 32, 25, 19               |
| foreground          | 48 30% 90%            | 237, 234, 222            |
| primary             | 28 52% 58%            | ~204, 144, 92            |
| primary-foreground  | 42 20% 96%            | near white               |
| secondary           | 28 20% 20%            |                          |
| muted               | 28 15% 15%            |                          |
| muted-foreground    | 28 10% 60%            |                          |
| accent              | 28 15% 18%            |                          |
| card                | 28 25% 12%            |                          |
| border              | 28 20% 15%            | 46, 38, 31               |
| home-control-accent | hsl(30 66% 43%)       | Sign-in / control bronze |
| accent-glow         | rgba(255,200,120,0.4) |                          |

## Typography

- Family: self-hosted `fontSans` (Inter-like) → `/fonts/font-sans-{400,500,600,700}.woff2`
- Body: 16px / 24px / 400
- H1: 40px / 46px / 700 / letter-spacing -1px
- Nav buttons: 14px / 20px / 500
- Upgrade pill: 11px / 600

## Radii

- `--radius: 0.5rem`
- Pills: 9999px
- Sign in button: 10px
- Cards / generator panel: ~16–24px (rounded-2xl)

## Layout

- Container: `md:max-w-7xl mx-auto px-4` (1280px)
- Header height: 64px (py-3)
