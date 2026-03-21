# ZoCW Model Selection Guide
**Claude Cowork + GitHub Workflow | Zo Health Clinicians Workbench**
**Version:** 1.2.0
**Author:** CDP + Claude
**Last Updated:** 2026-03-20
**Status:** MANDATORY — Read at session start alongside HANDOFF.md

---

## Overview

This guide defines which Claude model to use for each task category when working on ZoCW via Claude Cowork. It is calibrated for ZoCW's current architecture: a multi-artifact governance suite, two-project Firebase/GCP backend (app + image pipeline), hybrid Claude-architect workflow, and a versioned screen and component registry.

**Every Cowork session must follow this guide.** For multi-step tasks, produce a Model-Routed Task Plan before executing.

---

## Mental Model

| Model | Role | When to Use |
|---|---|---|
| **Haiku 4.5** | Fast Clerk | Speed over perfection. Triage, extraction, bulk transforms. |
| **Sonnet 4.6** | Senior Operator | Most actual work. Execution, implementation, iteration. |
| **Opus 4.x** | Principal Strategist | Judgment calls. Architecture, synthesis, final QA on high-stakes output. |

**Default rule:** Start on Sonnet. Escalate to Opus only when the task is more judgment than execution.

**Target mix:**

| Model | Target % of Hours | Primary Use |
|---|---|---|
| Sonnet 4.6 | 70–80% | Day-to-day build, iteration, implementation |
| Opus 4.x | 15–25% | Architecture, final QA, complex debugging |
| Haiku 4.5 | 5–10% | Triage, extraction, bulk tasks |

---

## Decision Matrix by Task Type

### 1. UI / Screen Changes

| Sub-task | Model | Rationale |
|---|---|---|
| Implementing a screen from the Screen Registry spec | Sonnet | Clear spec, bounded execution scope |
| Refactoring an existing component | Sonnet | Local change, validatable output |
| Resolving a layout or styling bug | Sonnet | Execution task |
| Designing a new screen not yet in the Registry | Opus | Requires UX judgment and artifact alignment |
| Reviewing a screen for cross-registry consistency | Opus | Cross-artifact coordination risk — Sonnet may miss drift |
| Bulk extraction of component props or labels | Haiku | Speed and volume task |

---

### 2. Firebase / Firestore Work

| Sub-task | Model | Rationale |
|---|---|---|
| Writing or editing Firestore rules | Sonnet | Rule logic is bounded and testable |
| Implementing a collection or document schema | Sonnet | Execution against a defined spec |
| Debugging a known Firestore error | Sonnet → Opus | Start Sonnet; escalate if root cause elusive after 2 passes |
| Architecture decision on data model (e.g. subcollections vs flat) | Opus | Downstream implications across schema, rules, and queries |
| Reviewing seed scripts or migration logic before execution | Opus | High-stakes, hard to reverse |
| Summarizing query output or log extraction | Haiku | Lightweight, speed-priority |

---

### 3. Image Pipeline & Cross-Project Work

**Context:** ZoCW uses two GCP projects — `cw-e7c19` (app) and `podium-capsule-ingest` (pipeline). Cross-project operations are a distinct risk category.

| Sub-task | Model | Rationale |
|---|---|---|
| Implementing `getCapsuleFrames` proxy callable from BUILD_09 spec | Sonnet | Clear spec, bounded execution |
| Implementing `useCapsuleFrames` hook | Sonnet | Bounded hook following existing patterns |
| Wiring Viewer.tsx to real frame data + AI findings | Sonnet → Opus | Cross-layer (UI + data + pipeline); escalate if integration issues arise |
| Pipeline field rename (`procedure_id` → `capsule_serial`) | Sonnet | Bounded implementation, clear target |
| Cross-project IAM / service account setup | Opus | Infrastructure decision, hard to reverse, security implications |
| CORS configuration on pipeline bucket | Sonnet | Execution from documented spec |
| Debugging cross-project auth failures | Opus | Multi-project, multi-layer — needs global reasoning |
| Architecture decisions about data flow between projects | Opus | Downstream implications, binding decisions |

---

### 4. Copilot / AI Integration

**Context:** ZoCW integrates Gemini 2.5 Flash for both the image pipeline (server-side) and the Copilot Auto-Draft feature (client-side via `gemini.ts`).

