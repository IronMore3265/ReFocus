---
name: Ember Serenity
colors:
  surface: '#f3ece4'
  surface-dim: '#e0d3c2'
  surface-bright: '#fbf6ef'
  surface-container-lowest: '#fffdf9'
  surface-container-low: '#f8f1e7'
  surface-container: '#f1e7da'
  surface-container-high: '#e8dccc'
  surface-container-highest: '#dfd0bc'
  surface-variant: '#e8dccc'
  on-surface: '#373234'
  on-surface-variant: '#6a544c'
  outline: '#b09a88'
  outline-variant: '#e0d2c0'
  primary: '#780000'
  on-primary: '#fffdf9'
  primary-container: '#c0392c'
  on-primary-container: '#ffdad3'
  primary-fixed: '#fadfd9'
  secondary: '#6a5d55'
  on-secondary: '#fffdf9'
  secondary-container: '#e8dccc'
  on-secondary-container: '#574a43'
  secondary-fixed-dim: '#c9b6a2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  background: '#f3ece4'
  on-background: '#373234'
colorsDark:
  surface: '#1c0f0e'
  surface-dim: '#150908'
  surface-bright: '#2e1917'
  surface-container-lowest: '#170b0a'
  surface-container-low: '#241211'
  surface-container: '#2b1614'
  surface-container-high: '#351c19'
  surface-container-highest: '#40221e'
  surface-variant: '#4a2a25'
  on-surface: '#f2e3d0'
  on-surface-variant: '#d3b79c'
  outline: '#8a6455'
  outline-variant: '#4a2a25'
  primary: '#ffb4a9'
  on-primary: '#fff5f0'
  primary-container: '#9d2a20'
  on-primary-container: '#ffdad3'
  primary-fixed: '#3c1210'
  secondary: '#c0a48c'
  secondary-container: '#3a211c'
  on-secondary-container: '#e4cdb4'
  secondary-fixed-dim: '#8a7362'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#4a1210'
  on-error-container: '#ffdad6'
  background: '#1c0f0e'
  on-background: '#f2e3d0'
accents:
  timer:
    light: { accent: '#c0392c', accent-soft: '#a82d24', accent-tint: '#fadfd9' }
    dark:  { accent: '#d84339', accent-soft: '#ff9d90', accent-tint: '#3c1210' }
  reading:
    light: { accent: '#780000', accent-soft: '#8c1a14', accent-tint: '#efdbd5' }
    dark:  { accent: '#b22a20', accent-soft: '#ffb4a9', accent-tint: '#451312' }
  tasks:
    light: { accent: '#9d4c3d', accent-soft: '#8a3d2f', accent-tint: '#f3e0d6' }
    dark:  { accent: '#b05a48', accent-soft: '#f0ac96', accent-tint: '#40241d' }
typography:
  headline-xl:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Manrope
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1200px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  stack-lg: 48px
  stack-md: 24px
  stack-sm: 12px
---

> **This file is the source of truth for color.** Every token above is mirrored
> verbatim in `app/src/style.css` — `colors` in the `@theme` block, `colorsDark`
> in `.dark`, and `accents` in the `.accent-*` scopes. If you change a hex here,
> change it there in the same commit. The prose below cites only token names and
> real hexes; do not introduce a color in prose that has no token.

## Brand & Style

This design system is built on the philosophy of **Warm Focus**. It keeps the minimalist
discipline that eliminates cognitive load — expansive whitespace, a restrained surface
palette, surgical color — but grounds it in warmth rather than clinical grey. Paper, ink,
and ember, not glass and steel.

The target audience consists of professionals and creatives who value mental clarity and
precision. The emotional response should be one of calm reliability — a "digital sanctuary"
where every element has a clear purpose and nothing competes for attention unnecessarily.
High-quality typography and subtle tonal shifts replace heavy shadows or decorative flourishes.

## Colors

The palette is a warm neutral ground carrying a single hue: **red**. Red is the entire
character of the product. Nothing else on screen is allowed to be chromatic except the
achievement medals, which are literal metals and gems.

### The red ramp

The brand is built from one family of reds, dark to bright. Every fill listed here clears
WCAG AA (≥4.5:1) against `on-primary` cream.

| Shade | Hex | Role |
|---|---|---|
| Ember-950 | `#3c1210` | deepest ground; dark-mode accent tint |
| Chocolate | `#530b0a` | dark surface anchor |
| Red Velvet | `#780000` | light `primary`; the Reading accent |
| Ember-700 | `#9d2a20` | dark `primary-container` |
| **Ember** | **`#c0392c`** | **the brand red** — light `primary-container`, the Timer accent, notification icon tint |
| Signal | `#d84339` | dark-mode Timer accent; the brightest note in the system |
| Clay | `#9d4c3d` | the Tasks accent |
| Blush | `#ffb4a9` | dark `primary`; soft accent text |

### Two grounds

- **Light — daylight calm.** Cream `surface #f3ece4` with beige containers rising to
  `#e8dccc`, charcoal `on-surface #373234` for text. Surfaces are separated by tonal shift,
  never by shadow.
