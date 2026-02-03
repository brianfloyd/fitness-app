# 20-00 — **Canonical File Structure Specification**

> **Purpose:** This document defines the canonical file structure for the Fitness App project. All files must be organized according to these rules.
>
> **Use When:** Creating, moving, or organizing files in the project.

---

## 1. Root Directory Principles

The root directory (`fitness/`) must contain **only essential files**:

### **Required Root Files:**
- `README.md` - Project overview and setup instructions
- `.gitignore` - Git ignore rules
- `start-dev.bat` / `start-dev.ps1` - Development startup scripts

### **Root Directory Rules:**
- No source code files (except as noted below)
- No documentation files (except README.md)
- No archive or legacy files
- No utility scripts (except dev startup scripts)

---

## 2. Directory Structure & Purpose

### **2.1 Frontend Directory**

#### **`frontend/`** - Svelte Application
- **Purpose:** All frontend code, components, and assets
- **Structure:**
  ```
  frontend/
  ├── src/
  │   ├── lib/              # Reusable Svelte components
  │   │   ├── utils/        # Utility functions
  │   │   └── *.svelte      # Component files
  │   ├── App.svelte        # Main app component
  │   ├── app.css           # Global styles
  │   ├── main.js           # Entry point
  │   └── main.ts           # TypeScript entry (if used)
  ├── public/               # Static assets
  │   ├── manifest.json     # PWA manifest
  │   ├── sw.js            # Service worker
  │   └── *.svg            # Icons and images
  ├── index.html           # HTML entry point
  ├── package.json         # Dependencies
  ├── vite.config.js      # Vite configuration
  └── svelte.config.js    # Svelte configuration
  ```

**Rules:**
- All Svelte components in `src/lib/`
- Utility functions in `src/lib/utils/`
- Global styles in `src/app.css`
- Static assets in `public/`

---

### **2.2 Backend Directory**

#### **`backend/`** - Express API Server
- **Purpose:** Backend API server and business logic
- **Structure:**
  ```
  backend/
  ├── src/
  │   ├── db/              # Database connection and utilities
  │   │   └── connection.js
  │   ├── routes/          # Express route handlers
  │   │   ├── dailyLogs.js
  │   │   ├── foods.js
  │   │   ├── settings.js
  │   │   └── strava.js
  │   ├── server.js        # Server entry point
  │   └── setup-db.js      # Database setup utilities
  ├── package.json
  └── .env                 # Environment variables (not in git)
  ```

**Rules:**
- One route file per API resource
- Database utilities in `src/db/`
- Server entry point is `src/server.js`

---

### **2.3 Database Directory**

#### **`database/`** - Database Schema and Migrations
- **Purpose:** SQL schema definitions and migration files
- **Structure:**
  ```
  database/
  ├── schema.sql          # Main schema definition
  ├── migrations/         # Migration files
  │   └── *.sql
  └── verify_setup.sql    # Setup verification queries
  ```

**Rules:**
- Main schema in `schema.sql`
- Migrations in `migrations/` directory
- Migration files named descriptively (e.g., `add_foods_column.sql`)

---

### **2.4 Documentation Directory**

#### **`docs/`** - Canonical Documentation
- **Purpose:** Authoritative specifications and canonical documentation
- **Structure:**
  ```
  docs/
  ├── 00-README.md                    # Governance rules
  ├── 00-01-INDEX.md                  # Document catalog
  ├── 01-00-scrub-prompt-template.md  # Analysis template
  ├── 01-01-scrub-add-cannon-template.md
  ├── 10-*.md                         # App operation canon
  ├── 20-*.md                         # Architecture canon
  ├── 30-*.md                         # Design standards
  ├── 40-*.md                         # Production config
  ├── 50-*.md                         # Database canon
  └── Chuck docs/                     # Reference docs (non-canonical)
      └── 999-*.md                     # All reference docs start with 999-
  ```

**Rules:**
- Only canonical specifications in `docs/` root
- Reference documents (analysis, proposals) in `docs/Chuck docs/`
- All reference docs must start with `999-`
- Never mix canonical and reference documentation

---

### **2.5 Cursor Configuration Directory**

#### **`.cursor/`** - Cursor IDE Configuration
- **Purpose:** Cursor rules, MCP config, and project-level settings
- **Structure:**
  ```
  .cursor/
  ├── rules/
  │   └── *.mdc          # Cursor rules
  └── mcp.json           # Project-level MCP servers (e.g. fitness-db)
  ```

