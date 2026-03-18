/**
 * Shared TypeScript Enums for ZoCW Data Model
 *
 * Each enum has an associated display label map and color map for UI consistency.
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
 */
export enum StudyType {
  UPPER_GI = 'upper_gi',
  SB_DIAGNOSTIC = 'sb_diagnostic',
  CROHNS_MONITOR = 'crohns_monitor',
  COLON_EVAL = 'colon_eval',
}

/**
 * Display labels for study types.
 */
export const STUDY_TYPE_LABELS: Record<StudyType, string> = {
  [StudyType.UPPER_GI]: 'Upper GI — Evaluation',
  [StudyType.SB_DIAGNOSTIC]: 'Small Bowel — Diagnostic',
  [StudyType.CROHNS_MONITOR]: 'Small Bowel — Crohn\'s Monitoring',
  [StudyType.COLON_EVAL]: 'Colon — Evaluation',
};

/**
 * Primary anatomical focus regions by study type.
 */
export const STUDY_TYPE_PRIMARY_FOCUS: Record<StudyType, string> = {
    [StudyType.UPPER_GI]: 'Esophagus, Stomach, GEJ',
    [StudyType.SB_DIAGNOSTIC]: 'Small Bowel',
    [StudyType.CROHNS_MONITOR]: 'Small Bowel (Inflammatory)',
    [StudyType.COLON_EVAL]: 'Colon',
};


// ============================================================================
// USER ROLES (5-Role RBAC)
// ============================================================================

/**
 * User role defines permissions and access levels across the platform.
 */
export enum UserRole {
  CLINICIAN_AUTH = 'clinician_auth',
  CLINICIAN_NOAUTH = 'clinician_noauth',
  CLINICIAN_ADMIN = 'clinician_admin',
  ADMIN = 'admin',
  CLINICAL_STAFF = 'clinical_staff',
}

/**
 * Display labels for user roles.
 */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.CLINICIAN_AUTH]: 'Authorized Clinician',
  [UserRole.CLINICIAN_NOAUTH]: 'Clinician (Non-Authorized)',
  [UserRole.CLINICIAN_ADMIN]: 'Clinician Administrator',
  [UserRole.ADMIN]: 'Administrator',
  [UserRole.CLINICAL_STAFF]: 'Clinical Staff',
};

/**
 * Role hierarchy for permission checking.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.CLINICAL_STAFF]: 1,
  [UserRole.CLINICIAN_NOAUTH]: 2,
  [UserRole.CLINICIAN_AUTH]: 3,
  [UserRole.CLINICIAN_ADMIN]: 4,
  [UserRole.ADMIN]: 5,
};

// ============================================================================
// FINDING PROVENANCE
// ============================================================================

/**
 * Finding provenance indicates the source/origin of a finding.
 */
export enum FindingProvenance {
  AI_DETECTED = 'ai_detected',
  CLINICIAN_MARKED = 'clinician_marked',
  CLINICIAN_MODIFIED = 'clinician_modified',
}

/**
 * Display labels for finding provenance.
 */
export const FINDING_PROVENANCE_LABELS: Record<FindingProvenance, string> = {
  [FindingProvenance.AI_DETECTED]: 'AI-Detected',
  [FindingProvenance.CLINICIAN_MARKED]: 'Clinician-Marked',
  [FindingProvenance.CLINICIAN_MODIFIED]: 'AI-Detected (Modified)',
};

// ============================================================================
// FINDING REVIEW STATUS
// ============================================================================

/**
 * Finding review status tracks the clinician's decision on a finding.
 */
export enum FindingReviewStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  MODIFIED = 'modified',
  DEFERRED = 'deferred',
}

/**
 * Display labels for finding review status.
 */
export const FINDING_REVIEW_STATUS_LABELS: Record<FindingReviewStatus, string> = {
  [FindingReviewStatus.PENDING]: 'Pending Review',
  [FindingReviewStatus.CONFIRMED]: 'Confirmed',
  [FindingReviewStatus.REJECTED]: 'Rejected',
  [FindingReviewStatus.MODIFIED]: 'Modified',
  [FindingReviewStatus.DEFERRED]: 'Deferred',
};