- **Dark — evening focus.** Chocolate-maroon `surface #1c0f0e` warming through `#40221e`,
  with cream `on-surface #f2e3d0`. The dark theme is *warm*, not black: it should feel like
  low lamplight, not a switched-off screen.

Both themes are first-class. The app follows the OS preference by default (`theme: 'system'`).

### `on-primary` is "text on accent"

By convention in this codebase, every accent fill pairs `bg-accent` with `text-on-primary`.
`on-primary` is therefore the *text color that rides on an accent fill*, and it stays a light
cream in **both** themes (`#fffdf9` light, `#fff5f0` dark). This deliberately departs from
Material's `on-primary` semantics — do not "fix" it to a dark value in dark mode, or every
button in the app loses contrast.

### Error is not distinguished by hue

`error #ba1a1a` sits inside the brand's own red family, and in a red-branded product it
cannot be told apart by color alone. That is accepted. **Error states must always carry an
icon and explicit copy** — never rely on redness to communicate failure. The error tokens are
kept for surface tinting (`error-container`) and text, not as the sole signal.

## Section Accents

Three scopes each claim their own shade of red, so a section is identifiable at a glance while
the product stays one character. The scope class is applied to `<body>` by the router
(`main.js`), and the tokens resolve per-scope:

| Section | Light | Dark | Feel |
|---|---|---|---|
| **Timer** (also `:root` default) | `#c0392c` | `#d84339` | bright, urgent, in-motion |
| **Reading** (incl. book detail, shelf) | `#780000` | `#b22a20` | deep, bookish, still |
| **Tasks** (incl. task detail) | `#9d4c3d` | `#b05a48` | muted, steady, workmanlike |

Each scope defines three tokens:

- `accent` — fills: buttons, FABs, checked boxes, progress bars. Always with `on-primary` text.
- `accent-soft` — text and strokes. Darkens in light mode, brightens in dark mode, so it stays
  legible directly on the surface.
- `accent-tint` — tinted container backgrounds for chips, badges, and highlight rows.

Unaccented routes (Home, Stats, Settings, Profile, History, Achievements) inherit the `:root`
Timer red.

## Typography

The typography system relies entirely on **Manrope**, a modern sans-serif that balances
geometric purity with humanistic warmth.

- **Headlines:** Set with tighter letter-spacing and heavier weights to provide a structural anchor to the layout.
- **Body Text:** Optimized for long-form reading with generous line-heights.
- **Labels:** Small labels use increased letter-spacing and uppercase styling to maintain hierarchy without needing color or size increases.

On mobile, headline sizes scale down to prevent awkward line breaks while maintaining the bold weight characteristic of the system.

## Layout & Spacing

The layout philosophy is **Fixed-Fluid Hybrid**. Content is contained within a 1200px max-width grid on desktop to ensure line lengths remain readable, but background elements stretch to the viewport edges to maintain a sense of openness.

- **Whitespace:** Use "generous plus" spacing. If an element feels tight, increase padding by one increment (8px).
- **Grid:** A 12-column system is used for desktop, collapsing to 4 columns on mobile.
- **Vertical Rhythm:** Elements are stacked using a base-8 scale. Large sections should be separated by at least 48px to preserve the serene, unhurried pace of the UI.

## Elevation & Depth

Depth is conveyed through **Tonal Layering** and **Low-Contrast Outlines**. This design system avoids heavy shadows to maintain its light, serene character.

- **Planes:** The base layer is `surface-container-lowest` (`#fffdf9` light / `#170b0a` dark). Elevated containers step up the `surface-container-*` ladder, with a hairline 1px border in `outline-variant`.
- **Shadows:** When necessary for functional distinction (e.g. a floating dropdown), use a single, ultra-diffused shadow: `0 8px 32px rgba(0,0,0,0.04)`.
- **Active State:** Depth is indicated by color (`accent`) rather than physical elevation or "pop-out" effects.

## Shapes

The shape language is **Soft** and disciplined. A subtle corner radius of `0.25rem` (4px) is applied to standard components like inputs and buttons to take the edge off the palette's boldness without making the UI feel overly bubbly or playful.

Larger containers (cards, modals) use `0.5rem` (8px) to provide a gentle enclosure for content. Progress rings and selection dots remain perfectly circular.

## Components

- **Buttons:**
    - **Primary:** Solid `accent` with `on-primary` text. No gradient. High-contrast focus states.
    - **Secondary:** Transparent background with an `on-surface` border and text.
- **Input Fields:** 1px solid `outline-variant` border. On focus, the border remains neutral but a 2px interior focus ring appears in `accent`.
- **Progress Rings:** Use `accent` for the active stroke. The background track should be `surface-container-high`.
- **Cards:** No shadows. Defined by a `surface-container-lowest` background and a light `outline-variant` border. Use generous internal padding (min 24px).
- **Chips/Badges:** Use `surface-container` with `on-surface` text for neutral states. Active states switch to `accent-tint` background with `accent-soft` text.
- **Lists:** Separated by thin 1px `outline-variant` lines. Hover states use a subtle shift to `surface-container-low`.
- **Achievement medals:** The only chromatic exception. Tier colors (bronze, silver, gold, pearl, ruby, sapphire, diamond) are defined in `store.js` and read as literal metals and gems, not as brand color. They always sit on neutral surfaces.
