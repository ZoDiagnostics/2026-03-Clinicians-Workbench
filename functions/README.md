# Zo Clinicians Workbench - Firebase Cloud Functions

Production-ready Firebase Cloud Functions for the Zo Clinicians Workbench (ZoCW) project. Implements complete clinical workflows, state management, audit logging, and notification dispatch.

## Architecture

### Project Structure

```
functions/
├── src/
│   ├── index.ts                 # Main exports
│   ├── stateMachine.ts          # Procedure state machine logic
│   ├── triggers/
│   │   ├── onProcedureWrite.ts  # Procedure CREATE/UPDATE trigger
│   │   └── onReportSign.ts      # Report signing trigger
│   ├── callable/
│   │   ├── generateAutoDraft.ts # Auto-draft generation (ZCW-BRD-0297)
│   │   ├── suggestCodes.ts      # ICD-10/CPT code suggestions (ZCW-BRD-0299)
│   │   ├── generateReportPdf.ts # PDF report generation
│   │   ├── validateCapsule.ts   # Capsule validation (ZCW-BRD-0276)
│   │   └── calculateTransitTimes.ts # Transit time calculation
│   └── utils/
│       ├── validators.ts        # Zod input validation schemas
│       ├── auditLogger.ts       # Audit logging utility
│       └── notificationDispatcher.ts # Notification routing
├── dist/                        # Compiled output (gitignored)
├── package.json
├── tsconfig.json
└── README.md
```

## Features

### 1. Procedure State Machine
- **9-state lifecycle**: `capsule_return_pending` → `capsule_received` → `ready_for_review` → `draft` → `completed` → `closed`
- **Valid transitions**: Enforced via state machine with detailed error messages
- **Terminal states**: `closed` and `void` (no further transitions allowed)
- **File**: `src/stateMachine.ts`

### 2. Firestore Triggers

#### onProcedureWrite
- **Trigger**: `practices/{practiceId}/procedures/{procedureId}` onWrite
- **CREATE**: Validates required fields, creates initial audit entry, dispatches assignment notification
- **UPDATE**: Validates state transitions, logs changes, dispatches status-specific notifications, updates timestamps
- **Atomic operations**: Uses batch writes for consistency
- **File**: `src/triggers/onProcedureWrite.ts`

#### onReportSign
- **Trigger**: `practices/{practiceId}/reports/{reportId}` onUpdate (status → 'signed')
- **Actions**:
  - Reads delivery defaults from practice settings
  - Creates delivery records for each configured method
  - Creates notification entries for email deliveries
  - Updates procedure status to 'completed'
  - Logs signing and delivery events to audit trail
- **Error handling**: Delivery failures don't block signing (retried separately)
- **File**: `src/triggers/onReportSign.ts`

### 3. HTTPS Callable Functions

#### generateAutoDraft (ZCW-BRD-0297)
```typescript
// Input
{ procedureId: string }

// Output
{
  autoDraft: AutoDraftReport;
  findingCount: number;
  sectionCount: number;
}
```
- Reads confirmed findings from procedure
- Groups by anatomical region
- Generates three sections:
  - **Findings**: Lists findings with classification, size, location
  - **Impressions**: Study-type-specific clinical impression templates
  - **Recommendations**: Study-type-appropriate follow-up recommendations
- **Linked evidence**: Each section includes findingIds and frame references
- **Authorization**: Assigned clinician or clinician_admin only
- **TODO**: Vertex AI integration for dynamic impression/recommendation generation
- **File**: `src/callable/generateAutoDraft.ts`

#### suggestCodes (ZCW-BRD-0299)
```typescript
// Input
{ procedureId: string }

// Output
{
  codes: CodeEntry[];
  totalCount: number;
  findingCount: number;
}
```
- Maps finding classifications to ICD-10 and CPT codes
- **ICD-10 mappings**: 13+ classifications (polyp, ulcer, bleeding, stricture, crohns, barrett, varix, mass, erosion, inflammation, villous_atrophy, lymphangiectasia, angiodysplasia, diverticulum)
- **CPT codes**: Capsule endoscopy procedure codes
- **Confidence scoring**: Based on AI confidence, classification specificity, finding count
- **Favorites**: Flags codes marked as favorites by clinician
- **Sorted**: By confidence descending
- **File**: `src/callable/suggestCodes.ts`

