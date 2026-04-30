# Design System

## Philosophy
Minimalist, typography-first. Content is the design. Whitespace does the grouping — not borders or containers. The interface should feel like a well-edited article, not a dashboard.

---

## Font

**Primary:** Inter via `next/font/google` (weight 300, 400, 600 only)  
**Fallback stack:** `system-ui, -apple-system, sans-serif`  
**Never use:** bold (700+), italic decoratively, more than 3 weights simultaneously

In `app/layout.tsx`:
```tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '600'] })
```

---

## Color Palette

| Token | Tailwind | Hex | Use |
|-------|----------|-----|-----|
| text-primary | `text-gray-900` | `#111827` | headings, body |
| text-secondary | `text-gray-500` | `#6B7280` | captions, labels, timestamps |
| text-muted | `text-gray-400` | `#9CA3AF` | placeholder text, disabled |
| background | `bg-white` | `#FFFFFF` | page background |
| border | `border-gray-200` | `#E5E7EB` | only for form inputs, dividers |
| accent | `text-gray-900` / underline | — | links, CTAs (text-based, not colored buttons) |
| error | `text-red-600` | `#DC2626` | inline validation errors only |
| success | `text-green-600` | `#16A34A` | confirmation states |

**Rule:** No colored backgrounds. No `bg-blue-500` buttons — use black fill (`bg-gray-900 text-white`) for primary CTAs. One solid color per page max.

---

## Typography Scale

| Role | Tailwind Classes | Notes |
|------|-----------------|-------|
| Page title (H1) | `text-4xl font-semibold tracking-tight text-gray-900` | One per page |
| Section heading (H2) | `text-xl font-semibold text-gray-900` | Sparse use |
| Label / caption | `text-sm font-normal text-gray-500` | Form labels, metadata |
| Body | `text-base font-light text-gray-700` | Main readable text |
| Button / CTA | `text-sm font-semibold` | No decoration except weight |
| Error | `text-sm font-normal text-red-600` | Inline only |

---

## Layout

**Max reading width:** `max-w-2xl` (~65ch) — all content columns use this  
**Page wrapper:**
```tsx
<div className="min-h-screen bg-white px-6 py-16 md:px-12">
  <div className="max-w-2xl mx-auto">
    {/* content */}
  </div>
</div>
```

**Section spacing:** `space-y-16` between major sections (≈ 64px), `space-y-8` within a section  
**Text alignment:** left-aligned always. `text-center` only for the landing page headline  
**No cards:** do not use `rounded-xl`, `shadow`, or `bg-gray-50` containers to group content. Use vertical spacing + a thin `border-b border-gray-100` divider if separation is needed

---

## Components

### Primary Button (CTA)
```tsx
<button className="bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded hover:bg-gray-700 transition-colors">
  Sign in with Google
</button>
```
Use sparingly — one per page section.

### Secondary / Ghost Button
```tsx
<button className="text-sm font-semibold text-gray-900 underline underline-offset-4 hover:text-gray-600">
  Cancel
</button>
```
For secondary actions (Cancel, Edit). Never use an outlined border button.

### Text Input
```tsx
<input className="w-full border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-900" />
```
Label above the input, `text-sm font-normal text-gray-500 mb-1`.

### Inline Error
```tsx
<p className="text-sm text-red-600 mt-1">{error}</p>
```

### Loading State
Text-based: `<span className="text-sm text-gray-400">Loading...</span>`  
No spinners. No skeleton shimmer. Plain text suffices.

### Empty / Placeholder State
`<p className="text-sm text-gray-400 italic">No fact yet — click "Get a fact" to generate one.</p>`

### Profile Avatar (image fallback)
```tsx
{image ? (
  <Image src={image} alt={name ?? 'User'} width={40} height={40} className="rounded-full" />
) : (
  <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm font-semibold">
    {(name ?? email ?? '?')[0].toUpperCase()}
  </div>
)}
```

---

## Page-Specific Guidelines

### Landing Page (`/`)
- Single column, vertically centered
- H1: app name "Movie Memory" — large, left-aligned (or centered on mobile)
- One-sentence tagline below in `text-base font-light text-gray-500`
- Single CTA button: "Sign in with Google"
- No hero image, no illustration

### Onboarding (`/onboarding`)
- H1: "What's your favorite movie?"
- Short description `text-sm text-gray-500` below
- Single text input + "Continue" button
- Inline error below input

### Dashboard (`/dashboard`)
Layout (top to bottom, single column):
1. User row: avatar + name + email + "Sign out" link (right-aligned on same row)
2. Thin `border-b border-gray-100` divider
3. **Movie section:** label "Favorite movie" `text-sm text-gray-500` → value below in `text-xl font-semibold` → "Edit" as ghost button inline
4. Thin divider
5. **Fact section:** label "Fun fact" → fact text in `text-base font-light text-gray-700` → timestamp in `text-xs text-gray-400` → "Get new fact" ghost button below

---

## What Not To Do

- No `shadow-*` on any element
- No `bg-gray-50`, `bg-gray-100`, or any tinted container backgrounds
- No `rounded-2xl` or `rounded-lg` on layout containers (only `rounded` on inputs/buttons)
- No gradients (`bg-gradient-*`)
- No decorative icons (no emoji in UI, no heroicons unless truly necessary)
- No `text-center` except landing headline
- No more than 2 font weights visible on any single screen simultaneously
- No colored accent except `text-red-600` for errors and `text-green-600` for success
