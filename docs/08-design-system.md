# 08 — Design System `[SPEC]`

> Palette derived from `KlinikVoice AI Logo.png`: a deep teal-navy wordmark with
> a bright cyan accent ("AI" + sound waves) on white. Clean, clinical, friendly.

## 1. Brand palette

| Token | Hex | Use |
|---|---|---|
| `brand-navy` (primary) | `#0F3D4D` | Primary buttons, headings, sidebar bg, logo wordmark |
| `brand-navy-700` | `#0A2C38` | Hover/pressed on navy, active sidebar item |
| `brand-cyan` (accent) | `#1FC2DD` | Accents, links, focus rings, active highlights, "AI" |
| `brand-cyan-600` | `#15A6BE` | Cyan hover |
| `brand-cyan-50` | `#E7F8FC` | Subtle tinted backgrounds, selected rows, badges |
| `ink` | `#13212B` | Body text |
| `muted` | `#5B6B73` | Secondary text, captions |
| `line` | `#E2E8EC` | Borders, dividers |
| `surface` | `#FFFFFF` | Cards, panels |
| `canvas` | `#F6F9FA` | App background |

Semantic: `success #16A34A`, `warning #D97706`, `danger #DC2626`,
`info` = `brand-cyan`.

## 2. Tailwind tokens

```ts
// tailwind.config.ts (excerpt)
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0F3D4D",
          "navy-700": "#0A2C38",
          cyan: "#1FC2DD",
          "cyan-600": "#15A6BE",
          "cyan-50": "#E7F8FC",
        },
        ink: "#13212B",
        muted: "#5B6B73",
        line: "#E2E8EC",
        canvas: "#F6F9FA",
      },
      borderRadius: { card: "0.75rem" },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
};
```

Primary CTA = `bg-brand-navy text-white hover:bg-brand-navy-700`.
Accent / link = `text-brand-cyan-600`. Focus ring = `ring-brand-cyan`.

## 3. Typography & spacing

- **Inter** (or system sans). Headings `font-semibold` ink; body `text-ink`,
  secondary `text-muted`.
- Scale: page title `text-2xl/semibold`, section `text-lg/semibold`,
  body `text-sm`, captions `text-xs text-muted`.
- 4px spacing grid (Tailwind default). Cards: `rounded-card border border-line bg-white p-5`.

## 4. Core primitives (`components/ui/`)

`Button` (variants: primary/secondary/ghost/danger), `Input`, `Select`,
`Textarea`, `Card`, `Table`, `Badge` (status colors), `Dialog`/`Modal`,
`Toast`, `Spinner`, `EmptyState`, `Tabs`. Keep them small and unstyled-by-props;
no heavy component library — Tailwind classes only.

## 5. Layout shell

- **Sidebar** (`brand-navy` bg, white text, cyan active indicator) with the
  logo at top; nav items role-filtered.
- **Topbar**: page title left, user menu (email + logout) right.
- Content max-width `~1100px`, `canvas` background, cards on `surface`.

## 6. States & a11y

- Every async view: loading (Spinner/skeleton), error (inline message +
  retry), empty (EmptyState). Per-widget, never a blank screen.
- Focus-visible rings on all interactive elements (`ring-brand-cyan`).
- Color contrast ≥ WCAG AA; never encode meaning by color alone (pair status
  badges with text).
