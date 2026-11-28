# Fitness Daily-Log App — Comprehensive Assessment

**Date:** November 26, 2026  
**Prepared for:** Brian Floyd  
**Live URL:** `https://fit.brianfloyd.me` (discovered from OAuth/email config docs)

---

## 1. What the App Does Today

### 1.1 Features Overview

The app is a **mobile-first daily fitness tracking PWA** built with Svelte/Vite (frontend) and Express/PostgreSQL (backend). It supports:

| Feature | Description |
|---------|-------------|
| **Daily Photo Logging** | Upload/crop progress photos with AI goal-photo overlay (3-sec hold to toggle) |
| **Body Composition** | Weight (lbs) and body fat % tracking |
| **Workout Logging** | Structured exercises by muscle group (Biceps, Triceps, Chest, Back, Shoulders, Legs, Forearms, Core) with sets/reps/weight, volume calculations, and direction indicators (up/down arrows for progression cues) |
| **Food Tracking** | USDA FoodData Central integration, barcode scanning, custom foods, recipes with ingredient management, macro calculations (protein/fat/carbs/calories) |
| **Sleep Tracking** | Sleep time and sleep score |
| **Activity Tracking** | Manual steps, Strava activity import (paste link to fetch details), Fitbit integration (steps, active zone minutes, calories out) |
| **Data Visualization** | Photo progression slideshows (first/last, first-middle-last, custom days), tabular data views for body, sleep, workout volume, and nutrition |
| **Day Counter** | "Day X of Y" progress display with configurable program length (default 84 days / 12 weeks) |
| **Copy Data** | Copy any data category to another day |
| **Multi-Profile Support** | Google OAuth login, profile-scoped data isolation |

### 1.2 Screens / Navigation

**Desktop:** Header nav with "Daily Log" and "Settings" tabs  
**Mobile:** Bottom navigation with 4 views:
- **Home** — Photo + weight/body fat quick entry
- **Workout** — Full workout exercise entry
- **Food** — Food tracker with search, barcode, recipes
- **Stats** — Sleep, steps, Strava activities, Fitbit metrics

### 1.3 Data Model (PostgreSQL)

```
profiles (id, username, password, google_id, email, created_at)
    ↓ 1:N
app_settings (id, profile_id, total_days, start_date, goal_photo, goal_photo_mime_type)
    ↓ 1:N
daily_logs (id, profile_id, date, day_number, photo, photo_mime_type, weight, 
            fat_percent, workout[JSON], protein, fat, carbs, foods[JSON], 
            sleep_time, sleep_score, strava[JSON], steps)

foods (id, source[usda|custom], fdc_id, name, brand, barcode, serving_size, 
       serving_unit, calories, protein, fat, carbs, usda_data[JSONB], profile_id)

recipes (id, profile_id, name, brand, servings, total_calories, total_protein, 
         total_fat, total_carbs)
    ↓ 1:N
recipe_ingredients (id, recipe_id, food_id, amount, unit, ingredient_json[JSONB])

fitbit_tokens (profile_id, access_token, refresh_token, expires_at, fitbit_user_id)
```

### 1.4 Storage & Backend

- **Backend:** Node.js Express server on Railway
- **Database:** Railway-managed PostgreSQL
- **Image Storage:** PostgreSQL BYTEA columns (photos stored as binary)
- **External APIs:**
  - USDA FoodData Central (food search/details)
  - Strava (activity parsing via HTML scraping, no OAuth)
  - Fitbit (OAuth2 PKCE flow for steps, zone minutes, calories, body sync)
  - Google OAuth (authentication)

### 1.5 Deploy Setup

| Config | Value |
|--------|-------|
| **Platform** | Railway |
| **Domain** | `fit.brianfloyd.me` (custom domain via GoDaddy) |
| **Build** | `cd frontend && npm install && npm run build && cd ../backend && npm install` |
| **Start** | `cd backend && npm run migrate-all && npm start` |
| **CI/CD** | GitHub Actions (`deploy-railway.yml`) triggers on push to `main` |
| **Email** | `fitmyaiway@brianfloyd.me` (GoDaddy SMTP, configured for nodemailer) |

