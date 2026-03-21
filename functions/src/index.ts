/**
 * Zo Clinicians Workbench - Firebase Cloud Functions
 * Main entry point exporting all triggers and callable functions
 *
 * Production-ready functions for the ZoCW application.
 * Includes:
 * - Firestore triggers for procedure and report workflows
 * - HTTPS callable functions for clinical operations
 * - Audit logging and notification dispatch utilities
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// Export Firestore Triggers
export { onProcedureWrite } from './triggers/onProcedureWrite';
export { onReportSign } from './triggers/onReportSign';

// Export HTTPS Callable Functions
export { generateAutoDraft } from './callable/generateAutoDraft';
export { suggestCodes } from './callable/suggestCodes';
export { generateReportPdf } from './callable/generateReportPdf';
export { validateCapsule } from './callable/validateCapsule';
export { calculateTransitTimes } from './callable/calculateTransitTimes';
export { bulkUpdateProcedureStatus } from './callable/bulkUpdateProcedureStatus';
export { transferReview } from './callable/transferReview';
export { exportDashboard } from './callable/exportDashboard';
export { initiateCapsuleRecall } from './callable/initiateCapsuleRecall';
export { scheduleAnalyticsReport } from './callable/scheduleAnalyticsReport';
export { setInitialUserClaims } from './callable/setInitialUserClaims';
export { createUser, updateUser } from './callable/userManagement';

// Export Utilities for direct use if needed
export * from './utils/auditLogger';
export * from './utils/notificationDispatcher';
export * from './stateMachine';
