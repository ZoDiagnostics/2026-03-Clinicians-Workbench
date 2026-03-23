# ZoCW Naming Contract v1.0
**Status:** LOCKED — Do not rename without updating this file AND every file in the Import Map.
**Last Updated:** March 23, 2026
**Purpose:** Prevent naming conflicts that consumed ~55 turns (6+ hours) in the prior build attempt.

---

## Rules

1. Every hook, provider, context, and component has ONE canonical name listed below.
2. Firebase Studio AI must NEVER introduce alternate names (e.g., useCurrentUser, useAppContext).
3. When any file references a hook or provider, it MUST use the exact name from this contract.
4. If a name needs to change, update THIS file first, then update every file listed in IMPORT_MAP.md.

---

## Canonical Hook Names

| Hook | File | Purpose | Returns |
|------|------|---------|---------|
| `useAuth` | lib/hooks.tsx | Current authenticated user | `User \| null` |
| `useProcedures` | lib/hooks.tsx | Procedure list for current context | `Procedure[]` |
| `useUsers` | lib/hooks.tsx | User list for current practice | `User[]` |
| `useNotifications` | lib/hooks.tsx | Notification state | `Notification[]` |
| `useActiveProcedure` | lib/hooks.tsx | Currently active procedure | `Procedure \| null` |
| `useStore` | lib/store.tsx | Global app state + dispatch | `{ state: AppState, dispatch }` |
| `useI18n` | lib/i18n.tsx | Internationalization context | `I18nContextType` |

**All hooks are in `.tsx` files. There are zero `.ts` files containing JSX in this project.**

### Forbidden Aliases (DO NOT USE)

| Forbidden Name | Use Instead | Reason |
|----------------|-------------|--------|
| `useCurrentUser` | `useAuth` | Caused 55-turn naming loop in prior build |
| `useAppContext` | `useStore` | Ambiguous; confused with React.useContext |
| `AppProvider` | `StoreProvider` | Must match useStore naming |
| `useAppStore` | `useStore` | Redundant variation |
| `useUser` | `useAuth` | Too similar to useUsers (plural) |

---

## Canonical Provider Names

| Provider | File | Wraps |
|----------|------|-------|
| `StoreProvider` | lib/store.tsx | Global state context |
| `I18nProvider` | lib/i18n.tsx | Internationalization context |
| `AuthProvider` | — (future) | Firebase Auth listener (to be created in Phase 1) |

---

## Canonical Component Names

| Component | File | Export Style |
|-----------|------|-------------|
| `Header` | components/Header.tsx | Named export |
| `Sidebar` | components/Sidebar.tsx | Named export |
| `WorkflowStepper` | components/WorkflowStepper.tsx | Named export |
| `ErrorBoundary` | components/ErrorBoundary.tsx | Named export |
| `PreReviewBanner` | components/PreReviewBanner.tsx | Named export |
| `NotificationDrawer` | components/NotificationDrawer.tsx | Named export |
| `CopilotAutoDraft` | components/CopilotAutoDraft.tsx | Named export |
| `ErrorState` | components/ErrorState.tsx | Named export |
| `FrameViewer` | components/FrameViewer.tsx | Named export |
| `ICDCodeSuggestions` | components/ICDCodeSuggestions.tsx | Named export |
| `LoadingSkeleton` | components/LoadingSkeleton.tsx | Named export |

---

## Canonical Screen Export Pattern

Every screen file in `screens/` follows this pattern:
```typescript
// Named export (used by router)
export const ScreenName = () => { ... };

// Default export (backup import style)
export default ScreenName;
```

The router (`lib/router.tsx`) imports screens using **named imports**:
```typescript
import { Dashboard } from '../screens/Dashboard';
```

---

## Canonical Type Sources

| Type | Canonical Source | DO NOT import from |
|------|----------------|-------------------|
| `User` (app-level) | lib/store.tsx | lib/types.ts (duplicate) |
| `Procedure` (app-level) | lib/store.tsx | lib/types.ts (duplicate) |
| `AppState` | lib/store.tsx | — |
| `User` (Firestore model) | types/user.ts | lib/store.tsx |
| `Procedure` (Firestore model) | types/procedure.ts | lib/store.tsx |
| `Patient` | types/patient.ts | — |
| `Finding` | types/finding.ts | — |
| `Report` | types/report.ts | — |
| `Practice` | types/practice.ts | — |

**Note:** `lib/store.tsx` and `lib/types.ts` both define `User` and `Procedure`. During Firebase integration (Phase 1), consolidate onto the `types/` versions and remove duplicates from `lib/store.tsx` and `lib/types.ts`.

---

## File Extension Rules

| Contains JSX? | Extension | Example |
|---------------|-----------|---------|
| Yes (or will) | `.tsx` | hooks.tsx, store.tsx, i18n.tsx |
| No | `.ts` | firebase.ts, mockData.ts, types.ts |

**Note:** `lib/i18n.tsx` was renamed from `.ts` to `.tsx` because it contains JSX (`<I18nContext.Provider>`). This is now resolved.

---

*This contract is referenced by every Phase Prompt in PHASE_PROMPTS.md. Any Firebase Studio AI session must be given this file at the start.*
