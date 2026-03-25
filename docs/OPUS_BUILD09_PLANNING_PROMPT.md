# Opus BUILD_09 Planning Session — Image Pipeline Integration
**Model:** Opus 4.6 (Cowork)
**Scope:** PLANNING ONLY — No code changes, no browser automation.
**Deliverable:** `docs/BUILD_09_IMPLEMENTATION_PLAN.md` — a concrete, Sonnet-dispatchable implementation plan
**Estimated time:** 30–45 minutes

---

## YOUR ROLE

You are the **Opus architect** for ZoCW. Your job is to read the existing architecture docs and BUILD_09 packet, identify gaps, risks, and decision points, then produce a concrete implementation plan that a Sonnet session can execute without needing to make architectural decisions.

**You must NOT write any code.** You produce a plan document only.

---

## STEP 0: PRE-FLIGHT + CONTEXT

Read these files (in this exact order — each builds on the previous):

1. `HANDOFF.md` — current project state, session log, work queue
2. `docs/IMAGE_PIPELINE_INTEGRATION.md` — approved architecture for cross-project integration
3. `docs/build-packets/BUILD_09_Image_Pipeline_Integration.md` — the build packet with implementation steps
4. `docs/ZOCW_REFERENCE.md` — component registry, screen list, routing table, role matrix
5. `src/types/capsule-image.ts` — existing type definitions for pipeline data
6. `src/screens/Viewer.tsx` — current Viewer implementation (has TODO for frames)
7. `src/screens/CapsuleUpload.tsx` — current upload screen (simulated)
8. `src/components/FrameViewer.tsx` — existing frame viewer component
9. `src/lib/hooks.tsx` — existing hooks (useAuth, etc.)
10. `functions/src/index.ts` — current Cloud Functions exports
11. `firestore.rules` — current security rules

Also scan the functions directory:
```bash
ls -la functions/src/ functions/src/callable/ functions/src/triggers/ 2>/dev/null
```

---

## STEP 1: PREREQUISITE AUDIT

Before planning the build, audit the prerequisites listed in BUILD_09. For each prerequisite, determine its current status:

### Pipeline Backend Prerequisites
| Prerequisite | Status | Evidence | Action Needed |
|---|---|---|---|
| `procedure_id` → `capsule_serial` field rename | ? | Check pipeline project docs | ? |
| CORS on `podium-capsule-raw-images-test` bucket | ? | Check IMAGE_PIPELINE doc | ? |
| Cross-project service account IAM grants | ? | Check IMAGE_PIPELINE doc | ? |
| Composite Firestore index on `capsule_images` | ? | Check IMAGE_PIPELINE doc | ? |

### ZoCW Prerequisites
| Prerequisite | Status | Evidence | Action Needed |
|---|---|---|---|
| Cloud Functions deployable (Blaze plan) | ✅ | HANDOFF.md — 14 functions deployed | None |
| `capsule-image.ts` types exist | ✅ | BUILD_09 confirms | Verify completeness |
| Test data in pipeline Firestore | ? | Check HANDOFF.md | ? |

For any prerequisite that is NOT confirmed complete, flag it as a **blocker** or **workaround needed** in the plan.

---

## STEP 2: GAP ANALYSIS

Review BUILD_09's implementation steps against the actual source code. Identify:

1. **Missing imports or dependencies** — Does `firebase/functions` need to be initialized in `src/lib/firebase.ts`? Is `httpsCallable` importable? Check how existing callables (if any) are invoked.

2. **Type mismatches** — Does `GetCapsuleFramesResponse` in `capsule-image.ts` match what the Cloud Function will return? Are there any missing fields?

3. **FrameViewer prop interface** — What does `FrameViewer.tsx` actually expect? Does it accept `string[]` for frame URLs, or does it expect a richer object? Will signed HTTPS URLs work directly as `<img>` sources?

4. **Viewer.tsx integration points** — Where exactly in the current Viewer code should the hook be wired? What existing state needs to change?

5. **CapsuleUpload.tsx flow** — BUILD_09 suggests keeping upload manual and making the screen a "confirm upload complete" step. Evaluate: is this the right MVP approach? What procedure status transitions are needed?

6. **Error boundary** — Does the Viewer have an ErrorBoundary? If `getCapsuleFrames` fails, what's the UX?

7. **Functions directory structure** — Does `functions/src/callable/` exist? What pattern do existing callables follow?

---

## STEP 3: RISK ASSESSMENT

Evaluate and rate each risk (Low / Medium / High):

