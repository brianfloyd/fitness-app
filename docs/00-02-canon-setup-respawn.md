# 00-02 — **Canon Setup Respawn Guide**

> **Purpose:** This document provides instructions for respawning the canon governance system in new projects and updating/iterating the system as it evolves.
>
> **Use When:** Setting up canon governance in a new project, updating the canon system, or understanding how to replicate this setup.

---

## 1. Overview

This document explains how to replicate the canon governance system established in this project. The system consists of:

1. **Local Project Canon** - `docs/` directory with numbered canonical documents
2. **Global Cursor Skill** - `~/.cursor/skills/canon-governance/` for reusable workflow
3. **Project Rule** - `.cursor/rules/canon-governance.mdc` for local enforcement

---

## 2. How the System Works

### **2.1 The Three-Layer Architecture**

```
┌─────────────────────────────────────────┐
│  Global Skill (canon-governance)       │
│  ~/.cursor/skills/canon-governance/    │
│  - Reusable across all projects        │
│  - Workflow and decision logic         │
└─────────────────────────────────────────┘
              ↓ references
┌─────────────────────────────────────────┐
│  Project Rule (canon-governance.mdc)   │
│  .cursor/rules/canon-governance.mdc    │
│  - Always-apply trigger                │
│  - Points to skill and local canon     │
└─────────────────────────────────────────┘
              ↓ enforces
┌─────────────────────────────────────────┐
│  Local Canon (docs/)                    │
│  docs/00-README.md                     │
│  docs/00-01-INDEX.md                   │
│  docs/10-XX, 20-XX, 30-XX, etc.        │
│  - Project-specific documentation      │
│  - Single source of truth              │
└─────────────────────────────────────────┘
```

**Why This Architecture:**
- **Global Skill** = Reusable knowledge (workflow, patterns, templates)
- **Project Rule** = Lightweight trigger (always-apply, points to skill)
- **Local Canon** = Project-specific truth (what this project actually does)

---

### **2.2 Cursor Skills: The Key Innovation**

**What Makes Skills Powerful:**

1. **Progressive Disclosure**
   - Skill description triggers when relevant
   - References loaded only when needed
   - Avoids context bloat

2. **Structured Workflow**
   - Not just guidelines, but executable processes
   - Decision ladder built into skill
   - Status reporting standardized

3. **Reusability**
   - One skill works across all projects
   - Global installation = consistent behavior
   - Updates propagate automatically

4. **Separation of Concerns**
   - Skill = How to work with canon (process)
   - Rule = When to apply (trigger)
   - Canon = What is true (content)

---

### **2.3 The Decision Flow**

**Every Cursor Interaction:**

1. **Rule Triggers** (always-apply)
   - Points to global skill
   - References local `docs/00-README.md`

2. **Skill Activates**
   - Checks if canon exists (`docs/00-01-INDEX.md`)
   - Applies decision ladder
   - Reports status

3. **Action Taken**
   - 🟢 CANON APPLY - Execute (canon exists)
   - 🟡 CANON PROPOSE - Wait for approval (new pattern)
   - 🔴 CANON BLOCK - Stop and explain (conflicts)

**Result:** Cursor never invents behavior without explicit consent

**Status Reporting Format:**
Every response must end with a status report that includes the visual indicator:
- 🟢 CANON STATUS: APPLIED (all changes align with canon)
- 🟡 CANON STATUS: PROPOSE or PARTIAL (needs approval or has gaps)
- 🔴 CANON STATUS: BLOCK (action blocked, cannot proceed)

**Example:**
```markdown
---
🟢 CANON STATUS: APPLIED

Applied:
- 20-01-system-architecture.md - Followed documented patterns
---
```

---

## 3. Setup Process for New Projects

### **3.1 Create Documentation Structure**

**Steps:**
1. Create `docs/` directory in project root
2. Create `docs/Chuck docs/` for reference materials
3. Create initial governance files:
   - `docs/00-README.md` - Governance rules
   - `docs/00-01-INDEX.md` - Document catalog