| Sub-task | Model | Rationale |
|---|---|---|
| Wiring an API call to Gemini from a React component | Sonnet | Execution against known SDK patterns |
| Debugging API quota / billing issues | Sonnet | Diagnostic, bounded |
| Designing AI prompt templates for clinical output | Opus | Medical domain judgment, output quality evaluation |
| Evaluating AI output quality (hallucination, clinical accuracy) | Opus | Requires domain reasoning, not execution |
| Adding error handling / fallback for AI failures | Sonnet | Bounded implementation |

---

### 5. Architecture & Artifact Decisions

| Sub-task | Model | Rationale |
|---|---|---|
| Updating BRD_Golden_Master or Architecture_Capability_Map | Opus | High governance weight; cross-artifact ripple risk |
| Maintaining or extending the Screen Registry | Sonnet (with Opus review) | Execution is Sonnet; final consistency check warrants Opus |
| Keeping the Demo artifact in sync with build state | Sonnet | Execution and formatting task |
| Evaluating two competing design paths with downstream implications | Opus | Tradeoff judgment, not execution |
| Diagnosing artifact drift across the governance suite | Opus | Requires global coherence judgment, not just local review |

---

### 6. Bug Hunting

| Sub-task | Model | Rationale |
|---|---|---|
| Reproducing a bug hypothesis | Sonnet | Execution and code tracing |
| Writing a targeted fix for a known bug | Sonnet | Bounded implementation |
| Root cause analysis when Sonnet loops or gives shallow answer | Opus | Escalation trigger: two Sonnet passes without convergence |
| Debugging a cross-layer issue (auth + Firestore + UI state) | Opus | Many interacting constraints; needs global reasoning |
| Scanning logs or error output for patterns | Haiku | Extraction task, speed priority |

---

### 7. Spec & Doc Drafting

| Sub-task | Model | Rationale |
|---|---|---|
| Drafting a feature spec or BRD section from known requirements | Sonnet | Well-scoped writing task |
| Iterating on an existing spec | Sonnet | Edit and refinement work |
| Writing a ZoCW changelog entry | Sonnet | Structured, templated output |
| Producing a near-final spec for stakeholder review | Opus | Final QA on high-stakes output |
| Decomposing a vague requirement into implementable sub-tasks | Opus | Ambiguous input; judgment required |
| Extracting action items or task lists from a long doc | Haiku | Bulk extraction, speed priority |

---

### 8. Seed Data & Demo Enrichment

| Sub-task | Model | Rationale |
|---|---|---|
| Adding new patients/procedures to seed scripts | Sonnet | Templated data, bounded |
| Creating realistic clinical finding templates | Sonnet → Opus | Start Sonnet; escalate if medical accuracy matters |
| Enriching report content with varied clinical language | Sonnet | Writing task with known patterns |
| Reviewing seed data for clinical plausibility before demo | Opus | Domain judgment, pre-stakeholder |

---

### 9. GitHub & Git Operations

| Sub-task | Model | Rationale |
|---|---|---|
| Drafting a commit message | Sonnet | Short, structured, bounded |
| Writing a PR description | Sonnet | Execution, templatable |
| Reviewing a PR for logic correctness | Sonnet | Standard code review |
| Reviewing a PR that touches multiple layers (UX, state, auth, data) | Opus | Cross-cutting change; second-order risk |
| Final review before merging a milestone release | Opus | High stakes, irreversible action |
| Summarizing a diff or commit history | Haiku | Lightweight extraction |

---

### 10. Cross-Artifact Sync Checks

| Sub-task | Model | Rationale |
|---|---|---|
| Verifying a single artifact is internally consistent | Sonnet | Local, bounded check |
| Checking alignment between two artifacts | Sonnet → Opus | Sonnet can attempt; escalate if inconsistency is subtle |
| Full audit of all governance artifacts for drift | Opus | Requires global coherence across the entire suite |
| Rebuilding the Workflow and Navigation Master from existing artifacts | Opus | High-complexity synthesis from multiple sources |
| Producing a gap analysis across the artifact suite | Opus | Judgment-heavy, multi-constraint task |

---

### 11. Session Handoff & HANDOFF.md Updates

