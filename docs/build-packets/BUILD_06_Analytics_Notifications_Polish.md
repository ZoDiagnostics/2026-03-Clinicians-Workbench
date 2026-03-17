# Build Packet 06: Analytics, Notifications & Polish

## Objective
Implement notification system with real-time routing, analytics dashboards with Firestore aggregation, activity logging, education library delivery triggers, and final UI polish.

## Files to Have Open in Firebase Studio
- `types/notification.ts`, `types/analytics.ts`, `types/audit.ts`, `types/education.ts`, `types/enums.ts`
- `screens/Dashboard.tsx`, `screens/Operations.tsx`, `screens/Analytics.tsx`, `screens/AIQA.tsx`, `screens/ActivityLog.tsx`, `screens/Education.tsx`
- `components/NotificationDrawer.tsx`, `components/Header.tsx`
- `lib/hooks.ts` (add notification hooks)
- `scaffold/firestore.rules` (notification rules)

## Requirements Implemented

### ZCW-BRD-0259–0260: Notification Infrastructure & Preferences
In-app, email, push channels with event-driven delivery. Per-user channel toggles, quiet hours, digest mode, mandatory notification types, escalation rules.

### ZCW-BRD-0251–0252: Analytics Export & Scheduling
Dashboard and Workbench export PDF/CSV/PNG. Scheduled report delivery via email.

### ZCW-BRD-0253: Analytics View Sharing
Saved analytics views shareable between practice users.

### ZCW-BRD-0290: Education Delivery Triggers
Auto-suggest education materials at check-in, post-sign, post-referral. Trigger learning engine.

## Implementation Steps

### Step 1: Notification Firestore Schema & Real-Time Router

Prompt Gemini:
```
Create Firestore notification system with event-driven delivery and routing.

Collections:
- `users/{uid}/notifications`: per-user notification queue
- `notificationTemplates`: system notification templates
- `notificationLog`: audit trail of all notifications sent

Notification document schema:
{
  notificationId: string
  userId: string (recipient)
  type: 'study_assignment' | 'signature_request' | 'qa_alert' | 'recall_notice' |
         'education_assigned' | 'transfer_request' | 'system_alert' | 'workflow_alert'
  title: string
  message: string (user-facing text)
  channels: {
    inApp: { enabled: boolean, sentAt?: timestamp }
    email: { enabled: boolean, sentAt?: timestamp }
    push: { enabled: boolean, sentAt?: timestamp }
  }
  actionUrl?: string (route to navigate on click)
  relatedEntity: {
    type: 'procedure' | 'report' | 'patient' | 'recall' | 'education' | 'system'
    entityId: string
  }
  priority: 'low' | 'normal' | 'high' | 'urgent'
  read: boolean (only for in-app)
  readAt?: timestamp
  createdAt: timestamp
  expiresAt?: timestamp (90-day retention, auto-delete)
  metadata?: {
    procedureId?: string
    patientId?: string
    clinician?: string
    findingType?: string
    // ... context-specific fields
  }
}

Create Cloud Function `routeNotification(event)` triggered on Firestore writes:
1. Listen for procedure status changes, report operations, recalls, etc.
2. Determine notification type + template
3. Query user preferences from `users/{uid}/preferences`
4. Check quiet hours + digest mode settings
5. For each enabled channel:
   - In-App: write to users/{uid}/notifications
   - Email: call SendGrid Cloud Function
   - Push: call Firebase Cloud Messaging
6. Create audit entry in notificationLog
7. Return { notificationId, channelsSent: [] }

Example triggers:
- Procedure status = 'ready_for_review' → send "Study Ready for Review" to assigned clinicians
- Report signed → send "Report signed by [Clinician]" to referring physician (email)
- Recall initiated → send "Capsule lot [ABC] recalled" (urgent) to all staff
- Education assigned → send "Patient education material assigned" to patient (email)

Cloud Function implementation:
```
exports.routeNotification = functions.firestore
  .document('procedures/{procId}')
  .onUpdate(async (change, context) => {
    const newProc = change.after.data();
    const oldProc = change.before.data();

    // Detect status change
    if (oldProc.status !== newProc.status) {
      const notificationType = getNotificationType(newProc.status);
      const recipientIds = getRecipients(newProc.status, newProc.assignedTo);

      for (const userId of recipientIds) {
        const prefs = await admin.firestore()
          .collection('users').doc(userId).collection('preferences').get();

        const notification = {
          userId,
          type: notificationType,
          title: generateTitle(notificationType, newProc),
          message: generateMessage(notificationType, newProc),
          channels: selectChannels(prefs.data(), notificationType),
          actionUrl: getRouteForProcedure(newProc.id, newProc.status),
          relatedEntity: { type: 'procedure', entityId: newProc.id },
          priority: getPriority(notificationType),
          read: false,
          createdAt: FieldValue.serverTimestamp(),
          expiresAt: admin.firestore.Timestamp.fromDate(
            new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          )
        };

        await admin.firestore()
          .collection('users').doc(userId)
          .collection('notifications').add(notification);

        // Send email if enabled
        if (notification.channels.email.enabled) {
          await sendEmail(userId, notification);
        }
      }
    }
  });
