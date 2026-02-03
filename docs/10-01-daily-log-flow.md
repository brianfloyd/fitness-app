# 10-01 — **Daily Log Flow Canonical Specification**

> **Purpose:** This document defines the user flow for daily log entry, including all steps from opening the app to saving a complete daily log entry.
>
> **Use When:** Understanding how users interact with the daily log feature, implementing changes to the daily log workflow, or documenting new daily log features.

---

## 1. Overview

The daily log is the primary feature of the Fitness App. Users log daily metrics including photos, body composition, workouts, nutrition, sleep, and activity data.

**Main Component:** `frontend/src/lib/DailyLogForm.svelte`

---

## 2. User Flow

### **2.1 Entry Point**

**View:** Daily Log tab (default view)
**File:** `frontend/src/App.svelte`
**Lines:** 20-22

User navigates to Daily Log view via navigation button.

---

### **2.2 Initial Load**

**Component:** `DailyLogForm.svelte`
**File:** `frontend/src/lib/DailyLogForm.svelte`

**Steps:**
1. Component mounts (`onMount`)
2. Loads settings (`getSettings()`) - total_days, start_date
3. Calculates current day number based on start_date
4. Loads today's log if it exists (`getTodayLog()`)
5. Populates form fields with existing data
6. Displays day counter (`DayCounter.svelte`)

**Day Calculation:**
- Day number = (current_date - start_date) + 1
- Clamped between 1 and total_days
- Displayed as "Day X of Y"

---

### **2.3 Date Selection**

**Feature:** Date picker for viewing/editing past or future logs

**Behavior:**
- Default: Today's date
- User can select any date
- Form loads log for selected date
- Day number recalculates based on selected date

---

### **2.4 Photo Upload**

**Component:** `PhotoUpload.svelte`
**File:** `frontend/src/lib/PhotoUpload.svelte`

**Flow:**
1. User clicks "Change Photo" or file input
2. File picker opens (camera on mobile)
3. User selects/captures photo
4. Crop modal opens with cropperjs
5. User adjusts crop area
6. User clicks "Apply Crop"
7. Photo converted to base64/FormData
8. Photo uploaded to `/api/logs/:date/photo`
9. Photo displayed in form

**AI Goal Photo:**
- Toggle between actual photo and AI goal photo
- Tap/click photo to toggle (mobile: single tap)
- Goal photo loaded from `/api/settings/goal-photo`

---

### **2.5 Body Metrics Entry**

**Component:** `MetricInput.svelte`
**Fields:**
- Weight (lbs) - DECIMAL(5,2)
- Body Fat % - DECIMAL(5,2)

**Behavior:**
- Auto-saves after delay (debounced)
- Validates numeric input
- Displays in photo progression when available

---

### **2.6 Workout Entry**

**Component:** `WorkoutExercises.svelte`
**File:** `frontend/src/lib/WorkoutExercises.svelte`

**Flow:**
1. User selects muscle group button
2. Exercise selection modal opens
3. User selects exercise (or creates custom)
4. Exercise card appears with sets
5. User enters weight and reps for each set
6. User marks exercise as completed
7. Workout data stored as JSON in `daily_logs.workout`

**Muscle Groups:**
- Biceps, Triceps, Chest, Back, Shoulders, Legs, Forearms, Core

**Data Structure:**
```json
[
  {
    "id": "unique-id",
    "name": "Exercise Name",
    "muscleGroup": "Chest",
    "sets": [
      { "id": "set-id", "weight": 150, "reps": 10 }
    ],
    "completed": true
  }
]
```

---

### **2.7 Food Tracking**

**Component:** `FoodTracker.svelte`
**File:** `frontend/src/lib/FoodTracker.svelte`

**Flow:**
1. User searches for food (USDA FoodData Central)
2. User selects food from results
3. Food added to list with default portion (100g)
4. User adjusts portion via `PortionAdjustmentModal`
5. Macros recalculated automatically
6. Food data stored as JSON in `daily_logs.foods`

**Common Foods:**
- Recent foods displayed in carousel
- Quick-add from recent foods
- Usage tracking for sorting

**Data Structure:**
```json
[
  {
    "id": "unique-id",
    "fdcId": 123456,
    "name": "Food Name",
    "brand": "Brand Name",
    "amount": 100,
    "unit": "g",
    "protein": 20.5,
    "fat": 1.3,
    "carbs": 0.0,
    "calories": 98
  }
]
```

---

### **2.8 Manual Macros Entry**

**Fields:**
- Protein (g) - DECIMAL(6,2)
- Fat (g) - DECIMAL(6,2)
- Carbs (g) - DECIMAL(6,2)

**Behavior:**
- Combined with food macros for total
- Total calories calculated: (protein * 4) + (fat * 9) + (carbs * 4)
- Auto-saves after delay

---

### **2.9 Sleep & Activity**

**Components:**
- `SleepTimeInput.svelte` - Sleep time and score
- `StravaActivities.svelte` - Strava integration
- Steps input field

**Fields:**
- Sleep Time (TIME)
- Sleep Score (INTEGER 1-10)
- Steps (INTEGER)
- Strava Activities (JSON)

---

### **2.10 Save Log**

**Action:** "Save Log" button or auto-save

**API Call:** `POST /api/logs`
**File:** `backend/src/routes/dailyLogs.js`

**Process:**
1. Form data validated
2. Day number calculated
3. Data serialized to JSON (workout, foods, strava)
4. Photo uploaded separately if new
5. Log saved/updated in database
6. Success message displayed
7. Form state updated

**Auto-save:**
- Debounced save after field changes
- Prevents saving on initial load

---

## 3. Data Flow

### **3.1 Load Flow**

```
User opens Daily Log
  ↓
Load Settings (start_date, total_days)
  ↓
Calculate Day Number
  ↓
Load Today's Log (if exists)
  ↓
Populate Form Fields
  ↓
Display Day Counter
```

### **3.2 Save Flow**

```
User enters/changes data
  ↓
Form state updates
  ↓
Auto-save timer (debounced)
  ↓
Serialize data (JSON for workout, foods, strava)
  ↓
POST /api/logs
  ↓
Backend saves to database
  ↓
Success response
  ↓
UI updates
```

---

## 4. Copy to Functionality

**Feature:** Copy data from one day to another

**Categories:**
- Photo
- Body (weight, fat %)
- Sleep (time, score)
- Workout (exercises, sets)
- Macros (protein, fat, carbs)

**Flow:**
1. User clicks "Copy to" button
2. Modal opens with date picker
3. User selects target date
4. User selects category
5. Data copied to target date
6. Target date log updated

---

## 5. Graph View Access

**Feature:** View data visualization

**Access:** Graph icon button in form
**Component:** `GraphView.svelte`

**Categories:**
- Photo (progression)
- Body (weight, fat % charts)
- Sleep (time, score charts)
- Workout (volume charts)
- Macros (nutrition charts)

---

## 6. References

- **Photo Upload:** `10-02-photo-management.md`
- **Food Tracking:** `10-03-food-tracking.md`
- **Workout Exercises:** `10-04-workout-exercises.md`
- **Graph View:** `10-05-graph-view.md`
- **API Routes:** `20-03-backend-services.md`
- **Database Schema:** `20-04-database-schema.md`

---

## 7. Maintenance

This document should be updated when:
- New fields are added to daily log
- User flow changes
- New features are added to daily log form
- Copy functionality is extended

---

**END OF CANONICAL SPECIFICATION**