// ============================================================================
// DELIVERY METHOD
// ============================================================================

/**
 * Report delivery method specifies how the report is distributed.
 */
export enum DeliveryMethod {
  PDF_DOWNLOAD = 'pdf_download',
  PRINT = 'print',
  EMAIL_PATIENT = 'email_patient',
  EMAIL_REFERRING = 'email_referring',
  HL7_FHIR = 'hl7_fhir',
  DICOM_SR = 'dicom_sr',
}

/**
 * Display labels for delivery methods.
 */
export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  [DeliveryMethod.PDF_DOWNLOAD]: 'PDF Download',
  [DeliveryMethod.PRINT]: 'Print',
  [DeliveryMethod.EMAIL_PATIENT]: 'Email to Patient',
  [DeliveryMethod.EMAIL_REFERRING]: 'Email to Referring Physician',
  [DeliveryMethod.HL7_FHIR]: 'HL7/FHIR Integration',
  [DeliveryMethod.DICOM_SR]: 'DICOM SR Export',
};

// ============================================================================
// URGENCY LEVEL
// ============================================================================

/**
 * Urgency level for procedures and referrals.
 */
export enum UrgencyLevel {
  ROUTINE = 'routine',
  URGENT = 'urgent',
  EMERGENT = 'emergent',
}

/**
 * Display labels for urgency levels.
 */
export const URGENCY_LEVEL_LABELS: Record<UrgencyLevel, string> = {
  [UrgencyLevel.ROUTINE]: 'Routine',
  [UrgencyLevel.URGENT]: 'Urgent',
  [UrgencyLevel.EMERGENT]: 'Emergent',
};

/**
 * Color classes for urgency level badges.
 */
export const URGENCY_LEVEL_COLORS: Record<UrgencyLevel, string> = {
  [UrgencyLevel.ROUTINE]: 'bg-gray-200 text-gray-900',
  [UrgencyLevel.URGENT]: 'bg-yellow-200 text-yellow-900',
  [UrgencyLevel.EMERGENT]: 'bg-red-200 text-red-900',
};

// ============================================================================
// CONSENT METHOD
// ============================================================================

/**
 * Consent method indicates how informed consent was obtained.
 */
export enum ConsentMethod {
    DIGITAL = 'digital',
    PAPER = 'paper',
    VIDEO = 'video',
}

/**
 * Display labels for consent methods.
 */
export const CONSENT_METHOD_LABELS: Record<ConsentMethod, string> = {
    [ConsentMethod.DIGITAL]: 'Digital',
    [ConsentMethod.PAPER]: 'Paper',
    [ConsentMethod.VIDEO]: 'Video',
};

// ============================================================================
// ANATOMICAL REGION
// ============================================================================

/**
 * Anatomical regions for GI findings.
 */
export enum AnatomicalRegion {
    ESOPHAGUS = 'esophagus',
    STOMACH = 'stomach',
    DUODENUM = 'duodenum',
    JEJUNUM = 'jejunum',
    ILEUM = 'ileum',
    CECUCM = 'cecum',
    COLON = 'colon',
    RECTUM = 'rectum',
}

/**
 * Display labels for anatomical regions.
 */
export const ANATOMICAL_REGION_LABELS: Record<AnatomicalRegion, string> = {
    [AnatomicalRegion.ESOPHAGUS]: 'Esophagus',
    [AnatomicalRegion.STOMACH]: 'Stomach',
    [AnatomicalRegion.DUODENUM]: 'Duodenum',
    [AnatomicalRegion.JEJUNUM]: 'Jejunum',
    [AnatomicalRegion.ILEUM]: 'Ileum',
    [AnatomicalRegion.CECUCM]: 'Cecum',
    [AnatomicalRegion.COLON]: 'Colon',
    [AnatomicalRegion.RECTUM]: 'Rectum',
};

// ============================================================================
// NOTIFICATION TYPE
// ============================================================================

/**
 * Notification type categorizes the business event triggering the notification.
 */
