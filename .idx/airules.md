# ZoCW Firebase Studio AI Rules

## Project Overview
Zo Clinicians Workbench (ZoCW) v3.1.0 — a clinical workflow app for capsule endoscopy practices.
Tech stack: React 18 + TypeScript + Vite + Firebase (Auth, Firestore, Storage, Cloud Functions) + Tailwind CSS.

## MANDATORY: Read Before Every Change

### Naming Contract (NEVER violate these)
- Auth hook: `useAuth` — NOT useCurrentUser, NOT useUser
- Store hook: `useStore` — NOT useAppContext, NOT useAppStore
- Store provider: `StoreProvider` — NOT AppProvider
- i18n hook: `useI18n` — in lib/i18n.tsx
- If you need to rename anything, STOP and ask the user first.

### File Extension Rules
- Files with JSX → `.tsx` (hooks.tsx, store.tsx, i18n.tsx, router.tsx, all screens, all components)
- Files without JSX → `.ts` (firebase.ts, mockData.ts, type definitions)
- NEVER put JSX in a `.ts` file. If JSX is needed, rename to `.tsx` first.

### Import Path Convention
- All source code is in `src/`
- Screens import from `../lib/` and `../components/`
- Router imports from `../screens/`
- Entry point (`src/main.tsx`) imports from `./lib/`

### Firestore Data Scoping
- ALL queries must be scoped to `practiceId`
- Collection paths follow `types/firestore-paths.ts`
- Security rules enforce practice isolation

### Environment Variables
- Use `import.meta.env.VITE_*` (Vite pattern)
- NEVER use `process.env.REACT_APP_*` (Create React App pattern)
- Real API keys come from Firebase Console — never invent placeholder values

### When Making Changes
1. Show the exact code diff for EVERY file you modify
2. If renaming an export, update ALL files that import it (see IMPORT_MAP.md)
3. After changes, verify: `grep -r "oldName" src/` should return 0 results
4. Never suggest "clear cache" or "hard refresh" as a fix for compilation errors — read the error message first

### Deferred Infrastructure (DO NOT implement)
- Vertex AI / Genkit inference → mark with `// TODO: External Infrastructure`
- MedASR speech recognition → mark with `// TODO: External Infrastructure`
- EHR/PACS interoperability → mark with `// TODO: External Infrastructure`
- Virtual chromoendoscopy → mark with `// TODO: External Infrastructure`

## RBAC Roles (5 roles via Firebase Auth custom claims)
1. clinician_auth — Can sign reports
2. clinician_noauth — Cannot sign reports
3. clinician_admin — Full clinical + admin access
4. admin — Administrative access only
5. clinical_staff — Check-in, upload, limited procedure access

## Procedure Lifecycle (9 states)
capsule_return_pending → capsule_received → ready_for_review → draft → appended_draft → completed → completed_appended → closed → void
