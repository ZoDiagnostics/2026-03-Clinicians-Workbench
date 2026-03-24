import * as admin from 'firebase-admin';

/**
 * Audit Action Type
 * Enumeration of all actions tracked in the audit log.
 * Used for compliance, security, and debugging purposes.
 *
 * Related to Screen Registry SCR-07 (Activity Log) and ZCW-BRD data governance requirements.
 */
export type AuditAction =
  // === PROCEDURE ACTIONS ===
  | 'procedure_created'
  | 'procedure_status_changed'
  | 'procedure_assigned'
  | 'procedure_delegated'
  | 'procedure_voided'
  | 'procedure_closed'
  | 'capsule_scanned'
  | 'capsule_identified'
  | 'procedure_uploaded'

  // === FINDING ACTIONS ===
  | 'finding_detected'
  | 'finding_confirmed'
  | 'finding_rejected'
  | 'finding_modified'
  | 'finding_deferred'
  | 'annotation_added'
  | 'annotation_modified'
  | 'annotation_deleted'

  // === REPORT ACTIONS ===
  | 'report_created'
  | 'report_auto_drafted'
  | 'report_section_edited'
  | 'report_signed'
  | 'report_amended'
  | 'report_voided'
  | 'report_delivered'
  | 'code_suggested'
  | 'code_confirmed'
  | 'code_rejected'

  // === REFERRAL ACTIONS ===
  | 'referral_generated'
  | 'referral_approved'
  | 'referral_dismissed'

  // === REVIEW TRANSFER ACTIONS ===
  | 'review_transferred'
  | 'review_transfer_accepted'
  | 'review_transfer_rejected'

  // === NOTIFICATION ACTIONS ===
  | 'notification_created'
  | 'notification_sent'
  | 'notification_failed'
  | 'notification_read'
  | 'notification_dismissed'

  // === USER ACTIONS ===
  | 'user_login'
  | 'user_logout'
  | 'user_created'
  | 'user_updated'
  | 'user_role_changed'
  | 'user_archived'
  | 'user_activated'
  | 'delegation_granted'
  | 'delegation_revoked'

  // === PATIENT ACTIONS ===
  | 'patient_created'
  | 'patient_updated'
  | 'patient_archived'
  | 'patient_reactivated'
  | 'patient_demographics_overridden'
  | 'patient_emr_synced'
  | 'patient_emr_conflict_resolved'

  // === PRACTICE ACTIONS ===
  | 'practice_settings_updated'
  | 'clinic_created'
  | 'clinic_updated'
  | 'staff_assigned'
  | 'staff_unassigned'
  | 'emr_integration_configured'
  | 'emr_sync_executed'

  // === EDUCATION ACTIONS ===
  | 'education_material_assigned'
  | 'education_material_sent'
  | 'teaching_case_created'
  | 'teaching_case_updated'

  // === CAPSULE & TRANSFER ACTIONS ===
  | 'capsule_recall_initiated'
  | 'scheduled_report_created'
  | 'procedure_transfer'

  // === SYSTEM ACTIONS ===
  | 'system_error'
  | 'system_maintenance'
  | 'ai_model_updated'
  | 'capsule_recall_issued'
  | 'data_export'
  | 'analytics_accessed';

/**
 * Audit Log Entry
 * Single record in the practice audit trail.
 *
 * @remarks
 * Audit entries are created automatically by the system and Cloud Functions.
 * Entries are stored in the auditLog collection at the practice level.
 * Only system (admin SDK) can write; only admin and clinician_admin can read.
 * Audit log provides full compliance trail for healthcare regulations.
 *
 * Defined in BRD Appendix B and Screen Registry SCR-07.
 */
export interface AuditEntry {
  /** Unique audit entry identifier (UUID) */
  id: string;

  /** Practice ID - audit entry belongs to this practice */
  practiceId: string;

  /** Procedure ID if action involves a procedure (optional) */
  procedureId?: string;

  /** Patient ID if action involves a patient (optional) */
  patientId?: string;

  /** User ID who performed the action */
  userId: string;

  /** Type of action performed (see AuditAction enum) */
  action: AuditAction;

  /** Entity type that was acted upon (procedure, patient, report, user, etc.) */
  entityType: 'procedure' | 'patient' | 'report' | 'finding' | 'user' | 'practice' | 'notification' | 'clinic' | 'education';

  /** Entity ID - the specific entity that was acted upon */
  entityId: string;

  /** Detailed action context and parameters */
  details: Record<string, any>;

  /** State of entity before the action (if applicable) */
  previousState?: Record<string, any>;

  /** State of entity after the action (if applicable) */
  newState?: Record<string, any>;

  /** IP address of the client performing the action (for security analysis) */
  ipAddress?: string;

  /** User agent string from the client (browser/device info) */
  userAgent?: string;

  /** Timestamp when the action was performed */
  timestamp: admin.firestore.Timestamp;
}