export enum NotificationType {
  STUDY_ASSIGNED = 'study_assigned',
  SIGNATURE_REQUIRED = 'signature_required',
  QA_ALERT = 'qa_alert',
  RECALL_NOTICE = 'recall_notice',
  TRANSFER_REQUEST = 'transfer_request',
  DELIVERY_CONFIRMED = 'delivery_confirmed',
  SYSTEM = 'system',
  EDUCATION_ASSIGNED = 'education_assigned',
}

/**
 * Display labels for notification types.
 */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  [NotificationType.STUDY_ASSIGNED]: 'Study Assigned',
  [NotificationType.SIGNATURE_REQUIRED]: 'Signature Required',
  [NotificationType.QA_ALERT]: 'QA Alert',
  [NotificationType.RECALL_NOTICE]: 'Recall Notice',
  [NotificationType.TRANSFER_REQUEST]: 'Transfer Request',
  [NotificationType.DELIVERY_CONFIRMED]: 'Delivery Confirmed',
  [NotificationType.SYSTEM]: 'System Message',
  [NotificationType.EDUCATION_ASSIGNED]: 'Education Assigned',
};

// ============================================================================
// REPORT STATUS
// ============================================================================

/**
 * Report status tracks the state of a report in its lifecycle.
 */
export enum ReportStatus {
  DRAFT = 'draft',
  AUTO_DRAFTED = 'auto_drafted',
  IN_REVIEW = 'in_review',
  SIGNED = 'signed',
  AMENDED = 'amended',
  VOIDED = 'voided',
}

/**
 * Display labels for report status.
 */
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  [ReportStatus.DRAFT]: 'Draft',
  [ReportStatus.AUTO_DRAFTED]: 'Auto-Drafted',
  [ReportStatus.IN_REVIEW]: 'In Review',
  [ReportStatus.SIGNED]: 'Signed',
  [ReportStatus.AMENDED]: 'Amended',
  [ReportStatus.VOIDED]: 'Voided',
};

// ============================================================================
// CAPSULE SCAN METHOD
// ============================================================================

/**
 * Capsule scan method indicates how the capsule was identified.
 */
export enum CapsuleScanMethod {
    BARCODE = 'barcode',
    QR_CODE = 'qr_code',
    MANUAL = 'manual',
}

/**
 * Display labels for capsule scan methods.
 */
export const CAPSULE_SCAN_METHOD_LABELS: Record<CapsuleScanMethod, string> = {
    [CapsuleScanMethod.BARCODE]: 'Barcode Scan',
    [CapsuleScanMethod.QR_CODE]: 'QR Code Scan',
    [CapsuleScanMethod.MANUAL]: 'Manual Entry',
};

// ============================================================================
// CODE SUGGESTION STATUS
// ============================================================================

/**
 * Status of ICD-10 / CPT code suggestions from Copilot.
 */
export enum CodeSuggestionStatus {
    SUGGESTED = 'suggested',
    CONFIRMED = 'confirmed',
    REJECTED = 'rejected',
}

/**
 * Display labels for code suggestion status.
 */
export const CODE_SUGGESTION_STATUS_LABELS: Record<CodeSuggestionStatus, string> = {
    [CodeSuggestionStatus.SUGGESTED]: 'Suggested',
    [CodeSuggestionStatus.CONFIRMED]: 'Confirmed',
    [CodeSuggestionStatus.REJECTED]: 'Rejected',
};

// ============================================================================
// DRAFT SECTION STATUS
// ============================================================================

/**
 * Status of individual sections in auto-drafted reports.
 */
export enum DraftSectionStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    EDITED = 'edited',
    REJECTED = 'rejected',
}

/**
 * Display labels for draft section status.
 */
export const DRAFT_SECTION_STATUS_LABELS: Record<DraftSectionStatus, string> = {
    [DraftSectionStatus.PENDING]: 'Pending Review',
    [DraftSectionStatus.ACCEPTED]: 'Accepted',
    [DraftSectionStatus.EDITED]: 'Edited',
    [DraftSectionStatus.REJECTED]: 'Rejected',
};
