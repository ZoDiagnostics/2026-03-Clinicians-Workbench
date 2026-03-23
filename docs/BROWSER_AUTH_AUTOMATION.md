# ZoCW Browser Auth Automation Guide

## Overview

This document provides reusable JavaScript snippets for automated browser testing of ZoCW across all 4 test roles. These work in Cowork browser automation (Claude in Chrome) and any browser console.

## Prerequisites

Custom claims MUST be set on all test users via `fix-claims.ts` (run once from Firebase Studio). Without claims, login succeeds but the app redirects back to `/login` after ~15 seconds.

## Test Credentials

| Email | Password | Role | UID |
|-------|----------|------|-----|
| clinician@zocw.com | password | clinician_auth | uKbxuvulVLUDSa5INUxGh9S4QSh1 |
| admin@zocw.com | password | admin | VtPqYvrpwCZhTFqCpzkP7FR3aZt2 |
| staff@zocw.com | password | clinical_staff | cf9f1YBWFhNAB9KLbk1qVdoE1tE2 |
| noauth@zocw.com | password | clinician_noauth | 0ZhIsvTsClV37xic0KQDYSMeEM33 |
| clinadmin@zocw.com | password | clinician_admin | (created by fix-claims.ts) |

## Login Automation Snippet

This fills the React login form using the native input value setter (required because React controlled inputs don't respond to `form_input` or simple `.value =` assignment).

```javascript
// === AUTOMATED LOGIN ===
// Replace EMAIL with desired test user
const EMAIL = 'admin@zocw.com';
const PASSWORD = 'password';

const nativeSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype, 'value'
).set;

const emailInput = document.querySelector('input[type="email"]');
const passwordInput = document.querySelector('input[type="password"]');

nativeSetter.call(emailInput, EMAIL);
emailInput.dispatchEvent(new Event('input', { bubbles: true }));
emailInput.dispatchEvent(new Event('change', { bubbles: true }));

nativeSetter.call(passwordInput, PASSWORD);
passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

setTimeout(() => {
  const btn = document.querySelector('button[type="submit"]') ||
    Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent.includes('Sign in'));
  if (btn) btn.click();
}, 200);
```

## Sign Out + Switch Role Snippet

```javascript
// === SIGN OUT (clear IndexedDB auth) ===
(async () => {
  const dbs = await indexedDB.databases();
  for (const db of dbs) {
    if (db.name && db.name.includes('firebase')) {
      indexedDB.deleteDatabase(db.name);
    }
  }
  window.location.href = '/login';
})();
```

After the page reloads to `/login`, run the Login Automation Snippet with the new email.

## Cowork Automation Sequence (for Sonnet prompts)

When writing Sonnet testing prompts that need role-based testing:

1. Navigate to `https://cw-e7c19.web.app/login`
2. Wait 2 seconds for page load
3. Run the Login Automation Snippet via `javascript_tool`
4. Wait 5 seconds for auth + dashboard load
5. Take screenshot to verify (top-right shows role name)
6. Perform tests
7. To switch roles: run Sign Out snippet, wait 2s, run Login with new email

## RBAC Sidebar Expectations

| Role | Admin & Settings visible? | Sign/Deliver enabled? |
|------|--------------------------|----------------------|
| admin | YES | No (not a clinician) |
| clinician_auth | No | YES |
| clinician_noauth | No | No (cannot sign) |
| clinical_staff | No | No (not a clinician) |

## Troubleshooting

**"Invalid email or password"**: Password is `password` (not `password123` or anything else).

**"Loading..." then redirect to /login**: Custom claims missing. Run `npx tsx fix-claims.ts` in Firebase Studio.

**Form doesn't submit**: The native setter technique is required for React controlled inputs. Regular `input.value = 'x'` won't trigger React state updates.

**Claims out of date after re-seed**: The updated `seed-demo.ts` now sets claims on every run. If running an older version, run `fix-claims.ts` afterward.
