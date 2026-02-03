# 50-01 — **PostgreSQL Setup Canonical Specification**

> **Purpose:** This document defines PostgreSQL database setup, connection configuration, and environment variable requirements.
>
> **Use When:** Setting up the database, configuring connections, or troubleshooting database issues.

---

## 1. Database Configuration

### **1.1 Database Name**

**Default:** `fitness_db`

**Creation:**
```sql
CREATE DATABASE fitness_db;
```

---

## 2. Connection Configuration

### **2.1 Environment Variables**

**File:** `backend/.env`

**Required Variables:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fitness_db
DB_USER=postgres
DB_PASSWORD=your_password
```

**Variables:**
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
- `DB_NAME` - Database name (default: fitness_db)
- `DB_USER` - Database user (default: postgres)
- `DB_PASSWORD` - Database password (required)

---

### **2.2 Connection Implementation**

**File:** `backend/src/db/connection.js`

**Pattern:** Uses `pg` library with connection pooling

**Connection String Format:**
```
postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}
```

---

## 3. Schema Setup

### **3.1 Initial Schema**

**File:** `database/schema.sql`

**Execution:**
```bash
psql -U postgres -d fitness_db -f database/schema.sql
```

**Or manually:** Execute SQL commands from `database/schema.sql`

---

### **3.2 Schema Verification**

**File:** `database/verify_setup.sql`

**Purpose:** Verify tables and default data were created correctly

**Check Tables:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('app_settings', 'daily_logs');
```

**Check Default Settings:**
```sql
SELECT * FROM app_settings;
```

---

## 4. Default Configuration

### **4.1 Default Settings**

**Table:** `app_settings`

**Defaults:**
- `total_days`: 84
- `start_date`: CURRENT_DATE (today)

**Insertion:** Automatically inserted on schema creation if no row exists

---

## 5. Connection Testing

### **5.1 Backend Connection Test**

**File:** `backend/check-db.js` (if exists)

**Purpose:** Test database connection from backend

---

## 6. Port Configuration

### **6.1 Default Port**

**Port:** `5432` (PostgreSQL default)

**Note:** If port conflicts exist, PostgreSQL port can be changed in `postgresql.conf`, but this requires updating `DB_PORT` in `.env`

---

## 7. Troubleshooting

### **7.1 Common Issues**

**"Database does not exist"**
- Verify database was created: `CREATE DATABASE fitness_db;`
- Check `DB_NAME` in `.env` matches actual database name

**"Connection refused"**
- Verify PostgreSQL is running
- Check `DB_HOST` and `DB_PORT` in `.env`
- Verify firewall settings

**"Authentication failed"**
- Verify `DB_USER` and `DB_PASSWORD` in `.env`
- Check PostgreSQL `pg_hba.conf` if needed

**"Permission denied"**
- Ensure user has CREATE privileges
- May need to connect as superuser for initial setup

---

## 8. Production Configuration

### **8.1 Railway Deployment**

**Environment Variables:** Set in Railway dashboard
- Same variables as development
- Use Railway-provided PostgreSQL connection string if available

**Connection:** Railway provides PostgreSQL service with connection string

---

## 9. References

- **Schema:** `database/schema.sql`
- **Database Schema:** `20-04-database-schema.md`
- **Migrations:** `50-02-migrations.md`
- **Backend Connection:** `backend/src/db/connection.js`

---

## 10. Maintenance

This document should be updated when:
- Connection patterns change
- New environment variables are added
- Database setup process changes
- Production deployment configuration changes

---

**END OF CANONICAL SPECIFICATION**
