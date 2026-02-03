# 📚 Canonical Documentation Index

**Entry Point for All Canonical Specifications**

This index catalogs all canonical documents in the Fitness App's documentation library. All documents listed here are the **single source of truth** for their respective domains.

**🚨 CRITICAL: Only documents in this index are canonical. Documents in `/docs/Chuck docs/` (999-*) are reference materials and MUST NOT be treated as canonical sources.**

---

## 📋 Quick Reference

| Series | Domain | Document Count |
|--------|--------|----------------|
| **00-XX** | Index & Governance | 4 |
| **01-XX** | Templates & Processes | 2 |
| **10-XX** | App Operation | 5 |
| **20-XX** | System Architecture | 5 |
| **30-XX** | Design Standards | 3 |
| **40-XX** | Production Configuration | 1 |
| **50-XX** | Database | 2 |
| **Total** | | **22 canonical documents** |

---

## 00-XX: Index & Governance

### `README.md`
**Purpose:** Comprehensive guide explaining how the canon governance system works, with emphasis on Cursor Skills  
**Use When:** Understanding the system architecture, learning about Cursor Skills, or exploring skill expansion opportunities  
**Key Content:** System overview, three-layer architecture, Cursor Skills deep dive, efficiency patterns, avoiding bloat, skill expansion ideas

### `00-README.md`
**Purpose:** Cursor governance rules and canon management processes  
**Use When:** Starting any task, understanding how to work with canon, determining whether canon exists  
**Key Content:**
- Canon creation and update flow (MANDATORY)
- Visual drift cues (CANON APPLY, CANON PROPOSE, CANON BLOCK)
- File & write rules
- Prime directive and self-check requirements

### `00-01-INDEX.md` (This Document)
**Purpose:** Comprehensive catalog of all canonical documents  
**Use When:** Finding relevant canonical documents for a specific task or domain  
**Key Content:** Complete index organized by series and topic

### `00-02-canon-setup-respawn.md`
**Purpose:** Instructions for respawning the canon governance system in new projects  
**Use When:** Setting up canon governance in a new project, updating the canon system, or replicating this setup  
**Key Content:** Setup process, canon series structure, maintenance guidelines, troubleshooting

### `README.md`
**Purpose:** Comprehensive guide explaining how the canon governance system works, with emphasis on Cursor Skills  
**Use When:** Understanding the system architecture, learning about Cursor Skills, or exploring skill expansion opportunities  
**Key Content:** System overview, three-layer architecture, Cursor Skills deep dive, efficiency patterns, avoiding bloat, skill expansion ideas

---

## 01-XX: Templates & Processes

### `01-00-scrub-prompt-template.md`
**Purpose:** Template for creating reference documents (999-*) when canon is missing or unclear  
**Use When:** Canon doesn't exist and you need to create analysis/reference material  
**Key Content:** Template structure for scrub documents that go to `/docs/Chuck docs/`

### `01-01-scrub-add-cannon-template.md`
**Purpose:** Template for creating or updating canonical documents  
**Use When:** Adding new canon or updating existing canon (requires explicit user approval)  
**Key Content:** Required structure and format for canonical specifications

---

## 10-XX: App Operation

### `10-01-daily-log-flow.md`
**Purpose:** User flow for daily log entry, from opening app to saving complete log  
**Use When:** Understanding daily log workflow, implementing changes to daily log, or documenting new daily log features  
**Key Content:** Entry point, initial load, date selection, photo upload, body metrics, workout entry, food tracking, save process

### `10-02-photo-management.md`
**Purpose:** Photo upload, cropping, storage, display, and AI goal photo functionality  
**Use When:** Working with photo features, implementing photo-related changes, or understanding photo data flow  
**Key Content:** Photo upload flow, cropping with cropperjs, storage in PostgreSQL, AI goal photo toggle, photo progression

### `10-03-food-tracking.md`
**Purpose:** Food search, selection, portion adjustment, macro calculation, and common foods functionality  
**Use When:** Working with food tracking features, implementing food-related changes, or understanding food data flow  
**Key Content:** USDA API integration, food search, portion adjustment, macro calculation, common foods, LocalStorage

### `10-04-workout-exercises.md`
**Purpose:** Workout exercise entry, muscle group selection, set tracking, and exercise data structure  
**Use When:** Working with workout features, implementing exercise-related changes, or understanding workout data flow  
**Key Content:** Muscle groups, exercise selection, sets entry, workout volume calculation, recent exercises, exercise history

### `10-05-graph-view.md`
**Purpose:** Data visualization, photo progression, comparison modes, and graph display functionality  
**Use When:** Working with graph/visualization features, implementing data display changes, or understanding graph data flow  
**Key Content:** Graph categories, photo progression modes, comparison modes (all, first-last, first-middle-last, custom), data tables, progression controls

---

## 20-XX: System Architecture

### `20-00-file-structure-canonical.md`
**Purpose:** Canonical file structure, directory organization, archive policies  
**Use When:** **ALWAYS** when creating, moving, or organizing files  
**Key Content:** Directory structure, file naming conventions, archive policies, documentation organization

