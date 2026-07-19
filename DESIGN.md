# Marco Polo Design System

## Brand
- **Name**: Marco Polo
- **Tagline**: Open-source travel command center
- **Voice**: Calm, precise, no hype. A seasoned traveler's notebook, not a sales page.
- **Anti-references**: Purple gradients, glassmorphism, "Boost your productivity", AI-generated stock imagery, generic SaaS dashboards.

## Color

### Dark (default)
- Background: `#0a0a0a` (stone-950)
- Foreground: `#f2f2f2` (stone-100)
- Card: `#111111`
- Muted: `#1c1c1c`
- Muted-foreground: `#9aa0a6`
- Border: `rgba(255,255,255,0.08)`
- Primary: `#19c59f` (emerald)
- Accent: `#f5d78e` (warm gold)

### Light
- Background: `#f7f5f0` (warm paper)
- Foreground: `#1c1917` (stone-900)
- Card: `#ffffff`
- Muted: `#f5f4f2`
- Muted-foreground: `#78716c`
- Border: `rgba(28,25,23,0.08)`
- Primary: `#0f766e` (teal-700)
- Accent: `#d97706` (amber-600)

## Typography
- **Display**: Fraunces, serif. Used for hero titles and itinerary headings.
- **Body**: Geist Sans, system-ui. Used for UI text and chat.
- **Mono**: Geist Mono, ui-monospace. Used for prices, code, and ASCII portrait.
- **Scale**: 12 / 14 / 15 / 16 / 18 / 20 / 24 / 30 / 36 / 48 / 60 / 72
- **Rules**: Body text never below 14px. Chat body 16px. Hero title 48-72px. Line-height 1.6 for paragraphs.

## Spacing
- **Grid**: 8pt base (4, 8, 12, 16, 24, 32, 48, 64)
- **Card padding**: 20-24px
- **Section gap**: 24-32px
- **Panel width**: 420px (desktop)

## Radius
- **sm**: 8px
- **md**: 10px
- **lg**: 12px
- **xl**: 16px

## Components

### Button
- **Primary**: `bg-primary text-primary-foreground`, radius 12px, padding 10-12px, font-weight 600
- **Secondary**: `bg-secondary border`, radius 12px, font-weight 500
- **Ghost**: text-only, hover background muted
- **Icon**: 16px, stroke-width 1.5

### Card
- **Border**: 1px solid `border`
- **Radius**: 12px
- **Shadow**: `0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.04)` (light); `0 1px 2px rgba(0,0,0,0.2), 0 8px 24px rgba(0,0,0,0.25)` (dark)
- **Padding**: 20-24px

### Chat message
- **User**: right-aligned, `bg-secondary`, radius 16px with 4px bottom-right
- **Assistant**: left-aligned, transparent background, logo avatar
- **Body**: 16px, `leading-relaxed`

### Badge / Pill
- **Radius**: full
- **Border**: 1px solid `border`
- **Padding**: 8-10px horizontal, 6-8px vertical
- **Font**: 14px, weight 500

## Motion
- **Duration**: 200-400ms for UI feedback, 500-700ms for entrances
- **Easing**: `cubic-bezier(0.22, 1, 0.36, 1)` for entrances, `power2.out` for exits
- **Reduced motion**: All animations disabled when `prefers-reduced-motion: reduce`

## Iconography
- **Library**: Lucide React
- **Size**: 16px default, 20px for emphasis
- **Stroke**: 1.5px
- **Brand**: Custom portolan wind rose SVG (cyan on navy) for logo and app icons

## Assets
- **Logo**: `/public/logo.svg` — portolan wind rose, titanium + electric cyan
- **Portrait**: `/public/marco-portrait.png` — dithered sepia from public-domain c.1600 portrait
- **ASCII**: `src/components/chat/marco-ascii.ts` — luminance-ramped ASCII portrait
