POS Design Tokens — Dhakal Traders

Overview

A compact design token set for the POS billing interface. Use these CSS variables (in `client/src/styles/pos/pos-billing.css`) for spacing, typography, and color to keep the UI consistent and printable.

Color tokens

- --pos-bg: page background
- --pos-card-bg: card surface background
- --pos-card-border: card border / divider
- --pos-text: primary text
- --pos-text-muted: secondary text
- --pos-accent: primary accent (amber)
- --pos-success: success (green)
- --pos-danger: error (red)

Spacing scale

- --space-1: 4px (tiny gaps)
- --space-2: 8px (small padding)
- --space-3: 12px (inline spacing)
- --space-4: 16px (component padding)
- --space-5: 24px (large gaps)
- --space-6: 32px (section padding)

Typography

- --font-size-xs: 11px — notes, captions
- --font-size-sm: 13px — small labels
- --font-size-base: 15px — main body text
- --font-size-lg: 18px — headings, totals

Radii

- --radius-sm: 8px
- --radius-md: 14px
- --radius-lg: 24px

Printing guidance

- Invoice preview uses card surfaces with `--pos-card-bg` and rounded corners; for thermal printing set border-radius to 0 for thermal templates.
- Use `@media print` rules located in `client/src/utils/printHelper.tsx` to set page size (A4 / thermal widths).

Accessibility notes

- Interactive product cards use focus outlines and role="button" with keyboard handlers. Maintain 44px touch targets for primary actions and ensure contrast of `--pos-accent` on dark text for legibility.

How to adopt

- Replace repeated literal values in `pos-billing.css` with these variables.
- For app-wide tokens, consider moving tokens to global CSS or the Tailwind config (theme.extend.colors) so they can be reused across components.

Small example

.bill-product-card { padding: var(--space-4); border-radius: var(--radius-md); background: var(--pos-card-bg); }

Generated: 2026-05-27
