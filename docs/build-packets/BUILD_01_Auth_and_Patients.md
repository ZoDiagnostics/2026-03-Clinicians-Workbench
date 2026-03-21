# Build Packet 01: Authentication & Patient Management

## Objective
Wire up Firebase Auth with 5-role RBAC and implement patient CRUD operations with Firestore. Establish user provisioning infrastructure and patient data persistence.

## Files to Have Open in Firebase Studio
- `scaffold/firestore.rules` (security rules reference)
- `types/user.ts`, `types/patient.ts`, `types/enums.ts`
- `screens/Patients.tsx`, `screens/PatientOverview.tsx`
- `components/Header.tsx` (role switcher)
- `lib/firebase.ts`, `lib/store.tsx`
- `lib/hooks.ts` (to be created)

## Requirements Implemented

### ZCW-BRD-0005: Role-Based Access Control
The system shall enforce role-based access for 5 roles: Clinician (Authorized to Sign), Clinician (Not Authorized), Clinician Administrator, Administrator, and Clinical Staff. Each role has defined permissions per the RBAC matrix. Roles are stored as custom claims in Firebase Auth ID tokens (`request.auth.token.role`).

### ZCW-BRD-0088: Custom Role Configuration
Administrators can create custom roles with granular screen-level permissions. This builds on the base RBAC system to allow tenant-specific role definitions.

### ZCW-BRD-0011–0025: Patient Management
Full patient CRUD: create, read, update, search by name/MRN, archive/reactivate. Firestore collection: `practices/{practiceId}/patients/{patientId}`. EMR source badges on pre-populated fields (ZCW-BRD-0278). Read-only enforcement for EMR-sourced identity fields (ZCW-BRD-0279). PHI masking by role (ZCW-BRD-0281).

### ZCW-BRD-0278: EMR-Sourced Field Visual Tagging
Visual "EMR" badge on pre-populated fields from EHR integrations. Lineage persists (source system, sync timestamp).

### ZCW-BRD-0279: EMR-Sourced Demographics Editability Rules
Core identity fields (name, MRN, DOB, SSN) from EMR sources are read-only. Non-identity fields (address, phone, contact method) can be overridden locally with admin toggle in Practice Settings.

### ZCW-BRD-0281: Field-Level PHI Access Masking by Role
Sensitive fields (SSN, full DOB, insurance IDs, contact details) are masked for non-clinical roles. Unmask action is logged in audit trail.

### User Identity Bootstrapping (Identity Orchestration)
Firebase Auth custom claims (`role`, `practiceId`, `clinicIds`) are the **single source of truth** for RBAC. Firestore security rules evaluate these claims on every read/write — they do NOT fall back to Firestore document fields. This creates a bootstrapping problem: after an admin creates a user account, the user's ID token has no claims until they are explicitly set via `setInitialUserClaims`. During this "Initial Login" window, the user is locked out of all practice-scoped data.

The implementation must:
1. Call `setInitialUserClaims({ userId, role, practiceId, clinicIds })` immediately after creating the user document in `users/{uid}`.
2. Handle the **Initial Login state** in the client: after a user's first sign-in, call `getIdTokenResult(true)` to force-refresh the token and pick up newly provisioned claims. If `token.claims.role` is undefined, show a "Your account is being set up" interstitial instead of a blank/error screen.
3. Prevent race conditions: the `useAuth` hook must retry `getIdTokenResult(true)` on a short interval (e.g., 3 seconds, max 5 retries) when claims are absent, to account for the delay between `setInitialUserClaims` execution and token propagation.
4. The `setInitialUserClaims` Cloud Function refuses to overwrite existing claims — use `updateUserRole` for subsequent role changes.

See `functions/src/callable/setInitialUserClaims.ts` for the production-ready implementation.

## Implementation Steps

### Step 1: Firebase Auth Integration

Prompt Gemini:
```
Replace the mock role switcher in Header.tsx with Firebase Auth integration.
Create a `useAuth` hook in `lib/hooks.ts` that:

1. Listens to `onAuthStateChanged` from Firebase Auth
2. Reads custom claims (role, practiceId, clinicIds) from the ID token
3. Returns { currentUser, currentRole, practiceId, isLoading, signOut, error }
4. Provides `currentUser` object with UID, email, displayName, customClaims
5. Updates the store context with the authenticated user immediately on load
6. Handles auth state persistence across page reloads

Use the User interface from `types/user.ts` with fields:
- uid: string
- email: string
- displayName: string
- photoURL?: string
- role: 'clinician_auth' | 'clinician_noauth' | 'clinician_admin' | 'admin' | 'clinical_staff'
- practiceId: string
- clinicIds: string[]

Wrap the top-level app in an `<AuthProvider>` component that exposes useAuth hook context.
The Header.tsx role switcher should call updateProfile() or a custom Cloud Function to
update custom claims when role is changed in demo mode.

Replace mock USERS list in Header with Firebase Auth user.

CRITICAL — Initial Login State Handling:
7. After onAuthStateChanged fires, call getIdTokenResult(true) to get custom claims
8. If token.claims.role is undefined or token.claims.practiceId is undefined:
   - Show a "Setting up your account..." interstitial (not an error screen)
   - Retry getIdTokenResult(true) every 3 seconds, up to 5 retries
   - If claims still absent after retries, show "Contact your administrator" message
9. Only transition to authenticated app shell once role AND practiceId are present
10. Store the resolved claims in AuthProvider context so all downstream hooks read from it
```

