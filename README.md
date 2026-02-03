# Fitness Daily Log Web App

A mobile-first web application for tracking daily fitness metrics including photos, weight, macros, sleep, and activity data.

## Features

- **Daily Log Tracking**: Record daily photos, weight, body fat %, workouts, macros, sleep, and steps
- **Day Counter**: Track progress with "Day X of Y" display (e.g., Day 1 of 84)
- **Photo Storage**: Upload and store daily photos in the database
- **Food Tracking**: Search and log foods from USDA database with automatic macro calculation
- **Common Foods**: Quick-add frequently used foods with portion adjustment
- **Data Visualization**: Graphs and charts for all tracked metrics
- **Settings**: Configure total tracking days and start date
- **Mobile-First Design**: Responsive UI optimized for mobile and desktop
- **Data Persistence**: All data stored in PostgreSQL database

## Technology Stack

- **Frontend**: Svelte + Vite
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Image Storage**: PostgreSQL bytea column

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Setup Instructions

### 1. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE fitness_db;
```

Run the schema to create tables:

```bash
psql -U postgres -d fitness_db -f database/schema.sql
```

Or manually execute the SQL in `database/schema.sql`.

### 2. Frontend Setup

Navigate to the frontend directory:

```bash
cd frontend
npm install
```

The dev server runs with HTTPS enabled for camera access support. On first run, `vite-plugin-mkcert` will automatically generate and install a trusted certificate. You may be prompted to allow certificate installation.

Start the development server:

```bash
npm run dev
```

The app will be available at:
- **HTTPS**: `https://localhost:5173` (for local access)
- **HTTPS**: `https://[your-ip]:5173` (for mobile access on the same network)

**Note**: For mobile access, use `https://` (not `http://`) as camera access requires a secure context.

### 3. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and API keys:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fitness_db
DB_USER=postgres
DB_PASSWORD=your_password

PORT=3001
NODE_ENV=development

# USDA FoodData Central API Key (required for food tracking)
# Get your free API key at: https://api.data.gov/signup/
USDA_API_KEY=your_usda_api_key_here
```

Start the backend server:

```bash
npm run dev
```

The backend will run on `http://localhost:3001`

### 3. Frontend Setup

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will run on `https://localhost:5173` (HTTPS enabled for camera access)

## Usage

1. **Configure Settings**: 
   - Navigate to the Settings page
   - Set your total tracking days (e.g., 84 for 12 weeks)
   - Set your start date

2. **Log Daily Data**:
   - Go to the Daily Log page
   - Upload your daily photo
   - Enter your metrics (weight, macros, sleep, steps, etc.)
   - Click "Save Log"

3. **Track Progress**:
   - The app displays "Day X of Y" at the top
   - Day number automatically increments based on the date
   - Progress bar shows your progress through the tracking period

## Project Structure

```
fitness/
├── backend/              # Express API server
│   ├── src/
│   │   ├── db/          # Database connection
│   │   ├── routes/      # API routes
│   │   └── server.js    # Server entry point
│   └── package.json
├── frontend/             # Svelte application
│   ├── src/
│   │   ├── lib/         # Reusable components
│   │   └── App.svelte   # Main app component
│   └── package.json
├── database/            # Database schema
│   └── schema.sql
└── README.md
```

## API Endpoints

### Settings
- `GET /api/settings` - Get current settings
- `PUT /api/settings` - Update settings
- `GET /api/settings/current-day` - Get current day number

### Daily Logs
- `GET /api/logs` - Get all logs (paginated)
- `GET /api/logs/today` - Get today's log
- `GET /api/logs/:date` - Get log for specific date
- `POST /api/logs` - Create or update log entry
- `PUT /api/logs/:date` - Update existing log
- `GET /api/logs/:date/photo` - Get photo for date
- `GET /api/logs/range?startDate=...&endDate=...` - Get logs by date range (for graphing)

### Foods (USDA FoodData Central)
- `GET /api/foods/search?query=...` - Search foods
- `GET /api/foods/search?gtin=...` - Search foods by barcode/GTIN
- `GET /api/foods/:fdcId` - Get food details by FDC ID
- `POST /api/foods/batch` - Get multiple food details

## Development

### Backend
- Development mode: `npm run dev` (with auto-reload)
- Production mode: `npm start`

### Frontend
- Development mode: `npm run dev` (with hot reload)
- Build for production: `npm run build`
- Preview production build: `npm run preview`

## Notes

- Photos are stored as binary data in PostgreSQL (bytea column)
- Day numbers are automatically calculated based on the start date
- The app uses mobile-first responsive design
- All data persists in the PostgreSQL database

## License

ISC
