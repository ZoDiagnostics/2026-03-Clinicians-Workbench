# Build Packet 05: Administration & System Settings

## Objective
Implement practice and staff management with role-based access, clinic configuration, subscription display, ICD code favorites, payer configuration, and capsule recall workflow.

## Files to Have Open in Firebase Studio
- `types/practice.ts`, `types/staff.ts`, `types/clinic.ts`, `types/capsule.ts`, `types/enums.ts`
- `screens/Admin.tsx`, `screens/ManageStaff.tsx`, `screens/ManagePractice.tsx`, `screens/ManageClinics.tsx`
- `screens/ManageSubscription.tsx`, `screens/ManageICDCodes.tsx`
- `lib/hooks.ts` (add admin hooks)
- `scaffold/firestore.rules` (admin rules)

## Requirements Implemented

### ZCW-BRD-0005 & 0088: Role-Based Access & Custom Roles
Roles provisioned via Firebase Auth custom claims. Administrators create custom roles with screen-level permissions. Base 5 roles: clinician_auth, clinician_noauth, clinician_admin, admin, clinical_staff.

### ZCW-BRD-0281: PHI Masking by Role
Field-level masking configurable per role. Sensitive fields: SSN, full DOB, insurance IDs, contact details. Unmask action logged.

### ZCW-BRD-0298: Delivery Defaults Configuration
Practice Settings stores default delivery methods and recipients for Sign & Deliver pre-population.

### ZCW-BRD-0292: Capsule Recall Workflow
Administrators initiate lot recall. Active banner shown on affected procedures. Affected procedure list visible. Notifications sent to clinicians.

## Implementation Steps

### Step 1: Practice Settings CRUD

Prompt Gemini:
```
Create Firestore schema and integration for practice configuration.

Collection: `practices/{practiceId}`

Document schema:
{
  practiceId: string
  name: string (practice name)
  type: 'hospital' | 'clinic' | 'private_practice'

  operationalConfig: {
    maxDailyProcedures: number
    procedureTimeoutMinutes: number
    workflowLockDuringReview: boolean
    requiresPhysicianApprovalForIncidentals: boolean
    indicationTemplatesEnabled: boolean
  }

  incidentalFindingsConfig: {
    defaultSensitivity: 1-10 (0247)
    autoGenerateReferrals: boolean
    requiresClinicianReviewBeforeReferral: boolean
  }

  lotNumberConfig: {
    traceabilitySearchEnabled: boolean
    autoValidateExpiryOnScan: boolean
  }

  ehrIntegration: {
    system: 'epic' | 'cerner' | 'allscripts' | 'other' | 'none'
    endpoint?: string
    enabled: boolean
    lastSyncAt?: timestamp
    nextScheduledSyncAt?: timestamp
  }

  pacsIntegration: {
    enabled: boolean
    system?: string
    endpoint?: string
  }

  notificationConfig: {
    emailEnabled: boolean
    pushEnabled: boolean
    smsEnabled: boolean
    quietHoursStart?: string (HH:MM format)
    quietHoursEnd?: string
    digestMode: boolean
    mandatoryNotificationTypes: string[]
  }

  localeConfig: {
    defaultLocale: 'en-US' | 'es-MX' | 'pt-BR' | 'ja-JP' | 'zh-CN' | 'de-DE'
    supportedLocales: string[]
    dateFormat: string (e.g., "MM/DD/YYYY")
    numberFormat: string
  }

  annotationTemplates: [{
    templateId: string
    studyType: 'upper_gi' | 'sb_diagnostic' | 'sb_crohns' | 'colon'
    name: string
    fields: [{
      fieldName: string
      fieldType: 'text' | 'number' | 'select' | 'checkbox'
      required: boolean
      options?: string[]
    }]
  }]

  capsuleRecallList: [{
    recallId: string
    lotNumber: string
    reason: string
    initiatedBy: userId
    initiatedAt: timestamp
    affectedProcedureCount: number
    notificationsSet: boolean
  }]

  deliveryDefaults: {
    defaultMethod: 'email' | 'print' | 'portal'
    emailRecipients: {
      patient: boolean
      referringPhysician: boolean
      referringPhysicianEmail?: string
      practice: boolean
      practiceEmail?: string
    }
    printMethod: 'direct' | 'queue'
    portalEnabled: boolean
  }

  indicationTemplates: [{
    studyType: 'upper_gi' | 'sb_diagnostic' | 'sb_crohns' | 'colon'
    indications: [{
      id: string
      text: string
      icon?: string
    }]
  }]

  createdAt: timestamp
  updatedAt: timestamp
  updatedBy: userId
}

Create hooks in `lib/hooks.ts`:
- `usePracticeSettings(practiceId)`: load settings + real-time updates
- `updatePracticeSettings(practiceId, updates)`: update sections
- `updateDeliveryDefaults(practiceId, defaults)`: update delivery config
- `addCapsuleRecall(practiceId, lotNumber, reason)`: initiate recall
- `resolveRecall(practiceId, recallId)`: mark recall resolved
```

