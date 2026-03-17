/**
 * Shared TypeScript Enums and Union Types for ZoCW Data Model
 *
 * All enums are defined as union types for better tree-shaking and runtime flexibility.
 * Each has an associated display label map and color map for UI consistency.
 */

// ============================================================================
// PROCEDURE STATUS (9-state Lifecycle)
// ============================================================================

/**
 * Procedure status represents the current state in the procedure workflow.
 * Defined in Screen Registry SCR-03 and ZCW-BRD-0293.
 */
export enum ProcedureStatus {
  CAPSULE_RETURN_PENDING = 'capsule_return_pending',
  CAPSULE_RECEIVED = 'capsule_received',
  READY_FOR_REVIEW = 'ready_for_review',
  DRAFT = 'draft',
  APPENDED_DRAFT = 'appended_draft',
  COMPLETED = 'completed',
  COMPLETED_APPENDED = 'completed_appended',
  CLOSED = 'closed',
  VOID = 'void',
}

/**
 * Display labels for procedure status (user-facing strings).
 * Maps each status to a human-readable label for UI rendering.
 */
export const PROCEDURE_STATUS_LABELS: Record<ProcedureStatus, string> = {
  [ProcedureStatus.CAPSULE_RETURN_PENDING]: 'Awaiting Capsule Return',
  [ProcedureStatus.CAPSULE_RECEIVED]: 'Capsule Received',
  [ProcedureStatus.READY_FOR_REVIEW]: 'Ready for Review',
  [ProcedureStatus.DRAFT]: 'Report Draft',
  [ProcedureStatus.APPENDED_DRAFT]: 'Appended Draft',
  [ProcedureStatus.COMPLETED]: 'Completed',
  [ProcedureStatus.COMPLETED_APPENDED]: 'Completed (Amended)',
  [ProcedureStatus.CLOSED]: 'Closed',
  [ProcedureStatus.VOID]: 'Voided',
};

/**
 * Color classes for procedure status badges.
 * Uses Tailwind color utilities for consistent styling across the application.
 * Maps to colors defined in tailwind.config.ts.
 */
export const PROCEDURE_STATUS_COLORS: Record<ProcedureStatus, string> = {
  [ProcedureStatus.CAPSULE_RETURN_PENDING]: 'bg-status-pending text-white',
  [ProcedureStatus.CAPSULE_RECEIVED]: 'bg-status-received text-white',
  [ProcedureStatus.READY_FOR_REVIEW]: 'bg-status-ready text-white',
  [ProcedureStatus.DRAFT]: 'bg-status-draft text-white',
  [ProcedureStatus.APPENDED_DRAFT]: 'bg-status-appended text-white',
  [ProcedureStatus.COMPLETED]: 'bg-status-completed text-white',
  [ProcedureStatus.COMPLETED_APPENDED]: 'bg-status-appended-completed text-white',
  [ProcedureStatus.CLOSED]: 'bg-status-closed text-white',
  [ProcedureStatus.VOID]: 'bg-status-void text-white',
};

/**
 * Valid state transitions for the procedure workflow.
 * Defines which statuses can transition to other statuses.
 */
export const VALID_PROCEDURE_TRANSITIONS: Record<ProcedureStatus, ProcedureStatus[]> = {
  [ProcedureStatus.CAPSULE_RETURN_PENDING]: [ProcedureStatus.CAPSULE_RECEIVED, ProcedureStatus.VOID],
  [ProcedureStatus.CAPSULE_RECEIVED]: [ProcedureStatus.READY_FOR_REVIEW, ProcedureStatus.VOID],
  [ProcedureStatus.READY_FOR_REVIEW]: [ProcedureStatus.DRAFT, ProcedureStatus.VOID],
  [ProcedureStatus.DRAFT]: [ProcedureStatus.APPENDED_DRAFT, ProcedureStatus.COMPLETED, ProcedureStatus.VOID],
  [ProcedureStatus.APPENDED_DRAFT]: [ProcedureStatus.COMPLETED_APPENDED, ProcedureStatus.DRAFT, ProcedureStatus.VOID],
  [ProcedureStatus.COMPLETED]: [ProcedureStatus.APPENDED_DRAFT, ProcedureStatus.CLOSED, ProcedureStatus.VOID],
  [ProcedureStatus.COMPLETED_APPENDED]: [ProcedureStatus.CLOSED, ProcedureStatus.VOID],
  [ProcedureStatus.CLOSED]: [ProcedureStatus.VOID],
  [ProcedureStatus.VOID]: [],
};

// ============================================================================
// STUDY TYPE
// ============================================================================

/**
 * Study type indicates the primary clinical focus for the procedure.
 * Defined in ZCW-BRD-0226 and ZCW-BRD-0227.
 *
 * All procedures capture full pan-GI imaging regardless of study type;
 * study type only affects the primary focus region for AI analysis and reporting.
 */
export type StudyType =
  | 'upper_gi'           // Upper GI Evaluation (esophagus, stomach, GEJ focus)
  | 'sb_diagnostic'      // Small Bowel Diagnostic
  | 'crohns_monitor'     // Small Bowel Crohn's Monitoring
  | 'colon_eval';        // Colon Evaluation

