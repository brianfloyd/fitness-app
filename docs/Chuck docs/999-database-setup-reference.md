# PostgreSQL Database Setup Guide

## PostgreSQL Default Configuration

**Default Port:** `5432` is the standard PostgreSQL port, but it can be changed if you have multiple PostgreSQL instances or conflicts.

**Default Host:** `localhost` (or `127.0.0.1`) for local connections

**Default Superuser:** `postgres` (common default, but can vary)

## Step-by-Step Setup

### 1. Create the Database

First, connect to PostgreSQL (using your database tool or command line) and create a new database:

```sql
CREATE DATABASE fitness_db;
```

**Note:** You need to connect to the `postgres` database (or any existing database) as a superuser to create a new database.

### 2. Connection Settings for Your Database Tool

Based on the connection dialog you're seeing, use these settings:

#### Main Tab:
- **Connect by:** Host (selected)
- **Host:** `localhost` (or `127.0.0.1`)
- **Port:** `5432` (default PostgreSQL port)
  - ⚠️ **If you have other databases using 5432:** You can use the same port if they're different databases, OR change PostgreSQL's port in `postgresql.conf` if needed
- **Database:** `fitness_db` (the database you just created)
- **Show all databases:** Checked (optional, helps you see all databases)

#### Authentication Tab:
- **Authentication:** Database Native
- **Username:** `postgres` (or your PostgreSQL username)
- **Password:** Your PostgreSQL password
- **Save password:** Checked (optional, for convenience)

### 3. Test the Connection

Click "Test Connection..." to verify:
- Connection is successful
- You can access the `fitness_db` database
- Authentication works

### 4. Run the Schema

Once connected to `fitness_db`, run the SQL from `database/schema.sql`:

1. Open the SQL file: `database/schema.sql`
2. Copy all the SQL commands
3. Execute them in your database tool (or use the SQL editor/query window)
4. Verify tables were created:
   - `app_settings` table
   - `daily_logs` table

### 5. Verify Tables Were Created

Run this query to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('app_settings', 'daily_logs');
```

You should see both tables listed.

### 6. Check Default Settings

Verify the default settings were inserted:

```sql
SELECT * FROM app_settings;
```

You should see one row with `total_days = 84` and today's date as `start_date`.

## Backend Configuration

After the database is set up, configure the backend `.env` file:

1. Copy `.env.example` to `.env` in the `backend/` directory
2. Update the values to match your PostgreSQL setup:

```env
DB_HOST=localhost          # Same as in your connection dialog
DB_PORT=5432              # Same as in your connection dialog
DB_NAME=fitness_db        # The database you created
DB_USER=postgres          # Same username as in your connection dialog
DB_PASSWORD=your_password # Same password as in your connection dialog
```

## Port Conflicts

If port `5432` is already in use by another PostgreSQL instance:

### Option 1: Use a Different Port (Recommended if you have multiple PostgreSQL instances)
1. Find your PostgreSQL config file (`postgresql.conf`)
2. Change `port = 5432` to a different port (e.g., `5433`)
3. Restart PostgreSQL
4. Update your connection dialog and `.env` file to use the new port

### Option 2: Use the Same Port (If different databases)
- Multiple databases can share the same port on the same PostgreSQL server
- Just make sure you're connecting to the correct `fitness_db` database
- This is the normal setup - one PostgreSQL server, multiple databases

## Common Issues

**"Database does not exist"**
- Make sure you created `fitness_db` first
- Verify you're connecting to the correct database name

**"Connection refused"**
- Check if PostgreSQL is running
- Verify the port number is correct
- Check firewall settings

**"Authentication failed"**
- Verify username and password
- Check PostgreSQL's `pg_hba.conf` if needed

**"Permission denied"**
- Make sure your user has CREATE privileges on the database
- You may need to connect as a superuser to create tables

## Quick Test Query

After setup, test with this query:

```sql
SELECT 
  (SELECT COUNT(*) FROM app_settings) as settings_count,
  (SELECT COUNT(*) FROM daily_logs) as logs_count;
```

Both should return `1` and `0` respectively (one default setting, no logs yet).