1. **Cross-project Firestore access** — The `getCapsuleFrames` function needs to read from `podium-capsule-ingest`. Does the service account have the right IAM roles? Can we test this without the pipeline project?

2. **Signed URL generation** — Generating 50K signed URLs in one response is expensive. Should we paginate? Lazy-load? What's the payload size?

3. **CORS for frame images** — When the browser fetches signed URLs from `podium-capsule-raw-images-test`, will CORS allow it? The bucket is in a different GCP project.

4. **Performance at scale** — 50K frames × (signed URL generation + metadata) could be slow. What's the expected response time? Should we batch or virtualize?

5. **Offline pipeline** — What if the pipeline project's Firestore is empty for a given serial number? What if the pipeline hasn't finished processing?

6. **Field rename timing** — If `procedure_id` hasn't been renamed to `capsule_serial` yet, the temporary compatibility code in BUILD_09 is a tech debt landmine. How do we handle this?

---

## STEP 4: PRODUCE THE IMPLEMENTATION PLAN

Write `docs/BUILD_09_IMPLEMENTATION_PLAN.md` with this structure:

### Section 1: Prerequisites Checklist
- Table of prerequisites with status and who is responsible (Cameron manual action vs. Sonnet code vs. pipeline team)
- Any blockers that must be resolved before Sonnet starts

### Section 2: Implementation Phases
Break BUILD_09 into Sonnet-dispatchable phases. Each phase should be:
- **Self-contained** — completable in one Sonnet session (30–60 min)
- **Testable** — has a clear verification step
- **Ordered** — dependencies are explicit

Suggested phasing:
- **Phase A:** Cloud Function (`getCapsuleFrames`) — create, test locally if possible
- **Phase B:** React hook (`useCapsuleFrames`) + Firebase Functions client setup
- **Phase C:** Viewer.tsx integration — wire hook, frame display, AI findings panel
- **Phase D:** CapsuleUpload.tsx — confirmation flow, status transition
- **Phase E:** End-to-end test with real pipeline data (requires Cameron + pipeline)

For each phase, provide:
1. Files to create/modify (exact paths)
2. Specific implementation instructions (enough detail that Sonnet doesn't need to make decisions)
3. Verification steps
4. Rollback plan if something breaks

### Section 3: Architectural Decisions
Document any decisions you're making that differ from or extend BUILD_09:
- Pagination strategy for large frame sets
- Error handling approach
- Loading UX pattern
- Signed URL caching/expiry strategy
- Whether to create a `getCapsuleFrameCount` lightweight callable

### Section 4: Sonnet Dispatch Prompts
For each phase, write a brief prompt summary that could be included in a Sonnet session prompt. This saves Cameron from having to translate the plan into prompts later.

### Section 5: Open Questions for Cameron
Any decisions that need Cameron's input:
- Pipeline project access (service account status)
- Test data availability
- Whether to do the field rename first or use the compatibility shim
- Timeline preferences

---

## STEP 5: UPDATE HANDOFF.md

Add a session log entry to HANDOFF.md:
- Date, model, scope
- What was produced
- Any blockers identified
- Next steps

---

## STEP 6: COMMIT

```bash
git add docs/BUILD_09_IMPLEMENTATION_PLAN.md HANDOFF.md
git commit -m "$(cat <<'EOF'
plan: BUILD_09 image pipeline implementation plan (Opus)

- Prerequisite audit with status for all pipeline/ZoCW dependencies
- Gap analysis against BUILD_09 packet and current source
- Risk assessment: cross-project access, signed URLs at scale, CORS, performance
- 5-phase Sonnet-dispatchable implementation plan (A-E)
- Architectural decisions: pagination, error handling, loading UX
- Sonnet dispatch prompt summaries for each phase

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

**Do NOT push** — Cameron will push from Mac Terminal.

---

## IMPORTANT NOTES

- **This is a PLANNING session.** Do not write implementation code. Your output is a plan document.
- **Read thoroughly.** The value of this session is in catching gaps and risks that BUILD_09 doesn't address. Spend time reading source files, not rushing to write.
- **Be specific.** Sonnet needs exact file paths, exact function signatures, exact prop names. Vague instructions like "wire up the hook" are useless — say exactly where and how.
- **Flag blockers clearly.** If something can't proceed without Cameron's action (e.g., pipeline IAM grants), mark it prominently so it doesn't get lost.
- **Consider the 50K-frame scale.** The pipeline processes ~50K frames per capsule study. Every design decision should account for this scale.
