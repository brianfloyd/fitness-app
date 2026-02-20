# 50-02 — **Migrations Canonical Specification**

> **Purpose:** This document defines migration patterns, SQL conventions, and migration execution guidelines for database schema changes.
>
> **Use When:** Creating new migrations, modifying database schema, or understanding migration patterns.

---

## 1. Migration Location

**Directory:** `database/migrations/`

**Naming Pattern:** Descriptive name with underscores
- Example: `add_foods_column.sql`
- Example: `add_goal_photo_to_settings.sql`
- Example: `add_profile_id_to_tables.sql` (multi-tenant: profile_id on app_settings, daily_logs, foods)

---

## 2. Migration File Structure

### **2.1 Standard Format**

```sql
-- Migration: [Descriptive name]
-- Date: YYYY-MM-DD
-- Purpose: [What this migration does]

-- [SQL statements]

-- Verification query (optional)
-- SELECT * FROM [table] WHERE [condition];
```

---

## 3. Migration Patterns

### **3.1 Adding Columns**

**Pattern:**
```sql
ALTER TABLE table_name 
ADD COLUMN column_name data_type 
DEFAULT default_value;
```

**Example:**
```sql
ALTER TABLE app_settings 
ADD COLUMN goal_photo BYTEA;
```

---

### **3.2 Modifying Columns**

**Pattern:**
```sql
ALTER TABLE table_name 
ALTER COLUMN column_name TYPE new_data_type;
```

**Example:**
```sql
ALTER TABLE daily_logs 
ALTER COLUMN weight TYPE DECIMAL(6, 2);
```

---

### **3.3 Adding Indexes**

**Pattern:**
```sql
CREATE INDEX IF NOT EXISTS index_name 
ON table_name(column_name);
```

**Example:**
```sql
CREATE INDEX IF NOT EXISTS idx_daily_logs_date 
ON daily_logs(date);
```

---

### **3.4 Adding Constraints**

**Pattern:**
```sql
ALTER TABLE table_name 
ADD CONSTRAINT constraint_name 
CHECK (condition);
```

---

## 4. Migration Principles

### **4.1 Idempotency**

**Rule:** Migrations should be safe to run multiple times

**Use:**
- `IF NOT EXISTS` for tables, columns, indexes
- `IF EXISTS` for drops (when appropriate)

**Example:**
```sql
CREATE INDEX IF NOT EXISTS idx_name ON table(column);
```

---

### **4.2 Reversibility**

**Rule:** When possible, migrations should be reversible

**Pattern:** Document reverse migration in comments

**Example:**
```sql
-- Migration: add_goal_photo
-- Reverse: ALTER TABLE app_settings DROP COLUMN goal_photo;
ALTER TABLE app_settings 
ADD COLUMN goal_photo BYTEA;
```

---

### **4.3 Data Preservation**

**Rule:** Migrations should preserve existing data when possible

**Pattern:**
- Use `DEFAULT` values for new columns
- Use `ALTER COLUMN ... SET DEFAULT` for existing columns
- Avoid `NOT NULL` on existing columns without defaults

---

## 5. Migration Execution

### **5.1 Manual Execution**

**Command:**
```bash
psql -U postgres -d fitness_db -f database/migrations/migration_name.sql
```

---

### **5.2 Programmatic Execution**

**File:** `backend/src/run-migration.js` (if exists)

**Purpose:** Run migrations programmatically from Node.js

---

## 6. Migration Verification

### **6.1 Post-Migration Checks**

**Pattern:** Include verification queries in migration file

**Example:**
```sql
-- Verify column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'app_settings' 
  AND column_name = 'goal_photo';
```

---

## 7. Migration Naming Conventions

### **7.1 Descriptive Names**

**Pattern:** `action_object.sql`

**Examples:**
- `add_goal_photo_to_settings.sql`
- `add_index_to_daily_logs_date.sql`
- `modify_weight_column_precision.sql`

---

## 8. Migration Documentation

### **8.1 Migration Notes**

**File:** `database/MIGRATION_NOTES.md` (if exists)

**Purpose:** Document migration history and rationale

---

## 9. References

- **Schema:** `database/schema.sql`
- **Database Schema:** `20-04-database-schema.md`
- **PostgreSQL Setup:** `50-01-postgresql-setup.md`

---

## 10. Maintenance

This document should be updated when:
- Migration patterns change
- New migration types are introduced
- Migration execution process changes

---

**END OF CANONICAL SPECIFICATION**