**Source:** Copy from this project's `docs/` directory and adapt

---

### **3.2 Create Template Files**

**Files to Create:**
- `docs/01-00-scrub-prompt-template.md` - Analysis template
- `docs/01-01-scrub-add-cannon-template.md` - Canon creation template

**Source:** Copy from this project's `docs/` directory

---

### **3.3 Install Global Skill**

**Location:** `~/.cursor/skills/canon-governance/`

**If Skill Exists:**
- Skill is already global, no action needed
- Works across all projects

**If Skill Doesn't Exist:**
- Copy from `C:\Users\SfdcB\.cursor\skills\canon-governance/`
- Or recreate from this project's structure

**Structure:**
```
canon-governance/
├── SKILL.md
└── references/
    ├── decision-ladder.md
    ├── document-templates.md
    └── status-reporting.md
```

**Important:** The `status-reporting.md` reference file must include visual indicators (🟢 🟡 🔴) in all status report formats. This is a requirement for clear visual feedback.

---

### **3.4 Create Project Rule**

**File:** `.cursor/rules/canon-governance.mdc`

**Content:**
```yaml
---
description: >
  Enforces canon governance for this project. Cursor must check docs/00-README.md
  for governance rules and docs/00-01-INDEX.md for document catalog before any action.
  Uses CANON APPLY, CANON PROPOSE, CANON BLOCK status markers with visual indicators.
alwaysApply: true
---
```

**Location:** Project root `.cursor/rules/` directory

**Note:** The rule should reference the visual indicator requirement (🟢 🟡 🔴) in the status markers section. See this project's `.cursor/rules/canon-governance.mdc` for the complete format.

---

## 4. Canon Series Structure

### **4.1 Series Numbering**

**Pattern:** `XX-XX-name.md`

**Series:**
- **00-XX** - Index and governance
- **01-XX** - Templates and processes
- **10-XX** - App operation (user flows, features)
- **20-XX** - System architecture (technical structure)
- **30-XX** - Design standards (CSS, components, UI)
- **40-XX** - Production configuration (deployment)
- **50-XX** - Database (schema, migrations)

**Adapt to Project:**
- Adjust series to match project needs
- Add new series as needed (60-XX, 70-XX, etc.)
- Maintain numbering consistency

---

### **4.2 Document Creation Process**

**Step 1: Analyze Codebase**
- Use `01-00-scrub-prompt-template.md`
- Create `999-*` reference document in `docs/Chuck docs/`
- Document findings from code analysis

**Step 2: Create Canon**
- Use `01-01-scrub-add-cannon-template.md`
- Promote findings to canonical document
- Number according to series
- Update `00-01-INDEX.md`

---

## 5. Cursor Skills Deep Dive

### **5.1 Why Skills Over Rules Alone**

**Problem with Rules:**
- Rules are static guidelines
- No structured workflow
- Hard to maintain consistency
- Context bloat (all rules always loaded)

**Solution with Skills:**
- Skills provide executable workflows
- Progressive disclosure (load when needed)
- Structured decision processes
- Reusable across projects

---

### **5.2 Skill Triggering Mechanism**

**How Skills Are Triggered:**

1. **Description Matching**
   - Skill description includes keywords
   - Cursor matches user query to description
   - Skill activates when relevant

2. **Rule Reference**
   - Project rule explicitly references skill
   - Always-apply rule ensures skill is considered
   - Skill provides detailed workflow

3. **Progressive Loading**
   - SKILL.md loaded first (overview)
   - References loaded when needed (details)
   - Avoids unnecessary context

---

### **5.3 Skill Structure Best Practices**

**SKILL.md Should:**
- Have clear, keyword-rich description
- Explain when to use the skill
- Provide workflow overview
- Reference detailed guides

