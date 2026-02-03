# Quick Database Setup

## Step 1: Add Your PostgreSQL Password

Open `backend/.env` and add your PostgreSQL password:

```env
DB_PASSWORD=your_actual_password_here
```

Replace `your_actual_password_here` with your PostgreSQL password.

## Step 2: Run the Setup Script

From the `backend` directory, run:

```bash
npm run setup-db
```

This will:
- ✅ Connect to PostgreSQL
- ✅ Create the `fitness_db` database (if it doesn't exist)
- ✅ Create all tables (`app_settings` and `daily_logs`)
- ✅ Insert default settings
- ✅ Verify everything is set up correctly

## Alternative: Run Setup and Enter Password When Prompted

If you prefer not to store the password in `.env`, you can:

1. Run: `npm run setup-db`
2. When prompted, enter your PostgreSQL password
3. The script will complete the setup

## Troubleshooting

**"password authentication failed"**
- Check that your password is correct
- Make sure you're using the right username (default is `postgres`)

**"ECONNREFUSED" or "Connection refused"**
- Make sure PostgreSQL is running
- Check that the port is correct (default is 5432)
- Verify DB_HOST in `.env` matches your setup

**"role does not exist"**
- Check that DB_USER in `.env` matches a valid PostgreSQL user
- Default is usually `postgres`

## After Setup

Once the database is set up, you can:
1. Start the backend: `cd backend && npm run dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Open http://localhost:5173 in your browser
