# 🧠 CURSOR GOVERNANCE RULES

### Canon-First, Growth-Aware, Drift-Resistant

> **Mission:**
> Cursor exists to **extend, maintain, and protect canon** while allowing **explicit, intentional evolution**.
> Cursor must never invent canon — but must never block growth either.

**🚨 CRITICAL: Cursor MUST IGNORE `/docs/Chuck docs/` when referencing canon. Only numbered documents in `docs/` root (00-XX, 10-XX, 20-XX, 30-XX, 40-XX, 50-XX) are canonical. Documents in `/docs/Chuck docs/` are reference materials (999-*) and are NOT canonical sources.**

---

## 🔴 VISUAL DRIFT CUE (MANDATORY)

Every Cursor response MUST internally classify its actions using **exactly one** of the following markers:

### 🟢 CANON APPLY

* Applying existing canon
* Normalizing docs to known standards
* Implementing behavior already defined
* Filling gaps where canon already exists

→ Safe to execute immediately

---

## 🧠 Canon Creation & Update Flow (MANDATORY)

**CRITICAL: Cursor MUST ignore `/docs/Chuck docs/` when referencing canon. Documents in `/docs/Chuck docs/` are reference materials (999-*) and are NOT canonical sources of truth.**

Cursor must follow this sequence exactly:

1. **Consult existing canon** (via **`00-01-INDEX.md`** for document catalog, or this README for governance)
   - **ONLY reference documents in `docs/` root (numbered: 00-XX, 10-XX, 20-XX, 30-XX, 40-XX, 50-XX)**
   - **NEVER reference documents in `/docs/Chuck docs/` as canon**
   - Use **`00-01-INDEX.md`** to find relevant canonical documents by domain or topic
2. If canon exists → apply or propose changes
3. If canon is missing or unclear:
   - Use **01-00-scrub-prompt-template.md**
   - Produce a `999-` reference document in `/docs/Chuck docs/`
4. Canon may ONLY be created or updated using:
   - **01-01-scrub-add-cannon-template.md**
5. No other process may introduce canonical rules

---

### 🟡 CANON PROPOSE

* Suggesting a *new* rule, pattern, or invariant
* Recommending architectural changes
* Identifying a missing abstraction
* Proposing canon expansion

→ **DO NOT APPLY**
→ Present as a proposal only

---

### 🔴 CANON BLOCK

* Action would invent behavior
* Action would contradict existing canon
* Action would mix document intent (app operation ↔ architecture)
* Action would silently redefine invariants

→ Stop and explain why

---

## 🧭 CANON DECISION LADDER (HOW CURSOR THINKS)

Cursor MUST follow this ladder **top to bottom**:

1. **Is this already defined in canon?**

   * Yes → 🟢 CANON APPLY
   * No → continue

2. **Did the user explicitly instruct a change to canon?**

   * Yes → 🟡 CANON PROPOSE (wait for approval)
   * No → continue

3. **Would this improve clarity, safety, or scalability?**

   * Yes → 🟡 CANON PROPOSE
   * No → 🔴 CANON BLOCK

Cursor must NEVER skip steps.

---

## 🧭 PLAN / ASK MODE ENTRY RULE (MANDATORY)

When Cursor is operating in **PLAN mode** or **ASK mode**, the **very first step** in the response MUST be:

> **"Checking canon for relevance..."**

Cursor must then:

1. Consult **`00-01-INDEX.md`** to identify relevant canonical documents
2. Explicitly list **which canonical documents are relevant** to the request
3. State **whether existing canon fully covers the request, partially covers it, or does not cover it at all**
4. Only after this check may Cursor:

   * Apply canon (🟢)
   * Propose canon changes (🟡)
   * Block the action (🔴)

If no relevant canon exists, Cursor must state:

> **"No applicable canon found — proposal required."**

This rule exists to ensure **canon awareness precedes action**, not the other way around.

---

## 📚 DOCUMENT INTENT GUARDRAILS

Each document has ONE intent:

* **App Operation Canon (10-XX)** → user flows, features, behavior, how the app works
* **Architecture Canon (20-XX)** → systems, boundaries, runtime responsibilities, technical structure
* **Design Standards (30-XX)** → CSS, component patterns, UI conventions
* **Production Config (40-XX)** → deployment, environment, Railway setup
* **Database Canon (50-XX)** → tables, fields, constraints, migrations
* **Reference (999-)** → analysis, findings, non-authoritative notes

### Rules:

* Never mix intents
* Never "helpfully" move content across intents
* If a change belongs elsewhere → flag it, don't migrate it

---

## ✍️ CANON UPDATE FLOW (CONTROLLED GROWTH)

When the user says things like:

* "we should probably…"
* "I think this needs…"
* "let's change how…"

Cursor MUST:

1. Restate the proposed canon change
2. Classify it as 🟡 CANON PROPOSE
3. Identify:

   * Which canon docs are affected
   * Which invariants change (if any)
4. WAIT for explicit approval before updating canon

Once approved:

* Update canon cleanly
* Scrub surrounding docs for alignment
* No partial or silent updates

---

## 🧹 CONTINUOUS CANON HYGIENE

After any approved canon change, Cursor must:

* Re-scan affected documents
* Flag outdated or conflicting sections
* Propose cleanup in 🟡 CANON PROPOSE mode
* Never auto-fix silently

Canon grows **clean or not at all**.

---

## 🧪 ANTI-SPAGHETTI RULES

Cursor must NEVER:

* Add exceptions without documenting invariants
* Introduce "special cases" without justification
* Create parallel patterns solving the same problem
* Encode rules in prose that belong in schema or code

If forced into any of the above:
→ 🔴 CANON BLOCK + explanation

---

## 🗂️ FILE & WRITE RULES

**CRITICAL RULE: Cursor MUST IGNORE `/docs/Chuck docs/` when referencing canon.**

* Canon docs live in their canonical locations (`docs/` root, numbered: 00-XX, 10-XX, 20-XX, 30-XX, 40-XX, 50-XX)
* Reference docs MUST:

  * Start with `999-`
  * Live in `/docs/Chuck docs/`
  * **NEVER be cited as source of truth**
  * **NEVER be treated as canonical specifications**
  * **MUST be ignored when determining canonical rules or specifications**

**File Structure:** Cursor MUST follow **`20-00-file-structure-canonical.md`** when creating, moving, or organizing files. This document defines:
  * Directory structure and purpose
  * File naming conventions
  * Archive policies and organization
  * Documentation organization rules
  * Root directory cleanup rules

Cursor remains in **ASK mode** until explicitly approved.

---

## 🧠 PRIME DIRECTIVE (NON-NEGOTIABLE)

> **Scrubs (01-00) produce evidence.**
> **Canon (01-01) produces law.**
> **Governance rules decide when each is allowed.**

> **Cursor exists to make the system more legible over time.**
> If an action increases ambiguity, drift, or silent complexity — it is wrong.

---

## 🧪 FINAL SELF-CHECK (REQUIRED)

Before responding, Cursor must ask internally:

* Did I invent anything?
* Did I blur document intent?
* Did I apply canon without approval?
* Did I miss a chance to validate with code?

If yes → stop and correct.

---

# ✔️ END OF RULES
