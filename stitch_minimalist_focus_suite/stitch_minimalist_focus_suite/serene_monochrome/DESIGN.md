---
name: Serene Monochrome
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#5a403d'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#8f706b'
  outline-variant: '#e3beb9'
  surface-tint: '#b6241b'
  primary: '#6c0002'
  on-primary: '#ffffff'
  primary-container: '#950606'
  on-primary-container: '#ff9d90'
  inverse-primary: '#ffb4a9'
  secondary: '#5f5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfde'
  on-secondary-container: '#636262'
  tertiary: '#002884'
  on-tertiary: '#ffffff'
  tertiary-container: '#003bb7'
  on-tertiary-container: '#a2b4ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad5'
  primary-fixed-dim: '#ffb4a9'
  on-primary-fixed: '#410001'
  on-primary-fixed-variant: '#920305'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#dce1ff'
  tertiary-fixed-dim: '#b7c4ff'
  on-tertiary-fixed: '#001551'
  on-tertiary-fixed-variant: '#0039b3'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
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

## Brand & Style

This design system is built on the philosophy of **Focus & Serenity**. It utilizes a refined **Minimalist** aesthetic to eliminate cognitive load, allowing the user's content and tasks to take center stage. The style is characterized by expansive whitespace, a disciplined monochromatic foundation, and surgical applications of high-contrast color.

The target audience consists of professionals and creatives who value mental clarity and precision. The emotional response should be one of calm reliability—a "digital sanctuary" where every element has a clear purpose and nothing competes for attention unnecessarily. High-quality typography and subtle tonal shifts replace heavy shadows or decorative flourishes.

## Colors

The palette is strictly monochromatic with a singular, aggressive accent. 

- **Primary (#950606):** Reserved exclusively for "Intentional Action." Use this for primary buttons, active progress indicators, and critical state changes. Its rarity preserves its impact.
- **Secondary (#1A1A1A):** Used for primary headings and icons to ensure maximum legibility and a grounded feel.
- **Neutral / Background:** A hierarchy of whites and soft grays (#FFFFFF, #F5F5F5, #E5E5E5) creates depth without introducing new hues. 

The default mode is **Light**, emphasizing the "serenity" through brightness and breathability. Surfaces are defined by subtle shifts in neutral values rather than shadows.

## Typography

The typography system relies entirely on **Manrope**, a modern sans-serif that balances geometric purity with humanistic warmth. 

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

Depth is conveyed through **Tonal Layering** and **Low-Contrast Outlines**. This design system avoids heavy shadows to maintain its "light" and "serene" character.

- **Planes:** The base layer is pure white (#FFFFFF). Elevated containers use a light gray surface (#F5F5F5) with a hairline border (1px) in #E5E5E5.
- **Shadows:** When necessary for functional distinction (e.g., a floating dropdown), use a single, ultra-diffused shadow: `0 8px 32px rgba(0,0,0,0.04)`.
- **Active State:** Depth is indicated by color (Primary #950606) rather than physical elevation or "pop-out" effects.

## Shapes

The shape language is **Soft** and disciplined. A subtle corner radius of `0.25rem` (4px) is applied to standard components like inputs and buttons to take the edge off the brutalism of the monochrome palette without making the UI feel overly "bubbly" or "playful."

Larger containers (cards, modals) use `0.5rem` (8px) to provide a gentle enclosure for content. Progress rings and selection dots remain perfectly circular.

## Components

- **Buttons:** 
    - **Primary:** Solid #950606 with white text. No gradient. High-contrast focus states.
    - **Secondary:** Transparent background with a #1A1A1A border and text. 
- **Input Fields:** 1px solid #E5E5E5 border. On focus, the border remains neutral but a 2px interior "accent bar" or focus ring appears in #950606.
- **Progress Rings:** Use the Primary color for the active stroke. The background track should be a very light #F5F5F5.
- **Cards:** No shadows. Defined by a #F5F5F5 background or a light #E5E5E5 border. Use generous internal padding (min 24px).
- **Chips/Badges:** Use a #F5F5F5 background with #1A1A1A text for neutral states. Active states switch to a light tinted version of the primary color with #950606 text.
- **Lists:** Separated by thin 1px #F5F5F5 lines. Hover states utilize a subtle background shift to #FAFAFA.