**References Should:**
- Contain detailed procedures
- Include examples
- Provide templates
- Be modular (load only what's needed)

---

## 6. Expanding and Augmenting Skills

### **6.1 Adding New Reference Files**

**Pattern:**
- Add new `.md` files to `references/` directory
- Reference from SKILL.md when relevant
- Keep files focused and modular

**Examples:**
- `references/code-analysis-patterns.md` - How to analyze code
- `references/canon-validation.md` - How to validate canon accuracy
- `references/conflict-resolution.md` - How to resolve canon conflicts

---

### **6.2 Creating Specialized Skills**

**Pattern:** Create domain-specific skills that reference canon-governance

**Example Skills:**
- `api-design-governance` - API design patterns
- `component-library-governance` - Component standards
- `testing-governance` - Testing patterns

**Structure:**
```
specialized-skill/
├── SKILL.md (references canon-governance)
└── references/
    └── [domain-specific patterns]
```

---

### **6.3 Skill Composition**

**Pattern:** Skills can reference other skills

**Example:**
- `canon-governance` - Core canon workflow
- `code-quality` - Code review patterns
- `architecture-governance` - Architecture decisions

**Composition:**
- Skills work together
- Each handles its domain
- Canon-governance coordinates

---

## 7. Making Development More Efficient

### **7.1 Right the First Time**

**How Canon Prevents Mistakes:**

1. **Pattern Consistency**
   - Canon documents established patterns
   - Cursor follows patterns automatically
   - Reduces ad-hoc decisions

2. **Early Validation**
   - Canon checked before action
   - Conflicts detected early
   - Prevents incompatible changes

3. **Explicit Consent**
   - New patterns require approval
   - No silent invention
   - Intentional evolution only

---

### **7.2 Avoiding Project Bloat**

**How Canon Prevents Bloat:**

1. **Documented Patterns Only**
   - No undocumented features
   - No "helpful" additions without approval
   - Everything must be justified

2. **Canon Hygiene**
   - Regular reviews
   - Outdated patterns removed
   - Conflicts resolved
   - Canon stays aligned with code

3. **Reference vs Canon Separation**
   - Analysis goes to Chuck docs/ (999-*)
   - Only proven patterns become canon
   - Prevents premature documentation

---

### **7.3 Skill-Driven Efficiency**

**How Skills Improve Efficiency:**

1. **Automated Workflows**
   - Decision ladder automated
   - Status reporting standardized
   - Reduces manual checking

2. **Context Management**
   - Progressive disclosure
   - Load only what's needed
   - Faster responses

3. **Consistency Across Projects**
   - Same workflow everywhere
   - Predictable behavior
   - Less learning curve

---

## 8. Future Skill Expansions

### **8.1 Code Analysis Skills**

**Potential Skills:**
- `code-pattern-detection` - Detect patterns in codebase
- `canon-gap-analysis` - Identify undocumented patterns
- `refactoring-governance` - Safe refactoring patterns

**Benefits:**
- Automated canon discovery
- Proactive gap identification
- Safer refactoring

---

### **8.2 Validation Skills**

**Potential Skills:**
- `canon-accuracy-validator` - Verify canon matches code
- `conflict-detector` - Find canon conflicts
- `completeness-checker` - Ensure all areas documented

**Benefits:**
- Automated validation
- Early conflict detection
- Completeness assurance

---

### **8.3 Generation Skills**

**Potential Skills:**
- `canon-generator` - Generate canon from code analysis
- `index-updater` - Auto-update index when canon changes
- `reference-promoter` - Promote 999-* to canon (with approval)

**Benefits:**
- Reduced manual work
- Consistent formatting
- Faster canon creation

---

### **8.4 Integration Skills**

**Potential Skills:**
- `git-canon-sync` - Sync canon with git commits
- `ci-canon-check` - Validate canon in CI/CD
- `docs-site-generator` - Generate docs site from canon

**Benefits:**
- Canon stays in sync
- Automated validation
- Living documentation

---

## 9. Best Practices for Skill Development

### **9.1 Skill Design Principles**

1. **Single Responsibility**
   - Each skill handles one domain
   - Clear boundaries
   - Composable with other skills

2. **Progressive Disclosure**
   - Overview in SKILL.md
   - Details in references/
   - Load only what's needed

3. **Reusability**
   - Global skills work across projects
   - Project-specific = local rules
   - Balance global vs local

---

### **9.2 Skill Maintenance**

**Regular Updates:**
- Refine based on usage
- Add examples from real use
- Update patterns as they evolve
- Document lessons learned

**Versioning:**
- Track skill versions
- Maintain backward compatibility
- Document breaking changes

---

### **9.3 Skill Testing**

**Test Approaches:**
- Use in real projects
- Measure effectiveness
- Gather feedback
- Iterate based on results

**Metrics:**
- Canon compliance rate
- Conflict detection rate
- Time to create canon
- Developer satisfaction

---

## 10. Troubleshooting

### **10.1 Skill Not Triggering**

**Check:**
- Skill exists in `~/.cursor/skills/canon-governance/`
- SKILL.md has proper description with keywords
- Project rule exists and is `alwaysApply: true`
- Cursor has loaded skills (restart if needed)

**Fix:**
- Verify skill structure
- Check description keywords
- Ensure rule references skill
- Restart Cursor

---

### **10.2 Canon Not Being Applied**

**Check:**
- `docs/00-README.md` exists
- `docs/00-01-INDEX.md` exists
- Canon documents are numbered correctly
- Documents are in `docs/` root (not Chuck docs/)

**Fix:**
- Verify document structure
- Check index catalog
- Ensure proper numbering
- Verify file locations

---

### **10.3 Status Not Reporting**

**Check:**
- Skill references include status-reporting.md
- Rule points to skill
- Skill description includes status markers
- Visual indicators (🟢 🟡 🔴) are included in status report format

**Fix:**
- Verify skill structure
- Check reference files
- Ensure status reporting is documented
- Verify visual indicators are included in status-reporting.md format examples

**Visual Indicator Requirement:**
All status reports MUST include the visual indicator at the start:
- 🟢 for APPLIED
- 🟡 for PROPOSE or PARTIAL
- 🔴 for BLOCK

This provides immediate visual feedback about canon compliance.

---

## 11. Advanced Patterns

### **11.1 Multi-Project Canon Sync**

**Pattern:** Shared canon across related projects

**Approach:**
- Common canon in shared location
- Project-specific canon locally
- Skills reference both

**Use Case:**
- Monorepo with multiple apps
- Shared component library
- Common architecture patterns

---

### **11.2 Canon Versioning**

**Pattern:** Track canon versions

**Approach:**
- Version numbers in documents
- Changelog for major changes
- Migration guide for breaking changes

**Benefits:**
- Track evolution
- Understand changes
- Maintain compatibility

---

### **11.3 Canon Automation**

**Pattern:** Automated canon maintenance

**Tools:**
- Scripts to validate canon
- Auto-update index
- Detect outdated canon
- Generate canon from code

**Future:**
- AI-assisted canon generation
- Automated conflict detection
- Proactive gap identification

---

## 12. References

- **Governance Rules:** `00-README.md`
- **Document Index:** `00-01-INDEX.md`
- **Scrub Template:** `01-00-scrub-prompt-template.md`
- **Canon Template:** `01-01-scrub-add-cannon-template.md`
- **Global Skill:** `~/.cursor/skills/canon-governance/SKILL.md`
- **Skill References:** `~/.cursor/skills/canon-governance/references/`

---

## 13. Maintenance

This document should be updated when:
- Setup process changes
- New series are added
- Governance rules evolve significantly
- Skill structure changes
- Best practices are refined
- New skill expansion patterns are discovered

---

## 14. Version History

**Initial Version:** Created with canon governance system setup
**Purpose:** Enable replication and iteration of the canon system
**Focus:** Cursor skills as the key innovation for scalable canon governance

---

**END OF CANONICAL SPECIFICATION**