**Rules:**
- Rules in `.cursor/rules/` directory
- Rule files use `.mdc` extension
- MCP config in `.cursor/mcp.json` when using MCP tools for this project

---

### **2.6 MCP Directory**

#### **`mcp/`** - MCP Server for PostgreSQL Tools
- **Purpose:** MCP server exposing query/update tools for the Fitness app PostgreSQL database (`app_settings`, `daily_logs`). Used by Cursor so the AI can inspect and modify DB state directly.
- **Structure:**
  ```
  mcp/
  ├── index.js           # MCP server (stdio)
  ├── db.js              # pg pool; loads backend/.env
  ├── tools/
  │   └── db.js          # fitness_db_query, fitness_db_execute, fitness_db_get_tables, etc.
  ├── package.json
  └── README.md
  ```

**Rules:**
- DB config from `backend/.env` (same as API). Override via MCP server `env` in `.cursor/mcp.json` if needed.
- Tools: read-only `fitness_db_query` (SELECT only), `fitness_db_execute` (INSERT/UPDATE/DELETE; no DROP/TRUNCATE/ALTER), `fitness_db_get_tables`, plus convenience `fitness_get_logs`, `fitness_get_settings`.

---

## 3. File Naming Conventions

### **3.1 Code Files**
- **JavaScript:** `camelCase.js` (e.g., `server.js`, `connection.js`)
- **Svelte Components:** `PascalCase.svelte` (e.g., `DailyLogForm.svelte`)
- **Routes:** `camelCase.js` (e.g., `dailyLogs.js`, `settings.js`)
- **SQL:** `snake_case.sql` (e.g., `add_foods_column.sql`)

### **3.2 Documentation**
- **Canonical Docs:** `XX-XX-[name].md` (e.g., `20-01-system-architecture.md`)
- **Reference Docs:** `999-[name].md` (in `docs/Chuck docs/`)

---

## 4. File Organization Decision Tree

### **Where does a new file belong?**

1. **Is it served to the browser?**
   - Yes → `frontend/public/` or `frontend/src/`
   - No → Continue

2. **Is it a Svelte component?**
   - Yes → `frontend/src/lib/`
   - No → Continue

3. **Is it a database migration?**
   - Yes → `database/migrations/`
   - No → Continue

4. **Is it an API route?**
   - Yes → `backend/src/routes/`
   - No → Continue

5. **Is it a utility function?**
   - Yes → `frontend/src/lib/utils/` or `backend/src/`
   - No → Continue

6. **Is it documentation?**
   - Canonical spec → `docs/` (numbered)
   - Reference/analysis → `docs/Chuck docs/999-*.md`
   - No → Continue

7. **Is it MCP tooling for this project’s database?**
   - Yes → `mcp/` (server, tools, DB helpers)
   - No → Continue

8. **Is it a Cursor rule?**
   - Yes → `.cursor/rules/`
   - No → Root (only if essential config)

---

## 5. Archive Policy

### **5.1 When to Archive**

Archive a file or directory when:
- It is no longer referenced in active code
- It has been replaced by a newer implementation
- It is a one-time utility that was used once
- It is historical analysis or reporting

### **5.2 Archive Process**

1. **Verify file is not referenced:**
   ```bash
   grep -r "filename" --include="*.js" --include="*.svelte" .
   ```

2. **Move using git mv:**
   ```bash
   git mv path/to/file archive/appropriate-subdirectory/
   ```

3. **Verify no broken references**

---

## 6. Enforcement Rules for Cursor

When Cursor creates, moves, or organizes files, it must:

1. **Check this document** before placing files
2. **Follow the decision tree** (Section 4)
3. **Use `git mv`** when moving files to preserve history
4. **Verify references** before archiving files
5. **Never create files in root** unless they are essential config
6. **Never mix canonical and reference docs**

---

## 7. Summary of Key Principles

1. **Clear Separation** - Frontend, backend, database, docs in separate directories
2. **Canonical Docs** - Only authoritative specs in `docs/` (numbered)
3. **Reference Docs** - Non-canonical analysis in `docs/Chuck docs/999-*.md`
4. **No Root Clutter** - Only essential config and entry points in root
5. **Preserve History** - Always use `git mv` for moves
6. **Follow Naming** - Use established conventions

---

**END OF CANONICAL SPECIFICATION**