```

Create hooks:
- `useNotifications(userId)`: real-time listener, returns unread notifications
- `markNotificationRead(userId, notificationId)`: set read = true
- `markAllNotificationsRead(userId)`: batch update all to read = true
- `deleteNotification(userId, notificationId)`: archive notification
```

### Step 2: Notification Drawer & Preferences

Prompt Gemini:
```
Update NotificationDrawer.tsx with real-time notification list and preferences.

Drawer layout (Header component):
1. Notification bell icon (top-right):
   - Badge count: unread notifications
   - Click to open/close drawer

2. Drawer panel (slide-in from right):
   - Header: "Notifications" + close button
   - Tabs: "All" / "Unread" / "Actions"
   - Search/filter: by type, priority

3. Notification list (scrollable):
   - Each notification card shows:
     a. Icon (per type): study, report, alert, recall, education
     b. Title + message (first 80 chars)
     c. Time: "2 hours ago" (relative time)
     d. Type badge: "Study Assignment" / "Signature Request" / etc.
     e. Priority dot: red (urgent), orange (high), gray (normal/low)
     f. Read indicator: filled circle (unread), empty circle (read)
     g. Hover action: click → navigate via actionUrl

4. Notification detail (on click):
   - Full message text
   - Related entity: linked to procedure/patient/etc.
   - "Open Related [Procedure/Report/Patient]" button → navigate
   - "Mark as Read" toggle
   - "Delete" button

5. Top actions:
   - "Mark All Read" button
   - "Notification Preferences" link → navigate to Admin > Notification Settings

6. Empty state:
   - "No notifications" message
   - Icon + helpful text

7. Notification preferences modal (0260):
   - Per-channel toggles: In-App, Email, Push
   - Quiet hours: time range selector (start/end HH:MM)
   - Digest mode: toggle + frequency selector (daily/weekly)
   - Mandatory notifications: always send list (signature requests, urgent alerts)
   - Notification type preferences: toggle each type
   - Save button → update users/{uid}/preferences document

Props:
- onNotificationClick: (actionUrl) => void (callback to navigate)
- unreadCount: number
- notifications: Notification[]

Firestore operations:
- Real-time listener: onSnapshot(users/{uid}/notifications, orderBy('createdAt', 'desc'))
- Mark read: update({ read: true, readAt: FieldValue.serverTimestamp() })
- Mark all read: batch update all notifications
- Delete: delete document from notifications collection
- Preferences: write to users/{uid}/preferences document
```

### Step 3: Analytics Dashboards with Firestore Aggregation

