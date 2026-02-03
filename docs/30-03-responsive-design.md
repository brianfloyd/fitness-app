# 30-03 — **Responsive Design Canonical Specification**

> **Purpose:** This document defines responsive design patterns, breakpoints, mobile-first approach, and PWA considerations.
>
> **Use When:** Creating or modifying responsive layouts, implementing mobile features, or ensuring cross-device compatibility.

---

## 1. Overview

The Fitness App uses a mobile-first responsive design approach with breakpoints, safe area support, and PWA optimization.

**Approach:** Mobile-first (design for mobile, enhance for desktop)
**Framework:** CSS Media Queries
**PWA:** Progressive Web App with standalone mode

---

## 2. Breakpoints

### **2.1 Standard Breakpoints**

**Mobile:** Default (< 768px)
- Base styles apply
- Single column layouts
- Touch-optimized interactions

**Desktop:** `@media (min-width: 768px)`
- Enhanced layouts
- Multi-column where appropriate
- Hover states enabled

**Example:**
```css
/* Mobile (default) */
.component {
  width: 100%;
  padding: var(--spacing-md);
}

/* Desktop */
@media (min-width: 768px) {
  .component {
    max-width: 1200px;
    padding: var(--spacing-xl);
  }
}
```

---

## 3. Mobile-First Patterns

### **3.1 Layout Direction**

**Mobile:** Vertical stacking (flex-direction: column)
**Desktop:** Horizontal layouts (flex-direction: row)

**Example:**
```css
.container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

@media (min-width: 768px) {
  .container {
    flex-direction: row;
  }
}
```

---

### **3.2 Spacing**

**Mobile:** Tighter spacing
**Desktop:** More generous spacing

**Pattern:** Use CSS variables, adjust in media queries

**Example:**
```css
.section {
  padding: var(--spacing-md);
}

@media (min-width: 768px) {
  .section {
    padding: var(--spacing-xl);
  }
}
```

---

## 4. Safe Area Support

### **4.1 Safe Area Insets**

**File:** `frontend/src/app.css`

**Usage:**
- `env(safe-area-inset-top)`
- `env(safe-area-inset-bottom)`
- `env(safe-area-inset-left)`
- `env(safe-area-inset-right)`

**Purpose:**
- Handle device notches
- Support full-screen PWA mode
- Prevent content cutoff

**Example:**
```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

---

### **4.2 Viewport Configuration**

**File:** `frontend/index.html`

**Meta Tag:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```

**Features:**
- `viewport-fit=cover` - Full screen support
- `user-scalable=no` - Prevent zoom (PWA)
- `maximum-scale=1.0` - Lock scale

---

## 5. Touch Interactions

### **5.1 Touch Targets**

**Rule:** Minimum 44px × 44px touch targets
**Pattern:** Use padding, not just content size

**Example:**
```css
.button {
  min-height: 44px;
  min-width: 44px;
  padding: var(--spacing-sm) var(--spacing-md);
}
```

---

### **5.2 Touch Events**

**Pattern:** Use `on:touchstart`, `on:touchend` for mobile-specific interactions

**Example:**
```svelte
<div 
  on:click={handleClick}
  on:touchstart={handleTouchStart}
  on:touchend={handleTouchEnd}
>
  Content
</div>
```

---

## 6. PWA Considerations

### **6.1 Standalone Mode**

**Manifest:** `frontend/public/manifest.json`

**Display Mode:**
- `standalone` - No browser UI
- `window-controls-overlay` - Minimal UI

**Result:**
- App appears as native app
- No address bar
- Full screen experience

---

### **6.2 Viewport Height**

**Issue:** Mobile browsers have dynamic viewport height
**Solution:** Use `-webkit-fill-available` and `100vh` with safe areas

**Example:**
```css
body {
  min-height: 100vh;
  min-height: -webkit-fill-available; /* iOS Safari */
}
```

---

## 7. Responsive Components

### **7.1 Photo Display**

**Mobile:**
- Full width
- Metrics below photo
- Stacked layout

**Desktop:**
- Fixed width (600px)
- Metrics beside photo
- Side-by-side layout

---

### **7.2 Forms**

**Mobile:**
- Full width inputs
- Stacked fields
- Large touch targets

**Desktop:**
- Max width constraints
- Multi-column where appropriate
- Hover states

---

### **7.3 Navigation**

**Mobile:**
- Bottom navigation (if implemented)
- Hamburger menu (if needed)
- Touch-optimized

**Desktop:**
- Top navigation
- Hover states
- Keyboard navigation

---

## 8. Grid and Flexbox

### **8.1 Flexbox Patterns**

**Mobile:**
```css
.container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}
```

**Desktop:**
```css
@media (min-width: 768px) {
  .container {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
```

---

### **8.2 Grid Patterns**

**Usage:** When appropriate for complex layouts

**Example:**
```css
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-md);
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

---

## 9. Typography

### **9.1 Font Sizing**

**Mobile:** Base font size (1rem)
**Desktop:** Can increase slightly if needed

**Pattern:** Use relative units (rem, em)

---

### **9.2 Line Height**

**Pattern:** `line-height: 1.6` for readability
**Mobile:** Slightly tighter acceptable
**Desktop:** More generous spacing

---

## 10. Images and Media

### **10.1 Image Sizing**

**Pattern:** Responsive images with `max-width: 100%`

**Example:**
```css
img {
  max-width: 100%;
  height: auto;
}
```

---

### **10.2 Aspect Ratios**

**Pattern:** Maintain aspect ratios
**Method:** Use `aspect-ratio` CSS property or padding-bottom trick

---

## 11. References

- **CSS Variables:** `30-01-css-variables.md`
- **Component Patterns:** `30-02-component-patterns.md`
- **PWA Setup:** Reference docs (999-pwa-setup-reference.md)
- **System Architecture:** `20-01-system-architecture.md`

---

## 12. Maintenance

This document should be updated when:
- New breakpoints are needed
- PWA features change
- Responsive patterns evolve
- Device support requirements change

---

**END OF CANONICAL SPECIFICATION**