### Step 2: Staff Management & Role Provisioning

Prompt Gemini:
```
Update ManageStaff.tsx to integrate with Firebase Auth and role provisioning.

Staff collection: `practices/{practiceId}/staff`

Document schema:
{
  staffId: string (same as Auth UID)
  email: string
  firstName: string
  lastName: string
  role: 'clinician_auth' | 'clinician_noauth' | 'clinician_admin' | 'admin' | 'clinical_staff'
  customRoleId?: string (if using custom role per BRD-0088)
  status: 'active' | 'inactive' | 'pending_invite'
  clinicIds: string[] (assigned clinics)
  delegationRules?: [{
    fromUserId: userId
    scope: 'read_only' | 'review_transfer' | 'full_authority'
    expiresAt: timestamp
    isActive: boolean
  }]
  phiMaskingConfig: {
    maskedFields: string[] (array of field names to mask)
    canUnmask: boolean
    unmaskedCount: number
  }
  lastLoginAt?: timestamp
  createdAt: timestamp
  createdBy: userId
  updatedAt: timestamp
  updatedBy: userId
}

UI layout for ManageStaff:
1. Staff table columns:
   - First name / Last name
   - Email
   - Role (dropdown, editable)
   - Status (Active/Inactive badge)
   - Clinics assigned (tags)
   - Last login (date)
   - Actions: Edit / Deactivate / Delete / Impersonate (for demo)

2. Add Staff button:
   - Modal with form: email, first name, last name, role, clinics
   - On submit:
     a. Create Auth user via Cloud Function `createStaffUser(email, role, clinicIds)`
     b. Create staff document in Firestore
     c. Send invitation email to user
     d. Show toast: "Staff member added, invitation sent"

3. Edit Staff:
   - Click role dropdown → selector modal
   - Role options: clinician_auth, clinician_noauth, clinician_admin, admin, clinical_staff
   - Custom roles (BRD-0088): additional selector for custom roles
   - On change:
     a. Call `updateUserRole(uid, newRole)` Cloud Function
     b. Updates custom claims in Firebase Auth
     c. Updates staff document
     d. Creates audit log: 'staff_role_changed'
     e. Toast: "Role updated for [Name]"

4. Clinic assignment:
   - Multi-select: assign staff to multiple clinics
   - On save: update staff.clinicIds[]

5. Delegation management (0285):
   - Clinician can delegate coverage to another clinician
   - "Add Delegation" button opens modal
   - Delegate to: clinician selector
   - Scope: Read-only / Review Transfer / Full Authority
   - Duration: expiry date/time selector
   - On save: create delegationRules entry
   - Show active delegations table with expiry countdowns

6. PHI Masking rules (0281):
   - Per-staff masking configuration
   - "Configure Masking" button → modal
   - Checkboxes for field masking: SSN, full DOB, insurance IDs, contact details
   - Toggle "Can unmask fields" (logs unmask actions)
   - On save: update phiMaskingConfig

7. Deactivate:
   - Click "Deactivate" → confirmation modal
   - On confirm: set status = 'inactive'
   - Clinic access revoked, auth access disabled
   - Toast: "Staff member deactivated"

8. Delete:
   - Admin only
   - Confirmation: "This cannot be undone"
   - On confirm: delete from staff collection + archive in audit log

Firestore operations:
- Cloud Function `createStaffUser(email, firstName, lastName, role, clinicIds)`:
  1. Create Auth user (temporary password or email link)
  2. Set custom claims: { role, practiceId, clinicIds }
  3. Create staff document
  4. Send invitation email
  5. Create audit log: 'staff_created'

- Cloud Function `updateUserRole(uid, newRole, practiceId)`:
  1. Validate caller is admin
  2. Update Auth custom claims to newRole
  3. Update staff document role
  4. Create audit log: 'staff_role_updated'
```

