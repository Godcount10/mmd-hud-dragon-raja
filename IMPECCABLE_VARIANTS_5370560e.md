# Impeccable Live Variants: Alchemy Veins System

**Variant ID:** 5370560e  
**Target:** `.dr-workspace` (Story surface main layout)  
**Direction:** A - 炼金脉络呼吸系统 (Alchemy Veins Breathing System)

## Variant 1: 克制版 (Restrained)

**Design Intent:** Minimal alchemy veins with single emerald-green accent, subtle breathing animation, watermark logo.

**Features:**
- Lightweight gradient veins (emerald green, 8% opacity)
- 10s breathing cycle animation
- Cassell crest as subtle watermark (bottom-right, 8% opacity, grayscale)
- Single-color pulse on live status indicator (emerald)

**Parameters:**
- `vein-intensity`: 0.1–0.8, default 0.3
- `logo-opacity`: 0.05–0.2, default 0.08

**Best for:** Users who prefer minimal distraction, accessibility-first design.

---

## Variant 2: 平衡版 (Balanced)

**Design Intent:** Medium-density alchemy grid with three accent colors, radar breathing animation, visible floating logo.

**Features:**
- Three radial gradients: emerald (#3a7a5e), purple-copper (#5c3a5a), amber-orange (#d9844a)
- 45° diagonal grid veins with 12s animation cycle
- Floating logo (140px, 15% opacity, overlay blend, 6s float animation)
- Radar ring pulse (80px, synchronized with status indicator)
- Tri-color pulse on live indicator (emerald → purple → amber)
- Changed status keys highlighted in amber with glow

**Parameters:**
- `vein-intensity`: 0.2–0.8, default 0.4
- `logo-glow`: 0.1–0.3, default 0.15
- `radar-speed`: 2–6s, default 3s

**Best for:** Standard immersive experience with visible thematic elements.

---

## Variant 3: 饱满版 (Full/Saturated)

**Design Intent:** High-density vein network with four dynamic colors, dual radar rings, glowing logo, enhanced interactions.

**Features:**
- Four elliptical radial gradients with complex breathing (10s, hue-rotate)
- Dense repeating-linear-gradient grid (vertical, horizontal, diagonal)
- Logo with dual drop-shadow glow (160px, 25% opacity, screen blend, dynamic filter)
- Dual concentric radar rings (90px, counter-rotating, 4s/3s cycles)
- Quad-color pulse on live indicator (emerald → purple → amber → bronze)
- Active nav buttons with inset/outer box-shadow
- Changed status keys with pulsing text-shadow (2s cycle)
- Hover states with gradient backgrounds

**Parameters:**
- `vein-intensity`: 0.3–1.0, default 0.5
- `glow-strength`: 0.15–0.4, default 0.25
- `animation-speed`: 0.5–2x, default 1x

**Best for:** High-end displays, users who want maximum atmospheric immersion.

---

## Technical Notes

- All variants use `@property` for `--alchemy-pulse` and `--veins-glow` custom properties
- `@scope` isolation prevents CSS leakage
- Full `prefers-reduced-motion: reduce` support (animations disabled)
- Logo references `var(--dr-welcome-poster-image)` (Cassell crest from media.ts)
- Accent colors derived from DESIGN.md mineral palette:
  - Emerald green: `#3a7a5e` (alchemy life energy)
  - Purple-copper: `#5c3a5a` (shadow bloodline)
  - Amber-orange: `#d9844a` (time/memory)
  - Bronze: `#8a5f24` (existing accent from daylight palette)

## Next Steps

1. User previews variants in browser via Impeccable Live panel
2. Adjusts parameters (intensity, glow, speed) with sliders
3. Accepts chosen variant
4. I persist the accepted variant CSS and HTML to source files
