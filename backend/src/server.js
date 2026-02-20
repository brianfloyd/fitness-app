import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import dotenv from 'dotenv';
import { requireProfileId } from './middleware/requireProfileId.js';
import dailyLogsRoutes from './routes/dailyLogs.js';
import settingsRoutes from './routes/settings.js';
import stravaRoutes from './routes/strava.js';
import foodsRoutes from './routes/foods.js';
import profilesRoutes from './routes/profiles.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - CORS: production whitelists Railway domain(s), dev allows all
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) : []),
      ...(process.env.RAILWAY_PUBLIC_DOMAIN ? [`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`] : []),
    ].filter(Boolean)
  : [];
app.use(
  cors(
    allowedOrigins.length
      ? { origin: allowedOrigins, credentials: true }
      : { origin: true }
  )
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
  res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; img-src 'self' data: blob: https:;");
  next();
});

// Routes (foods, strava require X-Profile-Id for multi-tenant scoping)
app.use('/api/strava', requireProfileId, stravaRoutes);
app.use('/api/foods', requireProfileId, foodsRoutes);
app.use('/api/profiles', profilesRoutes);

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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