| Sub-task | Model | Rationale |
|---|---|---|
| Routine end-of-session HANDOFF.md update (session log, checked items) | Sonnet | Structured formatting from known context |
| Recording new architectural decisions in HANDOFF.md | Opus | Binding decisions with downstream implications |
| Writing the initialization prompt for a new session | Sonnet (with Opus review for complex state) | Formatting task, but review if build state is complex |
| Cowork-to-Cowork handoff when architectural state has changed | Opus | Context fidelity is critical across session boundary |

---

## Cowork Task Decomposition & Model Routing

When given a multi-step request, Cowork must decompose the request into discrete steps and assign the optimal model to each step before execution begins.

### Model-Routed Task Plan Format

For any request involving a plan, build phase, or multi-step task, produce this table first:

| Step | Task | Model | Confidence | Rationale |
|---|---|---|---|---|
| 1 | [description] | Haiku/Sonnet/Opus | High/Medium/Low | [one-line reason] |
| 2 | ... | ... | ... | ... |

### Rules

1. **Always decompose before executing.** Produce the plan first and confirm with the user.
2. **Flag low-confidence assignments.** Mark `Medium` or `Low` and explain.
3. **Respect step boundaries.** Don't blend a Haiku step into an Opus session unnecessarily.
4. **Identify switch points explicitly.** When a plan contains a model transition, call it out.
5. **Apply to all plan types:** feature builds, bug hunts, artifact sync audits, release prep, pipeline work, GitHub PR sequences.

### Prompt Pattern

> _"Before executing, decompose this into steps. For each step, recommend the optimal model (Haiku / Sonnet / Opus), your confidence level (High / Medium / Low), and a one-line rationale. Present as a table. Flag any model switch points. Then confirm before proceeding."_

### Context Handoff at Model Switch Points

When a plan includes a model transition, generate a context handoff summary:
- What has been completed and its current state
- What decisions were made and why
- What the next model needs to know
- Recommended opening prompt for the next model session

---

## Escalation Signals

Escalate from **Sonnet → Opus** when you observe any of the following:

1. **Locally good, globally weak** — code compiles or spec reads fine, but something feels architecturally fragile
2. **Tradeoff judgment required** — choosing between two paths with downstream implications
3. **Many interacting constraints** — change touches UX, state, auth, data, and rollout risk simultaneously
4. **Final QA on high-stakes output** — pre-stakeholder, pre-merge, or pre-release review
5. **Sonnet loops or hedges twice** — two passes without convergence is a strong escalation signal

---

## ZoCW-Specific Escalation Notes

These situations are high-risk in ZoCW and should default to Opus regardless of apparent simplicity:

- Any change that modifies the **BRD_Golden_Master** or **Architecture_Capability_Map**
- Any **Firestore schema or rules change** before production deployment
- Any task requiring **cross-artifact consistency** across the full governance suite
- **Root cause diagnosis** for Firestore bugs (e.g. zero record returns, project ID mismatch)
- **Cross-project operations** between `cw-e7c19` and `podium-capsule-ingest` (IAM, service accounts, data flow)
- **AI prompt design** for clinical output (Copilot auto-draft, CEST classification prompts)
- **Session handoffs** when architectural state has changed since the last session

---

## Operational Hazards

### OneDrive On-Demand Sync
Files in the shared OneDrive folder may appear missing if they haven't been downloaded to the local device. Before making file-existence decisions (deleting "dead" files, changing imports), run `ls -la` on the directory and verify files are actually present. See HANDOFF.md March 19 session log for a documented incident where this caused incorrect changes.

### Cowork-to-Cowork Continuity
ZoCW uses multiple Cowork sessions (home Mac, office Mac) working on the same OneDrive-synced repo. Every session must read HANDOFF.md first, and every session must update it before ending. The HANDOFF.md is the authoritative state document — not any individual session's memory.

---

## Quick-Reference Rule

> **Execution task → Sonnet**
> **Judgment task → Opus**
> **Speed/volume task → Haiku**

When in doubt, open with Sonnet and add this to your prompt:
> _"First tell me in one sentence whether this is a Haiku, Sonnet, or Opus task and why. Then proceed."_

---

*ZoCW Model Selection Guide v1.2.0 | CDP + Claude | Zo Health Clinicians Workbench*
*Location: docs/ZoCW_Model_Selection_Guide.md (travels with repo)*