### `20-01-system-architecture.md`
**Purpose:** Overall system architecture, component relationships, system design  
**Use When:** Understanding system-wide architecture, component interactions, or system design  
**Key Content:** System architecture overview, component relationships, data flow, API structure, service boundaries

### `20-02-frontend-architecture.md`
**Purpose:** Frontend architecture, component structure, reactive patterns, client-side data flow  
**Use When:** Working on frontend code, creating new components, or understanding frontend patterns  
**Key Content:** Component structure, reactive statements, API client, state management, lifecycle hooks, styling patterns

### `20-03-backend-services.md`
**Purpose:** Backend API routes, handlers, middleware, and service patterns  
**Use When:** Working on backend code, creating new API endpoints, or understanding backend architecture  
**Key Content:** Route handlers, database connection, file upload (multer), error handling, day number calculation, external API integration

### `20-04-database-schema.md`
**Purpose:** Database schema, table definitions, database structure  
**Use When:** Working with database, queries, migrations, or database-related code  
**Key Content:** Database schema, table definitions, relationships, constraints, data types

---

## 30-XX: Design Standards

### `30-01-css-variables.md`
**Purpose:** CSS custom properties (variables) for colors, spacing, typography, and design tokens  
**Use When:** Creating or modifying styles, ensuring design consistency, or adding new UI components  
**Key Content:** Color variables, spacing scale, border radius, shadows, usage guidelines

### `30-02-component-patterns.md`
**Purpose:** Svelte component conventions, prop patterns, event handling, and component structure standards  
**Use When:** Creating new Svelte components, modifying existing components, or ensuring component consistency  
**Key Content:** Component file structure, props, event handling, reactive statements, lifecycle hooks, styling patterns, component composition

### `30-03-responsive-design.md`
**Purpose:** Responsive design patterns, breakpoints, mobile-first approach, and PWA considerations  
**Use When:** Creating or modifying responsive layouts, implementing mobile features, or ensuring cross-device compatibility  
**Key Content:** Breakpoints, mobile-first patterns, safe area support, touch interactions, PWA considerations, responsive components

---

## 40-XX: Production Configuration

### `40-01-railway-deployment.md`
**Purpose:** Railway platform deployment process, environment variable configuration, and production deployment patterns  
**Use When:** Deploying to Railway, configuring production environment, or understanding deployment process  
**Key Content:** Railway configuration, environment variables, deployment process, database migration, production considerations, monitoring

---

## 50-XX: Database

### `50-01-postgresql-setup.md`
**Purpose:** PostgreSQL database setup, connection configuration, environment variables  
**Use When:** Setting up the database, configuring connections, or troubleshooting database issues  
**Key Content:** Database configuration, connection setup, schema setup, troubleshooting

### `50-02-migrations.md`
**Purpose:** Migration patterns, SQL conventions, migration execution guidelines  
**Use When:** Creating new migrations, modifying database schema, or understanding migration patterns  
**Key Content:** Migration patterns, naming conventions, idempotency, reversibility, execution guidelines

---

## 🔍 Finding Documents Quickly

### By Series Number
- **00-XX**: Start here (governance, index)
- **01-XX**: Templates and processes
- **10-XX**: App operation and user flows
- **20-XX**: Technical architecture and systems
- **30-XX**: Design standards (CSS, components)
- **40-XX**: Production configuration (Railway)
- **50-XX**: Database schema and migrations

### By Topic
- **File Structure**: `20-00-file-structure-canonical.md`
- **Database**: `20-04-database-schema.md`, `50-01-postgresql-setup.md`, `50-02-migrations.md`
- **Architecture**: `20-01-system-architecture.md`, `20-02-frontend-architecture.md`, `20-03-backend-services.md`
- **CSS Variables**: `30-01-css-variables.md`
- **Component Patterns**: `30-02-component-patterns.md`
- **Responsive Design**: `30-03-responsive-design.md`
- **Deployment**: `40-01-railway-deployment.md`
- **User Flows**: `10-01-daily-log-flow.md`, `10-02-photo-management.md`, `10-03-food-tracking.md`, `10-04-workout-exercises.md`, `10-05-graph-view.md`

---

## 📝 Document Status

All documents listed in this index are:
- ✅ Canonical (single source of truth)
- ✅ Located in `docs/` root directory
- ✅ Numbered according to series conventions

**Documents NOT in this index (e.g., in `/docs/Chuck docs/`) are reference materials and MUST NOT be treated as canonical sources.**

---

## 🔄 Maintenance

This index should be updated whenever:
- New canonical documents are added
- Canonical documents are removed or deprecated
- Document purposes or key content areas change significantly

Update process:
1. Modify this index document
2. Ensure document numbering follows series conventions
3. Verify all listed documents exist and are canonical

---

**Last Updated:** After completing all canon document series  
**Entry Point:** Start with `00-README.md` for governance, or use this index to find specific domains
