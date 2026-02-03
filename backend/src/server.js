import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dailyLogsRoutes from './routes/dailyLogs.js';
import settingsRoutes from './routes/settings.js';
import stravaRoutes from './routes/strava.js';
import foodsRoutes from './routes/foods.js';
import profilesRoutes from './routes/profiles.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
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

// Routes
app.use('/api/logs', dailyLogsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/strava', stravaRoutes);
app.use('/api/foods', foodsRoutes);
app.use('/api/profiles', profilesRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
