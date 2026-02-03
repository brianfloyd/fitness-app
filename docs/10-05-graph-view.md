# 10-05 — **Graph View Canonical Specification**

> **Purpose:** This document defines data visualization, photo progression, comparison modes, and graph display functionality.
>
> **Use When:** Working with graph/visualization features, implementing data display changes, or understanding graph data flow.

---

## 1. Overview

The Graph View provides data visualization for all tracked metrics including photo progression, body composition charts, sleep/activity graphs, workout volume, and nutrition tracking.

**Main Component:** `frontend/src/lib/GraphView.svelte`

---

## 2. Graph Categories

### **2.1 Available Categories**

**Categories:**
- `photo` - Photo progression
- `body` - Body composition (weight, fat %)
- `sleep` - Sleep time and score
- `workout` - Workout volume
- `macros` - Nutrition tracking

**Access:**
- Graph icon button in DailyLogForm
- Opens modal with category selection

---

## 3. Photo Progression

### **3.1 Progression Mode**

**Component:** `PhotoGrid.svelte`
**File:** `frontend/src/lib/PhotoGrid.svelte`

**Features:**
- Automatic photo cycling
- Speed control (delay between photos)
- Play/Pause controls
- Restart button (when progression ends)

**Behavior:**
- Progression stops at last photo entry
- Does not loop
- Displays restart button when ended
- Shows metrics (weight, fat %) if available

---

### **3.2 Comparison Modes**

**Modes:**
- `all` - All photos with data
- `first-last` - First and last day only
- `first-middle-last` - First, middle, and last day
- `custom` - User-selected days

**Custom Day Selection:**
- User enters day numbers
- Days added to custom list
- Days sorted ascending
- Photos displayed for selected days only

**UI:**
- Dropdown for mode selection
- Custom day editor (when custom mode selected)
- Day input with add/remove buttons

---

### **3.3 Photo Display**

**Layout:**
- Single photo at a time (progression)
- Or side-by-side (comparison)
- Metrics displayed below photo (mobile) or beside (desktop)

**Metrics Display:**
- Weight (if available)
- Body Fat % (if available)
- Day number
- Date

**Static Position:**
- Photo position remains fixed during progression
- Metrics and controls don't shift photo position
- Fixed dimensions prevent layout shifts

---

## 4. Data Tables

### **4.1 Body Composition Table**

**Data:**
- Date
- Day Number
- Weight (lbs)
- Body Fat (%)

**Display:**
- Table format
- Sorted by date (ascending)
- Shows all logs with body data

---

### **4.2 Sleep & Activity Table**

**Data:**
- Date
- Day Number
- Sleep Time
- Sleep Score
- Steps

**Display:**
- Table format
- Sorted by date
- Shows all logs with sleep/activity data

---

### **4.3 Workout Volume Table**

**Data:**
- Date
- Day Number
- Total Volume (lbs × reps)
- Muscles Worked
- Exercise Count

**Calculation:**
- Volume = sum of (weight × reps) for all completed exercises
- Muscles = unique muscle groups from completed exercises

---

### **4.4 Nutrition Table**

**Data:**
- Date
- Day Number
- Protein (g)
- Fat (g)
- Carbs (g)
- Calories

**Source:**
- Manual macro entries + food entries
- Combined totals displayed

---

## 5. Data Loading

### **5.1 Log Fetching**

**API:** `GET /api/logs` (paginated) or `GET /api/logs/range`
**File:** `frontend/src/lib/api.js`

**Process:**
1. Load settings (for date range)
2. Fetch recent logs (100+ for graphs)
3. Filter logs by category (has relevant data)
4. Sort by date
5. Display in table or progression

---

### **5.2 Data Filtering**

**Filter Logic:**
```javascript
logs.filter(log => {
  switch (category) {
    case 'photo':
      return log.photo_mime_type;
    case 'body':
      return log.weight || log.fat_percent;
    case 'sleep':
      return log.sleep_time || log.sleep_score || log.steps;
    case 'workout':
      return log.workout; // JSON string
    case 'macros':
      return log.protein || log.fat || log.carbs;
  }
});
```

---

## 6. Progression Controls

### **6.1 Speed Control**

**Input:** Slider or number input
**Range:** 100ms - 5000ms delay
**Default:** 500ms

**Behavior:**
- Adjusts delay between photo transitions
- Updates in real-time
- Affects progression speed

---

### **6.2 Play/Pause**

**Button:** Toggle progression
**States:**
- Playing: Photos cycle automatically
- Paused: Photos static, manual navigation

---

### **6.3 Restart**

**Button:** Appears when progression ends
**Action:**
- Resets to first photo
- Restarts progression
- Clears "ended" state

---

## 7. References

- **Daily Log Flow:** `10-01-daily-log-flow.md`
- **Photo Management:** `10-02-photo-management.md`
- **Backend Routes:** `20-03-backend-services.md`
- **Database Schema:** `20-04-database-schema.md`

---

## 8. Maintenance

This document should be updated when:
- New graph categories are added
- Comparison modes change
- Progression behavior changes
- Data display formats change

---

**END OF CANONICAL SPECIFICATION**
