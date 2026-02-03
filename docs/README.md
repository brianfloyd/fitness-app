# Canon Governance System - How It Works

> **A comprehensive guide to understanding and using the canon governance system, with emphasis on Cursor Skills as the key innovation.**

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Why Cursor Skills?](#why-cursor-skills)
3. [How It Works](#how-it-works)
4. [The Three-Layer Architecture](#the-three-layer-architecture)
5. [Cursor Skills Deep Dive](#cursor-skills-deep-dive)
6. [Making Development Efficient](#making-development-efficient)
7. [Avoiding Project Bloat](#avoiding-project-bloat)
8. [Expanding Skills](#expanding-skills)
9. [Quick Start](#quick-start)

---

## System Overview

The canon governance system ensures that Cursor (and developers) always know what patterns exist, what's allowed, and what requires explicit approval. It prevents undocumented features, maintains consistency, and enables intentional evolution.

**Core Principle:** Cursor must never invent behavior without explicit user consent, and must always report canon status after each interaction.

---

## Why Cursor Skills?

### The Problem with Rules Alone

**Traditional Approach (Rules Only):**
- Rules are static guidelines
- No structured workflow
- Hard to maintain consistency
- Context bloat (all rules always loaded)
- Inconsistent application
- No reusable patterns

**Result:** Rules get ignored, drift occurs, patterns become inconsistent.

---

### The Solution: Skills + Rules

**Skills Provide:**
- **Structured Workflows** - Not just guidelines, but executable processes
- **Progressive Disclosure** - Load details only when needed
- **Reusability** - One skill works across all projects
- **Separation of Concerns** - Process (skill) vs. Content (canon) vs. Trigger (rule)

**Rules Provide:**
- **Always-Apply Trigger** - Ensures skill is considered
- **Lightweight** - Just points to skill and local canon
- **Project-Specific** - Can reference project-specific governance

**Result:** Consistent, scalable, maintainable canon governance.

---

## How It Works

### The Decision Flow

Every Cursor interaction follows this flow:

```
User Request
    ↓
Project Rule Triggers (always-apply)
    ↓
Points to Global Skill
    ↓
Skill Checks Local Canon (docs/00-01-INDEX.md)
    ↓
Applies Decision Ladder
    ↓
Reports Status (APPLY | PROPOSE | BLOCK)
    ↓
Action Taken (or blocked)
```

### The Decision Ladder

1. **Is this already defined in canon?**
   - Yes → 🟢 **CANON APPLY** (execute immediately)
   - No → Continue

2. **Did user explicitly instruct a change?**
   - Yes → 🟡 **CANON PROPOSE** (wait for approval)
   - No → Continue

3. **Would this improve clarity/safety/scalability?**
   - Yes → 🟡 **CANON PROPOSE** (wait for approval)
   - No → 🔴 **CANON BLOCK** (stop and explain)

**Cursor must NEVER skip steps.**

---

## The Three-Layer Architecture

```
┌─────────────────────────────────────────────────┐
│  Layer 1: Global Skill                          │
│  ~/.cursor/skills/canon-governance/              │
│                                                  │
│  Purpose: Reusable workflow and knowledge        │
│  Scope: All projects                            │
│  Contains:                                       │
│    - SKILL.md (workflow overview)               │
│    - references/decision-ladder.md              │
│    - references/document-templates.md          │
│    - references/status-reporting.md             │
└─────────────────────────────────────────────────┘
                    ↓ referenced by
┌─────────────────────────────────────────────────┐
│  Layer 2: Project Rule                           │
│  .cursor/rules/canon-governance.mdc              │
│                                                  │
│  Purpose: Lightweight trigger                    │
│  Scope: This project only                       │
│  Contains:                                       │
│    - alwaysApply: true                          │
│    - Points to global skill                     │
│    - Points to local canon                      │
└─────────────────────────────────────────────────┘
                    ↓ enforces
┌─────────────────────────────────────────────────┐
│  Layer 3: Local Canon                            │
│  docs/                                           │
│                                                  │
│  Purpose: Project-specific truth                 │
│  Scope: This project only                       │
│  Contains:                                       │
│    - 00-README.md (governance)                 │
│    - 00-01-INDEX.md (catalog)                  │
│    - 10-XX, 20-XX, 30-XX, etc. (canon docs)   │
│    - Chuck docs/999-*.md (reference materials) │
└─────────────────────────────────────────────────┘
```

**Why This Separation:**

- **Global Skill** = Reusable knowledge (how to work with canon)
- **Project Rule** = Lightweight trigger (when to apply)
- **Local Canon** = Project-specific truth (what this project does)

This allows:
- One skill to work across all projects
- Project-specific canon without duplication
- Easy updates (change skill once, affects all projects)

---

## Cursor Skills Deep Dive

### What Makes Skills Powerful

#### 1. Progressive Disclosure

**Traditional Rules:**
- All rules loaded into context
- Context bloat
- Slower responses
- Harder to maintain

**Skills:**
- Skill description triggers when relevant
- References loaded only when needed
- Faster responses
- Easier maintenance

**Example:**
```
User: "Add a new API endpoint"
  ↓
Skill triggers (description matches)
  ↓
SKILL.md loaded (overview)
  ↓
references/decision-ladder.md loaded (needed for decision)
  ↓
references/document-templates.md NOT loaded (not needed yet)
```

#### 2. Structured Workflow

**Skills provide executable processes, not just guidelines:**

```markdown
# In SKILL.md
1. Check canon (docs/00-01-INDEX.md)
2. Apply decision ladder
3. Report status
4. Execute or propose
```

**vs. Rules:**
```markdown
# In rule file
Remember to check canon before making changes.
```

**Skills enforce the process; rules just remind.**

#### 3. Reusability

**One skill, many projects:**
- Install skill once globally
- Works in all projects
- Updates propagate automatically
- Consistent behavior everywhere

**vs. Rules:**
- Copy rules to each project
- Update each project separately
- Inconsistent across projects

#### 4. Separation of Concerns

**Skill = Process (HOW)**
- How to check canon
- How to make decisions
- How to report status

**Rule = Trigger (WHEN)**
- When to apply (always-apply)
- Points to skill and canon

**Canon = Content (WHAT)**
- What patterns exist
- What's allowed
- What's documented

---

### Skill Triggering Mechanism

**How Cursor Knows to Use a Skill:**

1. **Description Matching**
   ```yaml
   description: >
     Enforces canon-first development for projects with a docs/ directory.
     Use when: starting any task, checking if canon exists, creating or modifying code,
     proposing new patterns, or when the user mentions canon, documentation, or standards.
   ```
   - Keywords: "canon", "documentation", "standards", "docs/"
   - Cursor matches user query to description
   - Skill activates when relevant

2. **Rule Reference**
   ```yaml
   # .cursor/rules/canon-governance.mdc
   alwaysApply: true
   ```
   - Rule explicitly references skill
   - Always-apply ensures skill is considered
   - Skill provides detailed workflow

3. **Progressive Loading**
   - SKILL.md loaded first (overview)
   - References loaded when needed (details)
   - Avoids unnecessary context

---

### Skill Structure

**Optimal Skill Structure:**

```
canon-governance/
├── SKILL.md                    # Overview, triggers, workflow
└── references/
    ├── decision-ladder.md      # Detailed decision process
    ├── document-templates.md   # Canon document structure
    └── status-reporting.md     # How to format status reports
```

**SKILL.md Should:**
- Have clear, keyword-rich description
- Explain when to use the skill
- Provide workflow overview
- Reference detailed guides (don't include all details)

**References Should:**
- Contain detailed procedures
- Include examples
- Provide templates
- Be modular (load only what's needed)

---

## Making Development Efficient

### Right the First Time

**How Canon Prevents Mistakes:**

#### 1. Pattern Consistency

**Problem:** Developers make ad-hoc decisions, creating inconsistent patterns.

**Solution:** Canon documents established patterns, Cursor follows them automatically.

**Example:**
- Canon says: "API routes use RESTful conventions"
- Cursor creates: `POST /api/logs` (not `POST /api/create-log`)
- Result: Consistent API design

#### 2. Early Validation

**Problem:** Incompatible changes discovered late, requiring rework.

**Solution:** Canon checked before action, conflicts detected early.

**Example:**
- User: "Add new workout field"
- Cursor checks: `10-04-workout-exercises.md`
- Finds: Workout stored as JSON with specific structure
- Ensures: New field fits existing structure
- Result: No breaking changes

#### 3. Explicit Consent

**Problem:** Features added without approval, creating technical debt.

**Solution:** New patterns require approval, no silent invention.

**Example:**
- User: "Add caching layer"
- Cursor: 🟡 CANON PROPOSE (new pattern, needs documentation)
- User approves → Canon updated → Feature added
- Result: Intentional evolution only

---

### Avoiding Project Bloat

**How Canon Prevents Bloat:**

#### 1. Documented Patterns Only

**Rule:** No undocumented features allowed.

**Enforcement:**
- Cursor blocks creation of undocumented patterns
- Must either use existing canon or get approval for new canon
- Prevents "helpful" additions without justification

**Example:**
- Developer: "Add feature X"
- Cursor: 🔴 CANON BLOCK (no canon for feature X)
- Developer: Must document feature X first, then implement
- Result: All features are intentional and documented

#### 2. Canon Hygiene

**Process:**
- Regular reviews of canon vs. code
- Outdated patterns removed
- Conflicts resolved
- Canon stays aligned with code

**Automation Potential:**
- Scripts to detect outdated canon
- Automated conflict detection
- Proactive gap identification

#### 3. Reference vs. Canon Separation

**Reference Docs (999-*):**
- Analysis, proposals, findings
- Non-authoritative
- Can be experimental

**Canon Docs (10-XX, 20-XX, etc.):**
- Proven patterns
- Authoritative
- Must match code

**Result:** Prevents premature documentation from becoming canon.

---

## Expanding Skills

### Adding New Reference Files

**Pattern:**
```
canon-governance/
├── SKILL.md
└── references/
    ├── decision-ladder.md
    ├── document-templates.md
    ├── status-reporting.md
    └── [new-reference].md      # Add new references as needed
```

**Examples of New References:**
- `code-analysis-patterns.md` - How to analyze codebase for canon
- `canon-validation.md` - How to validate canon accuracy
- `conflict-resolution.md` - How to resolve canon conflicts
- `canon-generation.md` - How to generate canon from code

**Usage:**
- Reference from SKILL.md when relevant
- Load only when needed (progressive disclosure)
- Keep focused and modular

---

### Creating Specialized Skills

**Pattern:** Domain-specific skills that reference canon-governance

**Example: API Design Skill**
```
api-design-governance/
├── SKILL.md
│   # References canon-governance for core workflow
│   # Adds API-specific patterns
└── references/
    ├── restful-conventions.md
    ├── error-handling.md
    └── versioning-strategies.md
```

**Composition:**
- `canon-governance` provides core workflow
- `api-design-governance` adds API-specific patterns
- Skills work together

**Benefits:**
- Domain expertise in specialized skills
- Core workflow in base skill
- Composable and maintainable

---

### Skill Composition Patterns

**Pattern 1: Skill Hierarchy**
```
canon-governance (base)
  ├── api-design-governance (specialized)
  ├── component-library-governance (specialized)
  └── testing-governance (specialized)
```

**Pattern 2: Skill Collaboration**
```
canon-governance (workflow)
  + code-quality (standards)
  + architecture-governance (decisions)
  = Comprehensive development governance
```

**Pattern 3: Skill Chaining**
```
User request
  → canon-governance (check canon)
  → code-generator (generate code)
  → code-reviewer (validate code)
  → canon-updater (update canon if needed)
```

---

## Advanced Skill Expansions

### 1. Code Analysis Skills

**Potential Skills:**

#### `code-pattern-detection`
- **Purpose:** Automatically detect patterns in codebase
- **Output:** List of potential canon candidates
- **Use:** Proactive canon discovery

#### `canon-gap-analysis`
- **Purpose:** Identify undocumented patterns
- **Output:** Gaps between code and canon
- **Use:** Find what needs documentation

#### `refactoring-governance`
- **Purpose:** Safe refactoring patterns
- **Output:** Refactoring checklist based on canon
- **Use:** Ensure refactoring doesn't break canon

**Benefits:**
- Automated canon discovery
- Proactive gap identification
- Safer refactoring

---

### 2. Validation Skills

**Potential Skills:**

#### `canon-accuracy-validator`
- **Purpose:** Verify canon matches code
- **Process:**
  1. Read canon document
  2. Analyze referenced code
  3. Compare canon to code
  4. Report mismatches
- **Output:** Validation report
- **Use:** Regular canon hygiene

#### `conflict-detector`
- **Purpose:** Find canon conflicts
- **Process:**
  1. Scan all canon documents
  2. Detect contradictions
  3. Flag conflicts
- **Output:** Conflict report
- **Use:** Prevent conflicting patterns

#### `completeness-checker`
- **Purpose:** Ensure all areas documented
- **Process:**
  1. Analyze codebase structure
  2. Check for corresponding canon
  3. Identify undocumented areas
- **Output:** Completeness report
- **Use:** Ensure comprehensive documentation

**Benefits:**
- Automated validation
- Early conflict detection
- Completeness assurance

---

### 3. Generation Skills

**Potential Skills:**

#### `canon-generator`
- **Purpose:** Generate canon from code analysis
- **Process:**
  1. Analyze code using scrub template
  2. Generate 999-* reference doc
  3. Propose canonical document
  4. Wait for approval
- **Output:** Draft canon document
- **Use:** Faster canon creation

#### `index-updater`
- **Purpose:** Auto-update index when canon changes
- **Process:**
  1. Detect new/modified canon docs
  2. Parse document metadata
  3. Update 00-01-INDEX.md
- **Output:** Updated index
- **Use:** Keep index in sync

#### `reference-promoter`
- **Purpose:** Promote 999-* to canon (with approval)
- **Process:**
  1. Identify mature reference docs
  2. Convert to canonical format
  3. Request approval
  4. Update index
- **Output:** New canon document
- **Use:** Streamline canon creation

**Benefits:**
- Reduced manual work
- Consistent formatting
- Faster canon creation

---

### 4. Integration Skills

**Potential Skills:**

#### `git-canon-sync`
- **Purpose:** Sync canon with git commits
- **Process:**
  1. Detect canon changes in commit
  2. Verify canon still matches code
  3. Flag if canon outdated
- **Output:** Sync status
- **Use:** Keep canon aligned with code

#### `ci-canon-check`
- **Purpose:** Validate canon in CI/CD
- **Process:**
  1. Run on every PR
  2. Validate canon accuracy
  3. Check for conflicts
  4. Fail if canon broken
- **Output:** CI status
- **Use:** Automated validation

#### `docs-site-generator`
- **Purpose:** Generate docs site from canon
- **Process:**
  1. Read all canon documents
  2. Generate navigation
  3. Create HTML/docs site
  4. Deploy
- **Output:** Documentation website
- **Use:** Living documentation

**Benefits:**
- Canon stays in sync
- Automated validation
- Living documentation

---

## Quick Start

### For New Projects

1. **Copy Foundation Files**
   ```bash
   # Copy from this project
   docs/00-README.md
   docs/00-01-INDEX.md
   docs/01-00-scrub-prompt-template.md
   docs/01-01-scrub-add-cannon-template.md
   ```

2. **Create Project Rule**
   ```bash
   # Create .cursor/rules/canon-governance.mdc
   # (See 00-02-canon-setup-respawn.md for content)
   ```

3. **Verify Global Skill**
   ```bash
   # Check ~/.cursor/skills/canon-governance/ exists
   # If not, copy from this project or recreate
   ```

4. **Start Documenting**
   - Use scrub template to analyze code
   - Create 999-* reference docs
   - Promote to canon with approval
   - Update index

---

### For Existing Projects

1. **Audit Existing Documentation**
   - Find all .md files
   - Classify: Canon vs. Reference
   - Move references to `docs/Chuck docs/999-*.md`
   - Create canon from important docs

2. **Set Up Governance**
   - Create `docs/00-README.md`
   - Create `docs/00-01-INDEX.md`
   - Create project rule

3. **Populate Canon**
   - Use scrub template for each major area
   - Create canon documents
   - Update index

---

## Key Takeaways

1. **Skills > Rules** - Skills provide workflows, not just guidelines
2. **Progressive Disclosure** - Load details only when needed
3. **Separation of Concerns** - Process (skill) vs. Content (canon) vs. Trigger (rule)
4. **Right the First Time** - Canon prevents mistakes through consistency
5. **Avoid Bloat** - Only documented patterns allowed, canon hygiene required
6. **Expandable** - Skills can be specialized, composed, and automated

---

## Next Steps

1. **Use the System** - Start using canon governance in real tasks
2. **Iterate** - Refine based on experience
3. **Expand** - Add specialized skills as needed
4. **Automate** - Build tools to make canon maintenance easier
5. **Share** - Use across multiple projects to validate approach

---

**For detailed setup instructions, see:** `00-02-canon-setup-respawn.md`  
**For governance rules, see:** `00-README.md`  
**For document catalog, see:** `00-01-INDEX.md`

---

**END OF README**