### Step 2: User Provisioning Cloud Function

Prompt Gemini:
```
Create a Cloud Function `onUserCreate` that triggers on Firebase Auth user creation event.
It should:

1. Read the corresponding user document from `users/{uid}` (pre-created by admin in Firestore)
2. Extract role, practiceId, clinicIds from that document
3. Set custom claims via admin SDK: setCustomUserClaims(uid, { role, practiceId, clinicIds })
4. Create an audit log entry in `auditLog` collection:
   - event: 'user_created'
   - timestamp: FieldValue.serverTimestamp()
   - userId: uid
   - email: user.email
   - role: role
   - practiceId: practiceId

Also create an admin-callable Cloud Function `updateUserRole` that:
1. Takes parameters: { uid, newRole, updatedBy }
2. Validates caller is admin or clinician_admin
3. Updates custom claims to new role
4. Updates the user document in `users/{uid}` with newRole and lastModified
5. Creates audit log entry: 'user_role_updated'
6. Returns { success: true, message }

This function is called by ManageStaff.tsx when an admin changes a user's role.

Language: JavaScript/TypeScript with Firebase Admin SDK.
```

### Step 3: Patient Firestore Integration

Prompt Gemini:
```
Replace mock PATIENTS array in Patients.tsx with Firestore queries.
Create a `usePatients` hook in `lib/hooks.ts` that:

1. Accepts filters: { searchTerm, archived, pageSize = 25 }
2. Queries `practices/{currentUser.practiceId}/patients` collection
3. Filters by practiceId (all queries scoped to current practice)
4. Supports search by patient name (client-side filter on loaded data) and
   MRN (server-side exact match query: where('mrn', '==', searchTerm))
5. Supports pagination using Firestore cursors (startAfter, limit)
6. Returns { patients: Patient[], nextCursor, isLoading, error, hasMore }
7. Updates store state with loaded patients

For patient create operation:
- Validate input with Zod schema from types/patient.ts
- Create document in `practices/{practiceId}/patients/{patientId}` with:
  - mrn, firstName, lastName, dateOfBirth, ssn, phone, email, address
  - emrSource: { system: 'epic'|'cerner'|'manual', syncedAt, sourceId }
  - isArchived: false
  - createdBy: currentUser.uid
  - createdAt: FieldValue.serverTimestamp()
  - emrFields: { name, mrn, dob } (tagged fields from EMR)
- Return { patientId, success }

For archive/reactivate:
- Update `isArchived` boolean field
- Log audit entry with archived/reactivated event
- Return success status

Use the Patient interface from `types/patient.ts`.
```

### Step 4: Patient Overview Firestore Integration

Prompt Gemini:
```
Wire PatientOverview.tsx tabs to Firestore subcollections and related collections.

1. Medical History tab:
   - Query: `practices/{practiceId}/patients/{patientId}/medicalHistory` subcollection
   - Display: condition name, ICD-10 code, diagnosed date, status (Active/Resolved)
   - Create hook: `useMedicalHistory(patientId)` returning array of diagnoses

2. Medications tab:
   - Query: `practices/{practiceId}/patients/{patientId}/medications` subcollection
   - Display: medication name, dose, frequency, prescriber, status (Active/Discontinued)
   - Create hook: `useMedications(patientId)`

3. Allergies tab:
   - Query: `practices/{practiceId}/patients/{patientId}/allergies` subcollection
   - Display: allergen, type (drug/food/environmental/other), reaction, severity (mild/moderate/severe)
   - Create hook: `useAllergies(patientId)`

4. Procedures tab:
   - Query: `practices/{practiceId}/procedures` where patientId == {patientId}
   - Display: status, study type, date, findings count, clinician
   - Enable click-through to procedure detail (routing to Viewer/Summary/Report per status)
   - Create hook: `usePatientProcedures(patientId)`

5. Reports tab:
   - Query: `practices/{practiceId}/reports` where patientId == {patientId} AND status == 'signed'
   - Display: study type, date, clinician, with View and Download actions
   - View action navigates to report screen, Download triggers PDF export
   - Create hook: `usePatientReports(patientId)`

6. Education tab:
   - Query: `practices/{practiceId}/patients/{patientId}/educationAssignments` subcollection
   - Display: material title, delivery method, delivery date, status (sent/pending)
   - Create hook: `usePatientEducation(patientId)`

7. Activity tab:
   - Query: `auditLog` where patientId == {patientId} ordered by timestamp DESC
   - Display: event type, timestamp, user, action description
   - Create hook: `usePatientActivityLog(patientId)`

All hooks should:
- Accept patientId parameter
- Return { data, isLoading, error }
- Auto-refresh on patientId change
- Use real-time listeners (onSnapshot) for live updates
```