**Environment Variables (from `.env.example` and docs):**
- `DB_*` — PostgreSQL credentials (auto-provided by Railway)
- `USDA_API_KEY` — Required for food search
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth
- `FITBIT_CLIENT_ID`, `FITBIT_CLIENT_SECRET`, `FITBIT_REDIRECT_URI` — Fitbit OAuth
- `CORS_ORIGIN` or `RAILWAY_PUBLIC_DOMAIN` — Production CORS whitelist

---

## 2. Code Health Assessment

### 2.1 Build/Run Status

| Check | Status | Notes |
|-------|--------|-------|
| **Frontend npm install** | ✅ Pass | 56 packages, 8 vulnerabilities (7 moderate, 1 high) |
| **Frontend npm build** | ✅ Pass | Vite production build successful |
| **Backend npm install** | ✅ Pass | 135 packages, 2 high vulnerabilities (multer, nodemailer) |
| **A11y warnings** | ⚠️ 4 warnings | Autofocus, unassociated labels, missing keyboard handlers |

### 2.2 Test Coverage

**❌ No tests found.** The codebase has zero test files (`*.test.*`, `*.spec.*`, `__tests__`).

### 2.3 Security Issues

| Severity | Issue | Location | Recommendation |
|----------|-------|----------|----------------|
| **High** | `multer@1.4.5-lts.2` has known vulnerabilities | `backend/package.json` | Upgrade to multer 2.x |
| **High** | `nodemailer@8.0.1` has 5+ CVEs (SSRF, DoS, bypass) | `backend/package.json` | Upgrade to nodemailer 9.1.1+ |
| **High** | `svelte@4.2.7` has SSR prototype pollution | `frontend/package.json` | Upgrade to svelte 5.52+ |
| **Moderate** | `esbuild@<=0.24.2` dev server CORS bypass | Via vite | Upgrade vite to 8.x |
| **Low** | Plaintext password seed in migration | `add_profiles_table.sql` | Remove seed or use bcrypt |
| **Info** | Google OAuth secrets not exposed (correctly uses env vars) | — | ✅ Good |
| **Info** | API error messages expose details in dev mode only | — | ✅ Good |

### 2.4 Obvious Bugs / Issues

| Issue | Location | Impact |
|-------|----------|--------|
| PWA icons missing | `frontend/public/icon-*.png` files don't exist | iOS "Add to Home Screen" won't show proper icons |
| Service worker precache failure | `sw.js` tries to cache icons that don't exist | Console errors on install |
| A11y: form labels not associated with inputs | `DailyLogForm.svelte` lines 924, 1121 | Screen reader issues |
| A11y: click handlers without keyboard handlers | `DailyLogForm.svelte` modals | Accessibility violation |

### 2.5 Mobile/PWA Readiness (iPhone)

| Feature | Status | Notes |
|---------|--------|-------|
| **manifest.json** | ✅ Complete | Standalone mode, portrait, proper metadata |
| **Service Worker** | ✅ Functional | Network-first strategy, offline fallback |
| **HTTPS** | ✅ Railway auto-SSL | Required for camera access |
| **Camera Access** | ✅ Working | Uses mkcert in dev, Railway SSL in prod |
| **Touch Optimizations** | ✅ Good | `-webkit-tap-highlight-color`, `touch-action` handling |
| **Safe Area Insets** | ✅ Implemented | `env(safe-area-inset-*)` for iPhone notch |
| **PWA Icons** | ❌ Missing | 192x192 and 512x512 PNG icons not generated |
| **iOS Splash Screens** | ❌ Not configured | Apple-touch-startup-image not set |

---

## 3. Prioritized Enhancement Suggestions

### Context: Brian's Training Profile

- **Demographics:** 54-year-old lifter, 5'10", ~175 lb, cutting for visible abs while preserving muscle
- **Gym:** Planet Fitness (dumbbells, Smith machine, cables, machines, fixed barbells ≤60 lb)
- **Split:** Mon biceps/back, Tue chest/triceps, Wed shoulders, Thu legs, Fri upper mashup
- **Schedule:** Ramp week Dec 8–14, 2026; full program Dec 15 with 4-week double-progression blocks
- **Injuries:** Left shoulder pain, elbow tendinitis (bench, chest flies, lateral flies aggravate)
- **Nutrition:** 2,100–2,200 kcal weekdays, 160–175g protein; meal prep focused; weekend flexibility with wife
- **Cardio:** Distance skateboarding for Ultraskate Feb 2027 — LDP, scogging, long weekend sessions, switch-foot practice 5–10 min/day
- **Check-ins:** Weekly weight trend average, waist measurement, photos