Prompt Gemini:
```
Implement SCR-29 Clinic Operations Dashboard and SCR-30 Analytics Workbench with Firestore aggregation.

SCR-29 Clinic Operations Dashboard (0251, 0252, 0272):
1. Real-time metrics:
   - "Procedures Completed Today": count(procedures where createdAt >= today AND status = 'completed')
   - "In Progress Reviews": count(procedures where status = 'draft')
   - "Awaiting Review": count(procedures where status = 'ready_for_review')
   - "Signed This Week": count(reports where status = 'signed' AND createdAt >= (now - 7 days))
   - "Average Review Time": avg(timeToReview) over last 30 days
   - "Procedure Funnel": chart showing status distribution

2. Workflow funnel chart:
   - Horizontal bar chart: Check-In → Upload → Review → Draft → Signed
   - Count per stage
   - Percentage of total
   - Click bar → drill down to procedure list for that stage

3. Lag metrics:
   - "Longest Awaiting Review": max(daysWaitingForReview) for ready_for_review procedures
   - "Average Days to Sign": avg(daysFromReviewToSign) over last 30 days
   - Alerts: if lag > threshold, show red banner

4. Clinician productivity:
   - Table: clinician, procedures reviewed, avg time, quality score
   - Sortable: by procedures reviewed, time, quality
   - Click clinician → drill down to their procedures

5. Operational alerts:
   - Banner cards showing:
     - "N procedures >3 days awaiting review" (red)
     - "Quality score below target" (orange)
     - "Capsule recall active" (red)

6. Capsule inventory tracking:
   - "Capsules Used This Month": N
   - "Capsules Remaining": N
   - "Days Until Restock": N
   - Link to Capsule Usage listing (SCR-34)

7. Export toolbar:
   - Buttons: PDF, CSV, PNG
   - Schedule Report button: opens modal with frequency/recipient
   - On export: call exportDashboard(format) Cloud Function

8. Firestore aggregation approach:
   - Query procedures collection with appropriate filters
   - Use Firestore aggregation queries for counts, averages
   - For complex aggregations (percentiles, funnel): export to BigQuery (future phase)
   - Cache metrics with 5-minute TTL in Firestore document `analytics/daily_metrics`

SCR-30 Analytics Workbench (0251, 0252, 0253, 0294, 0295):
1. Persistent cohort filter bar (sticky at top):
   - Date range picker: "Last 30 days" / "Last 90 days" / "Custom range"
   - Study type filter: Upper GI, SB-Diagnostic, Crohn's, Colon
   - Clinician filter: multi-select
   - Clinic filter: multi-select
   - "Apply Filters" button → refresh all charts

2. Pre-built views:
   a. Finding Prevalence:
      - Pie chart: top 10 findings by frequency
      - Legend with percentages
      - Click slice → drill to procedures with that finding

   b. Patient Demographics:
      - Age distribution chart (histogram)
      - Gender breakdown (pie)
      - Geographic heat map (by state/region)

   c. ICD Frequency:
      - Bar chart: most common ICD-10 codes
      - Stacked by study type

   d. Longitudinal Disease Tracking (0295):
      - Line charts per disease type:
        - Crohn's: Lewis Score trend over time
        - Colon: Polyp count trend
        - Ulcer count, inflammatory markers
      - X-axis: time, Y-axis: metric value
      - Alert threshold lines
      - Click point → view individual procedure

3. Docked Copilot panel (right side):
   - Share filter context with main view
   - "Ask about findings in selected cohort" text input
   - Copilot analyzes filtered data + responds
   - Examples: "Are ulcer findings more common in Crohn's than SB-Diagnostic?"

4. Drill-through:
   - Click chart element (bar, slice, line point) → filtered procedure list appears
   - Or click "View Procedures" within chart card
   - Procedure list shown in modal or slide-out panel

5. Save/pin views:
   - "Save View" button → enters name + description
   - Saves query + filters + selected charts to saved_views collection
   - "Saved Views" sidebar list all previously saved views
   - Click to reload saved view with same filters
   - Star icon to pin view for quick access

6. Sharing views (0253):
   - "Share View" button → modal with user selector
   - Multi-select staff members to share with
   - Shared views appear in "Shared With Me" section
   - Recipient sees saved query + charts, can modify without affecting original

7. Export + scheduling (0251, 0252):
   - Export toolbar: PDF, CSV, PNG buttons
   - Schedule Report modal: frequency (daily/weekly/monthly), time, recipients (email)
   - On export: call exportAnalytics(format, filters) Cloud Function
   - On schedule: create scheduled_reports document

8. Role-access matrix (0294):
   - Clinician_auth: sees own finding data + anonymized cohort
   - Clinician_admin: sees all clinic data
   - Admin: sees all practice data
   - Filter UI shows only accessible cohorts

Firestore aggregation:
- Create `practices/{practiceId}/analyticsCache/daily` document updated hourly
- Pre-compute: finding_counts, icd_frequency, avg_metrics, workflow_funnel
- Charts query cache for fast rendering
- Real-time listeners on procedures for live metric updates (with debounce)

Cloud Functions:
- `exportAnalytics(format, filters)`: aggregate data, generate PDF/CSV/PNG
- `scheduleAnalyticsReport(practiceId, query, frequency, recipients)`: create scheduled job
- `computeDailyAnalytics(practiceId)`: hourly job to update cache
```

