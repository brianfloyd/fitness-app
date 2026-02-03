# ✅ CURSOR: Canon-Constrained Update Prompt

You are updating documentation based on user-requested changes.

Your responsibility is to **apply updates ONLY within the bounds of the existing canonical standards already defined** in this repository.

You MUST NOT:
- Invent new canonical rules
- Introduce new architectural standards
- Reframe subsystems beyond what existing canon already establishes
- Blend app operation canon into architecture docs (or vice versa)

You MAY:
- Apply existing canonical standards consistently where missing
- Normalize documents to match established canon patterns
- Update facts ONLY where explicitly instructed by the user or validated by code

If a requested update would require **new canon**, respond with:

> **"Change requires new canonical decision — not applied."**

---

## 🧭 DOCUMENT INTENT AWARENESS (MANDATORY)

Before making any updates, you MUST classify each document as one of the following:

- **App Operation Canon (10-XX)**
  - User flows
  - Features
  - App behavior
  - How the app works
- **Architecture Canon (20-XX)**
  - System boundaries
  - Services
  - Data flow
  - Runtime responsibilities
- **Design Standards (30-XX)**
  - CSS variables
  - Component patterns
  - UI conventions
- **Production Config (40-XX)**
  - Deployment
  - Environment variables
  - Railway setup
- **Schema / Data Canon (50-XX)**
  - Tables
  - Fields
  - Constraints
  - Migrations
- **Reference / Supporting Spec**
  - Non-authoritative
  - Explanatory
  - Transitional

Each document must ONLY receive updates appropriate to its category.

If a requested change crosses document intent boundaries, you must:
- Apply the change ONLY in the correct document type
- Explicitly state where the change does NOT belong

---

## 🔒 CANONICAL CONSTRAINTS YOU MUST FOLLOW

All updates must conform to **existing canonical patterns**, including but not limited to:

- Established section ordering
- Existing terminology
- Known subsystem boundaries
- Current invariants already documented
- Previously defined serialization or data flow models

If multiple canonical documents conflict:
- Do NOT resolve the conflict
- Do NOT reconcile or merge interpretations
- Explicitly flag the conflict and stop

---

## 🔍 UPDATE VALIDATION RULES

All factual updates must be:
- Backed by explicit code references **or**
- Explicitly directed by the user

If a fact cannot be proven from code or instruction, write:

> **"Not found in codebase."**

When citing code, always include:
- File path
- Line numbers
- Function, class, or SQL migration

---

## 🛠️ UPDATE PROCESS YOU MUST FOLLOW

### Step 1 — Identify Applicable Canon
- Which canonical documents govern this change?
- Which canon standards already exist that apply?

### Step 2 — Verify Scope of Change
- Is this a clarification, correction, or normalization?
- Does this introduce new behavior or rules? (If yes → STOP)

### Step 3 — Apply Canon-Consistent Updates
- Update language to match existing canon tone and structure
- Fill gaps ONLY where canon already implies structure
- Do NOT extend behavior, rules, or scope

### Step 4 — Validate Against Code (if applicable)
- Confirm alignment with actual implementation
- Flag mismatches instead of correcting them silently

---

## 🧩 OUTPUT RULES (MANDATORY)

- Updates must be **precise and minimal**
- Do NOT rewrite entire documents unless instructed
- Do NOT editorialize
- Do NOT summarize unless requested

If a section cannot be safely updated within canon constraints, state why and leave it unchanged.

---

## 📄 FILE OUTPUT REQUIREMENT

When finished:
- Write the updated content to the appropriate canonical document in `docs/` root
- File name must follow numbering convention (10-XX, 20-XX, 30-XX, 40-XX, 50-XX)
- Update `00-01-INDEX.md` to include the new document
- These files ARE canonical sources of truth

Cursor remains in **ASK mode**.
The user will explicitly approve before any file write.

---

## 🧪 COMPLIANCE CHECK (REQUIRED BEFORE RESPONSE)

Before responding, verify:
- Did I introduce any new canon? → If yes, remove it.
- Did I cross document intent boundaries? → If yes, correct it.
- Can every factual claim be traced to code or instruction? → If no, mark it.

---

# ✔️ END OF PROMPT
