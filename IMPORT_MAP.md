# ZoCW Import Map v1.0
**Purpose:** Complete dependency map for every project file. When renaming anything, consult this map to find ALL files that need updating.
**Last Updated:** March 19, 2026

---

## How to Use This Map

When you need to rename a hook, component, or export:
1. Find the export in the "Exports" column below
2. Look at every file in the "Imported By" column
3. Update ALL of those files — not just one or two
4. Verify with: `grep -r "oldName" screens/ components/ lib/` → should return 0 results
5. Verify with: `grep -r "newName" screens/ components/ lib/` → should show all expected files

---

## lib/hooks.tsx (CENTRAL HUB — most imported file)

| Export | Type | Imported By |
|--------|------|-------------|
| `useAuth` | function | ALL screens, Header, Sidebar, WorkflowStepper, NotificationDrawer, PreReviewBanner |
| `usePatients` | function | Dashboard, Worklist, Viewer, PatientOverview, Patients |
| `useProcedures` | function | Dashboard, Worklist, Procedures, Operations, Analytics |
| `useActiveProcedure` | function | CheckIn, CapsuleUpload, Viewer, Summary, Report, SignDeliver |
| `useStaff` | function | ManageStaff, Admin |
| `useClinics` | function | ManageClinics, Admin |
| `usePractice` | function | ManagePractice, Admin |
| `usePracticeSettings` | function | Admin, ManagePractice |
| `useNotifications` | function | Header (NotificationDrawer) |
| `useFindings` | function | Viewer |
| `useReport` | function | Report, SignDeliver |
| `useCapsuleFrames` | function | Viewer (BUILD_09 — not yet implemented) |
| `createFinding` | function | Viewer |
| `updateFinding` | function | Viewer |
| `deleteFinding` | function | Viewer |
| `updateProcedure` | function | CheckIn, CapsuleUpload |
| `markNotificationRead` | function | NotificationDrawer |
| `markAllNotificationsRead` | function | NotificationDrawer |
| `generateReport` | function | Report |
| `updateReport` | function | Report |
| `signReport` | function | SignDeliver |
| `deliverReport` | function | SignDeliver |

**hooks.tsx imports from:**
- `auth`, `db` from `./firebase`
- `useStore` from `./store`
- Types from `../types/enums`, `../types/user`, `../types/procedure`, `../types/patient`, `../types/finding`, `../types/report`, `../types/practice`, `../types/notification`, `../types/firestore-paths`
- Firebase SDK: `firebase/auth`, `firebase/firestore`, `firebase/functions`

---

## lib/store.tsx

| Export | Type | Imported By |
|--------|------|-------------|
| `useStore` | function | lib/hooks.tsx |
| `StoreProvider` | component | main.tsx (app root — to be created) |
| `User` | interface | lib/hooks.tsx |
| `Procedure` | interface | lib/hooks.tsx |
| `AppState` | interface | (internal use) |

**store.tsx imports from:** nothing (leaf dependency)

---

## lib/firebase.ts

| Export | Type | Imported By |
|--------|------|-------------|
| `app` | FirebaseApp | (Phase 1+: auth listeners) |
| `auth` | Auth | (Phase 1: Login.tsx, hooks.tsx) |
| `db` | Firestore | (Phase 1+: all data hooks) |
| `storage` | Storage | (Phase 3: CapsuleUpload.tsx) |

**firebase.ts imports from:** nothing (leaf dependency)

---

## lib/router.tsx

| Export | Type | Imported By |
|--------|------|-------------|
| `router` | BrowserRouter | (internal) |
| `Router` | component | main.tsx (app root — to be created) |

**router.tsx imports from (18 screens):**
Dashboard, Worklist, Patients, Procedures, ReportsHub, Education, Admin, ActivityLog, AIQA, Operations, Analytics, CheckIn, CapsuleUpload, Viewer, Summary, Report, SignDeliver, PatientOverview

**Admin sub-screens:** ManageClinics, ManageICDCodes, ManagePractice, ManageStaff, ManageSubscription — imported by router from `screens/admin/` (NOT the 44-line stubs at `screens/` root level). Root stubs are candidates for deletion.

---

## lib/i18n.tsx

| Export | Type | Imported By |
|--------|------|-------------|
| `I18nProvider` | component | (Phase 7: main.tsx wrapper) |
| `useI18n` | function | (Phase 7: all screens) |
| `formatDate` | function | (Phase 2+: date displays) |
| `formatNumber` | function | (Phase 6: analytics) |
| `t` | function | (Phase 7: all translated strings) |

**i18n.tsx imports from:** nothing (leaf dependency)

---

## lib/mockData.ts (DEPRECATED — replaced by Firestore in Phase 1)

| Export | Type | Imported By |
|--------|------|-------------|
| `USERS` | array | (no longer imported — hooks.tsx uses Firestore) |
| `PATIENTS` | array | (no longer imported — hooks.tsx uses Firestore) |
| `PROCEDURES` | array | (no longer imported — hooks.tsx uses Firestore) |
| `NOTIFICATIONS` | array | (no longer imported) |

