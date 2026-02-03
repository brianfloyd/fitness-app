# 10-04 — **Workout Exercises Canonical Specification**

> **Purpose:** This document defines workout exercise entry, muscle group selection, set tracking, and exercise data structure.
>
> **Use When:** Working with workout features, implementing exercise-related changes, or understanding workout data flow.

---

## 1. Overview

The Fitness App allows users to log exercises organized by muscle groups, track sets with weight and reps, and view workout history.

**Main Component:** `frontend/src/lib/WorkoutExercises.svelte`

---

## 2. Muscle Groups

### **2.1 Available Muscle Groups**

**File:** `frontend/src/lib/WorkoutExercises.svelte`
**Lines:** 13-22

**Groups:**
- Biceps (💪, blue #3b82f6) - Paired with Back
- Triceps (💪, purple #8b5cf6) - Paired with Chest
- Chest (🫁, red #ef4444) - Paired with Triceps
- Back (🔙, green #10b981) - Paired with Biceps
- Shoulders (🏋️, orange #f59e0b)
- Legs (🦵, pink #ec4899)
- Forearms (🤏, cyan #06b6d4) - Paired with Biceps
- Core (🔥, orange #f97316)

**Pairing:**
- Some muscle groups are commonly paired
- Selecting one can suggest the other

---

### **2.2 Muscle Group Selection**

**UI:** Horizontal row of muscle group buttons
**Behavior:**
- Click button to open exercise selection
- Button highlights when active
- Exercise modal opens for selected group

---

## 3. Exercise Selection

### **3.1 Common Exercises**

**File:** `frontend/src/lib/WorkoutExercises.svelte`
**Lines:** 98-1378

**Structure:**
- Exercises organized by muscle group
- Each exercise has canonical name format: `Muscle Group – Exercise Name – Equipment`
- Example: "Chest – Fly – Machine"

**Selection:**
- User selects from common exercises list
- Or creates custom exercise

---

### **3.2 Custom Exercise**

**Fields:**
- Exercise name (text input)
- Muscle group (pre-selected)
- Movement type (dropdown or custom)
- Equipment (dropdown or custom)

**Storage:**
- Stored with same structure as common exercises
- Custom fields preserved in exercise data

---

## 4. Exercise Entry

### **4.1 Exercise Card**

**Structure:**
- Exercise name
- Muscle group label (colored)
- Sets list
- Add set button
- Complete checkbox

**Data Structure:**
```javascript
{
  id: "unique-id",
  name: "Exercise Name",
  muscleGroup: "Chest",
  movementType: "Fly",
  equipment: "Machine",
  sets: [
    { id: "set-id", weight: 150, reps: 10 }
  ],
  completed: false
}
```

---

### **4.2 Sets Entry**

**Fields:**
- Weight (lbs) - Number input
- Reps - Number input

**Actions:**
- Add set button
- Remove set (per set)
- Edit weight/reps inline

**Validation:**
- Weight: Positive number
- Reps: Positive integer

---

### **4.3 Exercise Completion**

**Checkbox:** "Complete" toggle
**Behavior:**
- Marks exercise as completed
- Completed exercises included in workout volume calculation
- Completed exercises show in workout summary

---

## 5. Workout Volume Calculation

**Component:** `DailyLogForm.svelte`

**Formula:**
```javascript
totalVolume = exercises
  .filter(ex => ex.completed && ex.sets)
  .reduce((total, exercise) => {
    const exerciseVolume = exercise.sets.reduce((vol, set) => {
      return vol + (set.weight * set.reps);
    }, 0);
    return total + exerciseVolume;
  }, 0);
```

**Units:** lbs × reps (total volume)

---

## 6. Recent Exercises

### **6.1 Exercise History**

**Function:** `loadRecentExercises()`
**File:** `frontend/src/lib/WorkoutExercises.svelte`
**Lines:** 39-86

**Process:**
1. Fetches recent logs (last 20)
2. Parses workout JSON from each log
3. Extracts exercises
4. Tracks most recent usage
5. Stores exercise history (last sets, weights, reps)

**Display:**
- Recent exercises shown in quick-access list
- Sorted by last used date
- Shows exercise name and muscle group

---

### **6.2 Quick Add from History**

**Feature:** Click recent exercise to add
**Behavior:**
- Exercise added with last used sets/weights
- User can modify before completing
- Speeds up common workout entry

---

## 7. Data Storage

### **7.1 Daily Log Storage**

**Field:** `daily_logs.workout` (TEXT)
**Format:** JSON string

**Structure:**
```json
[
  {
    "id": "unique-id",
    "name": "Chest – Fly – Machine",
    "muscleGroup": "Chest",
    "movementType": "Fly",
    "equipment": "Machine",
    "sets": [
      { "id": "set-1", "weight": 150, "reps": 10 },
      { "id": "set-2", "weight": 150, "reps": 10 }
    ],
    "completed": true
  }
]
```

---

### **7.2 Muscle Groups Worked**

**Calculation:**
- Extracts unique muscle groups from completed exercises
- Displays as colored badges
- Shows in workout summary

---

## 8. References

- **Daily Log Flow:** `10-01-daily-log-flow.md`
- **Graph View:** `10-05-graph-view.md` (workout volume charts)
- **Backend Routes:** `20-03-backend-services.md`
- **Database Schema:** `20-04-database-schema.md`

---

## 9. Maintenance

This document should be updated when:
- New muscle groups are added
- Exercise naming convention changes
- Set tracking structure changes
- Workout calculation formulas change

---

**END OF CANONICAL SPECIFICATION**