/**
 * Display labels for study types.
 */
export const STUDY_TYPE_LABELS: Record<StudyType, string> = {
  upper_gi: 'Upper GI — Evaluation',
  sb_diagnostic: 'Small Bowel — Diagnostic',
  crohns_monitor: 'Small Bowel — Crohn\'s Monitoring',
  colon_eval: 'Colon — Evaluation',
};

/**
 * Primary anatomical focus regions by study type.
 * Used to configure AI analysis emphasis and report templates.
 */
export const STUDY_TYPE_PRIMARY_FOCUS: Record<StudyType, string> = {
  upper_gi: 'Esophagus, Stomach, GEJ',
  sb_diagnostic: 'Small Bowel',
  crohns_monitor: 'Small Bowel (Inflammatory)',
  colon_eval: 'Colon',
};

// ============================================================================
// USER ROLES (5-Role RBAC)
// ============================================================================

/**
 * User role defines permissions and access levels across the platform.
 * Implemented as Firestore custom claims in Firebase Auth tokens.
 */
export type UserRole =
  | 'clinician_auth'      // Licensed clinician authorized to sign reports
  | 'clinician_noauth'    // Licensed clinician; cannot sign independently
  | 'clinician_admin'     // Clinician with administrative privileges
  | 'admin'               // System administrator
  | 'clinical_staff';     // Technician, staff (no clinical decision authority)

/**
 * Display labels for user roles.
 */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  clinician_auth: 'Authorized Clinician',
  clinician_noauth: 'Clinician (Non-Authorized)',
  clinician_admin: 'Clinician Administrator',
  admin: 'Administrator',
  clinical_staff: 'Clinical Staff',
};

/**
 * Role hierarchy for permission checking.
 * Higher index = higher privilege level.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  clinical_staff: 1,
  clinician_noauth: 2,
  clinician_auth: 3,
  clinician_admin: 4,
  admin: 5,
};

// ============================================================================
// FINDING PROVENANCE
// ============================================================================

/**
 * Finding provenance indicates the source/origin of a finding.
 * Used for transparency and audit trails.
 */
export type FindingProvenance =
  | 'ai_detected'         // Initially identified by AI/Copilot
  | 'clinician_marked'    // Manually marked by clinician
  | 'clinician_modified'; // AI finding modified by clinician

/**
 * Display labels for finding provenance.
 */
export const FINDING_PROVENANCE_LABELS: Record<FindingProvenance, string> = {
  ai_detected: 'AI-Detected',
  clinician_marked: 'Clinician-Marked',
  clinician_modified: 'AI-Detected (Modified)',
};

// ============================================================================
// FINDING REVIEW STATUS
// ============================================================================

/**
 * Finding review status tracks the clinician's decision on a finding.
 * Used in the Procedure Summary workflow.
 */
export type FindingReviewStatus =
  | 'pending'      // Awaiting clinician review
  | 'confirmed'    // Clinician confirmed the finding
  | 'rejected'     // Clinician rejected the finding
  | 'modified'     // Clinician modified the finding (size, location, etc.)
  | 'deferred';    // Clinician deferred decision (mark for follow-up)

/**
 * Display labels for finding review status.
 */
export const FINDING_REVIEW_STATUS_LABELS: Record<FindingReviewStatus, string> = {
  pending: 'Pending Review',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  modified: 'Modified',
  deferred: 'Deferred',
};

// ============================================================================
// DELIVERY METHOD
// ============================================================================

/**
 * Report delivery method specifies how the report is distributed to patient/provider.
 * Defined in ZCW-BRD-0298 (Delivery Defaults).
 */
export type DeliveryMethod =
  | 'pdf_download'   // Download as PDF from portal
  | 'print'          // Print at clinic
  | 'email_patient'  // Email to patient
  | 'email_referring' // Email to referring physician
  | 'hl7_fhir'       // HL7 v2 / FHIR integration
  | 'dicom_sr';      // DICOM Structured Report export

/**
 * Display labels for delivery methods.
 */
export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  pdf_download: 'PDF Download',
  print: 'Print',
  email_patient: 'Email to Patient',
  email_referring: 'Email to Referring Physician',
  hl7_fhir: 'HL7/FHIR Integration',
  dicom_sr: 'DICOM SR Export',
};

// ============================================================================
// URGENCY LEVEL
// ============================================================================

/**
 * Urgency level for procedures and referrals.
 * Used in notification prioritization and display.
 */
export type UrgencyLevel =
  | 'routine'       // Standard processing
  | 'urgent'        // Expedited review needed
  | 'emergent';     // Immediate action required

/**
 * Display labels for urgency levels.
 */
export const URGENCY_LEVEL_LABELS: Record<UrgencyLevel, string> = {
  routine: 'Routine',
  urgent: 'Urgent',
  emergent: 'Emergent',
};

/**
 * Color classes for urgency level badges.
 */
export const URGENCY_LEVEL_COLORS: Record<UrgencyLevel, string> = {
  routine: 'bg-gray-200 text-gray-900',
  urgent: 'bg-yellow-200 text-yellow-900',
  emergent: 'bg-red-200 text-red-900',
};

