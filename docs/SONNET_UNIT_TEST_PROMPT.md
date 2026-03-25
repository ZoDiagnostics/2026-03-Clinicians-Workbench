# Sonnet Unit Test Scaffolding Session
**Model:** Sonnet 4.6 (Cowork)
**Scope:** CODE — Create vitest unit test suite for ZoCW
**Estimated time:** 45–60 minutes
**No browser automation required — pure code generation.**

---

## STEP 0: PRE-FLIGHT + CONTEXT

Read these files (in order):
1. `HANDOFF.md` — current project state
2. `docs/ZOCW_REFERENCE.md` — component registry, screen list, architecture
3. `docs/LESSONS_LEARNED.md` — known constraints
4. `src/lib/hooks.tsx` — auth hook (RBAC logic lives here)
5. `src/lib/router.tsx` — route definitions and ProtectedRoute
6. `src/lib/types.ts` — UserRole enum, core types

Then scan the src directory structure:
```bash
find src/ -name "*.tsx" -o -name "*.ts" | head -60
```

## STEP 1: Install & Configure Vitest

### 1.1 Install dependencies
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/testing-library__jest-dom
```

### 1.2 Create `vitest.config.ts` in repo root
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/**/*.test.*', 'src/vite-env.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 1.3 Create `src/test/setup.ts`
```typescript
import '@testing-library/jest-dom';
```

### 1.4 Create `src/test/mocks/firebase.ts`
Mock the Firebase modules so tests don't need a live Firebase connection:
- Mock `firebase/auth` — `getAuth`, `signInWithEmailAndPassword`, `onAuthStateChanged`, `getIdTokenResult`
- Mock `firebase/firestore` — `collection`, `getDocs`, `onSnapshot`, `query`, `where`, `orderBy`, `limit`, `doc`, `getDoc`, `updateDoc`, `addDoc`, `deleteDoc`
- Mock `src/lib/firebase` — export a mock `auth` and `db`
- Mock `src/lib/hooks` — export a mock `useAuth` that returns configurable `{ user, loading, role, practiceId }`

### 1.5 Add test script to `package.json`
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

## STEP 2: RBAC & Auth Tests (`src/lib/__tests__/hooks.test.tsx`)

These are the highest-value tests. The `useAuth` hook in `src/lib/hooks.tsx` is the RBAC backbone — it reads Firebase custom claims and determines user role + practice scope.

### Test cases:
1. **Returns loading=true while Firebase auth is resolving**
2. **Returns user=null when not authenticated**
3. **Returns correct role from custom claims** — test each of the 5 roles:
   - `clinician_auth` → role='clinician_auth', practiceId='practice-gastro-sd-001'
   - `clinician_noauth` → role='clinician_noauth'
   - `clinical_staff` → role='clinical_staff'
   - `clinician_admin` → role='clinician_admin'
   - `admin` → role='admin'
4. **Retries up to 5 times when claims are missing** (the retry loop in hooks.tsx)
5. **Sets user to null after 5 failed retries** (triggers redirect to /login)
6. **Force-refreshes token on mount** (getIdTokenResult(true) is called)

### Mock strategy:
- Use `vi.mock('firebase/auth')` to control `onAuthStateChanged` and `getIdTokenResult`
- Wrap hook calls in `renderHook` from `@testing-library/react`
- Use `act()` for async state updates

## STEP 3: Route Protection Tests (`src/lib/__tests__/router.test.tsx`)

Test the `ProtectedRoute` component and route definitions:

1. **Unauthenticated user → redirects to /login**
2. **Authenticated user with valid role → renders children**
3. **User accessing /admin without admin role → shows Access Denied**
4. **User accessing /activity without admin/clinician_admin role → shows Access Denied**
5. **Login page → redirects to /dashboard if already authenticated**
6. **ProtectedRoute preserves `from` location state for post-login redirect**

## STEP 4: Utility Function Tests

### 4.1 `src/lib/__tests__/routeByStatus.test.ts`
Test `routeByStatus()` — maps procedure status to the correct screen route:
- `capsule_return_pending` → `/viewer/{id}` (or whatever the mapping is)
- `ready_for_review` → `/viewer/{id}`
- `report_draft` → `/report/{id}`
- etc.

Read `src/lib/routeByStatus.ts` to discover all status→route mappings and test each.

### 4.2 Type guard tests (if any exist in `src/lib/types.ts`)
Test any type guards, enum helpers, or utility functions in the types file.

## STEP 5: Component Render Tests (Smoke Tests)

For each of these components, write a basic "renders without crashing" test. Mock all Firebase dependencies.

### 5.1 `src/components/__tests__/ErrorState.test.tsx`
- Renders error message
- Renders retry button
- Calls onRetry when button clicked

### 5.2 `src/components/__tests__/LoadingSkeleton.test.tsx`
- Renders correct number of skeleton rows
- Renders stat cards when `showStats` prop is true

### 5.3 `src/components/__tests__/Sidebar.test.tsx`
- Renders navigation items
- **RBAC test:** Admin role → shows "Admin & Settings" section
- **RBAC test:** clinical_staff role → does NOT show "Admin & Settings"
- **RBAC test:** clinician_noauth role → does NOT show Activity Log link
- Collapse toggle works (icon changes, width class changes)

### 5.4 `src/components/__tests__/WorkflowStepper.test.tsx`
- Renders steps
- Highlights current step
- Marks completed steps

### 5.5 `src/components/__tests__/PreReviewBanner.test.tsx`
- Shows when procedure is not review-unlocked
- Hidden when procedure is review-unlocked

## STEP 6: Screen-Level Smoke Tests (Pick top 3)

Write render smoke tests for the 3 most critical screens. These test that the component mounts without error when given mocked data. Do NOT test Firebase interactions — just rendering.

### 6.1 `src/screens/__tests__/Dashboard.test.tsx`
- Renders "Dashboard" heading
- Shows loading skeleton initially
- Renders stat cards after mock data resolves

### 6.2 `src/screens/__tests__/Login.test.tsx`
- Renders email and password inputs
- Renders "Sign in" button
- Renders "Sign in with Google" button
- Shows error message on failed login

### 6.3 `src/screens/__tests__/Procedures.test.tsx`
- Renders procedure list
- Opens creation modal when triggered (if `?patientId` query param present — BUG-54 fix)

## STEP 7: Run & Fix

```bash
npm run test
```

Fix any failures. Target: **all tests passing, 0 failures**.

Then run coverage:
```bash
npm run test:coverage
```

Document the coverage numbers in the commit message.

## STEP 8: Commit

```bash
git add vitest.config.ts src/test/ src/**/*.test.* package.json package-lock.json
git commit -m "$(cat <<'EOF'
test: add vitest unit test suite — RBAC, routing, components

- Configure vitest with jsdom, @testing-library/react
- Firebase mock layer (auth, firestore, hooks)
- useAuth hook tests: 5 roles, retry logic, claim parsing
- ProtectedRoute tests: redirect, role gates, Access Denied
- Component smoke tests: Sidebar RBAC, ErrorState, LoadingSkeleton
- Screen smoke tests: Dashboard, Login, Procedures
- Coverage: [INSERT_NUMBERS]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

**Do NOT push** — Cameron will push from Mac Terminal.

---

## IMPORTANT NOTES

- **No browser automation in this session.** This is pure code generation + `npm run test`.
- **Do NOT modify any existing source files** unless a minor change is needed to make a component testable (e.g., exporting a helper function). If you do, document the change.
- **Mock Firebase aggressively.** Tests must run without any network access. The Cowork VM cannot reach Firebase APIs.
- **Keep tests focused.** Each test file should test ONE concern. Don't create a single mega test file.
- **Read source files before writing tests.** Understand the actual implementation — don't write tests based on assumptions.
- **Update HANDOFF.md** at the end with what was accomplished.
