# 20-02 — **Frontend Architecture Canonical Specification**

> **Purpose:** This document defines the frontend architecture, component structure, reactive patterns, and client-side data flow.
>
> **Use When:** Working on frontend code, creating new components, or understanding frontend patterns.

---

## 1. Overview

The frontend is built with Svelte and Vite, using a component-based architecture with reactive statements for state management.

**Framework:** Svelte 4+
**Build Tool:** Vite
**Entry Point:** `frontend/src/main.js`

---

## 2. Component Structure

### **2.1 Root Component**

**File:** `frontend/src/App.svelte`

**Structure:**
- Navigation header
- View switching (Daily Log / Settings)
- Conditional rendering based on `currentView`

**Views:**
- `'log'` - DailyLogForm component
- `'settings'` - SettingsPanel component

---

### **2.2 Component Organization**

**Directory:** `frontend/src/lib/`

**Components:**
- `DailyLogForm.svelte` - Main daily log entry form
- `SettingsPanel.svelte` - App settings
- `PhotoUpload.svelte` - Photo upload and display
- `WorkoutExercises.svelte` - Workout entry
- `FoodTracker.svelte` - Food logging
- `GraphView.svelte` - Data visualization
- `DayCounter.svelte` - Day number display
- `MetricInput.svelte` - Body metrics input
- `SleepTimeInput.svelte` - Sleep input
- `StravaActivities.svelte` - Strava integration
- `PhotoGrid.svelte` - Photo progression display
- `CommonFoods.svelte` - Recent foods carousel
- `FoodSearch.svelte` - Food search interface
- `FoodEntry.svelte` - Individual food entry
- `PortionAdjustmentModal.svelte` - Portion adjustment

**Utilities:**
- `api.js` - API client functions
- `utils/foodConversions.js` - Food unit conversions
- `utils/foodStorage.js` - LocalStorage food management

---

## 3. Reactive Patterns

### **3.1 Reactive Statements**

**Pattern:** `$: variable = expression`

**Usage:**
- Auto-calculate derived values
- Update UI when dependencies change
- Trigger side effects

**Example:**
```javascript
$: totalCalories = (() => {
  const p = (parseFloat(protein) || 0) + foodMacros.protein;
  const f = (parseFloat(fat) || 0) + foodMacros.fat;
  const c = (parseFloat(carbs) || 0) + foodMacros.carbs;
  return (p * 4) + (f * 9) + (c * 4);
})();
```

---

### **3.2 Reactive Blocks**

**Pattern:** `$: { statements }`

**Usage:**
- Multiple statements that depend on reactive values
- Side effects when values change

**Example:**
```javascript
$: if (comparisonMode) {
  if (progressionMode) {
    progressionMode = false;
  }
}
```

---

### **3.3 Component Props**

**Pattern:** `export let propName = defaultValue`

**Usage:**
- Pass data from parent to child
- Optional with default values
- Reactive (updates when parent changes)

**Example:**
```javascript
export let exercises = [];
export let currentPhotoUrl = null;
```

---

### **3.4 Event Dispatching**

**Pattern:** `createEventDispatcher()`

**Usage:**
- Child-to-parent communication
- Custom events with data

**Example:**
```javascript
const dispatch = createEventDispatcher();
dispatch('change', newFoods);
```

**Parent Handling:**
```svelte
<FoodTracker on:change={handleFoodsChange} />
```

---

## 4. API Client

### **4.1 API Functions**

**File:** `frontend/src/lib/api.js`

**Pattern:** All API calls use `fetch` with error handling

**Functions:**
- `getTodayLog()` - Get today's log
- `getLogByDate(date)` - Get log for date
- `saveLog(logData, photoFile)` - Save/update log
- `getSettings()` - Get app settings
- `updateSettings(settings, goalPhotoFile)` - Update settings
- `getCurrentDay()` - Get current day number
- `getPhotoUrl(date)` - Get photo URL
- `getGoalPhotoUrl()` - Get goal photo URL
- `getRecentLogs(limit)` - Get recent logs
- `getLogsByDateRange(startDate, endDate)` - Get logs by range
- `searchFoods(query, options)` - Search foods
- `getFoodDetails(fdcId, format)` - Get food details
- `getBatchFoodDetails(fdcIds)` - Batch food details

**Base URL:** `/api` (relative, proxied in production)

---

### **4.2 Error Handling**

**Pattern:** Try/catch with user-friendly error messages

**Example:**
```javascript
try {
  const log = await getTodayLog();
  // Use log
} catch (err) {
  console.error('Error loading log:', err);
  error = 'Failed to load log';
}
```

---

## 5. State Management

### **5.1 Component State**

**Pattern:** Local variables in component script

**Scope:**
- Component-level state
- Not shared across components
- Reactive updates trigger re-renders

---

### **5.2 LocalStorage**

**Usage:**
- Common foods storage
- User preferences
- Client-side caching

**Utilities:**
- `foodStorage.js` - Food-related storage
- Direct `localStorage` API for other data

---

### **5.3 No Global State Store**

**Pattern:** Props and events for data flow
**Rationale:** Svelte reactivity handles most needs without external stores

---

## 6. Lifecycle Hooks

### **6.1 onMount**

**Usage:**
- Initial data loading
- Setup operations
- One-time initialization

**Example:**
```javascript
onMount(async () => {
  const settings = await getSettings();
  startDate = settings.start_date;
});
```

---

### **6.2 onDestroy**

**Usage:**
- Cleanup operations
- Cancel timers
- Remove event listeners

---

## 7. Styling

### **7.1 Scoped Styles**

**Pattern:** `<style>` blocks in components

**Scope:**
- Styles scoped to component
- No global pollution
- Can use global selectors with `:global()`

---

### **7.2 CSS Variables**

**File:** `frontend/src/app.css`

**Usage:**
- Global design tokens
- Consistent spacing, colors, shadows
- See `30-01-css-variables.md` for full list

---

### **7.3 Responsive Design**

**Pattern:** Mobile-first media queries

**Breakpoints:**
- Mobile: default (< 768px)
- Desktop: `@media (min-width: 768px)`

**See:** `30-03-responsive-design.md`

---

## 8. Build Configuration

### **8.1 Vite Config**

**File:** `frontend/vite.config.js`

**Features:**
- Svelte plugin
- HTTPS in development (mkcert)
- Proxy configuration for API

---

### **8.2 Svelte Config**

**File:** `frontend/svelte.config.js`

**Features:**
- Compiler options
- Preprocessing (if used)

---

## 9. References

- **System Architecture:** `20-01-system-architecture.md`
- **Backend Services:** `20-03-backend-services.md`
- **CSS Variables:** `30-01-css-variables.md`
- **Component Patterns:** `30-02-component-patterns.md`
- **Responsive Design:** `30-03-responsive-design.md`

---

## 10. Maintenance

This document should be updated when:
- Component structure changes significantly
- New reactive patterns are introduced
- State management approach changes
- Build configuration changes

---

**END OF CANONICAL SPECIFICATION**
