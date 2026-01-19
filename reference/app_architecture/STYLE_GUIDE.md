# Travel Life UI Style Guide

This document defines the visual design system and UI conventions used throughout the Travel Life application. Follow these guidelines to maintain consistency when building or modifying UI components.

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Components](#components)
6. [Dark Mode](#dark-mode)
7. [Animations & Transitions](#animations--transitions)
8. [Icons](#icons)
9. [Responsive Design](#responsive-design)
10. [Accessibility](#accessibility)
11. [Print Styles](#print-styles)

---

## Design Philosophy

Travel Life uses a **warm, adventure-inspired design** with these core principles:

- **Compass Gold Theme**: Warm amber/gold tones evoke exploration and adventure
- **Dual-Mode Excellence**: Both light and dark modes are first-class citizens
- **Subtle Depth**: Use shadows, glows, and backdrop effects for depth without heaviness
- **Smooth Interactions**: Consistent animations make the UI feel polished and responsive
- **Travel-Centric**: Serif display font (Crimson Pro) adds an elegant, journalistic quality befitting a travel log

---

## Color System

### Primary Colors (Compass Gold)

Light mode primary palette - warm amber tones:

| Token | Hex | Usage |
|-------|-----|-------|
| `primary-50` | `#fef3c7` | Lightest backgrounds, subtle highlights |
| `primary-100` | `#fde68a` | Light backgrounds, skeleton loaders |
| `primary-200` | `#fcd34d` | Hover states, borders |
| `primary-300` | `#fbbf24` | Active states |
| `primary-400` | `#f59e0b` | Medium emphasis |
| `primary-500` | `#D97706` | **Primary actions, buttons** |
| `primary-600` | `#B45309` | Button gradients, hover states |
| `primary-700` | `#92400e` | Strong emphasis |
| `primary-800` | `#78350f` | Text on light backgrounds |
| `primary-900` | `#451a03` | Darkest text |

### Accent Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `accent-300` | `#fcd34d` | Light accents |
| `accent-400` | `#fbbf24` | Dark mode primary |
| `accent-500` | `#f59e0b` | Emphasis |
| `accent-600` | `#D97706` | Dark mode gradients |
| `gold` | `#fbbf24` | Dark mode highlights, glows |

### Neutral Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `cream` | `#f8fafc` | Light mode background |
| `parchment` | `#f1f5f9` | Secondary light background |
| `warm-gray` | `#e2e8f0` | Borders, dividers (light) |
| `charcoal` | `#1e293b` | Primary text (light mode) |
| `slate` | `#64748b` | Secondary text |

### Dark Mode Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `navy-900` | `#0f172a` | Darkest background |
| `navy-800` | `#1e293b` | Card backgrounds |
| `navy-700` | `#334155` | Elevated surfaces |
| `gold` | `#fbbf24` | Primary accent, highlights |
| `warm-gray` | `#e2e8f0` | Body text (dark mode) |

### Status Colors

Used for trip status badges and system states:

| Status | Light BG | Dark BG | Text |
|--------|----------|---------|------|
| Dream | `purple-100` | `purple-900` | `purple-700` / `purple-300` |
| Planning | `blue-100` | `blue-900` | `blue-700` / `blue-300` |
| Planned | `sky-100` | `sky-900` | `sky-700` / `sky-300` |
| In Progress | `amber-100` | `amber-900` | `amber-700` / `amber-300` |
| Completed | `green-100` | `green-900` | `green-700` / `green-300` |
| Cancelled | `red-100` | `red-900` | `red-700` / `red-300` |

---

## Typography

### Font Families

```css
font-display: 'Crimson Pro', serif   /* Headings, trip titles */
font-body: 'Manrope', sans-serif     /* UI text, body content */
```

### Usage Guidelines

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Hero titles | `font-display` | `font-bold` | `text-4xl` to `text-7xl` |
| Card titles | `font-display` | `font-bold` | `text-xl` to `text-2xl` |
| Section headings | `font-body` | `font-semibold` | `text-lg` |
| Body text | `font-body` | `font-normal` | `text-base` |
| Labels | `font-body` | `font-medium` | `text-sm` |
| Captions | `font-body` | `font-normal` | `text-xs` |

### Responsive Trip Titles

Use clamp-based sizing for fluid typography:

```css
.trip-title-hero { font-size: clamp(2rem, 5vw, 3.5rem); }
.trip-title-card { font-size: clamp(1.25rem, 3vw, 1.75rem); }
.trip-title-compact { font-size: clamp(1rem, 2vw, 1.25rem); }
```

### Gradient Text

For emphasis on headings:

```html
<span class="text-gradient">Featured Trip</span>
```

Light mode: `from-primary-500 to-accent-400`
Dark mode: `from-gold to-accent-400`

---

## Spacing & Layout

### Container

Standard page container:

```html
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
```

### Spacing Scale

Use Tailwind's spacing scale consistently:

| Size | Value | Usage |
|------|-------|-------|
| `gap-2` | 0.5rem | Tight spacing (inline elements) |
| `gap-4` | 1rem | Standard spacing |
| `gap-6` | 1.5rem | Card content, sections |
| `gap-8` | 2rem | Page sections |
| `p-4` | 1rem | Small component padding |
| `p-6` | 1.5rem | Standard card padding |
| `p-8` | 2rem | Large section padding |

### Grid Layouts

Responsive grids for card displays:

```html
<!-- Trip cards grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
```

### Border Radius

| Element | Radius |
|---------|--------|
| Buttons | `rounded-xl` |
| Cards | `rounded-2xl` |
| Inputs | `rounded-lg` |
| Badges/chips | `rounded-full` |
| Modals | `rounded-xl` |

---

## Components

### Buttons

**Primary Button** (`.btn-primary`):

```html
<button class="btn-primary">Save Trip</button>
```

- Gradient: `from-primary-500 to-primary-600` (light) / `from-accent-400 to-accent-600` (dark)
- White text
- Shadow with color-matched glow
- Hover: lift effect (`-translate-y-0.5`) + enhanced shadow
- Dark mode hover: gold glow (`0 0 20px rgba(251,191,36,0.25)`)

**Secondary Button** (`.btn-secondary`):

```html
<button class="btn-secondary">Cancel</button>
```

- Light: `bg-parchment` with `text-primary-600` border
- Dark: `bg-navy-800` with `text-gold` border
- Hover: background change + subtle lift

**Danger Button** (`.btn-danger`):

```html
<button class="btn-danger">Delete</button>
```

- Gradient: `from-red-600 to-red-700`
- White text
- Red shadow

### Inputs

**Standard Input** (`.input`):

```html
<input type="text" class="input" placeholder="Trip name" />
```

- Border: `border-primary-100` (light) / `border-gold/20` (dark)
- Background: `bg-white` (light) / `bg-navy-800` (dark)
- Focus: `border-primary-500` / `border-gold` with ring
- Dark mode focus: gold glow effect

**Labels** (`.label`):

```html
<label class="label">Trip Name</label>
<label class="label label-required">Required Field</label>
```

### Cards

**Standard Card** (`.card`):

```html
<div class="card">
  <!-- Card content -->
</div>
```

- Light: `bg-white/80` with backdrop blur
- Dark: gradient background with `border-gold/20`
- Hover: `shadow-xl` + border opacity increase
- Dark hover: gold glow

**Interactive Card** (`.card-interactive`):

```html
<div class="card-interactive" onClick={handleClick}>
  <!-- Clickable card content -->
</div>
```

- Same as `.card` with `cursor-pointer`
- Hover: `translate-y` lift effect

### Modals

Use the `Modal` component from `src/components/Modal.tsx`:

```tsx
<Modal
  isOpen={isOpen}
  onClose={onClose}
  title="Edit Trip"
  icon={<EditIcon />}
  size="lg"  // sm, md, lg, xl, 2xl, 4xl, 6xl
>
  {/* Modal content */}
</Modal>
```

- Backdrop: `bg-black/50` with blur
- Body: rounded corners, shadow-2xl
- Header with icon + title + close button
- Optional footer with border-top

### Tabs

Use `TabGroup` component for tabbed navigation:

```tsx
<TabGroup
  tabs={[
    { id: 'details', label: 'Details', count: 0 },
    { id: 'photos', label: 'Photos', count: 24 },
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

- Desktop: horizontal tabs with gradient underline
- Mobile: dropdown select
- Active: primary/gold color with animated underline

### Empty States

Use `EmptyState` component:

```tsx
<EmptyState
  icon="🗺️"
  message="No trips yet"
  subMessage="Start planning your first adventure!"
  actionLabel="Create Trip"
  onAction={handleCreate}
/>
```

- Bouncing icon animation
- Centered layout
- Optional action button

### Loading States

**Spinner**:

```tsx
<LoadingSpinner size="md" color="primary" />
<LoadingSpinner.FullPage />
<LoadingSpinner.Inline />
```

**Skeleton Loaders**:

```tsx
<Skeleton.Card lines={3} />
<Skeleton.ListItem />
<Skeleton.FormField />
```

### Floating Action Button

```html
<button class="fab">
  <PlusIcon class="w-6 h-6" />
</button>
```

- Fixed bottom-right position
- 56px circular
- Gradient background
- Scale + glow on hover

---

## Dark Mode

### Implementation

Dark mode uses Tailwind's class-based strategy:

1. `darkMode: 'class'` in `tailwind.config.js`
2. `.dark` class toggled on `<html>` element
3. State managed by Zustand store (`useThemeStore`)
4. Persisted to localStorage

### Pattern

Always pair light/dark classes:

```html
<div class="bg-white dark:bg-navy-800 text-charcoal dark:text-warm-gray">
```

### Key Dark Mode Conventions

| Element | Light | Dark |
|---------|-------|------|
| Page background | `bg-cream` | `bg-gradient-to-br from-navy-900 to-navy-800` |
| Card background | `bg-white/80` | `bg-navy-800/90` |
| Primary accent | `text-primary-600` | `text-gold` |
| Borders | `border-primary-100` | `border-gold/20` |
| Shadows | Standard shadows | Gold glow shadows |
| Focus rings | `ring-primary-500` | `ring-gold` |

### Gold Glow Effects

Dark mode uses subtle gold glows for depth:

```css
/* Custom shadow utilities */
shadow-glow-gold-sm: 0 0 15px rgba(251, 191, 36, 0.15)
shadow-glow-gold: 0 0 20px rgba(251, 191, 36, 0.15)
shadow-glow-gold-lg: 0 0 30px rgba(251, 191, 36, 0.2)
```

---

## Animations & Transitions

### Standard Durations

| Duration | Usage |
|----------|-------|
| `duration-200` | Fast micro-interactions |
| `duration-300` | Standard transitions |
| `duration-500` | Emphasis animations |

### Available Animations

| Class | Effect | Duration |
|-------|--------|----------|
| `animate-fade-in` | Fade in + slide up | 0.3s |
| `animate-scale-in` | Scale up + fade | 0.2s |
| `animate-slide-in-right` | Slide from right | 0.3s |
| `animate-slide-in-left` | Slide from left | 0.3s |
| `animate-bounce-slow` | Gentle float | 3s loop |
| `animate-pulse-subtle` | Subtle opacity pulse | 2s loop |
| `animate-spin` | Rotation (loaders) | 1s loop |
| `animate-pulse` | Skeleton loading | built-in |

### Hover Effects

```html
<!-- Lift effect -->
<div class="hover:-translate-y-0.5 transition-transform duration-200">

<!-- Scale effect -->
<div class="hover:scale-110 transition-transform duration-300">

<!-- Combined card hover -->
<div class="hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
```

### Stagger Delays

For sequential animations:

```css
.stagger-1 { animation-delay: 0.1s; }
.stagger-2 { animation-delay: 0.2s; }
.stagger-3 { animation-delay: 0.3s; }
.stagger-4 { animation-delay: 0.4s; }
.stagger-5 { animation-delay: 0.5s; }
```

---

## Icons

### Icon System

All icons are centralized in `src/components/icons/index.tsx`:

- SVG-based, stroke style (not filled)
- Default size: `w-5 h-5`
- `aria-hidden` by default

### Usage

```tsx
import { MapPinIcon, CalendarIcon, PhotoIcon } from '@/components/icons';

<MapPinIcon className="w-4 h-4 text-primary-500 dark:text-gold" />
```

### Available Icons

Core: `CloseIcon`, `SearchIcon`, `FilterIcon`, `PlusIcon`, `TrashIcon`, `EditIcon`
Content: `PhotoIcon`, `MapPinIcon`, `CalendarIcon`, `ChevronRight`, `ChevronDown`
Status: `Spinner` (with `animate-spin`)

### Icon Colors

| Context | Light | Dark |
|---------|-------|------|
| Primary action | `text-primary-500` | `text-gold` |
| Secondary | `text-slate` | `text-warm-gray` |
| On colored bg | `text-white` | `text-white` |
| Destructive | `text-red-500` | `text-red-400` |

---

## Responsive Design

### Breakpoints

Using Tailwind's mobile-first breakpoints:

| Breakpoint | Min-width | Usage |
|------------|-----------|-------|
| Default | 0px | Mobile phones |
| `sm:` | 640px | Large phones |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |

### Mobile Patterns

```html
<!-- Stack on mobile, side-by-side on desktop -->
<div class="flex flex-col md:flex-row gap-4">

<!-- Hidden on mobile, visible on desktop -->
<div class="hidden md:block">

<!-- Full width on mobile, contained on desktop -->
<div class="w-full md:w-auto">
```

### Component Adaptations

| Component | Mobile | Desktop |
|-----------|--------|---------|
| Navigation | Hamburger + drawer | Horizontal nav |
| Tabs | Dropdown select | Horizontal tabs |
| Pagination | "Page X of Y" | Full page numbers |
| Grids | 1 column | 2-4 columns |

---

## Accessibility

### Touch Targets

Minimum 44x44px for interactive elements on touch devices:

```css
@media (pointer: coarse) {
  .input, button { min-height: 44px; }
}
```

### Focus Indicators

All interactive elements have visible focus states:

```html
<button class="focus-visible:ring-2 focus-visible:ring-primary-500/50 dark:focus-visible:ring-gold/50">
```

### Color Contrast

- Body text: Minimum 4.5:1 contrast ratio
- Large text: Minimum 3:1 contrast ratio
- Interactive elements: Clear visual distinction

### Keyboard Navigation

- All modals trap focus
- ESC key closes modals/dropdowns
- Tab navigation follows logical order

---

## Print Styles

### Printable Itinerary

The timeline export uses print-optimized styles:

```css
@media print {
  /* Hide everything except printable content */
  body > *:not(.print-itinerary-wrapper) { display: none; }

  /* Optimize for paper */
  .print-itinerary { font-size: 11pt; }
  .print-title { font-size: 24pt; }

  /* Prevent page breaks inside items */
  .print-day-item { page-break-inside: avoid; }
}
```

### Print Guidelines

- Use grayscale-friendly colors
- Avoid dark backgrounds
- Ensure adequate contrast
- Set appropriate page breaks
- Test with actual print preview

---

## Quick Reference

### CSS Classes Cheat Sheet

| Purpose | Class |
|---------|-------|
| Primary button | `.btn-primary` |
| Secondary button | `.btn-secondary` |
| Danger button | `.btn-danger` |
| Form input | `.input` |
| Form label | `.label` |
| Required label | `.label-required` |
| Card | `.card` |
| Interactive card | `.card-interactive` |
| FAB | `.fab` |
| Tab | `.tab` |
| Active tab | `.tab-active` |
| Gradient text | `.text-gradient` |
| Glass effect | `.glass` |
| Loading shimmer | `.shimmer` |

### Files Reference

| File | Purpose |
|------|---------|
| `tailwind.config.js` | Color palette, animations, fonts |
| `src/index.css` | Global styles, component classes |
| `src/store/themeStore.ts` | Dark mode state management |
| `src/components/icons/index.tsx` | SVG icon components |
| `src/utils/statusColors.ts` | Status color mappings |
| `src/components/Modal.tsx` | Modal component |
| `src/components/Skeleton.tsx` | Loading skeletons |
| `src/components/LoadingSpinner.tsx` | Spinner component |
| `src/components/EmptyState.tsx` | Empty state component |
| `src/components/TabGroup.tsx` | Tab navigation |
| `src/components/Pagination.tsx` | Pagination controls |
