# 30-02 — **Component Patterns Canonical Specification**

> **Purpose:** This document defines Svelte component conventions, prop patterns, event handling, and component structure standards.
>
> **Use When:** Creating new Svelte components, modifying existing components, or ensuring component consistency.

---

## 1. Component File Structure

### **1.1 Standard Structure**

**Order:**
1. `<script>` - JavaScript logic
2. `<template>` (implicit in Svelte) - HTML markup
3. `<style>` - Scoped CSS

**Example:**
```svelte
<script>
  // Imports
  // Props
  // State
  // Functions
  // Lifecycle hooks
</script>

<!-- Template -->
<div class="component">
  <!-- Content -->
</div>

<style>
  /* Scoped styles */
</style>
```

---

## 2. Component Props

### **2.1 Prop Declaration**

**Pattern:** `export let propName = defaultValue`

**Rules:**
- Always provide default values when appropriate
- Use descriptive names
- Document prop types in comments

**Example:**
```javascript
export let exercises = []; // Array of exercise objects
export let currentPhotoUrl = null; // String URL or null
export let category = 'photo'; // 'photo' | 'body' | 'sleep' | 'workout' | 'macros'
```

---

### **2.2 Prop Validation**

**Pattern:** Reactive validation (when needed)

**Example:**
```javascript
$: if (exercises && !Array.isArray(exercises)) {
  console.warn('exercises prop must be an array');
  exercises = [];
}
```

---

## 3. Event Handling

### **3.1 Event Dispatcher**

**Pattern:** `createEventDispatcher()`

**Usage:**
- Child-to-parent communication
- Custom events with data payload

**Example:**
```javascript
import { createEventDispatcher } from 'svelte';

const dispatch = createEventDispatcher();

function handleChange() {
  dispatch('change', { data: newData });
}
```

**Parent Usage:**
```svelte
<ChildComponent on:change={handleChange} />
```

---

### **3.2 DOM Events**

**Pattern:** `on:event={handler}`

**Common Events:**
- `on:click` - Click events
- `on:input` - Input changes
- `on:change` - Form changes
- `on:submit` - Form submission
- `on:keydown` - Keyboard events

**Example:**
```svelte
<button on:click={handleClick}>Click</button>
<input on:input={handleInput} />
```

---

### **3.3 Event Modifiers**

**Common Modifiers:**
- `on:click|stopPropagation` - Stop event bubbling
- `on:click|preventDefault` - Prevent default behavior
- `on:click|once` - Fire only once

**Example:**
```svelte
<button on:click|stopPropagation={handleClick}>Click</button>
```

---

## 4. Reactive Statements

### **4.1 Reactive Variables**

**Pattern:** `$: variable = expression`

**Usage:**
- Derived values
- Computed properties
- Auto-updating calculations

**Example:**
```javascript
$: totalCalories = (protein * 4) + (fat * 9) + (carbs * 4);
$: isToday = selectedDate === todayStr;
```

---

### **4.2 Reactive Blocks**

**Pattern:** `$: { statements }`

**Usage:**
- Multiple statements
- Side effects
- Conditional logic

**Example:**
```javascript
$: if (comparisonMode) {
  if (progressionMode) {
    progressionMode = false;
  }
}
```

---

## 5. Component Lifecycle

### **5.1 onMount**

**Usage:**
- Initial data loading
- Setup operations
- One-time initialization

**Example:**
```javascript
import { onMount } from 'svelte';

onMount(async () => {
  const data = await loadData();
  // Initialize component
});
```

---

### **5.2 onDestroy**

**Usage:**
- Cleanup operations
- Cancel timers
- Remove event listeners

**Example:**
```javascript
import { onDestroy } from 'svelte';

let interval;

onMount(() => {
  interval = setInterval(() => {
    // Do something
  }, 1000);
});

onDestroy(() => {
  clearInterval(interval);
});
```

---

## 6. Component Naming

### **6.1 File Naming**

**Pattern:** `PascalCase.svelte`

**Examples:**
- `DailyLogForm.svelte`
- `PhotoUpload.svelte`
- `WorkoutExercises.svelte`

---

### **6.2 Component Naming**

**Pattern:** Match file name (PascalCase)

**Example:**
```svelte
<!-- PhotoUpload.svelte -->
<script>
  // Component logic
</script>
```

---

## 7. Styling Patterns

### **7.1 Scoped Styles**

**Pattern:** Styles in `<style>` block are scoped

**Scope:**
- Styles apply only to component
- No global pollution
- Use `:global()` for global selectors when needed

---

### **7.2 CSS Variables**

**Pattern:** Use CSS variables from `app.css`

**Example:**
```css
.button {
  background-color: var(--primary-color);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--border-radius-sm);
}
```

**See:** `30-01-css-variables.md` for available variables

---

## 8. Component Composition

### **8.1 Parent-Child Communication**

**Pattern:**
- Props: Parent → Child
- Events: Child → Parent

**Example:**
```svelte
<!-- Parent -->
<FoodTracker 
  foods={foods} 
  on:change={handleFoodsChange}
  on:totals={handleFoodTotals}
/>

<!-- Child -->
<script>
  export let foods = [];
  const dispatch = createEventDispatcher();
  
  function updateFoods(newFoods) {
    foods = newFoods;
    dispatch('change', newFoods);
  }
</script>
```

---

### **8.2 Slot Usage**

**Pattern:** Use slots for flexible content

**Example:**
```svelte
<!-- Component -->
<div class="card">
  <slot name="header" />
  <slot />
  <slot name="footer" />
</div>

<!-- Usage -->
<Card>
  <h2 slot="header">Title</h2>
  <p>Content</p>
  <button slot="footer">Action</button>
</Card>
```

---

## 9. State Management

### **9.1 Local State**

**Pattern:** Component-level variables

**Scope:**
- Component-only state
- Not shared
- Reactive updates

---

### **9.2 Props for Shared State**

**Pattern:** Pass state via props from parent

**Usage:**
- Shared state in parent
- Passed to children
- Updated via events

---

## 10. Best Practices

### **10.1 Component Size**

**Rule:** Keep components focused and reasonably sized
**Guideline:** Single responsibility per component

---

### **10.2 Prop Drilling**

**Rule:** Avoid deep prop drilling
**Solution:** Use events or lift state to appropriate level

---

### **10.3 Reusability**

**Rule:** Make components reusable when possible
**Pattern:** Accept props for customization

---

## 11. References

- **Frontend Architecture:** `20-02-frontend-architecture.md`
- **CSS Variables:** `30-01-css-variables.md`
- **Responsive Design:** `30-03-responsive-design.md`

---

## 12. Maintenance

This document should be updated when:
- New component patterns are established
- Svelte conventions change
- Component structure standards evolve

---

**END OF CANONICAL SPECIFICATION**