**Note:** This file is retained for offline testing only. All hooks now query Firestore directly.

---

## lib/types.ts

| Export | Type | Imported By |
|--------|------|-------------|
| `User` | interface | (DUPLICATE — consolidate with types/user.ts in Phase 1) |
| `Patient` | interface | (DUPLICATE — consolidate with types/patient.ts in Phase 1) |
| `Procedure` | interface | (DUPLICATE — consolidate with types/procedure.ts in Phase 1) |
| `Notification` | interface | (not imported) |
| `WorkflowState` | interface | (not imported) |

**Note:** This file has NO active importers. It can be safely removed after Phase 1 type consolidation.

---

## components/ (7 files)

| Component | Exports | Imports From Project |
|-----------|---------|---------------------|
| Header.tsx | `Header` | `useAuth`, `useNotifications`, `markNotificationRead`, `markAllNotificationsRead` from ../lib/hooks |
| Sidebar.tsx | `Sidebar` | `useAuth` from ../lib/hooks |
| WorkflowStepper.tsx | `WorkflowStepper` | `useAuth` from ../lib/hooks |
| NotificationDrawer.tsx | `NotificationDrawer` | `useAuth` from ../lib/hooks |
| PreReviewBanner.tsx | `PreReviewBanner` | `useAuth`, `updateProcedure` from ../lib/hooks |
| FrameViewer.tsx | `FrameViewer` | (none — receives frames as props) |
| ErrorBoundary.tsx | `ErrorBoundary`, `withErrorBoundary` | (none) |

**Sidebar + Header imported by:** All screen files
**FrameViewer imported by:** Viewer (SCR-10)

---

## screens/ (23 files) — Uniform Pattern

Every screen file follows this exact import pattern:
```typescript
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useProcedures } from '../lib/hooks';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { WorkflowStepper } from '../components/WorkflowStepper';
```

**Screen list:** AIQA, ActivityLog, Admin, Analytics, CapsuleUpload, CheckIn, Dashboard, Education, ManageClinics, ManageICDCodes, ManagePractice, ManageStaff, ManageSubscription, Operations, PatientOverview, Patients, Procedures, Report, ReportsHub, SignDeliver, Summary, Viewer, Worklist

---

## types/capsule-image.ts (NEW — Image Pipeline Types)

| Export | Type | Imported By |
|--------|------|-------------|
| `CapsuleImageDocument` | interface | Viewer (BUILD_09), getCapsuleFrames callable |
| `AIAnalysisResult` | interface | Viewer (BUILD_09) |
| `GetCapsuleFramesResponse` | interface | hooks.tsx (useCapsuleFrames), getCapsuleFrames callable |
| `CestAnatomicalLocation` | type | Viewer (BUILD_09) |
| `CestFindingClassification` | type | Viewer (BUILD_09) |
| `CEST_ANATOMICAL_LOCATIONS` | const array | (reference) |
| `CEST_FINDING_CLASSIFICATIONS` | const array | (reference) |
| `CEST_TO_ANATOMICAL_REGION` | const map | Viewer (BUILD_09) |
| `cestToAnatomicalRegion` | function | Viewer (BUILD_09) |

**capsule-image.ts imports from:** `../types/enums` (AnatomicalRegion)
**Barrel exported from:** `types/index.ts`

---

## Dependency Flow (no cycles)

```
main.tsx
  └─ StoreProvider (lib/store.tsx)
     └─ I18nProvider (lib/i18n.tsx)  [Phase 7]
        └─ Router (lib/router.tsx)
           └─ Screens (screens/*.tsx)
              ├─ useAuth, useProcedures (lib/hooks.tsx)
              │  └─ useStore (lib/store.tsx)
              │  └─ mockData (lib/mockData.ts) → replaced by Firestore in Phase 1+
              ├─ Header (components/Header.tsx)
              │  └─ useAuth (lib/hooks.tsx)
              ├─ Sidebar (components/Sidebar.tsx)
              │  └─ useAuth (lib/hooks.tsx)
              └─ WorkflowStepper (components/WorkflowStepper.tsx)
                 └─ useAuth (lib/hooks.tsx)
```

---

## Quick Reference: "If I rename X, what files need updating?"

| If you rename... | Update these files |
|-----------------|-------------------|
| `useAuth` | lib/hooks.tsx + ALL 23 screens + 5 components (28 files total) |
| `useProcedures` | lib/hooks.tsx + ALL 23 screens (24 files total) |
| `useStore` | lib/store.tsx + lib/hooks.tsx (2 files) |
| `StoreProvider` | lib/store.tsx + main.tsx (2 files) |
| `Header` | components/Header.tsx + ALL 23 screens (24 files) |
| `Sidebar` | components/Sidebar.tsx + ALL 23 screens (24 files) |
| Any screen name | screens/[Name].tsx + lib/router.tsx (2 files) |

---

*This map is referenced by NAMING_CONTRACT.md and PHASE_PROMPTS.md.*
