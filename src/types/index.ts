/**
 * ZoCW Data Model and Type System
 *
 * Central export file for all TypeScript types, enums, and interfaces.
 * Provides a single import source for data model types across the application.
 *
 * Usage:
 * import { Patient, Procedure, Report, UserRole } from '@/types';
 * import { ProcedureStatus, PROCEDURE_STATUS_LABELS } from '@/types';
 * import { COLLECTIONS, FirestorePath } from '@/types';
 */

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type {
  ProcedureStatus,
  StudyType,
  UserRole,
  FindingProvenance,
  FindingReviewStatus,
  DeliveryMethod,
  UrgencyLevel,
  ConsentMethod,
  AnatomicalRegion,
  NotificationType,
  ReportStatus,
  CapsuleScanMethod,
  CodeSuggestionStatus,
  DraftSectionStatus,
} from './enums';

export {
  PROCEDURE_STATUS_LABELS,
  PROCEDURE_STATUS_COLORS,
  VALID_PROCEDURE_TRANSITIONS,
  STUDY_TYPE_LABELS,
  STUDY_TYPE_PRIMARY_FOCUS,
  USER_ROLE_LABELS,
  ROLE_HIERARCHY,
  FINDING_PROVENANCE_LABELS,
  FINDING_REVIEW_STATUS_LABELS,
  DELIVERY_METHOD_LABELS,
  URGENCY_LEVEL_LABELS,
  URGENCY_LEVEL_COLORS,
  CONSENT_METHOD_LABELS,
  ANATOMICAL_REGION_LABELS,
  NOTIFICATION_TYPE_LABELS,
  REPORT_STATUS_LABELS,
  CAPSULE_SCAN_METHOD_LABELS,
  CODE_SUGGESTION_STATUS_LABELS,
  DRAFT_SECTION_STATUS_LABELS,
} from './enums';

// ============================================================================
// PATIENT TYPES
// ============================================================================

export type { Address, InsuranceInfo, ContactInfo, Patient } from './patient';

// ============================================================================
// PROCEDURE TYPES
// ============================================================================

export type {
  ContraindicationReview,
  PreProcedureCheck,
  PreReviewConfig,
  TransitTimes,
  Procedure,
} from './procedure';

// ============================================================================
// FINDING TYPES
// ============================================================================

export type {
  FrameReference,
  ModificationEntry,
  Annotation,
  Finding,
} from './finding';

// ============================================================================
// REPORT TYPES
// ============================================================================

export type {
  AutoDraftSection,
  AutoDraftReport,
  CodeEntry,
  RiskScore,
  ReferralEntry,
  SupplementalSection,
  DeliveryRecord,
  DeliveryDefaults,
  ReportSection,
  Report,
} from './report';

// ============================================================================
// USER TYPES
// ============================================================================

export type { NotificationPreferences, Delegation, User } from './user';

// ============================================================================
// PRACTICE TYPES
// ============================================================================

export type {
  SubscriptionInfo,
  DeliveryDefaults as PracticeDeliveryDefaults,
  PracticeNotificationConfig,
  PhiMaskingRule,
  EmrConfig,
  AnnotationTemplate,
  CapsuleInventoryItem,
  Practice,
  PracticeSettings,
  Clinic,
} from './practice';

// ============================================================================
// AUDIT TYPES
// ============================================================================

export type { AuditAction, AuditEntry } from './audit';

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type { AppNotification } from './notification';

// ============================================================================
// CAPSULE IMAGE PIPELINE TYPES
// ============================================================================

export type {
  CestAnatomicalLocation,
  CestFindingClassification,
  AIAnalysisResult,
  CapsuleImageDocument,
  GetCapsuleFramesResponse,
} from './capsule-image';

export {
  CEST_ANATOMICAL_LOCATIONS,
  CEST_FINDING_CLASSIFICATIONS,
  CEST_TO_ANATOMICAL_REGION,
  cestToAnatomicalRegion,
} from './capsule-image';

// ============================================================================
// FIRESTORE PATHS & HELPERS
// ============================================================================

export { COLLECTIONS, STORAGE_PATHS, FirestorePath } from './firestore-paths';

// ============================================================================
// VERSION INFO
// ============================================================================

export const DATA_MODEL_VERSION = '3.2.0';
export const DATA_MODEL_LAST_UPDATED = '2026-03-19';
