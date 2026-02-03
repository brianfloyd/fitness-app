# Production Deployment Guide

## Overview

In production, you'll use a **real domain with a trusted SSL certificate** (like Let's Encrypt), which will **completely eliminate the privacy warning**. This guide covers several deployment options.

## Key Differences from Development

- **Development**: Uses `mkcert` for self-signed certificates (causes privacy warnings)
- **Production**: Uses a real domain with Let's Encrypt SSL certificate (no warnings, fully trusted)

## Deployment Options

### Option 1: VPS with Nginx + Let's Encrypt (Recommended)

This is the most common and cost-effective approach for a personal app.

#### Prerequisites
- A VPS (DigitalOcean, Linode, AWS EC2, etc.)
- A domain name pointing to your VPS IP
- SSH access to your server

#### Steps

1. **Build the frontend for production**:
   ```bash
   cd frontend
   npm run build
   ```
   This creates optimized files in `frontend/dist/`

2. **Set up Nginx reverse proxy**:

   Create `/etc/nginx/sites-available/fitness-app`:
   ```nginx
   # Redirect HTTP to HTTPS
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;
       return 301 https://$server_name$request_uri;
   }

   # HTTPS server
   server {
       listen 443 ssl http2;
       server_name yourdomain.com www.yourdomain.com;

       # SSL certificates (Let's Encrypt)
       ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
       
       # SSL configuration
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers HIGH:!aNULL:!MD5;
       ssl_prefer_server_ciphers on;

       # Security headers
       add_header X-Frame-Options "DENY" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;
       add_header Referrer-Policy "strict-origin-when-cross-origin" always;

       # Frontend (static files)
       root /var/www/fitness-app/frontend/dist;
       index index.html;

       # Serve frontend
       location / {
           try_files $uri $uri/ /index.html;
       }

       # API proxy to backend
       location /api {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. **Install Let's Encrypt SSL certificate**:
   ```bash
   # Install certbot
   sudo apt update
   sudo apt install certbot python3-certbot-nginx

   # Get certificate (replace with your domain)
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

   # Auto-renewal is set up automatically
   ```

4. **Deploy your app**:
   ```bash
   # Create deployment directory
   sudo mkdir -p /var/www/fitness-app
   sudo chown $USER:$USER /var/www/fitness-app

   # Copy frontend build
   cp -r frontend/dist /var/www/fitness-app/frontend/

   # Copy backend
   cp -r backend /var/www/fitness-app/
   cd /var/www/fitness-app/backend
   npm install --production
   ```

5. **Set up backend as a service** (using PM2 or systemd):

   **Using PM2** (recommended):
   ```bash
   npm install -g pm2
   cd /var/www/fitness-app/backend
   pm2 start src/server.js --name fitness-backend
   pm2 save
   pm2 startup  # Follow instructions to enable on boot
   ```

   **Using systemd**:
   Create `/etc/systemd/system/fitness-backend.service`:
   ```ini
   [Unit]
   Description=Fitness App Backend
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/fitness-app/backend
   Environment="NODE_ENV=production"
   Environment="PORT=3001"
   ExecStart=/usr/bin/node src/server.js
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```
   Then:
   ```bash
   sudo systemctl enable fitness-backend
   sudo systemctl start fitness-backend
   ```

6. **Enable Nginx site**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/fitness-app /etc/nginx/sites-enabled/
   sudo nginx -t  # Test configuration
   sudo systemctl reload nginx
   ```

### Option 2: Cloud Platform (Vercel, Netlify, Railway, etc.)

Many platforms handle SSL automatically.

#### Vercel/Netlify (Frontend Only)
- Deploy frontend to Vercel/Netlify (they handle SSL automatically)
- Deploy backend separately (Railway, Render, Fly.io, etc.)
- Update frontend API URL to point to backend

#### Railway/Render (Full Stack)
- These platforms can deploy both frontend and backend
- They automatically provide SSL certificates
- Update your domain DNS to point to their servers

