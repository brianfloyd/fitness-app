# 20-04 — **Database Schema Canonical Specification**

> **Purpose:** This document defines the database schema, table structures, field specifications, constraints, and data relationships for the Fitness App.
>
> **Use When:** Working with database queries, migrations, or database-related code.

---

## 1. Schema Overview

**Database:** PostgreSQL  
**Schema File:** `database/schema.sql`  
**Connection:** `backend/src/db/connection.js`

**Multi-tenant:** Data is scoped by profile (user). Tables `app_settings`, `daily_logs`, and `foods` (custom only) include `profile_id` referencing `profiles(id)`. Each profile has separate settings, logs, and custom foods. USDA food cache (`foods` with `source = 'usda'`) is shared (`profile_id` NULL). See migration `add_profile_id_to_tables.sql`.

---

## 2. Table Definitions

### **2.1 app_settings Table**

**Purpose:** Per-profile configuration (total_days, start_date, goal photo). One row per profile.

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS app_settings (
    id SERIAL PRIMARY KEY,
    total_days INTEGER NOT NULL DEFAULT 84,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    goal_photo BYTEA,
    goal_photo_mime_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
- `id` - Primary key (auto-increment)
- `total_days` - Total tracking days (default: 84)
- `start_date` - Start date for tracking period (default: today)
- `goal_photo` - Goal photo binary data (optional)
- `goal_photo_mime_type` - MIME type for goal photo (e.g., 'image/jpeg')
- `created_at` - Record creation timestamp
- `updated_at` - Record update timestamp

**Constraints:**
- `total_days` - NOT NULL, DEFAULT 84
- `start_date` - NOT NULL, DEFAULT CURRENT_DATE

**Default Data:**
- One row inserted on schema creation with default values

---

### **2.2 daily_logs Table**

**Purpose:** Stores daily log entries with photos, metrics, macros, and activity data.

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS daily_logs (
    id SERIAL PRIMARY KEY,
    date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
    day_number INTEGER,
    photo BYTEA,
    photo_mime_type VARCHAR(50),
    weight DECIMAL(5, 2),
    fat_percent DECIMAL(5, 2),
    workout TEXT,
    protein DECIMAL(6, 2),
    fat DECIMAL(6, 2),
    carbs DECIMAL(6, 2),
    sleep_time TIME,
    sleep_score INTEGER,
    strava TEXT,
    steps INTEGER,
    foods TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Fields:**
- `id` - Primary key (auto-increment)
- `date` - Log date (UNIQUE, NOT NULL, default: today)
- `day_number` - Calculated day number based on start_date
- `photo` - Daily photo binary data (BYTEA)
- `photo_mime_type` - MIME type for photo (e.g., 'image/jpeg')
- `weight` - Body weight in pounds (DECIMAL 5,2)
- `fat_percent` - Body fat percentage (DECIMAL 5,2)
- `workout` - Workout data (TEXT, JSON string)
- `protein` - Protein in grams (DECIMAL 6,2)
- `fat` - Fat in grams (DECIMAL 6,2)
- `carbs` - Carbs in grams (DECIMAL 6,2)
- `sleep_time` - Sleep time (TIME)
- `sleep_score` - Sleep quality score (INTEGER)
- `strava` - Strava activities (TEXT, JSON string)
- `steps` - Step count (INTEGER)
- `foods` - Food entries (TEXT, JSON string)
- `created_at` - Record creation timestamp
- `updated_at` - Record update timestamp

**Constraints:**
- `profile_id` - NOT NULL, FK to profiles(id)
- `(profile_id, date)` - UNIQUE (one log per profile per date)
- All metric fields are optional (nullable)

**Indexes:**
- `idx_daily_logs_profile_date` - UNIQUE(profile_id, date)
- `idx_daily_logs_profile_id` - Index on profile_id

**Food entries (TEXT JSON):** Each item may include `fdcId` (USDA) or `customFoodId` (custom). Custom entries also store `customFood` (serving_size, serving_unit, calories, protein, fat, carbs) for macro scaling.

---

### **2.3 foods Table**

**Purpose:** Cache for USDA lookups and store for user-created custom foods. Enables fast retrieval and custom food creation.

**Migration:** `database/migrations/add_foods_table.sql`

**Schema:**
- `id` SERIAL PRIMARY KEY
- `source` VARCHAR(10) NOT NULL CHECK (source IN ('usda', 'custom'))
- `fdc_id` INTEGER UNIQUE NULL
- `name` VARCHAR(500) NOT NULL
- `brand` VARCHAR(255) NULL
- `barcode` VARCHAR(32) NULL (UPC/GTIN for custom foods)
- `serving_size` DECIMAL(10,2) NOT NULL
- `serving_unit` VARCHAR(20) NOT NULL DEFAULT 'g' (g or oz for custom; 1 serving = X g | X oz)
- `calories` DECIMAL(8,2) NOT NULL
- `protein`, `fat`, `carbs` DECIMAL(6,2) NULL
- `usda_data` JSONB NULL
- `created_at`, `updated_at` TIMESTAMP

**Indexes:** `idx_foods_fdc_id`, `idx_foods_source`, `idx_foods_name_lower`, `idx_foods_barcode` (partial, WHERE barcode IS NOT NULL)

---

## 3. Data Types

### **3.1 BYTEA (Binary Data)**

Used for photo storage:
- `app_settings.goal_photo`
- `daily_logs.photo`

**Storage:** Binary data stored directly in PostgreSQL  
**MIME Types:** Stored separately in `*_mime_type` fields  
**Retrieval:** Served as base64 or binary stream via API

### **3.2 TEXT (JSON Strings)**

Used for structured data stored as JSON strings:
- `daily_logs.workout` - Exercise data
- `daily_logs.strava` - Strava activities
- `daily_logs.foods` - Food entries

**Format:** JSON string, parsed by application code

### **3.3 DECIMAL**

Used for precise numeric values:
- `weight` - DECIMAL(5,2) - up to 999.99
- `fat_percent` - DECIMAL(5,2) - up to 999.99
- `protein/fat/carbs` - DECIMAL(6,2) - up to 9999.99

---

## 4. Relationships

### **4.1 profiles to app_settings, daily_logs, foods**

**Relationship:** One-to-many
- `app_settings.profile_id` → `profiles.id` (one settings row per profile)
- `daily_logs.profile_id` → `profiles.id` (logs scoped by profile)
- `foods.profile_id` → `profiles.id` (custom foods only; USDA rows have profile_id NULL)

### **4.2 app_settings to daily_logs**

**Relationship:** Indirect (same profile)
- `app_settings.start_date` and `total_days` for a profile are used to calculate `daily_logs.day_number` for that profile

---

## 5. Migrations

### **5.1 Migration Location**

**Directory:** `database/migrations/`

### **5.2 Migration Naming**

**Pattern:** Descriptive name with underscores
- Example: `add_foods_column.sql`

### **5.3 Migration Execution**

Migrations should be:
- Idempotent (safe to run multiple times)
- Reversible (when possible)
- Tested before deployment

---

## 6. Query Patterns

### **6.1 Get Today's Log**

```sql
SELECT * FROM daily_logs WHERE date = CURRENT_DATE;
```

### **6.2 Get Log by Date**

```sql
SELECT * FROM daily_logs WHERE date = $1;
```

### **6.3 Get Logs by Date Range**

```sql
SELECT * FROM daily_logs 
WHERE date >= $1 AND date <= $2 
ORDER BY date ASC;
```

### **6.4 Get Settings**

```sql
SELECT * FROM app_settings LIMIT 1;
```

---

## 7. Data Validation

### **7.1 Application-Level Validation**

Validation performed in:
- **Backend routes:** `backend/src/routes/dailyLogs.js`
- **Frontend forms:** `frontend/src/lib/DailyLogForm.svelte`

### **7.2 Database-Level Constraints**

- `date` UNIQUE constraint prevents duplicate logs
- NOT NULL constraints on required fields
- DEFAULT values for optional fields

---

## 8. References

- **Schema File:** `database/schema.sql`
- **Database Setup:** `50-01-postgresql-setup.md`
- **Migrations:** `50-02-migrations.md`
- **Backend Connection:** `backend/src/db/connection.js`

---

## 9. Maintenance

This document should be updated when:
- New tables are added
- Fields are added or modified
- Constraints change
- Migration patterns change

---

**END OF CANONICAL SPECIFICATION**
