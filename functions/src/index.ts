/**
 * ZoCW Cloud Functions Entry Point
 *
 * Exports all callable functions and Firestore triggers for Firebase deployment.
 * Also exports data model types for backend use with firebase-admin Timestamps.
 *
 * Firebase CLI discovers functions by scanning exports from this entry point.
 * Each exported Cloud Function becomes a deployable Firebase function.
 */

import * as admin from 'firebase-admin';

// Initialize the default Firebase Admin app BEFORE any module-level
// admin.firestore() / admin.auth() calls in imported modules.
// Without this, modules like userManagement.ts that call admin.firestore()
// at load time will crash with "The default Firebase app does not exist."
if (!admin.apps.length) {
  admin.initializeApp();
}

// ============================================================================
// CALLABLE FUNCTIONS (HTTPS onCall)
// ============================================================================

export { suggestCodes } from './callable/suggestCodes';
export { validateCapsule } from './callable/validateCapsule';
export { calculateTransitTimes } from './callable/calculateTransitTimes';
export { generateReportPdf } from './callable/generateReportPdf';
export { generateAutoDraft } from './callable/generateAutoDraft';
export { bulkUpdateProcedureStatus } from './callable/bulkUpdateProcedureStatus';
export { exportDashboard } from './callable/exportDashboard';
export { initiateCapsuleRecall } from './callable/initiateCapsuleRecall';
export { scheduleAnalyticsReport } from './callable/scheduleAnalyticsReport';
export { transferReview } from './callable/transferReview';
export { setInitialUserClaims } from './callable/setInitialUserClaims';
export { createUser, updateUser } from './callable/userManagement';
export { getCapsuleFrames } from './callable/getCapsuleFrames';

// ============================================================================
// FIRESTORE TRIGGERS
// ============================================================================

export { onProcedureWrite } from './triggers/onProcedureWrite';
export { onReportSign } from './triggers/onReportSign';

// ============================================================================
// TYPE EXPORTS (for other packages that import from functions)
// ============================================================================

export * from './enums';
export type { Patient, Address, InsuranceInfo, ContactInfo } from './patient';
export type { Procedure, PreProcedureCheck, PreReviewConfig, TransitTimes, ContraindicationReview } from './procedure';
export type { Finding, FrameReference, Annotation, ModificationEntry } from './finding';
export type { Report, CodeEntry, RiskScore, ReferralEntry, SupplementalSection, DeliveryRecord, DeliveryDefaults, ReportSection, SimpleReportSections, AutoDraftSection, AutoDraftReport } from './report';
export type { User, NotificationPreferences, Delegation } from './user';
export type { Practice, PracticeSettings, Clinic, SubscriptionInfo, PracticeNotificationConfig, PhiMaskingRule, EmrConfig, AnnotationTemplate, CapsuleInventoryItem, DeliveryDefaults as PracticeDeliveryDefaults } from './practice';
export type { AuditEntry, AuditAction } from './audit';
export type { AppNotification } from './notification';
