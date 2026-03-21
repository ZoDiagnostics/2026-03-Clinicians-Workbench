# BUILD_08 — Admin Sub-Screen Completion

**Screens:** SCR-24 Manage Clinics, SCR-25 Manage Subscription, SCR-27 Manage ICD Codes
**Depends on:** BUILD_01 (Auth), BUILD_05 (Admin & Settings)
**Firebase services:** Firestore (practices subcollections, icdFavorites)

---

## SCR-24: Manage Clinics (`/admin/clinics`)

### Purpose
CRUD management for clinic locations within the practice. Each clinic has address, contact info, operating hours, and assigned equipment.

### Firestore Integration
```typescript
// Clinics are practice subcollections
const clinicsRef = collection(db, COLLECTIONS.CLINICS(practiceId));
const q = query(clinicsRef, orderBy('name'));
const unsubscribe = onSnapshot(q, (snapshot) => { /* update state */ });
```

### UI Elements
1. **Back button (ArrowLeft)** → `navigate('/admin')` (NOT `navigate(-1)`)
2. **Clinic list** with cards: Name, Address, Phone, Status (Active/Inactive)
3. **Add Clinic button** → opens create modal
4. **Edit button per clinic** → opens edit modal
5. **Deactivate/Activate toggle** per clinic
6. **Modal form fields**: Name, Address (street, city, state, zip), Phone, Fax, Email, Operating Hours (per day), Notes

### Acceptance Criteria
- [ ] CRUD operations on `practices/{practiceId}/clinics` collection
- [ ] Back button navigates to `/admin` (not browser back)
- [ ] Only admin and clinician_admin roles can access
- [ ] Clinic deactivation is soft-delete (status toggle, not document deletion)
- [ ] Form validation with Zod schemas

---

## SCR-25: Manage Subscription (`/admin/subscription`)

### Purpose
Display current subscription plan, usage metrics, and billing information. Read-only in current scope (billing managed externally).

### Firestore Integration
```typescript
// Subscription is a practice subcollection document
const subRef = doc(db, 'practices', practiceId, 'subscription', 'current');
const unsubscribe = onSnapshot(subRef, (snapshot) => { /* update state */ });
```

### UI Elements
1. **Back button (ArrowLeft)** → `navigate('/admin')`
2. **Current plan card**: Plan name, tier, monthly cost, renewal date
3. **Usage metrics panel**: Procedures this month, Storage used, Active users vs. seat limit
4. **Feature access matrix**: Which features are available on current plan
5. **Billing contact info** (read-only display)
6. **"Contact Sales" button** → external link or mailto

### Acceptance Criteria
- [ ] Subscription data loads from Firestore
- [ ] Only admin role can access (not clinician_admin)
- [ ] All fields are read-only (no edit capability)
- [ ] Usage metrics update in real-time
- [ ] Back button navigates to `/admin`

---

## SCR-27: Manage ICD Codes (`/admin/icd-codes`)

### Purpose
Manage practice-wide ICD-10/CPT code favorites and custom code mappings used by the Copilot auto-suggest feature (ZCW-BRD-0299).

### Firestore Integration
```typescript
// ICD Favorites are practice subcollections
// Note: This collection needs to be added to firestore-paths.ts
const favoritesRef = collection(db, 'practices', practiceId, 'icdFavorites');
const q = query(favoritesRef, orderBy('usageCount', 'desc'));
```

### UI Elements
1. **Back button (ArrowLeft)** → `navigate('/admin')`
2. **Search bar**: Search ICD-10 and CPT codes by code or description
3. **Favorites list**: Code, Description, Category, Usage Count, Last Used Date
4. **Add to Favorites button** → adds code from search results to practice favorites
5. **Remove from Favorites** → removes code (with confirmation)
6. **Custom mapping section**: Map finding descriptions to preferred codes
7. **Import/Export buttons**: CSV import/export of favorites list
8. **Usage statistics panel**: Most used codes, trending codes, codes by study type

### Acceptance Criteria
- [ ] ICD-10/CPT code search works against embedded code database
- [ ] Favorites persisted in `practices/{practiceId}/icdFavorites` collection
- [ ] Usage count incremented when Copilot suggests a favorited code
- [ ] Only admin and clinician_admin can access
- [ ] Back button navigates to `/admin`
- [ ] CSV import validates code format before saving

---
