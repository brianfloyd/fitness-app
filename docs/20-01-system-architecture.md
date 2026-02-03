# 20-01 — **System Architecture Canonical Specification**

> **Purpose:** This document defines the overall system architecture, component relationships, and system design for the Fitness App.
>
> **Use When:** Understanding system-wide architecture, component interactions, or system design decisions.

---

## 1. System Overview

The Fitness App is a full-stack web application with the following architecture:

- **Frontend:** Svelte + Vite (SPA)
- **Backend:** Node.js + Express (REST API)
- **Database:** PostgreSQL
- **Deployment:** Railway (production)

---

## 2. Component Architecture

### **2.1 Frontend (Svelte)**

**Entry Point:**
- **File:** `frontend/src/main.js`
- **Purpose:** Initializes Svelte app, registers service worker

**Main Component:**
- **File:** `frontend/src/App.svelte`
- **Purpose:** Root component with navigation and view switching
- **Views:** Daily Log, Settings

**Component Structure:**
- **File:** `frontend/src/lib/`
- **Components:** Reusable Svelte components
  - `DailyLogForm.svelte` - Main daily log entry form
  - `SettingsPanel.svelte` - App settings
  - `PhotoUpload.svelte` - Photo upload and display
  - `WorkoutExercises.svelte` - Workout entry
  - `FoodTracker.svelte` - Food logging
  - `GraphView.svelte` - Data visualization

**API Client:**
- **File:** `frontend/src/lib/api.js`
- **Purpose:** Centralized API communication functions

---

### **2.2 Backend (Express)**

**Server Entry Point:**
- **File:** `backend/src/server.js`
- **Purpose:** Express app setup, middleware, route registration

**Route Handlers:**
- **File:** `backend/src/routes/`
- **Routes:**
  - `dailyLogs.js` - Daily log CRUD operations
  - `settings.js` - App settings management
  - `foods.js` - USDA food search API
  - `strava.js` - Strava integration

**Database Connection:**
- **File:** `backend/src/db/connection.js`
- **Purpose:** PostgreSQL connection pool management

---

### **2.3 Database (PostgreSQL)**

**Schema:**
- **File:** `database/schema.sql`
- **Tables:**
  - `app_settings` - App configuration (total_days, start_date, goal_photo)
  - `daily_logs` - Daily log entries (date, photo, metrics, macros, etc.)

**Migrations:**
- **Directory:** `database/migrations/`
- **Purpose:** Incremental schema changes

---

## 3. Data Flow

### **3.1 Daily Log Creation Flow**

1. User fills out `DailyLogForm.svelte`
2. Form calls `saveLog()` from `api.js`
3. `api.js` sends POST to `/api/logs`
4. `dailyLogs.js` route handler processes request
5. Database connection executes INSERT/UPDATE
6. Response returned to frontend
7. UI updates with saved data

### **3.2 Photo Upload Flow**

1. User selects photo in `PhotoUpload.svelte`
2. Photo cropped using cropperjs
3. Converted to base64 or FormData
4. Sent to `/api/logs/:date/photo` endpoint
5. Backend stores as BYTEA in PostgreSQL
6. Frontend displays photo from `/api/logs/:date/photo` endpoint

---

## 4. API Structure

### **4.1 Endpoint Patterns**

All API endpoints follow RESTful conventions:

- **GET** `/api/logs` - List logs (paginated)
- **GET** `/api/logs/today` - Get today's log
- **GET** `/api/logs/:date` - Get log for specific date
- **POST** `/api/logs` - Create or update log
- **PUT** `/api/logs/:date` - Update existing log
- **GET** `/api/logs/:date/photo` - Get photo for date

### **4.2 Response Format**

All API responses use JSON:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

---

## 5. Service Boundaries

### **5.1 Frontend Responsibilities**

- UI rendering and user interaction
- Form validation (client-side)
- API communication
- Local state management (Svelte reactivity)
- PWA features (service worker, manifest)

### **5.2 Backend Responsibilities**

- API route handling
- Database operations
- External API integration (USDA, Strava)
- Data validation (server-side)
- Security headers and CORS

### **5.3 Database Responsibilities**

- Data persistence
- Data integrity (constraints, indexes)
- Query optimization

---

## 6. External Integrations

### **6.1 USDA FoodData Central API**

- **Purpose:** Food search and nutrition data
- **Route:** `backend/src/routes/foods.js`
- **API Key:** Required, stored in environment variables

### **6.2 Strava API**

- **Purpose:** Activity tracking integration
- **Route:** `backend/src/routes/strava.js`
- **Status:** Integration exists, see route file for details

---

## 7. Security

### **7.1 Security Headers**

**File:** `backend/src/server.js`
**Lines:** 20-29

Headers set:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` (development: permissive, production: strict)

### **7.2 CORS**

**File:** `backend/src/server.js`
**Line:** 15

CORS enabled for frontend-backend communication.

---

## 8. References

- **Frontend Architecture:** `20-02-frontend-architecture.md`
- **Backend Services:** `20-03-backend-services.md`
- **Database Schema:** `20-04-database-schema.md`
- **File Structure:** `20-00-file-structure-canonical.md`

---

## 9. Maintenance

This document should be updated when:
- New major components are added
- API structure changes significantly
- External integrations are added or removed
- Security patterns change

---

**END OF CANONICAL SPECIFICATION**