---

### 3.1 Quick Wins (Small Effort)

| # | Enhancement | Why | Effort | Where |
|---|-------------|-----|--------|-------|
| **S1** | Generate PWA icons (192, 512 maskable) | iOS Add-to-Home-Screen currently broken | S | `frontend/public/generate-icons.js` → run with node-canvas or convert from SVG |
| **S2** | Add waist measurement field | Weekly check-in metric for cutting progress | S | `database/schema.sql` add `waist DECIMAL(5,2)`, `DailyLogForm.svelte` body section, `dailyLogs.js` |
| **S3** | Fix A11y label associations | Screen reader support, reduce Vite warnings | S | `DailyLogForm.svelte` lines 924, 1121 — add `for` attributes |
| **S4** | Upgrade nodemailer to 9.1.1+ | Critical security fixes | S | `backend/package.json` |
| **S5** | Add "Rest Day" or "Cardio Only" workout type | Not every day has weights — skate sessions need logging without sets/reps | S | `WorkoutExercises.svelte` add activity type selector |

### 3.2 Medium Effort Enhancements

| # | Enhancement | Why | Effort | Where |
|---|-------------|-----|--------|-------|
| **M1** | Pain/Flare Logging per Exercise | Track shoulder/elbow aggravation; identify problematic movements | M | Add `pain_level` (0-5) and `pain_note` fields to exercise JSON schema in `WorkoutExercises.svelte`; show pain history in exercise picker |
| **M2** | Skateboard Cardio Module | LDP distance, scogging time, switch-foot minutes, session type (training/long ride), comfort rating | M | New `SkateTraining.svelte` component; add `skate_training JSON` column to `daily_logs`; show in Stats view |
| **M3** | Weekly Summary Dashboard | 7-day weight average, total volume, protein average, waist trend, skate volume | M | New `WeeklySummary.svelte` using `getRecentLogs(7)`; display on Home view Saturdays or on-demand |
| **M4** | Program Phase Awareness | Distinguish ramp week (Dec 8–14) vs. full program; track 4-week block numbers for double progression | M | Add `phase` and `block_number` to `app_settings`; show in `DayCounter.svelte`; auto-calculate from start_date |
| **M5** | Exercise Substitution Suggestions | When shoulder/elbow pain flagged, suggest cable-friendly or neutral-grip alternatives | M | Create `exercise_substitutions` mapping in `WorkoutExercises.svelte`; show when exercise has recent pain log |
| **M6** | Weekend Meal Flexibility Mode | Toggle "flexible day" to relax macro targets; track alcohol/dining out without guilt | M | Add `is_flexible_day` boolean to `daily_logs`; adjust calorie/macro displays in `FoodTracker.svelte` |

### 3.3 Larger Features

| # | Enhancement | Why | Effort | Where |
|---|-------------|-----|--------|-------|
| **L1** | AI Coach/Assistant Integration | Personalized feedback on training, recovery, nutrition; automated weekly check-in summaries | L | New `/api/coach` endpoint using OpenAI API; `CoachChat.svelte` component; uses daily_logs context for personalized advice |
| **L2** | Progressive Overload Tracker | Track whether lifts increased weight/reps across 4-week blocks; alert when progression stalls | L | Analyze workout JSON history; compute progression metrics; show in `GraphView.svelte` workout section |
| **L3** | Ultraskate Training Plan | Structured skateboard periodization leading to Feb 2027 event; volume ramp, taper, etc. | L | New `SkateProgram.svelte` with phase display; integrate with `app_settings` |
| **L4** | Photo Comparison Overlays | Side-by-side or animated overlay of Day 1 vs current for visual progress assessment | L | Enhance `PhotoGrid.svelte` with canvas-based overlay; use goal photo as reference |
| **L5** | Apple Health / HealthKit Sync | Auto-import weight, body fat, steps from iPhone Health app | L | Requires native iOS wrapper (Capacitor/PWA bridge) or manual CSV import |

### 3.4 AI Coach Integration Architecture