#### generateReportPdf
```typescript
// Input
{ reportId: string, variant: 'internal' | 'patient' }

// Output
{
  pdfUrl: string;        // Signed download URL (24h validity)
  storagePath: string;   // Cloud Storage path
  variant: string;
  expiresIn: string;
}
```
- Generates PDF from report data
- **Internal variant**: Full report with codes, measurements, technical details
- **Patient variant**: Simplified language, de-identified, no codes
- **Storage**: `report-pdfs/{practiceId}/{reportId}/report.pdf`
- **TODO**: Actual PDF rendering with Puppeteer or pdf-lib
- **File**: `src/callable/generateReportPdf.ts`

#### validateCapsule (ZCW-BRD-0276)
```typescript
// Input
{ serialNumber: string, lotNumber: string, practiceId: string }

// Output
{ valid: boolean, errors: string[], warnings: string[] }
```
- **Validations**:
  1. Format validation (alphanumeric, length ranges)
  2. Recall list check (practice-level recalled lots)
  3. Serial reuse check (not already used in active procedures)
- **Error handling**: Graceful with detailed error messages
- **Warnings**: Informational (non-blocking)
- **File**: `src/callable/validateCapsule.ts`

#### calculateTransitTimes
```typescript
// Input
{ procedureId: string }

// Output
{
  transitTimes: TransitTimes;
  landmarksFound: number;
}
```
- Identifies anatomical landmarks from findings
- Calculates transit times between regions:
  - Esophagus entry → Stomach entry
  - Duodenum entry → Jejunum → Ileum → Cecum
  - Small bowel transit time (jejunum to ileum)
- **Handles missing landmarks**: Gracefully omits undefined times
- **File**: `src/callable/calculateTransitTimes.ts`

## Utilities

### Audit Logger
```typescript
import { logAudit } from './utils/auditLogger';

// Basic audit entry
await logAudit({
  practiceId: 'practice-123',
  procedureId: 'proc-456',
  userId: 'user-789',
  action: 'procedure_status_changed',
  entityType: 'procedure',
  entityId: 'proc-456',
  details: { previousStatus: 'capsule_received', newStatus: 'ready_for_review' },
  previousState: { status: 'capsule_received' },
  newState: { status: 'ready_for_review' }
});

// Helper functions available:
await logProcedureStatusChange(...);
await logFindingConfirmed(...);
await logReportSigned(...);
await logReportDelivered(...);
```
- **Storage**: `practices/{practiceId}/auditLog/{entryId}`
- **Immutable**: Created with server timestamp, no updates
- **Permissions**: Only system SDK can write; only admins can read
- **File**: `src/utils/auditLogger.ts`

### Notification Dispatcher
```typescript
import { dispatchNotification } from './utils/notificationDispatcher';

// Basic notification
await dispatchNotification({
  practiceId: 'practice-123',
  userId: 'clinician-456',
  type: 'study_assigned',
  title: 'New Study Assigned',
  body: 'Patient John Doe - Upper GI Evaluation',
  routeTo: '/procedures/proc-789',
  entityType: 'procedure',
  entityId: 'proc-789'
});

// Specialized helpers:
await dispatchStudyAssignedNotification(...);
await dispatchSignatureRequiredNotification(...);
await dispatchDeliveryConfirmedNotification(...);
await dispatchRecallNoticeNotification(...);
```
- **Storage**: `practices/{practiceId}/notifications/{notificationId}`
- **Channel routing**: Respects user notification preferences
- **Quiet hours**: Suppresses non-mandatory notifications during user quiet hours
- **Expiration**: Auto-expires after 90 days
- **TODO**: Email (SendGrid/Mailgun) and push (FCM) integration
- **File**: `src/utils/notificationDispatcher.ts`

### Input Validators
All HTTPS callable functions use Zod schemas for type-safe input validation:
- `generateAutoDraftInputSchema`
- `suggestCodesInputSchema`
- `generateReportPdfInputSchema`
- `validateCapsuleInputSchema`
- `calculateTransitTimesInputSchema`

## Setup & Deployment

### Prerequisites
- Node.js 20+
- Firebase CLI
- Firebase project with Firestore, Cloud Functions, and Cloud Storage enabled

### Installation
```bash
cd functions
npm install
```

### Development
```bash
npm run build    # Compile TypeScript
npm run dev      # Run with emulator
npm run test     # Run tests
```

### Deployment
```bash
npm run deploy   # Deploy to Firebase
```

### Build Configuration
- **TypeScript**: `src/` → `dist/`
- **Target**: ES2022 (Node.js 20)
- **Path aliases**: `@types/*`, `@utils/*`, `@triggers/*`, `@callable/*`

## Authentication & Authorization

All functions enforce role-based access control (RBAC):

