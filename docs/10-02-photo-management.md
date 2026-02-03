# 10-02 — **Photo Management Canonical Specification**

> **Purpose:** This document defines photo upload, cropping, storage, display, and AI goal photo functionality.
>
> **Use When:** Working with photo features, implementing photo-related changes, or understanding photo data flow.

---

## 1. Overview

The Fitness App stores daily photos in PostgreSQL as BYTEA and supports photo cropping, AI goal photo comparison, and photo progression viewing.

**Main Component:** `frontend/src/lib/PhotoUpload.svelte`

---

## 2. Photo Upload Flow

### **2.1 File Selection**

**Trigger:** "Change Photo" button or file input click
**File:** `frontend/src/lib/PhotoUpload.svelte`

**Process:**
1. File input opens (camera on mobile devices)
2. User selects/captures photo
3. File validated (size, type)
4. File read as DataURL
5. Crop modal opens

---

### **2.2 Photo Cropping**

**Library:** cropperjs
**File:** `frontend/src/lib/PhotoUpload.svelte`
**Lines:** 21-95

**Configuration:**
- Aspect ratio: Free (NaN)
- View mode: 1 (restrict to canvas)
- Drag mode: 'move'
- Auto crop area: 35% (torso/head focus)
- Crop box: Movable and resizable

**Initial Crop:**
- Starts at 35% of image
- Automatically expanded by 12px equivalent after initialization
- Keeps crop centered

**User Actions:**
- Adjust crop area
- Move crop box
- Resize crop box
- Click "Apply Crop"

---

### **2.3 Crop Application**

**Function:** `applyCrop()`
**File:** `frontend/src/lib/PhotoUpload.svelte`
**Lines:** 97-115

**Process:**
1. Cropper generates canvas (max 1920px width)
2. Canvas converted to blob
3. Blob converted to base64
4. Base64 sent to parent component
5. Parent uploads to backend

**Output:**
- Base64 string or FormData
- MIME type preserved (image/jpeg, image/png)

---

### **2.4 Photo Upload to Backend**

**API Endpoint:** `POST /api/logs/:date/photo`
**File:** `backend/src/routes/dailyLogs.js`

**Process:**
1. Multer receives file (memory storage)
2. File size validated (10MB limit)
3. Photo stored as BYTEA in `daily_logs.photo`
4. MIME type stored in `daily_logs.photo_mime_type`
5. Response returns success

**Storage:**
- Database: PostgreSQL BYTEA column
- No file system storage
- Binary data in database

---

### **2.5 Photo Retrieval**

**API Endpoint:** `GET /api/logs/:date/photo`
**File:** `backend/src/routes/dailyLogs.js`

**Response:**
- Content-Type: MIME type from database
- Body: Binary photo data
- Frontend displays as `<img src="/api/logs/:date/photo">`

---

## 3. AI Goal Photo

### **3.1 Goal Photo Storage**

**Table:** `app_settings`
**Fields:**
- `goal_photo` (BYTEA)
- `goal_photo_mime_type` (VARCHAR(50))

**Upload:**
- Settings panel uploads goal photo
- Stored in app_settings table
- Single goal photo per app instance

---

### **3.2 Goal Photo Display**

**Toggle:** Tap/click photo to toggle between actual and goal
**File:** `frontend/src/lib/PhotoUpload.svelte`

**Mobile Behavior:**
- Single tap to toggle
- Entire photo area is hit target
- Excludes top buttons (Change Photo, Remove)

**Desktop Behavior:**
- Click to toggle
- Same hit target rules

**State:**
- `showingGoalPhoto` boolean
- Toggles between `currentPhotoUrl` and `goalPhotoUrl`

---

## 4. Photo Progression

**Component:** `PhotoGrid.svelte`
**File:** `frontend/src/lib/PhotoGrid.svelte`

**Feature:** View photos in sequence with progression controls

**Modes:**
- Grid view: All photos displayed
- Progression mode: Photos cycle automatically

**Progression Controls:**
- Speed adjustment (delay between photos)
- Play/Pause
- Restart button (when progression ends)

**Stopping:**
- Progression stops at last photo entry
- Does not loop
- Restart button appears when ended

---

## 5. Photo Display in Daily Log

**Component:** `PhotoUpload.svelte`

**Display:**
- Current day's photo (if uploaded)
- Placeholder if no photo
- Toggle to goal photo (if available)

**Buttons:**
- "Change Photo" - Upload new photo
- "Remove" - Delete current photo

**Layout:**
- Responsive (mobile/desktop)
- Maintains aspect ratio
- Centered display

---

## 6. Data Model

### **6.1 Database Schema**

**Table:** `daily_logs`
**Fields:**
- `photo` (BYTEA) - Binary photo data
- `photo_mime_type` (VARCHAR(50)) - MIME type

**Table:** `app_settings`
**Fields:**
- `goal_photo` (BYTEA) - AI goal photo
- `goal_photo_mime_type` (VARCHAR(50)) - MIME type

---

### **6.2 Frontend State**

**Variables:**
- `currentPhotoUrl` - URL to current photo
- `photoMimeType` - MIME type
- `goalPhotoUrl` - URL to goal photo
- `showingGoalPhoto` - Toggle state
- `photoFile` - Selected file (before upload)

---

## 7. References

- **Daily Log Flow:** `10-01-daily-log-flow.md`
- **Graph View:** `10-05-graph-view.md`
- **Backend Routes:** `20-03-backend-services.md`
- **Database Schema:** `20-04-database-schema.md`

---

## 8. Maintenance

This document should be updated when:
- Photo upload process changes
- Cropping behavior changes
- New photo features are added
- Storage method changes

---

**END OF CANONICAL SPECIFICATION**
