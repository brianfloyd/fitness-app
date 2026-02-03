# 10-03 — **Food Tracking Canonical Specification**

> **Purpose:** This document defines food search, selection, portion adjustment, macro calculation, and common foods functionality.
>
> **Use When:** Working with food tracking features, implementing food-related changes, or understanding food data flow.

---

## 1. Overview

The Fitness App integrates with USDA FoodData Central API to search for foods, calculate macros, and track nutrition. Users can search foods, adjust portions, and quickly add common/recent foods.

**Main Component:** `frontend/src/lib/FoodTracker.svelte`

---

## 2. Food Search

### **2.1 Search Interface**

**Component:** `FoodSearch.svelte`
**File:** `frontend/src/lib/FoodSearch.svelte`

**Features:**
- Text search input
- Barcode/GTIN search
- Real-time search results
- Food selection

---

### **2.2 USDA API Integration**

**Backend Route:** `GET /api/foods/search`
**File:** `backend/src/routes/foods.js`

**Parameters:**
- `query` - Search text
- `gtin` - Barcode/GTIN (optional)

**API:** USDA FoodData Central v1
**Base URL:** `https://api.nal.usda.gov/fdc/v1`
**Authentication:** API key from environment (`USDA_API_KEY`)

**Response:**
- Array of food items with FDC ID, description, brand owner

---

### **2.3 Food Selection**

**Flow:**
1. User searches for food
2. Results displayed
3. User selects food
4. Food details fetched (`GET /api/foods/:fdcId`)
5. Food added to tracker with default portion

---

## 3. Food Entry

### **3.1 Food Entry Structure**

**Component:** `FoodEntry.svelte`
**File:** `frontend/src/lib/FoodEntry.svelte`

**Data Structure:**
```javascript
{
  id: "unique-id",
  fdcId: 123456,
  name: "Food Name",
  brand: "Brand Name",
  amount: 100,
  unit: "g",
  foodData: { /* Full USDA food data */ },
  protein: 20.5,
  fat: 1.3,
  carbs: 0.0,
  calories: 98
}
```

---

### **3.2 Portion Adjustment**

**Component:** `PortionAdjustmentModal.svelte`
**File:** `frontend/src/lib/PortionAdjustmentModal.svelte`

**Features:**
- Amount input
- Unit selection (g, oz, lb, kg, cup, tbsp, tsp)
- Real-time macro recalculation
- Apply changes

**Conversion:**
- Uses `foodConversions.js` utility
- Converts between units
- Recalculates macros based on portion

---

### **3.3 Macro Calculation**

**Utility:** `foodConversions.js`
**File:** `frontend/src/lib/utils/foodConversions.js`

**Function:** `calculateMacros(foodData, amount, unit)`

**Process:**
1. Extract nutrients from foodData
2. Convert amount to grams (base unit)
3. Calculate macros per gram
4. Multiply by portion amount
5. Return: { protein, fat, carbs, calories }

**Nutrients:**
- Protein: Nutrient ID 1003
- Fat: Nutrient ID 1004
- Carbs: Nutrient ID 1005 (by difference)
- Calories: Nutrient ID 1008

---

## 4. Common Foods

### **4.1 Recent Foods Display**

**Component:** `CommonFoods.svelte`
**File:** `frontend/src/lib/CommonFoods.svelte`

**Features:**
- Horizontal carousel of recent foods
- Usage count tracking
- Quick-add functionality
- Navigation arrows (when more items exist)

**Storage:**
- LocalStorage via `foodStorage.js`
- Tracks: fdcId, name, usageCount, lastAmount, lastUnit, foodData

---

### **4.2 Usage Tracking**

**Utility:** `foodStorage.js`
**File:** `frontend/src/lib/utils/foodStorage.js`

**Functions:**
- `getCommonFoods()` - Get sorted by usage count
- `trackFoodUsage(food)` - Increment usage, update last amount/unit
- `saveCommonFoods(foods)` - Persist to LocalStorage

**Sorting:**
- By usage count (descending)
- Most used foods appear first

---

## 5. Food List Management

### **5.1 Adding Foods**

**Flow:**
1. User searches/selects food
2. Food added to `foods` array
3. Duplicate check (by fdcId)
4. Macros calculated
5. Total macros updated
6. Usage tracked in common foods

---

### **5.2 Removing Foods**

**Action:** Delete button on food entry
**Result:**
- Food removed from array
- Macros recalculated
- Total updated

---

### **5.3 Editing Foods**

**Action:** Click food entry
**Result:**
- Portion adjustment modal opens
- User adjusts amount/unit
- Macros recalculated
- Entry updated

---

## 6. Total Macros Calculation

**Component:** `FoodTracker.svelte`

**Calculation:**
```javascript
totalMacros = foods.reduce((acc, food) => ({
  protein: acc.protein + (food.protein || 0),
  fat: acc.fat + (food.fat || 0),
  carbs: acc.carbs + (food.carbs || 0),
  calories: acc.calories + (food.calories || 0),
}), { protein: 0, fat: 0, carbs: 0, calories: 0 });
```

**Integration:**
- Combined with manual macro entries
- Total displayed in daily log
- Total calories: (protein * 4) + (fat * 9) + (carbs * 4)

---

## 7. Data Storage

### **7.1 Daily Log Storage**

**Field:** `daily_logs.foods` (TEXT)
**Format:** JSON string

**Structure:**
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

### **7.2 LocalStorage**

**Key:** `commonFoods`
**Format:** JSON array

**Stored Data:**
- fdcId
- name
- usageCount
- lastAmount
- lastUnit
- foodData (cached full food details)

### **7.3 foods Table (Database)**

**Purpose:** USDA lookup cache and custom foods. See `20-04-database-schema.md` (§2.3).

- **USDA:** Cached on fetch-by-FDC-ID; `fdc_id`, `usda_data`, normalized name/brand/serving/macros.
- **Custom:** User-created via "Add custom food"; minimum name, serving_size, serving_unit (g or oz), calories; optional brand, barcode (UPC/GTIN), protein, fat, carbs. Serving is **1 serving = X g** or **1 serving = X oz**.

**Endpoints:** `POST /api/foods/custom`, `GET /api/foods/custom/:id`, `GET /api/foods/custom/check?name=…&barcode=…` (duplicate check). Search returns DB custom matches (by name or barcode) plus USDA API results.

### **7.4 Custom Food Flow**

- **Add custom food:** Always available via "Add custom" on the same row as food search. Form: name, brand, barcode (optional), **1 serving = X g | X oz**, calories, optional macros. Before create, app calls duplicate-check; if potential matches exist, user is prompted to use one, create anyway, or go back.
- **Log entries:** Custom foods use `customFoodId` and `customFood` (serving_size, serving_unit, calories, …). Macro scaling uses `calculateMacrosForCustom`; units use `getAvailableUnitsForCustom` (g, oz, serving).

---

## 8. References

- **Daily Log Flow:** `10-01-daily-log-flow.md`
- **Backend Routes:** `20-03-backend-services.md`
- **Database Schema:** `20-04-database-schema.md`
- **API Client:** `frontend/src/lib/api.js`

---

## 9. Maintenance

This document should be updated when:
- USDA API integration changes
- Food data structure changes
- New food features are added
- Portion adjustment logic changes

---

**END OF CANONICAL SPECIFICATION**