### Step 3: Clinic Management

Prompt Gemini:
```
Update ManageClinics.tsx with master-detail clinic management.

Clinics collection: `practices/{practiceId}/clinics`

Document schema:
{
  clinicId: string
  name: string
  type: 'hospital_department' | 'outpatient_clinic' | 'private_practice'
  address: string
  city: string
  state: string
  zipCode: string
  phone: string
  email: string
  contactPerson?: string
  workingHours: {
    monday: { start: string, end: string }
    // ... through sunday
  }
  specializations: string[] (e.g., ["gastroenterology", "hepatology"])
  equipment: string[] (e.g., ["endoscope_A", "recorder_B"])
  staffIds: string[] (assigned staff UIDs)
  capacity: {
    maxDailyProcedures: number
    avgProcedureTime: number (minutes)
  }
  operationalAlerts?: string[]
  createdAt: timestamp
  updatedAt: timestamp
  updatedBy: userId
}

UI layout (Master-Detail):
1. Left panel (Master list):
   - Clinic list with search/filter
   - Columns: name, city, status (active/inactive)
   - Click row → loads detail on right

2. Right panel (Detail view):
   - Clinic information (editable):
     - Name, type, address, city, state, zip, phone, email, contact person
   - Working hours: expandable table (days and times)
   - Specializations: multi-select tags
   - Equipment: multi-select from practice equipment list
   - Staff assigned: multi-select staff list
   - Capacity: max daily procedures, avg procedure time
   - Save button: persists to Firestore
   - Toast: "Clinic updated"

3. Add Clinic button:
   - Opens new detail panel (empty form)
   - On save: creates clinic document
   - Toast: "Clinic created"

4. Deactivate clinic:
   - Button in detail panel
   - On confirm: set status = 'inactive'
   - Hides from staff clinic selector
```

### Step 4: Subscription Management

Prompt Gemini:
```
Update ManageSubscription.tsx to display subscription and billing information.

Subscription document: `practices/{practiceId}/subscription`

Schema:
{
  subscriptionId: string
  practiceId: string
  planName: string (e.g., "Professional Plan", "Enterprise Plan")
  planTier: 'starter' | 'professional' | 'enterprise'
  status: 'active' | 'paused' | 'expired' | 'cancelled'
  features: {
    maxClinicians: number
    maxClinics: number
    aiReportsIncluded: boolean
    voiceInputEnabled: boolean
    analyticsWorkbench: boolean
    customRoles: boolean (0088)
     ehrIntegration: boolean
    advancedReporting: boolean
  }
  startDate: date
  renewalDate: date
  billingCycle: 'monthly' | 'annual'
  monthlyPrice: number
  annualPrice: number

  invoices: [{
    invoiceId: string
    date: date
    amount: number
    status: 'paid' | 'pending' | 'failed' | 'cancelled'
    downloadUrl?: string
  }]

  paymentMethod: {
    type: 'credit_card' | 'ach' | 'invoice'
    last4?: string
    expiryMonth?: number
    expiryYear?: number
    cardBrand?: string
  }

  contact: {
    email: string
    phone: string
  }
}

UI layout:
1. Plan overview:
   - Current plan name + tier
   - Status badge (active/paused/expired)
   - Monthly/annual cycle indicator

2. Feature breakdown:
   - Card grid showing enabled/disabled features
   - Icons: checkmark for enabled, X for disabled
   - Features: max clinicians, max clinics, AI reports, voice input, analytics,
     custom roles, EHR integration, advanced reporting

3. Billing information:
   - Next renewal date
   - Current monthly/annual price
   - Auto-renewal toggle (disabled in demo, shows "Contact sales")

4. Payment method:
   - Display: "Visa ending in 4242"
   - "Update Payment Method" button (disabled in demo)

5. Invoice history:
   - Table: date, amount, status, download link
   - Download PDF for each invoice
   - Export all invoices button

6. Support:
   - "Manage Subscription" link (external to billing portal)
   - "Contact Sales" link
   - "View Terms" link

Read-only for non-admin users (admin_only access).
```

