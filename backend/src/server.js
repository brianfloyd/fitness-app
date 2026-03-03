import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import dotenv from 'dotenv';
import { runMigrations } from './runMigrations.js';
import { requireProfileId } from './middleware/requireProfileId.js';
import dailyLogsRoutes from './routes/dailyLogs.js';
import settingsRoutes from './routes/settings.js';
import stravaRoutes from './routes/strava.js';
import fitbitRoutes from './routes/fitbit.js';
import foodsRoutes from './routes/foods.js';
import recipesRoutes from './routes/recipes.js';
import profilesRoutes from './routes/profiles.js';
import authRoutes from './routes/auth.js';

dotenv.config();

// Debug: log Google-related env keys at startup (values never logged)
const googleKeys = Object.keys(process.env).filter((k) => k.toUpperCase().includes('GOOGLE'));
if (process.env.NODE_ENV === 'production') {
  console.log('[startup] GOOGLE_* env keys present:', googleKeys.length ? googleKeys : 'none');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - CORS: production whitelists Railway domain(s), dev allows all.
// When no origin (same-origin) or allowedOrigins empty (unconfigured prod), allow so requests don't get blocked.
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) : []),
      ...(process.env.RAILWAY_PUBLIC_DOMAIN ? [`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`] : []),
    ].filter(Boolean)
  : [];
app.use(
  cors({
    origin: (origin, callback) => {
      // Same-origin requests have no Origin header; always allow.
      if (!origin) return callback(null, true);
      // Dev or prod with no env set: allow all.
      if (allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(null, false);
    },
    credentials: true,
  })
);
// Mount multipart (file upload) routes BEFORE body parsers so multer receives the raw stream
app.use('/api/logs', requireProfileId, dailyLogsRoutes);
app.use('/api/settings', requireProfileId, settingsRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers to help with mobile privacy warnings
app.use((req, res, next) => {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // For development with self-signed certs, we allow unsafe-inline for CSP
  // In production, you should use proper CSP
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com; frame-src https://accounts.google.com; img-src 'self' data: blob: https:;");
  next();
});

// Routes (foods, strava require X-Profile-Id for multi-tenant scoping)
app.use('/api/strava', requireProfileId, stravaRoutes);
app.use('/api/fitbit', fitbitRoutes);
app.use('/api/foods', requireProfileId, foodsRoutes);
app.use('/api/recipes', requireProfileId, recipesRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve frontend static build in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (process.env.NODE_ENV === 'production' && existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

// Run migrations then start server (local and Railway: migrations run on every deploy/restart)
runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((e) => {
    console.error('Migrations failed, server not started:', e);
    process.exit(1);
  });