// ============================================================================
// CONSENT METHOD
// ============================================================================

/**
 * Consent method indicates how informed consent was obtained.
 * Tracked for regulatory compliance and audit.
 */
export type ConsentMethod =
  | 'digital'   // Digital signature / checkbox
  | 'paper'     // Paper form scanned
  | 'video';    // Video recorded consent

/**
 * Display labels for consent methods.
 */
export const CONSENT_METHOD_LABELS: Record<ConsentMethod, string> = {
  digital: 'Digital',
  paper: 'Paper',
  video: 'Video',
};

// ============================================================================
// ANATOMICAL REGION
// ============================================================================

/**
 * Anatomical regions for GI findings.
 * Used for finding classification and reporting.
 */
export type AnatomicalRegion =
  | 'esophagus'
  | 'stomach'
  | 'duodenum'
  | 'jejunum'
  | 'ileum'
  | 'cecum'
  | 'colon'
  | 'rectum';

/**
 * Display labels for anatomical regions.
 */
export const ANATOMICAL_REGION_LABELS: Record<AnatomicalRegion, string> = {
  esophagus: 'Esophagus',
  stomach: 'Stomach',
  duodenum: 'Duodenum',
  jejunum: 'Jejunum',
  ileum: 'Ileum',
  cecum: 'Cecum',
  colon: 'Colon',
  rectum: 'Rectum',
};

// ============================================================================
// NOTIFICATION TYPE
// ============================================================================

/**
 * Notification type categorizes the business event triggering the notification.
 * Used for filtering and prioritization.
 */
export type NotificationType =
  | 'study_assigned'          // New study assigned to clinician
  | 'signature_required'      // Report awaiting signature
  | 'qa_alert'                // QA/AI drift alert
  | 'recall_notice'           // Capsule recall notice
  | 'transfer_request'        // Review transfer request
  | 'delivery_confirmed'      // Report delivery confirmed
  | 'system'                  // System maintenance / informational
  | 'education_assigned';     // Patient education assigned

/**
 * Display labels for notification types.
 */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  study_assigned: 'Study Assigned',
  signature_required: 'Signature Required',
  qa_alert: 'QA Alert',
  recall_notice: 'Recall Notice',
  transfer_request: 'Transfer Request',
  delivery_confirmed: 'Delivery Confirmed',
  system: 'System Message',
  education_assigned: 'Education Assigned',
};

// ============================================================================
// REPORT STATUS
// ============================================================================

/**
 * Report status tracks the state of a report in its lifecycle.
 */
export type ReportStatus =
  | 'draft'           // Initial draft created
  | 'auto_drafted'    // Auto-drafted by Copilot
  | 'in_review'       // Clinician reviewing
  | 'signed'          // Signed by authorized clinician
  | 'amended'         // Amendment appended
  | 'voided';         // Report voided

/**
 * Display labels for report status.
 */
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  draft: 'Draft',
  auto_drafted: 'Auto-Drafted',
  in_review: 'In Review',
  signed: 'Signed',
  amended: 'Amended',
  voided: 'Voided',
};

// ============================================================================
// CAPSULE SCAN METHOD
// ============================================================================

/**
 * Capsule scan method indicates how the capsule was identified.
 * Defined in ZCW-BRD-0239 and ZCW-BRD-0240.
 */
export type CapsuleScanMethod =
  | 'barcode'     // Barcode scan
  | 'qr_code'     // QR code scan
  | 'manual';     // Manual entry (fallback)

/**
 * Display labels for capsule scan methods.
 */
export const CAPSULE_SCAN_METHOD_LABELS: Record<CapsuleScanMethod, string> = {
  barcode: 'Barcode Scan',
  qr_code: 'QR Code Scan',
  manual: 'Manual Entry',
};

// ============================================================================
// CODE SUGGESTION STATUS
// ============================================================================

/**
 * Status of ICD-10 / CPT code suggestions from Copilot.
 * Defined in ZCW-BRD-0299.
 */
export type CodeSuggestionStatus =
  | 'suggested'   // Code suggested by Copilot
  | 'confirmed'   // Clinician confirmed the code
  | 'rejected';   // Clinician rejected the code

/**
 * Display labels for code suggestion status.
 */
export const CODE_SUGGESTION_STATUS_LABELS: Record<CodeSuggestionStatus, string> = {
  suggested: 'Suggested',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
};

// ============================================================================
// DRAFT SECTION STATUS
// ============================================================================

/**
 * Status of individual sections in auto-drafted reports.
 * Used in Copilot Auto-Draft workflow (ZCW-BRD-0297).
 */
export type DraftSectionStatus =
  | 'pending'     // Awaiting clinician review
  | 'accepted'    // Clinician accepted the section
  | 'edited'      // Clinician edited the section
  | 'rejected';   // Clinician rejected and rewrote

/**
 * Display labels for draft section status.
 */
export const DRAFT_SECTION_STATUS_LABELS: Record<DraftSectionStatus, string> = {
  pending: 'Pending Review',
  accepted: 'Accepted',
  edited: 'Edited',
  rejected: 'Rejected',
};
