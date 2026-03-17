# ZoCW Firebase Setup Checklist v1.0
**Purpose:** Complete the Firebase Console setup BEFORE any AI-assisted coding.
**Time Estimate:** 20–30 minutes (manual, in browser)
**Last Updated:** March 16, 2026

---

## Why This Exists

In the prior build attempt, ~80 turns (8+ hours) were wasted because:
- Firebase API keys were never retrieved from the console
- A fake key (`AIzaSyA-Studio-Manual-Fix-123`) was used instead
- The app compiled but could never authenticate
- Gemini blamed browser cache instead of recognizing the credentials were fake

**Rule: Complete this checklist BEFORE opening Firebase Studio AI. Do not skip steps.**

---

## Part 1: Firebase Project Setup (in browser)

### Step 1: Access Firebase Console
- [ ] Open https://console.firebase.google.com in a regular browser tab (NOT inside Firebase Studio)
- [ ] Sign in with your Google account (cameron.plummer@gmail.com)
- [ ] You should see your existing project `clinicians-workbench` — click on it
- [ ] If no project exists, create one: "Add project" → name it `clinicians-workbench` → disable Google Analytics for now → Create

### Step 2: Register Web App
- [ ] In the Firebase Console, click the gear icon (⚙️) → **Project Settings**
- [ ] Scroll down to **"Your apps"** section
- [ ] If no web app exists: Click the web icon (`</>`) → Register app → name it `zocw-web` → do NOT check Firebase Hosting → Register
- [ ] You should now see the **Firebase SDK config** snippet. It looks like:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",          // ← REAL key, starts with AIzaSy
  authDomain: "clinicians-workbench.firebaseapp.com",
  projectId: "clinicians-workbench",
  storageBucket: "clinicians-workbench.firebasestorage.app",
  messagingSenderId: "1017397048798",
  appId: "1:1017397048798:web:..."
};
```
- [ ] **COPY ALL SIX VALUES** — you'll need them in Step 5

### Step 3: Enable Authentication
- [ ] In left sidebar: **Build** → **Authentication**
- [ ] Click **"Get started"** if not already enabled
- [ ] Under **Sign-in method** tab:
  - [ ] Enable **Email/Password** → toggle ON → Save
  - [ ] (Optional) Enable **Google** → toggle ON → set support email → Save
- [ ] Under **Settings** tab → **Authorized domains**:
  - [ ] Confirm `localhost` is listed
  - [ ] Add any Firebase Studio / Cloud Workstation domains if needed

### Step 4: Provision Firestore Database
- [ ] In left sidebar: **Build** → **Firestore Database**
- [ ] If not created: Click **"Create database"**
  - [ ] Choose location: `us-west1` (or your preferred region)
  - [ ] Start in **test mode** (allows all reads/writes for 30 days)
  - [ ] Click **Create**
- [ ] Verify you see the empty Firestore Data tab with "Start collection" prompt
- [ ] Note: Security rules should show `allow read, write: if true` in test mode

### Step 5: Create .env File
- [ ] In your project root, create a file called `.env` (not `.env.example`)
- [ ] Paste the following, replacing each value with the REAL values from Step 2:
```
VITE_FIREBASE_API_KEY=AIzaSy_YOUR_REAL_KEY_HERE
VITE_FIREBASE_AUTH_DOMAIN=clinicians-workbench.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=clinicians-workbench
VITE_FIREBASE_STORAGE_BUCKET=clinicians-workbench.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_REAL_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_REAL_APP_ID
VITE_ENVIRONMENT=development
VITE_LOG_LEVEL=debug
VITE_ENABLE_DEMO_MODE=false
VITE_APP_NAME=Zo Clinicians Workbench
VITE_APP_VERSION=3.1.0
```
- [ ] **Verify:** Every `VITE_FIREBASE_*` value is a real string from Firebase Console, not a placeholder

### Step 6: Verify Firebase CLI Project Alignment
- [ ] In terminal, run: `firebase projects:list`
- [ ] Confirm `clinicians-workbench` appears in the list
- [ ] Run: `firebase use clinicians-workbench`
- [ ] Run: `cat .firebaserc` — should show `"default": "clinicians-workbench"`
- [ ] **Critical check:** Run `gcloud config get-value project` — if this shows a DIFFERENT project ID (like `clinicians-workbench-73608547`), run `gcloud config set project clinicians-workbench`

---

## Part 2: Workspace Verification (in Firebase Studio terminal)

### Step 7: Verify File Structure
- [ ] `ls index.html` → must exist at project ROOT (not in .idx/ or scaffold/)
- [ ] `ls lib/firebase.ts` → must exist
- [ ] `ls lib/hooks.tsx` → must be `.tsx` NOT `.ts`
- [ ] `ls lib/store.tsx` → must exist
- [ ] `ls lib/router.tsx` → must exist
- [ ] `ls .env` → must exist (created in Step 5)
- [ ] `cat .env | grep VITE_FIREBASE_API_KEY` → must show a real key starting with `AIzaSy`

### Step 8: Install Dependencies and Boot
- [ ] `npm install` → should complete without errors
- [ ] `npm run dev` → Vite should start and show a localhost URL
- [ ] Open the preview URL in browser → should see SOMETHING (even if it's a blank page with no errors, that's better than a build failure)

### Step 9: Verify Firebase Connection
- [ ] Open browser DevTools (F12) → Console tab
- [ ] Look for Firebase initialization messages (no "API key not valid" errors)
- [ ] If you see `auth/api-key-not-valid`: your .env has wrong values → go back to Step 5
- [ ] If you see `auth/configuration-not-found`: your project ID is wrong → go back to Step 6

### Step 10: Create Test User
- [ ] In Firebase Console → Authentication → Users tab
- [ ] Click **"Add user"**
- [ ] Email: `cameron.plummer@gmail.com`, Password: (your choice)
- [ ] Verify user appears in the list with a UID

---

## Part 3: Data Seeding Verification

### Step 11: Seed Firestore (after Phase 1 build)
- [ ] Run: `npx tsx seed.ts` (seed script will be created in Phase 1)
- [ ] Expected output: `✅ SUCCESS: Clinical data is now live!`
- [ ] **Immediately verify in Firebase Console:**
  - [ ] Go to Firestore → Data tab
  - [ ] You should see collections: `patients`, `procedures`, `practices`
  - [ ] If collections are EMPTY: the seed wrote to the wrong project → check Step 6

### Step 12: Verify App Displays Data
- [ ] Refresh the app in browser
- [ ] Dashboard should show patient count > 0
- [ ] If dashboard shows 0: check browser console for Firestore errors

---

## Verification Summary

Before proceeding to Phase 1 AI-assisted build, ALL of these must be true:

| Check | Command / Location | Expected |
|-------|-------------------|----------|
| Real API key in .env | `cat .env \| grep API_KEY` | Starts with `AIzaSy` |
| Firebase project aligned | `firebase use` | `clinicians-workbench` |
| gcloud project aligned | `gcloud config get-value project` | `clinicians-workbench` |
| .firebaserc correct | `cat .firebaserc` | `"default": "clinicians-workbench"` |
| Vite boots | `npm run dev` | Shows localhost URL |
| No console errors | Browser DevTools | No `auth/` errors |
| Auth user exists | Firebase Console → Auth | cameron.plummer@gmail.com listed |
| Firestore provisioned | Firebase Console → Firestore | Data tab accessible |
| hooks.tsx extension | `ls lib/hooks.tsx` | File exists (NOT .ts) |
| index.html at root | `ls index.html` | File exists at project root |

**If ANY check fails, fix it before starting the AI build session.**

---

*This checklist is referenced by PHASE_PROMPTS.md Phase 0.*
