# DevDash Color Shift Strategy

This document outlines the extensive plan to migrate DevDash from its current generic theme to a custom design system based on the new identity.

## 1. Primary Palette Analysis
Based on the logo colors provided, we are moving to a **Triadic Blue Spectrum**:

- **Primary (Core UX)**: `#2b70b8` – Used for main call-to-actions, primary icons, and the application "heartbeat."
- **Deep (Structural)**: `#14499f` – Used for backgrounds of active items, deep shadows, and state transitions.
- **Vibrant (Acclent)**: `#57c1ef` – Used for success states, resumability scores, and "scanning" animations.
- **Glass (Muted)**: `#b6c6e1` – Used for borders, inactive tabs, and secondary metadata text.

## 2. Design Tokens (Tailwind)
We will map these to our existing Tailwind tokens to ensure a seamless transition:

```javascript
colors: {
  surface: '#0a0d14', // Slightly deeper blue-tinted black
  card:    '#111622', // Deep navy cards
  border:  'rgba(182, 198, 225, 0.15)', // Using #b6c6e1 with transparency
  accent:  '#2b70b8',
  'accent-hover': '#14499f',
  'accent-glow': '#57c1ef',
}
```

## 3. UI Component Rework

### Global Header
- The header border will shift to a subtle glass highlight using `#b6c6e1`.
- The logo text "DevDash" will stay white, but the search bar focus state will glow in `#2b70b8`.

### Project Cards
- **Status Indicators**:
  - `Active`: Gradient from `#2b70b8` to `#57c1ef`.
  - `Pinned`: Solid `#2b70b8` with a subtle outer glow.
- **Hover States**: Cards will lift with a soft `#14499f` shadow instead of raw black.

### Resumability Rings
- The circular progress bars (Recharts/Custom SVG) will use a stroke gradient:
  - `0%`: `#14499f`
  - `100%`: `#57c1ef`

## 4. Dark Mode Refinement
Instead of pure black (`#000`), we will implement a "Nordic Night" style:
- **Base Background**: `hsl(222, 47%, 6%)`
- **Elevated Surfaces**: `hsl(222, 47%, 10%)`

## 5. Execution Steps
1. **Config Update**: Modify `tailwind.config.js`.
2. **CSS variables**: Update `index.css`.
3. **Component Audit**: Manually update components that use utility gradients (like the detail panel).
4. **Rescan UI**: Run the app and ensure readability is improved.

---
*Created by DevDash Branding Assistant*