### Step 5: Role-Based Route Guards

Prompt Gemini:
```
Update `lib/roleGuard.tsx` to check Firebase Auth custom claims instead of mock role state.

1. Create a high-order component `ProtectedRoute` that:
   - Accepts requiredRoles: string[] parameter
   - Reads currentUser.role from useAuth hook
   - Compares role against requiredRoles
   - If authorized: render the component
   - If unauthorized: redirect to /dashboard with toast message "Access Denied: You don't have
     permission to view this screen"

2. Wrap routes in App.tsx with role guards:
   - SCR-06 (Admin), SCR-22–28, SCR-34 require: ['admin', 'clinician_admin']
   - SCR-29, SCR-30, SCR-33 require: ['admin', 'clinician_admin', 'clinician_auth']
   - SCR-35 (My Worklist) require: ['clinician_auth', 'clinician_noauth', 'clinician_admin']
   - All workflow screens (SCR-08–13) require any authenticated role
   - SCR-02 (Patients) accessible to all except 'viewer' (if implemented)

3. Implement route guard checks at navigation time:
   - Before navigate() calls in click handlers, check role access
   - Show disabled state on sidebar items user cannot access
   - Add lock icon next to disabled navigation items

4. Handle permission-denied states:
   - Toast notification with "Access Denied" message
   - Redirect to Dashboard
   - Log access attempt in audit trail for security

Use custom claims from ID token, NOT stored state.
```

## Acceptance Criteria

- [ ] User can sign in with email/password via Firebase Auth
- [ ] `setInitialUserClaims` Cloud Function provisions role, practiceId, clinicIds as custom claims
- [ ] `setInitialUserClaims` rejects callers who are not admin or clinician_admin
- [ ] `setInitialUserClaims` rejects cross-practice provisioning
- [ ] `setInitialUserClaims` refuses to overwrite existing claims (returns `already-exists`)
- [ ] Initial Login interstitial shown when claims are absent; retries getIdTokenResult(true)
- [ ] App shell only renders after role AND practiceId claims are confirmed present
- [ ] Role switcher (Header.tsx) shows actual user role from custom claims
- [ ] Role persists across page reloads (ID token cached in localStorage)
- [ ] Unauthorized routes redirect to dashboard with access denied message
- [ ] Patient list loads from Firestore with search by name and MRN
- [ ] Pagination works: 25 patients per page with next/prev cursors
- [ ] Patient create persists to Firestore with all required fields
- [ ] Patient edit updates Firestore document
- [ ] Patient archive/reactivate toggles isArchived flag
- [ ] EMR source badges visible on pre-populated fields
- [ ] EMR-sourced identity fields are read-only
- [ ] PHI fields (SSN, full DOB) masked for clinical_staff role
- [ ] Patient Overview tabs load from Firestore subcollections
- [ ] Medical History, Medications, Allergies tabs display correctly
- [ ] Procedures and Reports tabs show patient-scoped data
- [ ] Activity log shows patient-scoped audit entries
- [ ] Real-time listeners active: changes appear without page reload
- [ ] Audit entries created for patient operations (create, update, archive)
- [ ] Custom role provisioning Cloud Function creates audit entries
- [ ] useAuth hook available globally via context
- [ ] Error messages display when Firestore queries fail
- [ ] Firestore security rules prevent cross-practice data access

## Testing Notes

Test role transitions:
1. Sign in as clinician_auth → verify access to clinical screens, admin screens blocked
2. Switch to clinical_staff → verify patient CRUD available, admin hidden
3. Switch to admin → verify admin screens accessible
4. Sign out and sign back in → verify role persists from token

Test patient operations:
1. Create patient from Patients.tsx → verify appears in list immediately
2. Edit patient demographics → verify update persists
3. Archive patient → verify hidden from active list, visible in archived filter
4. Navigate to Patient Overview → verify all 8 tabs load correctly

Test EMR integration:
1. Pre-populate patient from mock EHR → verify EMR badges appear on name/MRN/DOB
2. Verify read-only enforcement on identity fields
3. Attempt to edit non-identity field (phone) → should allow local override
4. Toggle "Allow local override" in Practice Settings → verify behavior change

Test Firestore security:
1. Attempt to query another practice's patients from browser console → should be DENIED
2. Verify audit log shows who accessed which patients
3. Check Cloud Firestore logs for rule violations

---
