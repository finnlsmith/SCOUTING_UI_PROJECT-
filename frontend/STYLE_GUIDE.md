# Style Guide

## Table of Contents
1. [Overview](#overview)
2. [Design System](#design-system)
3. [Color Palette](#color-palette)
4. [Typography](#typography)
5. [Spacing](#spacing)
6. [Components](#components)
7. [CSS Modules Usage](#css-modules-usage)
8. [Best Practices](#best-practices)

---

## Overview

This style guide documents the design system and styling patterns used throughout the RoarStats frontend application. The application uses **CSS Modules** for component-scoped styling with **CSS Custom Properties** (CSS Variables) for theming and maintainability.

### Key Principles
- **Maintainability**: Centralized design tokens via CSS variables
- **Consistency**: Reusable shared styles for common patterns
- **Scalability**: Component-scoped styles prevent naming conflicts
- **Theming Ready**: CSS variables enable easy theme switching in the future

---

## Design System

### File Structure

```
src/
├── styles/
│   ├── variables.css          # Global CSS variables (colors, spacing, typography)
│   └── shared.module.css      # Reusable utility classes
└── components/
    └── [ComponentName]/
        ├── index.js
        └── [ComponentName].module.css
```

### CSS Variables Location

All design tokens are defined in `src/styles/variables.css` and imported globally in `App.js`.

---

## Color Palette

### Background Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--color-bg-primary` | `#0F0E26` | Main application background (dark navy) |
| `--color-bg-secondary` | `#1c1b3a` | Secondary backgrounds (sidebar, cards) |
| `--color-bg-card` | `#f8fafc` | Card backgrounds |
| `--color-bg-card-alt` | `#f9fafb` | Alternative card backgrounds |
| `--color-bg-white` | `#fff` | White backgrounds |
| `--color-bg-error` | `#ffe7e7` | Error message backgrounds |

### Text Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--color-text-primary` | `white` | Primary text (on dark backgrounds) |
| `--color-text-secondary` | `#4b5563` | Secondary text (labels, metadata) |
| `--color-text-tertiary` | `#666` | Tertiary text (subtle information) |
| `--color-text-dark` | `#0F0E26` | Dark text (on light backgrounds) |
| `--color-text-heading` | `#1e293b` | Heading text |
| `--color-text-error` | `#b40000` | Error text |
| `--color-text-link` | `#a9a9ff` | Link text |

### Border Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--color-border-light` | `#e5e5e6` | Light borders |
| `--color-border-medium` | `#e5e7eb` | Medium borders |
| `--color-border-dark` | `#dadce0` | Dark borders |
| `--color-border-error` | `#ffbdbd` | Error borders |

### Interactive Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--color-button-primary` | `#003cd1` | Primary button background |
| `--color-button-secondary` | `#777` | Secondary button background |
| `--color-button-nav` | `#3b5998` | Navigation button background |
| `--color-button-nav-active` | `#4e6fa4` | Active navigation button |
| `--color-highlight` | `#def` | Highlight color (selected items) |

### Shadow Colors

| Variable | Value | Usage |
|----------|-------|-------|
| `--color-shadow-light` | `rgba(0, 0, 0, 0.05)` | Light shadows |
| `--color-shadow-medium` | `rgba(0, 0, 0, 0.1)` | Medium shadows |
| `--color-shadow-dark` | `rgba(0, 0, 0, 0.2)` | Dark shadows |

### Usage Example

```css
/* In a component CSS Module */
.component {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-medium);
}
```

---

## Typography

### Font Sizes

| Variable | Value | Usage |
|----------|-------|-------|
| `--font-size-xs` | `12px` | Extra small text (captions, fine print) |
| `--font-size-sm` | `14px` | Small text (metadata, footnotes) |
| `--font-size-base` | `16px` | Base body text |
| `--font-size-lg` | `18px` | Large body text |
| `--font-size-xl` | `20px` | Extra large text (subheadings) |
| `--font-size-2xl` | `24px` | 2X large (section headings) |
| `--font-size-3xl` | `30px` | 3X large (page headings) |
| `--font-size-4xl` | `38px` | 4X large (hero text) |
| `--font-size-5xl` | `44px` | 5X large (main titles) |

### Font Weights

| Variable | Value | Usage |
|----------|-------|-------|
| `--font-weight-normal` | `400` | Regular text |
| `--font-weight-medium` | `500` | Medium emphasis |
| `--font-weight-semibold` | `600` | Semibold (subheadings) |
| `--font-weight-bold` | `700` | Bold (headings) |
| `--font-weight-extrabold` | `800` | Extrabold (hero text) |

### Usage Example

```css
.heading {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-heading);
}

.body {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-normal);
  line-height: 1.7;
}
```

---

## Spacing

### Spacing Scale

| Variable | Value | Usage |
|----------|-------|-------|
| `--spacing-xs` | `4px` | Tight spacing (icons, checkboxes) |
| `--spacing-sm` | `8px` | Small spacing (compact elements) |
| `--spacing-md` | `16px` | Medium spacing (default padding) |
| `--spacing-lg` | `24px` | Large spacing (section gaps) |
| `--spacing-xl` | `32px` | Extra large spacing |
| `--spacing-2xl` | `40px` | 2X large spacing |
| `--spacing-3xl` | `48px` | 3X large spacing |
| `--spacing-4xl` | `60px` | 4X large spacing (hero sections) |

### Usage Example

```css
.card {
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  gap: var(--spacing-sm);
}
```

---

## Components

### Buttons

#### Primary Button

```jsx
import sharedStyles from "../../styles/shared.module.css";

<button className={sharedStyles.buttonPrimary}>
  Primary Action
</button>
```

**Styles**: Blue background (`#003cd1`), white text, rounded corners, large padding.

#### Secondary Button

```jsx
<button className={sharedStyles.buttonSecondary} disabled>
  Disabled Action
</button>
```

**Styles**: Gray background (`#777`), reduced opacity, disabled state.

#### Standard Button

```jsx
<button className={sharedStyles.button}>
  Standard Button
</button>
```

**Styles**: White background, border, hover effects.

#### Reset Button

```jsx
<button className={sharedStyles.buttonReset}>
  Reset
</button>
```

**Styles**: Light border, smaller padding, subtle hover effect.

#### Navigation Button

```jsx
import styles from "./Sidebar.module.css";

<Link className={styles.link} to="/path">
  Navigation
</Link>
```

**Active State**:
```jsx
<Link className={styles.linkActive} to="/path">
  Active Navigation
</Link>
```

### Cards

#### Standard Card

```css
.card {
  box-shadow: var(--shadow-lg);
  border-radius: var(--radius-2xl);
  background: var(--color-bg-card);
  padding: var(--spacing-md);
}
```

#### Alternative Card

```css
.cardAlt {
  background: var(--color-bg-card-alt);
  border: 2px solid var(--color-border-dark);
  box-shadow: var(--shadow-xl);
}
```

### Typography Classes

#### Headings

```jsx
import sharedStyles from "../../styles/shared.module.css";

<h1 className={sharedStyles.heading1}>Main Title</h1>
<h2 className={sharedStyles.heading2}>Section Title</h2>
<h3 className={sharedStyles.heading3}>Subsection Title</h3>
```

**Styles**:
- `heading1`: 44px, extrabold, 1px letter-spacing
- `heading2`: 30px, medium weight
- `heading3`: 24px, medium weight

---

## CSS Modules Usage

### Basic Setup

Each component has its own CSS Module file:

```jsx
// ComponentName/index.js
import React from "react";
import styles from "./ComponentName.module.css";

export default function ComponentName() {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Title</h2>
    </div>
  );
}
```

```css
/* ComponentName/ComponentName.module.css */
.container {
  padding: var(--spacing-md);
  background-color: var(--color-bg-primary);
}

.title {
  font-size: var(--font-size-2xl);
  color: var(--color-text-primary);
}
```

### Composing Classes

CSS Modules support class composition:

```css
/* shared.module.css */
.baseButton {
  padding: 10px 20px;
  border-radius: var(--radius-md);
}

/* component.module.css */
.primaryButton {
  composes: baseButton from '../shared.module.css';
  background: var(--color-button-primary);
  color: white;
}
```

### Using CSS Variables

Always use CSS variables from `variables.css` instead of hardcoded values:

```css
/* ✅ Good */
.card {
  padding: var(--spacing-md);
  background: var(--color-bg-card);
  font-size: var(--font-size-base);
}

/* ❌ Bad */
.card {
  padding: 16px;
  background: #f8fafc;
  font-size: 16px;
}
```

### Multiple Classes

Apply multiple classes using template literals:

```jsx
<div className={`${styles.card} ${styles.cardActive}`}>
  Content
</div>
```

Or with conditional classes:

```jsx
<div className={`
  ${styles.card}
  ${isActive ? styles.cardActive : ''}
`}>
  Content
</div>
```

---

## Best Practices

### 1. Use CSS Variables

Always reference design tokens from `variables.css`:

```css
/* ✅ Good */
.element {
  color: var(--color-text-primary);
  margin: var(--spacing-lg);
}

/* ❌ Bad */
.element {
  color: white;
  margin: 24px;
}
```

### 2. Component-Scoped Styles

Keep styles component-specific using CSS Modules:

```css
/* ✅ Good - Component.module.css */
.button {
  /* Styles specific to this component */
}

/* ❌ Bad - Global styles */
.button {
  /* Might conflict with other components */
}
```

### 3. Shared Utilities

Use `shared.module.css` for reusable patterns:

```jsx
/* ✅ Good */
import sharedStyles from "../../styles/shared.module.css";
<button className={sharedStyles.buttonPrimary}>Click</button>
```

### 4. Semantic Class Names

Use descriptive, semantic class names:

```css
/* ✅ Good */
.matchCard {
  /* Clear intent */
}

.matchContainer {
  /* Clear intent */
}

/* ❌ Bad */
.box1 {
  /* Not descriptive */
}

.red {
  /* Not semantic */
}
```

### 5. Responsive Design

Use CSS variables for consistent responsive behavior:

```css
.container {
  padding: var(--spacing-md);
}

@media (min-width: 768px) {
  .container {
    padding: var(--spacing-lg);
  }
}
```

### 6. Maintain Hierarchy

Follow consistent spacing hierarchy:

```css
.card {
  padding: var(--spacing-md);        /* Internal padding */
  margin-bottom: var(--spacing-lg);  /* External spacing */
  gap: var(--spacing-sm);            /* Child gaps */
}
```

### 7. Accessibility

Ensure sufficient color contrast:

```css
/* ✅ Good */
.text {
  color: var(--color-text-primary);  /* White on dark bg */
  background: var(--color-bg-primary); /* Dark bg */
}

/* Ensure WCAG AA compliance */
```

---

## Component Examples

### Example: Card Component

```jsx
// Card/index.js
import React from "react";
import styles from "./Card.module.css";

export default function Card({ title, children }) {
  return (
    <div className={styles.card}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
```

```css
/* Card/Card.module.css */
.card {
  background: var(--color-bg-card);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-lg);
  margin-bottom: var(--spacing-lg);
}

.title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-heading);
  margin-bottom: var(--spacing-sm);
}

.content {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  line-height: 1.7;
}
```

### Example: Button with Variants

```jsx
// Button/index.js
import React from "react";
import styles from "./Button.module.css";
import sharedStyles from "../../styles/shared.module.css";

export default function Button({ variant = "default", children, ...props }) {
  const variantClass = {
    primary: sharedStyles.buttonPrimary,
    secondary: sharedStyles.buttonSecondary,
    reset: sharedStyles.buttonReset,
    default: sharedStyles.button,
  }[variant];

  return (
    <button className={variantClass} {...props}>
      {children}
    </button>
  );
}
```

---

## Border Radius

| Variable | Value | Usage |
|----------|-------|-------|
| `--radius-sm` | `5px` | Small radius (inputs, small elements) |
| `--radius-md` | `8px` | Medium radius (buttons, standard elements) |
| `--radius-lg` | `10px` | Large radius (cards, large elements) |
| `--radius-xl` | `15px` | Extra large radius (hero sections) |
| `--radius-2xl` | `16px` | 2X large radius (main cards) |
| `--radius-3xl` | `22px` | 3X large radius (modal dialogs) |

---

## Shadows

| Variable | Value | Usage |
|----------|-------|-------|
| `--shadow-sm` | `0 2px 6px var(--color-shadow-light)` | Subtle elevation |
| `--shadow-md` | `0 2px 12px rgba(0, 0, 0, 0)` | Medium elevation |
| `--shadow-lg` | `0 2px 16px rgba(0, 0, 1, 0.01)` | Large elevation (cards) |
| `--shadow-xl` | `0 3px 18px rgba(136, 136, 136, 0.05)` | Extra large elevation |
| `--shadow-button` | `3px 4px 0 rgba(0, 0, 0, 0.02)` | Button shadow |
| `--shadow-button-lg` | `0 4px 24px rgba(0, 0, 0, 0.01)` | Large button shadow |

---

## Transitions

| Variable | Value | Usage |
|----------|-------|-------|
| `--transition-fast` | `0.14s` | Quick transitions (hover states) |
| `--transition-base` | `0.2s` | Standard transitions |

---

## Quick Reference

### Common Patterns

```css
/* Card */
.card {
  background: var(--color-bg-card);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-lg);
}

/* Button */
.button {
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  transition: all var(--transition-base);
}

/* Heading */
.heading {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-heading);
  margin-bottom: var(--spacing-md);
}

/* Text */
.text {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  line-height: 1.7;
}
```

---

## Future Enhancements

### Theme Switching (Not Yet Implemented)

The CSS variable structure is ready for theme switching. Future implementation could include:

1. **Theme Provider** - React Context for theme management
2. **Dark/Light Mode Toggle** - UI control to switch themes
3. **Theme Variants** - Additional CSS variable sets in `variables.css`:
   ```css
   [data-theme="light"] {
     --color-bg-primary: #ffffff;
     --color-text-primary: #0F0E26;
   }
   
   [data-theme="dark"] {
     --color-bg-primary: #0F0E26;
     --color-text-primary: #ffffff;
   }
   ```

---

## Resources

- **CSS Variables File**: `src/styles/variables.css`
- **Shared Styles**: `src/styles/shared.module.css`
- **Component Examples**: See `src/components/` for implementation examples
- **CSS Modules Documentation**: https://github.com/css-modules/css-modules

---

## Questions or Updates?

For questions about this style guide or to propose design system updates, please contact the development team or open an issue in the repository.