The app's existing architecture supports AI integration well:

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Svelte)                        │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │  CoachChat.svelte│  │  Existing Components             │ │
│  │  - Chat UI       │  │  - DailyLogForm (context source) │ │
│  │  - Quick prompts │  │  - WorkoutExercises              │ │
│  │  - Weekly review │  │  - FoodTracker                   │ │
│  └────────┬─────────┘  └──────────────────────────────────┘ │
│           │                                                   │
└───────────┼───────────────────────────────────────────────────┘
            │ POST /api/coach/chat
            ▼
┌───────────────────────────────────────────────────────────────┐
│                     Backend (Express)                          │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  routes/coach.js                                        │   │
│  │  - Load user's recent logs (7-30 days)                  │   │
│  │  - Build system prompt with training context            │   │
│  │  - Call OpenAI API with structured output               │   │
│  │  - Return coaching advice + suggested actions           │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  Env: OPENAI_API_KEY                                          │
└───────────────────────────────────────────────────────────────┘
```

**Coach capabilities:**
- Review workout logs and suggest when to increase weight (double progression guidance)
- Flag exercises that repeatedly cause pain and suggest substitutes
- Analyze nutrition trends against 2,100–2,200 kcal / 160–175g protein targets
- Generate weekly check-in summaries (weight trend, volume, adherence)
- Provide skateboard training advice for Ultraskate prep

---

## 4. Recommended First Batch (3–5 Changes)

Based on Brian's immediate needs (ramp week starting Dec 8, cutting phase, injury management, Ultraskate prep), here's the recommended priority order:

### Batch 1: Pre-Ramp Week (Ship by Dec 7)

| Priority | Item | Rationale |
|----------|------|-----------|
| **1** | **S1: Generate PWA icons** | Fix iOS home screen install before daily use ramps up |
| **2** | **S2: Add waist measurement** | Critical for weekly cutting check-ins |
| **3** | **M1: Pain/flare logging** | Essential for shoulder/elbow tracking during ramp week to establish baselines |
| **4** | **M4: Program phase awareness** | Distinguish ramp week from full program; enables block tracking |
| **5** | **S4: Upgrade nodemailer** | Security fix, quick npm update |

### Why This Order:

1. **PWA icons** — Brian uses an iPhone; broken PWA install defeats mobile-first purpose
2. **Waist measurement** — He's tracking weekly waist for cutting; can't do check-ins without it
3. **Pain logging** — Ramp week is when he'll establish what aggravates shoulder/elbow
4. **Phase awareness** — Dec 8–14 is ramp, Dec 15+ is full program; app should know the difference
5. **Security** — nodemailer vulns are high severity, 1-line fix

### Batch 2: First Training Block (Dec 15–Jan 11)

| Priority | Item | Rationale |
|----------|------|-----------|
| **1** | **M2: Skateboard cardio module** | Ultraskate prep needs distance/scogging tracking |
| **2** | **M3: Weekly summary dashboard** | Saturday check-ins need aggregated view |
| **3** | **M5: Exercise substitution suggestions** | Pain data from ramp week enables smart swaps |
| **4** | **M6: Weekend flexibility mode** | Reduce friction for Saturday dinners with wife |

### Batch 3: Block 2+ (Jan 12 onwards)

| Priority | Item | Rationale |
|----------|------|-----------|
| **1** | **L1: AI coach integration** | Has enough data for meaningful coaching |
| **2** | **L2: Progressive overload tracker** | Full block of data enables progression analysis |
| **3** | **L3: Ultraskate training plan** | 6 weeks out from event, structured periodization helps |

---

## 5. Summary

### Strengths
- Solid mobile-first architecture with PWA support
- Comprehensive workout tracking with muscle groups and volume
- Good food tracking with USDA integration and recipes
- Multi-profile support with Google OAuth
- MCP server for database access (Cursor-friendly)
- Auto-save with debouncing for smooth UX

### Weaknesses
- No tests (significant technical debt)
- Security vulnerabilities in dependencies (multer, nodemailer)
- Missing PWA icons
- No injury/pain tracking
- No cardio/skateboard-specific logging
- No weekly summary or trend analysis

### Quick Win ROI
The first batch (5 items, all S/M effort) addresses the most critical gaps for Brian's Dec 8 ramp week start. Total estimated development time: 1–2 focused sessions.

---

*Assessment completed. No app code changes made per instructions.*
