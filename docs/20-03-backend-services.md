# 20-03 — **Backend Services Canonical Specification**

> **Purpose:** This document defines backend API routes, handlers, middleware, and service patterns.
>
> **Use When:** Working on backend code, creating new API endpoints, or understanding backend architecture.

---

## 1. Overview

The backend is an Express.js REST API server that handles all data operations, external API integrations, and file uploads.

**Framework:** Express.js
**Entry Point:** `backend/src/server.js`
**Database:** PostgreSQL (via `pg` library)

---

## 2. Server Setup

### **2.1 Server Configuration**

**File:** `backend/src/server.js`

**Middleware:**
- CORS enabled
- JSON body parser
- URL-encoded body parser
- Security headers
- Route handlers

**Port:** `process.env.PORT || 3001`

---

### **2.2 Security Headers**

**File:** `backend/src/server.js`
**Lines:** 20-29

**Headers:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` (development: permissive)

---

## 3. Route Handlers

### **3.1 Daily Logs Routes**

**File:** `backend/src/routes/dailyLogs.js`

**Endpoints:**
- `GET /api/logs` - Get all logs (paginated)
- `GET /api/logs/today` - Get today's log
- `GET /api/logs/:date` - Get log for specific date
- `GET /api/logs/range` - Get logs by date range
- `POST /api/logs` - Create or update log
- `PUT /api/logs/:date` - Update existing log
- `GET /api/logs/:date/photo` - Get photo for date
- `POST /api/logs/:date/photo` - Upload photo for date

**Features:**
- Day number calculation
- Photo upload (multer, memory storage)
- JSON serialization (workout, foods, strava)
- Pagination support

---

### **3.2 Settings Routes**

**File:** `backend/src/routes/settings.js`

**Endpoints:**
- `GET /api/settings` - Get current settings
- `PUT /api/settings` - Update settings
- `GET /api/settings/current-day` - Get current day number
- `GET /api/settings/goal-photo` - Get goal photo

**Features:**
- Goal photo upload
- Settings validation
- Default values handling

---

### **3.3 Foods Routes**

**File:** `backend/src/routes/foods.js`

**Endpoints:**
- `GET /api/foods/search` - Search foods (DB custom + USDA API); returns unified `{ foods }`
- `GET /api/foods/:fdcId` - Get food details (cache-first, then USDA; upsert into `foods`)
- `GET /api/foods/custom/:id` - Get custom food by id
- `POST /api/foods/custom` - Create custom food (JSON: name, serving_size, serving_unit [g|oz], calories, optional brand, barcode, protein, fat, carbs)
- `GET /api/foods/custom/check?name=…&barcode=…` - Check for potential duplicate custom foods before create
- `POST /api/foods/batch` - Get multiple food details (USDA)

**Features:**
- USDA FoodData Central API integration; `foods` table cache for USDA and custom
- API key from environment; DB pool from `backend/src/db/connection.js`
- Error handling and retries; response formatting

---

### **3.4 Strava Routes**

**File:** `backend/src/routes/strava.js`

**Endpoints:**
- Strava API integration endpoints

**Status:** See route file for current implementation

---

## 4. Database Connection

### **4.1 Connection Pool**

**File:** `backend/src/db/connection.js`

**Pattern:** PostgreSQL connection pool using `pg` library

**Configuration:**
- Environment variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
- Connection pooling for efficiency
- Error handling

---

### **4.2 Query Pattern**

**Pattern:** `pool.query(sql, params)`

**Example:**
```javascript
const result = await pool.query(
  'SELECT * FROM daily_logs WHERE date = $1',
  [date]
);
```

---

## 5. File Upload

### **5.1 Multer Configuration**

**Library:** multer
**Storage:** Memory storage (no file system)

**Configuration:**
```javascript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
```

**Usage:**
- Photo uploads
- Goal photo uploads
- Files stored as BYTEA in database

---

## 6. Error Handling

### **6.1 Error Response Format**

**Pattern:**
```javascript
res.status(500).json({
  error: 'Error message',
  details: process.env.NODE_ENV === 'development' ? error.message : undefined
});
```

**Features:**
- Consistent error format
- Development details in dev mode only
- Error logging to console

---

### **6.2 Try/Catch Pattern**

**Pattern:** All async route handlers wrapped in try/catch

**Example:**
```javascript
router.get('/', async (req, res) => {
  try {
    // Route logic
    res.json(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to...' });
  }
});
```

---

## 7. Day Number Calculation

### **7.1 Calculation Function**

**File:** `backend/src/routes/dailyLogs.js`
**Function:** `calculateDayNumber(date)`

**Formula:**
```javascript
dayNumber = (logDate - startDate) + 1
dayNumber = Math.max(1, Math.min(dayNumber, totalDays))
```

**Behavior:**
- Clamped between 1 and total_days
- Based on app_settings.start_date
- Calculated on save/update

---

## 8. Data Serialization

### **8.1 JSON Fields**

**Fields:** `workout`, `foods`, `strava`

**Pattern:**
- Stored as TEXT in database
- Serialized with `JSON.stringify()` on save
- Parsed with `JSON.parse()` on read

**Validation:**
- Valid JSON required
- Invalid JSON handled gracefully

---

## 9. External API Integration

### **9.1 USDA FoodData Central**

**Base URL:** `https://api.nal.usda.gov/fdc/v1`
**Authentication:** API key from `USDA_API_KEY` environment variable

**Endpoints Used:**
- `/foods/search` - Search foods
- `/foods/{fdcId}` - Get food details

**Error Handling:**
- API errors caught and formatted
- User-friendly error messages
- Retry logic (if implemented)

---

## 10. References

- **System Architecture:** `20-01-system-architecture.md`
- **Frontend Architecture:** `20-02-frontend-architecture.md`
- **Database Schema:** `20-04-database-schema.md`
- **PostgreSQL Setup:** `50-01-postgresql-setup.md`

---

## 11. Maintenance

This document should be updated when:
- New API endpoints are added
- Route patterns change
- Error handling approach changes
- External API integrations change

---

**END OF CANONICAL SPECIFICATION**