### Step 5: ICD Code Management & Favorites

Prompt Gemini:
```
Update ManageICDCodes.tsx to manage ICD-10 code favorites and reference library.

Collections:
- `practices/{practiceId}/icdFavorites`: searchable ICD-10 codes marked as favorites
- `practices/{practiceId}/cptFavorites`: searchable CPT codes marked as favorites

Document schema (ICD Favorites):
{
  favoriteId: string
  code: string (e.g., "K11.9")
  description: string
  category: string (e.g., "Salivary Gland Disorders")
  usageCount: number (auto-incremented when used in report)
  lastUsedAt?: timestamp
  createdBy: userId
  createdAt: timestamp
  isActive: boolean
}

UI layout:
1. Tabs: "ICD-10 Favorites" / "CPT Favorites"

2. ICD-10 tab:
   a. Search box: search by code or description
   b. Results table:
      - Code (e.g., "K11.9")
      - Description
      - Category
      - Usage count
      - Last used (date)
      - Actions: "Use in Report" / "Remove" / "View Details"
   c. "Add Favorite" button → opens ICD lookup modal
      - Search full ICD-10 database
      - Select code → adds to favorites
      - Toast: "K11.9 added to favorites"

3. CPT tab:
   - Similar layout to ICD-10
   - Codes: 43235, 45398, 91110, etc.
   - Study-type grouping (optional)

4. Auto-refresh from usage:
   - When codes used in reports (BUILD_04), usageCount increments
   - Last used date updates
   - Table re-sorts by usage count DESC

5. Bulk actions:
   - Select multiple rows → "Remove Selected" button
   - Confirmation modal

6. Import/Export (optional):
   - "Import Codes" button: CSV upload
   - "Export Favorites" button: download CSV

Firestore operations:
- `addIcdFavorite(practiceId, code, description)`: create favorite
- `removeIcdFavorite(practiceId, favoriteId)`: delete favorite
- `incrementCodeUsage(practiceId, code)`: increment usage count on report creation
```

### Step 6: Capsule Recall Workflow