### Option 3: Docker + Docker Compose

For containerized deployment:

1. **Create `Dockerfile` for backend**:
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 3001
   CMD ["node", "src/server.js"]
   ```

2. **Create `docker-compose.yml`**:
   ```yaml
   version: '3.8'
   services:
     backend:
       build: ./backend
       ports:
         - "3001:3001"
       environment:
         - NODE_ENV=production
         - DB_HOST=postgres
       depends_on:
         - postgres
     
     frontend:
       image: nginx:alpine
       volumes:
         - ./frontend/dist:/usr/share/nginx/html
       ports:
         - "80:80"
         - "443:443"
       depends_on:
         - backend
     
     postgres:
       image: postgres:15-alpine
       environment:
         - POSTGRES_DB=fitness_db
         - POSTGRES_USER=postgres
         - POSTGRES_PASSWORD=your_password
       volumes:
         - postgres_data:/var/lib/postgresql/data

   volumes:
     postgres_data:
   ```

3. **Use Traefik or Nginx Proxy Manager** for SSL termination

## Environment Configuration

### Frontend Production Build

Update `frontend/vite.config.js` for production:

```javascript
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  // Remove mkcert plugin in production
  plugins: process.env.NODE_ENV === 'production' 
    ? [svelte()] 
    : [
        svelte(),
        mkcert({ /* dev config */ })
      ],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  // API base URL for production
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL || 'https://yourdomain.com'
    ),
  },
});
```

### Backend Environment Variables

Create `backend/.env.production`:
```env
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fitness_db
DB_USER=postgres
DB_PASSWORD=your_secure_password
USDA_API_KEY=your_usda_api_key
```

## Security Checklist

- ✅ Use Let's Encrypt SSL certificate (free, trusted by all browsers)
- ✅ Enable HTTPS redirect (HTTP → HTTPS)
- ✅ Set proper security headers (already in backend)
- ✅ Use environment variables for secrets
- ✅ Keep dependencies updated
- ✅ Use strong database passwords
- ✅ Enable firewall (only allow ports 80, 443, 22)
- ✅ Regular backups of database

## Testing Production Build Locally

Before deploying, test the production build:

```bash
# Build frontend
cd frontend
npm run build

# Preview production build
npm run preview

# Test backend
cd ../backend
NODE_ENV=production node src/server.js
```

## Monitoring & Maintenance

- **SSL Certificate Renewal**: Let's Encrypt certificates expire every 90 days. Certbot auto-renewal handles this, but monitor it.
- **Logs**: Check Nginx and application logs regularly
- **Updates**: Keep Node.js, dependencies, and system packages updated
- **Backups**: Set up automated database backups

## Troubleshooting

**SSL certificate issues:**
- Ensure domain DNS points to your server IP
- Check firewall allows ports 80 and 443
- Verify certbot can access your domain

**API not working:**
- Check backend is running: `pm2 status` or `systemctl status fitness-backend`
- Verify Nginx proxy configuration
- Check CORS settings in backend

**Frontend not loading:**
- Verify files in `/var/www/fitness-app/frontend/dist`
- Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
- Ensure correct file permissions

## Cost Estimate

- **VPS**: $5-10/month (DigitalOcean, Linode)
- **Domain**: $10-15/year
- **SSL Certificate**: Free (Let's Encrypt)
- **Total**: ~$6-12/month

## Summary

In production:
1. ✅ **No privacy warnings** - Let's Encrypt certificates are trusted by all browsers
2. ✅ **Automatic HTTPS** - All traffic encrypted
3. ✅ **Professional setup** - Real domain, proper SSL
4. ✅ **Better security** - Production-grade configuration

The privacy warning you see in development will **completely disappear** in production because you'll be using a trusted SSL certificate from Let's Encrypt, which is recognized by all browsers and mobile devices.
