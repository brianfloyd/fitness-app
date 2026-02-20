# 40-01 — **Railway Deployment Canonical Specification**

> **Purpose:** This document defines Railway platform deployment process, environment variable configuration, and production deployment patterns.
>
> **Use When:** Deploying to Railway, configuring production environment, or understanding deployment process.

---

## 1. Overview

The Fitness App is deployed to Railway platform for production hosting. Railway provides PostgreSQL database, automatic SSL, and environment variable management.

**Platform:** Railway
**Database:** Railway PostgreSQL service
**Frontend:** Static build served by Railway
**Backend:** Node.js Express server on Railway

---

## 2. Railway Configuration

### **2.1 Project Setup**

**Steps:**
1. Create Railway project
2. Connect GitHub repository (or deploy from local)
3. Configure services (frontend, backend, database)

**Services:**
- Frontend service (static build)
- Backend service (Node.js)
- PostgreSQL service (database)

---

### **2.2 Build Configuration**

**Frontend:**
- Build command: `npm run build`
- Output directory: `dist`
- Serve static files from `dist/`

**Backend:**
- Start command: `npm start`
- Entry point: `src/server.js`
- Port: `process.env.PORT` (Railway provides)

---

## 3. Environment Variables

### **3.1 Required Variables**

**Backend:**
```env
DB_HOST=postgres.railway.internal
DB_PORT=5432
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=[Railway provided]
PORT=3001
NODE_ENV=production
USDA_API_KEY=[Your USDA API key]
```

**Railway Setup:**
- Database variables provided automatically
- Custom variables set in Railway dashboard
- Secrets managed by Railway

---

### **3.2 Database Connection**

**Railway PostgreSQL:**
- Connection string provided by Railway
- Internal hostname: `postgres.railway.internal`
- External connection also available

**Pattern:**
- Use Railway-provided connection string when available
- Fall back to individual variables

---

## 4. Deployment Process

### **4.1 Frontend Deployment**

**Build:**
```bash
cd frontend
npm run build
```

**Output:**
- `frontend/dist/` directory
- Optimized production build
- Static assets

**Railway Configuration:**
- Build command: `cd frontend && npm install && npm run build`
- Start command: Serve static files (Railway handles)

---

### **4.2 Backend Deployment**

**Build:**
- No build step (Node.js)
- Dependencies: `npm install --production`

**Railway Configuration:**
- Start command: `npm start`
- Working directory: `backend/`
- Port: Auto-detected from `PORT` env var

---

## 5. Database Migration

### **5.1 Initial Schema**

**Process:**
1. Railway PostgreSQL service created
2. Connect to database
3. Run `database/schema.sql`
4. Verify tables created

**Railway CLI:**
```bash
railway connect
psql -f database/schema.sql
```

---

### **5.2 Migrations**

**Process:**
- Run migrations manually via Railway CLI
- Or use migration script if implemented

**See:** `50-02-migrations.md` for migration patterns

---

## 6. Production Considerations

### **6.1 SSL/HTTPS**

**Railway Feature:**
- Automatic SSL certificates
- HTTPS enabled by default
- Custom domain support

**Configuration:**
- Add custom domain in Railway dashboard
- DNS configuration required
- SSL auto-provisioned

---

### **6.2 CORS Configuration**

**Backend:** `backend/src/server.js`
- Same-origin requests (no `Origin` header) are always allowed.
- If `CORS_ORIGIN` or `RAILWAY_PUBLIC_DOMAIN` is set in production, only those origins are allowed; otherwise all origins are allowed (so the app works even when env is unset).
- Set `RAILWAY_PUBLIC_DOMAIN` (e.g. `yourapp.railway.app`) or `CORS_ORIGIN` (comma-separated URLs) in Railway so production restricts CORS when using a custom domain.

---

### **6.3 Security Headers**

**Production:**
- Strict Content-Security-Policy
- Security headers enabled
- See `20-03-backend-services.md`

---

## 7. Monitoring and Logs

### **7.1 Railway Logs**

**Access:**
- Railway dashboard → Logs tab
- Real-time log streaming
- Historical logs

**Usage:**
- Debug production issues
- Monitor errors
- Track performance

---

### **7.2 Error Tracking**

**Pattern:**
- Console errors logged
- Error responses include details in development
- Production: Generic error messages

---

## 8. Environment-Specific Configuration

### **8.1 Development vs Production**

**Development:**
- Local PostgreSQL
- mkcert SSL certificates
- Detailed error messages
- Hot reload

**Production:**
- Railway PostgreSQL
- Railway SSL certificates
- Generic error messages
- Optimized builds

**Detection:**
```javascript
const isProduction = process.env.NODE_ENV === 'production';
```

---

## 9. Deployment Checklist

### **9.1 Pre-Deployment**

- [ ] Environment variables configured
- [ ] Database schema applied
- [ ] Frontend build tested locally
- [ ] Backend tested with production-like config
- [ ] API keys configured
- [ ] CORS domains updated

### **9.2 Post-Deployment**

- [ ] Verify database connection
- [ ] Test API endpoints
- [ ] Verify frontend loads
- [ ] Check SSL certificate
- [ ] Test photo uploads
- [ ] Verify external API integrations

---

## 10. Rollback Process

### **10.1 Railway Rollback**

**Method:**
- Railway dashboard → Deployments
- Select previous deployment
- Redeploy previous version

**Best Practice:**
- Keep previous deployment available
- Test before deploying
- Monitor after deployment

---

## 11. References

- **System Architecture:** `20-01-system-architecture.md`
- **Backend Services:** `20-03-backend-services.md`
- **Database Schema:** `20-04-database-schema.md`
- **PostgreSQL Setup:** `50-01-postgresql-setup.md`
- **Migrations:** `50-02-migrations.md`
- **Reference Docs:** `docs/Chuck docs/999-production-deployment-reference.md`

---

## 12. Maintenance

This document should be updated when:
- Deployment process changes
- Railway configuration changes
- New environment variables are added
- Deployment tools change

---

**END OF CANONICAL SPECIFICATION**