### Step 4: AI Quality Assurance Dashboard

Prompt Gemini:
```
Implement SCR-33 AI Quality Assurance Dashboard per ZCW-BRD-0256.

Audience: Administrator and Clinician Administrator only.

Layout:
1. Filter bar (top):
   - Date range: "Last 30 days", "Last 60 days", "Last 90 days", "Custom"
   - Finding type filter: multi-select
   - Model version filter: multi-select (show available versions)
   - Clinician filter: multi-select (show override patterns per clinician)

2. Sensitivity & Specificity:
   - Table per finding type:
     - Finding Type | Sensitivity | Specificity | F1 Score
     - Green rows (high scores), orange (moderate), red (low)
   - Benchmark comparison: "vs. target 92%" indicator
   - Link: "View procedures for [Finding Type]"

3. False Positive Analysis:
   - "False Positive Rate by Finding Type": bar chart
   - "False Positives Rejected by Clinician": % per type
   - Table: Finding Type | Total AI Detected | Rejected | FP Rate | Trend
   - Trend arrow: up (getting worse), down (improving)

4. Clinician Override Patterns:
   - Heatmap: clinician × finding type grid
   - Cell value: override frequency (color intensity)
   - Red (high overrides) = model poorly trained for that clinician's cases
   - Blue (low overrides) = model aligns well
   - Click cell → procedures with overrides for that pair

5. Incidental Findings Yield:
   - Chart: incidentals found per procedure (histogram)
   - Table: study type | incidental count | % of procedures
   - Benchmark comparison

6. Rolling Trend Windows:
   - 30/60/90 day toggle
   - Charts re-filter on toggle
   - Line chart showing metrics over time

7. Model Version Comparison:
   - Side-by-side comparison: old vs. new model
   - Metrics: sensitivity, specificity, false positive rate
   - A/B test results (if running parallel models)
   - Recommendation: "Deploy new model" / "Rollback" buttons (simulation only)

8. Model Drift Alerting:
   - Alert banner if metrics drop > 5% vs. baseline
   - "Sensitivity dropped from 94% to 88% in last 30 days — investigate"
   - Linked to procedure list with dropped metrics

9. Drill-through:
   - Click metric row → procedure list with that finding type
   - Procedures table: date, clinician, AI score, clinician action (confirm/reject/modify)

10. Export + scheduling (same as Analytics):
    - PDF/CSV/PNG export
    - Schedule report delivery

Firestore schema:
- `practices/{practiceId}/aiMetrics/daily`: pre-computed sensitivity, specificity, etc.
- Updated hourly by Cloud Function analyzing findings + rejections

Cloud Functions:
- `computeAIMetrics(practiceId, dateRange)`: query findings, compute metrics
- `detectModelDrift(practiceId, baseline, current)`: compare metrics, alert if > threshold
```

### Step 5: Activity Log Firestore Integration