Prompt Gemini:
```
Implement capsule recall management per ZCW-BRD-0292.

Recall flow:
1. Admin initiates recall from Practice Settings (SCR-23):
   - "Capsule Lot Recall" section
   - Button: "Initiate Recall"
   - Modal: lot number selector + reason text
   - On submit:
     a. Call `initiateCapsuleRecall(practiceId, lotNumber, reason)` Cloud Function
     b. Query procedures where capsuleInfo.lotNumber = lotNumber
     c. Create recall document in practice.capsuleRecallList
     d. Set active recall banner on all affected procedures
     e. Send notifications to all assigned clinicians

2. Active recall banner:
   - Appears on Dashboard and Procedures list if active recall exists
   - Text: "ACTIVE CAPSULE RECALL: Lot ABC123 — [Reason]"
   - Color: red/warning
   - Action: "View Affected Procedures" button

3. Affected procedures list:
   - Query: procedures where capsuleInfo.lotNumber matches recalled lot
   - Display table: patient, procedure date, clinician, status
   - Status: "Procedure completed" / "In progress" / "Pending"
   - Action column: "Mark as Reviewed" (per clinician)

4. Resolution:
   - When all affected procedures reviewed + marked safe or remediated:
     a. Admin clicks "Resolve Recall"
     b. Call `resolveCapsuleRecall(practiceId, recallId)` Cloud Function
     c. Remove recall from active list
     d. Send notification: "Recall resolved"

Firestore schema (embedded in practice document):
- practice.capsuleRecallList: [{ recallId, lotNumber, reason, initiatedBy, initiatedAt, affectedProcedureCount, notificationsSet, resolvedAt?, resolvedBy? }]

Cloud Functions:
- `initiateCapsuleRecall(practiceId, lotNumber, reason)`:
  1. Find all procedures with capsuleInfo.lotNumber = lotNumber
  2. Create recall entry in practice.capsuleRecallList
  3. Set recall flag on each affected procedure
  4. Query staff with admin/clinician_admin roles
  5. Send notifications to all staff
  6. Create audit log: 'capsule_recall_initiated'
  7. Return { recallId, affectedCount }

- `resolveCapsuleRecall(practiceId, recallId)`:
  1. Update recall.resolvedAt, recall.resolvedBy
  2. Remove recall flag from affected procedures
  3. Send notification: recall resolved
  4. Create audit log: 'capsule_recall_resolved'
```

## Acceptance Criteria

- [ ] Practice Settings load from Firestore
- [ ] Delivery defaults pre-populate Sign & Deliver screen
- [ ] Indication templates configurable per study type
- [ ] Incidental findings sensitivity configurable (1-10)
- [ ] EHR integration endpoint saveable
- [ ] Notification preferences configurable
- [ ] Locale settings update date/number formatting
- [ ] Staff table loads all practice staff
- [ ] Add Staff creates Auth user and staff document
- [ ] Role dropdown updates custom claims via Cloud Function
- [ ] Role change creates audit log
- [ ] Clinic assignment multi-select works
- [ ] Delegation rules create and display correctly
- [ ] Delegation expiry countdown visible
- [ ] PHI masking rules configurable per staff member
- [ ] Unmask action logs to audit trail
- [ ] Clinics master-detail works
- [ ] Add clinic creates document
- [ ] Clinic edit updates Firestore
- [ ] Subscription plan information displays
- [ ] Features enabled/disabled correctly per plan
- [ ] Invoice history shows with download links
- [ ] ICD-10 search functional
- [ ] Favorite codes add/remove works
- [ ] Code usage count increments on report creation
- [ ] Favorites sorted by usage count
- [ ] Capsule recall initiated creates recall document
- [ ] Active recall banner displays on affected procedures
- [ ] Affected procedures list shows all matching lots
- [ ] Recall resolution removes banner and notifications
- [ ] All admin operations create audit log entries
- [ ] Firestore security rules enforce admin access only

## Testing Notes

Test staff management:
1. Add staff member → verify Auth user created + invitation sent
2. Change role → verify custom claims updated in Firebase
3. Assign clinics → verify staff document updated
4. Deactivate staff → verify auth access disabled

Test practice settings:
1. Update delivery defaults → verify pre-populated in Sign & Deliver
2. Change indication templates → verify CheckIn loads new templates
3. Update locale → verify date format changes globally

Test clinic management:
1. Create clinic → verify appears in staff clinic selector
2. Edit clinic → verify Firestore updated
3. Assign staff to clinic → verify staff can see clinic

Test ICD code management:
1. Add favorite code → verify appears in list
2. Use code in report → verify usage count increments
3. Sort by usage → verify highest-used codes first

Test capsule recall:
1. Initiate recall for lot ABC123 → verify affected procedures marked
2. Verify recall banner appears on Dashboard
3. Verify clinicians receive notification
4. Resolve recall → banner disappears

---