### Callable Function Auth
- `generateAutoDraft`: `clinician`, `clinician_admin`
- `suggestCodes`: `clinician`, `admin`
- `generateReportPdf`: `clinician`, `clinician_admin`
- `validateCapsule`: `clinical_staff`, `clinician*`, `admin`
- `calculateTransitTimes`: `clinician`, `admin`

### Custom Claims
User custom claims in Firebase Auth tokens:
```json
{
  "role": "clinician_auth",
  "practiceId": "practice-123"
}
```

## Error Handling

### Standard Response Format
```typescript
// Success
{ success: true, data: {...} }

// Error
throw new functions.https.HttpsError(
  'error-code',
  'User-friendly message',
  { originalError: 'details' }
);
```

### Common Error Codes
- `unauthenticated`: No valid auth token
- `permission-denied`: Insufficient permissions
- `not-found`: Resource not found
- `invalid-argument`: Invalid input parameters
- `failed-precondition`: Precondition not met (e.g., no findings)
- `internal`: Server error

## Database Schema

### Collections
- `practices/{practiceId}/procedures/{procedureId}`
- `practices/{practiceId}/procedures/{procedureId}/findings/{findingId}`
- `practices/{practiceId}/reports/{reportId}`
- `practices/{practiceId}/auditLog/{entryId}` (immutable)
- `practices/{practiceId}/notifications/{notificationId}`
- `practices/{practiceId}/settings/default` (singleton)

### Indexes Required
- `procedures`: status, assignedClinicianId, createdAt (for queries)
- `findings`: reviewStatus, anatomicalRegion (for auto-draft)
- `reports`: status, clinicianId, signedAt (for delivery)

## Performance Considerations

### Rate Limiting
- Consider implementing rate limiting on callable functions (TODO)
- Procedure triggers: Optimized with batch writes
- Large finding sets: Pagination recommended for 1000+ findings

### Firestore Optimization
- **Batch reads**: Used for efficiency
- **Selective field reads**: Only fetch needed fields
- **Indexes**: Create recommended indexes before production
- **Write throughput**: Batch writes for multiple updates

### Cold Starts
- Functions are stateless and independent
- Consider warming up critical paths in production
- Memory allocation: 256MB default (sufficient for most operations)

## TODO Items

### Integration Points
1. **PDF Rendering**: Implement with Puppeteer or pdf-lib
   - `src/callable/generateReportPdf.ts` - `renderHtmlToPdf()`
2. **Email Delivery**: Integrate SendGrid or Mailgun
   - `src/utils/notificationDispatcher.ts` - `sendEmailNotification()`
3. **Push Notifications**: Integrate Firebase Cloud Messaging (FCM)
   - `src/utils/notificationDispatcher.ts` - `sendPushNotification()`
4. **Vertex AI Integration**: Dynamic report generation
   - `src/callable/generateAutoDraft.ts` - AI-generated impressions/recommendations
5. **Code Favorites**: Implement in PracticeSettings
   - Track clinician's favorite ICD-10/CPT codes

### Monitoring & Logging
- Set up Cloud Logging dashboards
- Configure error alerting
- Monitor function execution metrics

## Type System

All types are imported from the shared types directory:
- `@types/enums` - ProcedureStatus, StudyType, UserRole, etc.
- `@types/procedure` - Procedure, PreReviewConfig, TransitTimes
- `@types/report` - Report, AutoDraftReport, CodeEntry
- `@types/finding` - Finding, FrameReference, Annotation
- `@types/audit` - AuditEntry, AuditAction
- `@types/notification` - AppNotification, NotificationType
- `@types/practice` - Practice, PracticeSettings, DeliveryDefaults
- `@types/user` - User, UserRole, NotificationPreferences
- `@types/patient` - Patient, Address, InsuranceInfo

## Compliance & Audit

### HIPAA Compliance
- All patient data (PII) protected via Firestore security rules
- Audit trail immutable and tamper-proof
- Access logging for all clinical operations
- Data retention policies (90-day notification expiration)

### Audit Trail
Every clinical action is logged:
- Procedure creation/updates/status changes
- Finding confirmations/rejections/modifications
- Report signing and delivery
- Code suggestions and selections
- User actions and access

## Support & Maintenance

### Troubleshooting
- Check Cloud Functions logs: `firebase functions:log`
- Review Firestore security rules
- Verify custom auth claims
- Check Cloud Storage permissions

### Updates & Versioning
- Version Cloud Functions with git tags
- Test in staging environment before production
- Use canary deployments for major changes
- Monitor function metrics post-deployment

## License

Proprietary - Zo Medical Inc.