Prompt Gemini:
```
Implement SCR-07 System Activity Log with Firestore audit trail.

Audit collection: `practices/{practiceId}/auditLog`

Document schema:
{
  auditId: string
  practiceId: string
  event: 'procedure_created' | 'patient_created' | 'finding_confirmed' | 'report_signed' |
          'staff_role_updated' | 'user_created' | 'settings_updated' | 'recall_initiated' |
          'capsule_uploaded' | 'education_delivered' | 'access_denied' | ... (comprehensive list)
  timestamp: timestamp (FieldValue.serverTimestamp())
  userId: string (who performed action)
  userRole: string
  entity: {
    type: 'procedure' | 'patient' | 'report' | 'finding' | 'staff' | 'practice' | 'education'
    entityId: string
  }
  details: { ... } (event-specific details)
  ipAddress: string (captured at Cloud Function)
  changes?: {
    before: { field: value }
    after: { field: value }
  } (for update events)
  status: 'success' | 'failure'
  errorMessage?: string (if failed)
}

UI layout:
1. Filter bar (top):
   - Date range picker: "Last 7 days", "Last 30 days", custom
   - Event type filter: multi-select
   - User filter: selector
   - Entity type filter: procedure, patient, report, etc.

2. Activity table:
   - Columns: Timestamp, Event, User, Entity, Status, Details
   - Timestamp: relative time ("2 hours ago")
   - Event: colored badge per type
   - User: name + role
   - Entity: link to entity if still exists
   - Status: green check (success), red X (failure)
   - Details: expandable row showing full change details

3. Sorting & pagination:
   - Default sort: timestamp DESC (newest first)
   - Sortable columns: timestamp, event, user
   - 50 per page with next/prev

4. Export:
   - "Export Audit Log" button → CSV download
   - Includes all filtered rows

5. Real-time updates:
   - Real-time listener on auditLog collection
   - New entries appear at top of list
   - Toast notification: "[Event] by [User]"

Hooks:
- `useAuditLog(practiceId, filters)`: query + real-time listener
- `filterAuditLog(logs, dateRange, eventType, userId, entityType)`: client-side filtering

Every major operation creates audit entry:
- Procedure create/update/delete
- Patient create/update/archive
- Finding confirm/reject/modify
- Report sign/deliver
- Staff role change
- Settings update
- Recall initiated
- Education delivered
- Login/logout (authentication events)
- Access denied (security events)
```

### Step 6: Education Library & Delivery Triggers

Prompt Gemini:
```
Implement SCR-05 Manage Education Library with delivery triggers.

Education collection: `practices/{practiceId}/educationLibrary`

Document schema:
{
  materialId: string
  title: string
  type: 'patient_education' | 'clinical_reference' | 'teaching_case'
  studyTypes: string[] (applicable study types, e.g., ['crohns', 'upper_gi'])
  findingTypes: string[] (applicable findings, e.g., ['ulcer', 'bleeding'])
  content: string (markdown)
  mediaUrl?: string (video/PDF URL)
  difficulty: 'basic' | 'intermediate' | 'advanced' (for clinical references)
  language: string[] (available translations)
  keywords: string[]
  createdBy: userId
  createdAt: timestamp
  updatedAt: timestamp
  isActive: boolean
  accessControl: {
    visibleTo: string[] (roles: clinician_auth, clinical_staff, patient, etc.)
  }
}

Teaching Case schema (subtype):
{
  // ... inherits above
  type: 'teaching_case'
  caseStudyText: string
  sourceFindings: string[] (de-identified findings used in case)
  discussionNotes: string
  difficulty: 'basic' | 'intermediate' | 'advanced'
}

UI layout:
1. Search & filter:
   - Search box: search title + keywords
   - Filter buttons: Study Type, Finding Type, Difficulty, Language
   - Type selector: Patient Education / Clinical Reference / Teaching Cases

2. Material list:
   - Card grid showing:
     a. Thumbnail (preview image or icon)
     b. Title
     c. Type badge
     d. Applicable study types
     e. Star rating (if implemented)
     f. Actions: "View", "Assign to Patient", "Edit" (if admin), "Delete" (if admin)

3. View detail:
   - Full content displayed
   - For teaching cases: show case study + discussion
   - "Assign to Patient" button (0290)

4. Assign to Patient:
   - Button → navigate to Patients (SCR-02) with modal overlay
   - Select patient → select delivery method (email, in-app, portal)
   - Confirm → creates educationAssignments entry
   - Toast: "Material sent to [Patient Name]"

5. Admin section (for admin/clinician_admin):
   - "Add Material" button → form with title, type, content, study types, findings
   - "Edit Material" → click material → edit form
   - "Delete Material" → confirmation → delete

6. Delivery triggers (0290):
   - Auto-suggest at check-in: based on indications + study type
   - Auto-suggest post-sign: based on findings + study type + referrals
   - Post-referral: if referral generated for incidental finding

Firestore operations:
- Cloud Function `suggestEducationMaterials(studyType, findings)`:
  1. Query educationLibrary where studyTypes contains [studyType]
  2. Query where findingTypes contains any [finding.type]
  3. Rank by relevance
  4. Return top 3-5 suggestions

- Cloud Function `assignEducationMaterial(materialId, patientId, method)`:
  1. Create educationAssignments entry in `practices/{practiceId}/patients/{patientId}/educationAssignments`
  2. If email: queue email via SendGrid
  3. If portal: mark for posting to patient portal
  4. Create audit log: 'education_assigned'
  5. Send notification to patient

- Cloud Function `triggerEducationDelivery(procedureId, event)`:
  1. event = 'check_in_complete' | 'report_signed' | 'referral_generated'
  2. Based on event, suggest materials
  3. Auto-send to patient if auto-delivery enabled
  4. Notify clinician of suggestions

Integration with other screens:
- SCR-08 Check-In: "Suggested for this patient" card showing 2-3 education materials
- SCR-13 Sign & Deliver: post-sign trigger auto-suggests materials, "Send Education Materials" button
- SCR-02 Patients: "Assign Materials" action in patient row (0290)

Hooks:
- `useEducationLibrary(filters)`: query + filter materials
- `suggestEducationMaterials(studyType, findings)`: call Cloud Function
- `assignEducationMaterial(materialId, patientId, method)`: call Cloud Function
- `usePatientEducationAssignments(patientId)`: query patient's assigned materials
```

