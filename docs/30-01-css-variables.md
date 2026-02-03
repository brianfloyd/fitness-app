# 30-01 — **CSS Variables Canonical Specification**

> **Purpose:** This document defines all CSS custom properties (variables) used throughout the application for colors, spacing, typography, and other design tokens.
>
> **Use When:** Creating or modifying styles, ensuring design consistency, or adding new UI components.

---

## 1. CSS Variables Location

**File:** `frontend/src/app.css`  
**Scope:** Global (defined in `:root`)

---

## 2. Color Variables

### **2.1 Primary Colors**

```css
--primary-color: #3b82f6;        /* Blue - primary actions */
--primary-hover: #2563eb;        /* Darker blue for hover states */
--secondary-color: #8b5cf6;      /* Purple - secondary accents */
--accent-color: #10b981;         /* Green - success/positive actions */
```

**Usage:**
- `--primary-color`: Buttons, links, active states
- `--primary-hover`: Button hover states
- `--secondary-color`: Secondary buttons, gradients
- `--accent-color`: Success messages, positive indicators

---

### **2.2 Background Colors**

```css
--background: #0f172a;            /* Main background (dark) */
--surface: #1e293b;               /* Card/surface background */
--surface-elevated: #334155;      /* Elevated surfaces (hover, active) */
```

**Usage:**
- `--background`: Body and main container backgrounds
- `--surface`: Card backgrounds, input backgrounds
- `--surface-elevated`: Hover states, active panels

---

### **2.3 Text Colors**

```css
--text-primary: #f1f5f9;          /* Primary text color */
--text-secondary: #cbd5e1;        /* Secondary text, labels */
--text-muted: #94a3b8;            /* Muted text, placeholders */
```

**Usage:**
- `--text-primary`: Main content text
- `--text-secondary`: Secondary text, labels
- `--text-muted`: Placeholders, disabled text

---

### **2.4 Border Colors**

```css
--border: #334155;                /* Default border color */
--border-light: #475569;          /* Lighter border for subtle separation */
```

**Usage:**
- `--border`: Default borders on cards, inputs
- `--border-light`: Subtle borders, dividers

---

## 3. Spacing Variables

```css
--spacing-xs: 0.25rem;            /* 4px - Tight spacing */
--spacing-sm: 0.5rem;             /* 8px - Small spacing */
--spacing-md: 1rem;               /* 16px - Medium spacing */
--spacing-lg: 1.5rem;             /* 24px - Large spacing */
--spacing-xl: 2rem;               /* 32px - Extra large spacing */
```

**Usage:**
- `--spacing-xs`: Tight gaps, icon padding
- `--spacing-sm`: Small gaps, compact layouts
- `--spacing-md`: Default spacing, standard gaps
- `--spacing-lg`: Section spacing, larger gaps
- `--spacing-xl`: Major section spacing, page margins

**Pattern:** Use spacing variables consistently for all gaps, padding, and margins.

---

## 4. Border Radius

```css
--border-radius: 12px;            /* Default border radius */
--border-radius-sm: 8px;         /* Small border radius */
```

**Usage:**
- `--border-radius`: Cards, buttons, inputs
- `--border-radius-sm`: Small buttons, badges, pills

---

## 5. Shadow Variables

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.3);
--shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
```

**Usage:**
- `--shadow-sm`: Subtle elevation, inputs
- `--shadow`: Default card shadows, buttons
- `--shadow-lg`: Elevated modals, dropdowns

---

## 6. Usage Guidelines

### **6.1 Always Use Variables**

**DO:**
```css
.button {
  background-color: var(--primary-color);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius);
}
```

**DON'T:**
```css
.button {
  background-color: #3b82f6;
  padding: 8px 16px;
  border-radius: 12px;
}
```

### **6.2 Consistent Spacing**

Use spacing variables for all gaps:
- `gap: var(--spacing-md)` for flex/grid gaps
- `padding: var(--spacing-lg)` for component padding
- `margin: var(--spacing-xl)` for section margins

### **6.3 Color Hierarchy**

Follow the color hierarchy:
1. Primary actions → `--primary-color`
2. Secondary actions → `--secondary-color`
3. Success/positive → `--accent-color`
4. Backgrounds → `--background`, `--surface`
5. Text → `--text-primary`, `--text-secondary`, `--text-muted`

---

## 7. Component-Specific Patterns

### **7.1 Cards**

```css
.card {
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--border-radius);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow);
}
```

### **7.2 Buttons**

```css
.button {
  background-color: var(--primary-color);
  color: white;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--border-radius-sm);
  transition: all 0.2s ease;
}

.button:hover {
  background-color: var(--primary-hover);
  box-shadow: var(--shadow);
}
```

### **7.3 Inputs**

```css
.input {
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--border-radius-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  color: var(--text-primary);
}
```

---

## 8. References

- **CSS File:** `frontend/src/app.css`
- **Component Patterns:** `30-02-component-patterns.md` (when created)
- **Responsive Design:** `30-03-responsive-design.md` (when created)

---

## 9. Maintenance

This document should be updated when:
- New color variables are added
- Spacing scale changes
- Design system tokens are modified
- Theme changes are implemented

---

**END OF CANONICAL SPECIFICATION**