## Acceptance Criteria

- [ ] Notification system created with event-driven triggers
- [ ] Real-time listener on procedures → creates notifications
- [ ] Notification bell badge shows unread count
- [ ] Drawer displays all notifications with types
- [ ] Click notification → navigates via actionUrl
- [ ] Mark read toggles read status
- [ ] Mark all read batch updates all notifications
- [ ] Notification preferences modal functional
- [ ] Quiet hours configured and enforced
- [ ] Digest mode setting works
- [ ] Mandatory notifications always sent
- [ ] Dashboard metrics load from Firestore aggregation
- [ ] Procedure funnel chart displays status distribution
- [ ] Lag metrics show waiting procedures
- [ ] Clinician productivity table sortable
- [ ] Operational alerts banner shows issues
- [ ] Capsule inventory tracking visible
- [ ] Export buttons (PDF/CSV/PNG) functional
- [ ] Schedule Report modal saves scheduled_reports
- [ ] Analytics Workbench filters persist
- [ ] Finding Prevalence chart drillable
- [ ] Longitudinal disease tracking shows trends
- [ ] Copilot panel shares filter context
- [ ] Save View functionality creates saved_views
- [ ] Share View modal sends to selected users
- [ ] AI QA Dashboard shows sensitivity/specificity
- [ ] Override patterns visible in heatmap
- [ ] Model drift detected and alerted
- [ ] Activity Log table displays all events
- [ ] Filter bar works for date, event type, user
- [ ] Activity export downloads CSV
- [ ] Real-time activity updates appear
- [ ] Education Library searchable and filterable
- [ ] Materials display with study type tags
- [ ] Assign to Patient button functional
- [ ] Education delivery triggers at check-in
- [ ] Education delivery triggers at post-sign
- [ ] Post-referral education suggestions shown
- [ ] All notifications create audit log entries
- [ ] All analytics operations create audit entries
- [ ] All education assignments create audit entries
- [ ] Firestore security rules enforce user access

## Testing Notes

Test notifications:
1. Create procedure with status = 'ready_for_review' → verify notification created
2. Verify notification appears in drawer
3. Click notification → verify navigates to correct screen
4. Mark as read → verify read status updates
5. Set quiet hours → verify notification delayed
6. Test digest mode → notifications batched

Test analytics:
1. Load Dashboard → verify metrics calculated
2. Verify procedure count matches active procedures
3. Test funnel drill-down → click bar → procedures list appears
4. Load Analytics Workbench → apply filters → verify charts update
5. Save view → verify appears in saved views list
6. Share view → verify recipient can access

Test AI QA:
1. Load QA Dashboard → verify sensitivity/specificity calculated
2. Filter by finding type → verify metrics update
3. Check model drift alert → verify banner shows if threshold exceeded

Test activity log:
1. Perform operation (create procedure) → verify audit entry created
2. Filter by event type → verify filter works
3. Export log → CSV downloads
4. Real-time listener → perform action → new entry appears in table

Test education:
1. Create education material → verify appears in library
2. Assign to patient → verify educationAssignments created
3. At check-in → verify education suggestions shown
4. Accept suggestion → verify material sent to patient

---
