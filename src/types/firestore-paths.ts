/**
 * Firestore Collection Paths and Helpers
 *
 * Centralized constants for all Firestore collection paths and typed helper functions.
 * Ensures consistency across the codebase and prevents path typos.
 *
 * Usage:
 * import { COLLECTIONS } from '@/types/firestore-paths';
 *
 * // Collection paths
 * const patientRef = db.collection(COLLECTIONS.PATIENTS);
 * const findingsRef = db.collection(COLLECTIONS.FINDINGS(procedureId));
 */

/**
 * Firestore Collection Constants
 *
 * Top-level and dynamically-generated collection paths.
 */
export const COLLECTIONS = {
  /**
   * Patients collection
   * Path: /patients
   */
  PATIENTS: 'patients' as const,

  /**
   * Procedures collection
   * Path: /procedures
   */
  PROCEDURES: 'procedures' as const,

  /**
   * Findings sub-collection under procedures
   * Path: /procedures/{procedureId}/findings
   *
   * @param procedureId - The procedure ID
   * @returns Full path to findings sub-collection
   */
  FINDINGS: (procedureId: string) => `procedures/${procedureId}/findings` as const,

  /**
   * Reports collection
   * Path: /reports
   */
  REPORTS: 'reports' as const,

  /**
   * Users collection
   * Path: /users
   */
  USERS: 'users' as const,

  /**
   * Practices collection
   * Path: /practices
   */
  PRACTICES: 'practices' as const,

  /**
   * Practice Settings sub-collection
   * Path: /practices/{practiceId}/settings
   *
   * @param practiceId - The practice ID
   * @returns Full path to practice settings sub-collection
   */
  PRACTICE_SETTINGS: (practiceId: string) => `practices/${practiceId}/settings` as const,

  /**
   * Clinics sub-collection under practices
   * Path: /practices/{practiceId}/clinics
   *
   * @param practiceId - The practice ID
   * @returns Full path to clinics sub-collection
   */
  CLINICS: (practiceId: string) => `practices/${practiceId}/clinics` as const,

  /**
   * Audit Log collection
   * Path: /auditLog
   * Practice-scoped security rules apply
   */
  AUDIT_LOG: 'auditLog' as const,

  /**
   * Notifications collection
   * Path: /notifications
   * User-scoped read/write access
   */
  NOTIFICATIONS: 'notifications' as const,

  /**
   * Education Materials collection
   * Path: /educationMaterials
   */
  EDUCATION_MATERIALS: 'educationMaterials' as const,

  /**
   * Capsule Inventory sub-collection under practices
   * Path: /practices/{practiceId}/capsuleInventory
   *
   * @param practiceId - The practice ID
   * @returns Full path to capsule inventory sub-collection
   */
  CAPSULE_INVENTORY: (practiceId: string) => `practices/${practiceId}/capsuleInventory` as const,

  /**
   * Annotations sub-collection under procedures
   * Path: /procedures/{procedureId}/annotations
   *
   * @param procedureId - The procedure ID
   * @returns Full path to annotations sub-collection
   */
  ANNOTATIONS: (procedureId: string) => `procedures/${procedureId}/annotations` as const,

  /**
   * ICD Favorites sub-collection under practices
   * Path: /practices/{practiceId}/icdFavorites
   *
   * @param practiceId - The practice ID
   * @returns Full path to ICD favorites sub-collection
   */
  ICD_FAVORITES: (practiceId: string) => `practices/${practiceId}/icdFavorites` as const,

  /**
   * Scheduled Reports sub-collection under practices
   * Path: /practices/{practiceId}/scheduledReports
   *
   * @param practiceId - The practice ID
   * @returns Full path to scheduled reports sub-collection
   */
  SCHEDULED_REPORTS: (practiceId: string) => `practices/${practiceId}/scheduledReports` as const,

  /**
   * Capsule Recalls sub-collection under practices
   * Path: /practices/{practiceId}/capsuleRecalls
   *
   * @param practiceId - The practice ID
   * @returns Full path to capsule recalls sub-collection
   */
  CAPSULE_RECALLS: (practiceId: string) => `practices/${practiceId}/capsuleRecalls` as const,

  /**
   * Education Assignments sub-collection under patients
   * Path: /patients/{patientId}/educationAssignments
   *
   * @param patientId - The patient ID
   * @returns Full path to education assignments sub-collection
   */
  EDUCATION_ASSIGNMENTS: (patientId: string) => `patients/${patientId}/educationAssignments` as const,

  /**
   * Subscription document under practices
   * Path: /practices/{practiceId}/subscription
   *
   * @param practiceId - The practice ID
   * @returns Full path to subscription document
   */
  SUBSCRIPTION: (practiceId: string) => `practices/${practiceId}/subscription` as const,

  /**
   * User Preferences sub-collection
   * Path: /users/{uid}/preferences
   *
   * @param userId - The user ID
   * @returns Full path to user preferences sub-collection
   */
  USER_PREFERENCES: (userId: string) => `users/${userId}/preferences` as const,

  /**
   * User Notifications sub-collection
   * Path: /users/{uid}/notifications
   *
   * @param userId - The user ID
   * @returns Full path to user notifications sub-collection
   */
  USER_NOTIFICATIONS: (userId: string) => `users/${userId}/notifications` as const,
} as const;

/**
 * Cloud Storage Bucket Paths
 *
 * Constants for Cloud Storage bucket organization.
 */
export const STORAGE_PATHS = {
  /**
   * Capsule study videos
   * Path: gs://bucket/capsule-studies/{practiceId}/{procedureId}/{filename}
   *
   * @param practiceId - Practice ID
   * @param procedureId - Procedure ID
   * @returns Bucket path prefix
   */
  CAPSULE_STUDIES: (practiceId: string, procedureId: string) =>
    `capsule-studies/${practiceId}/${procedureId}`,

  /**
   * Clinician-facing report PDFs
   * Path: gs://bucket/report-pdfs/{practiceId}/{reportId}/{filename}
   *
   * @param practiceId - Practice ID
   * @param reportId - Report ID
   * @returns Bucket path prefix
   */
  REPORT_PDFS: (practiceId: string, reportId: string) =>
    `report-pdfs/${practiceId}/${reportId}`,

  /**
   * Patient-facing report PDFs (de-identified/translated)
   * Path: gs://bucket/patient-report-pdfs/{practiceId}/{reportId}/{filename}
   *
   * @param practiceId - Practice ID
   * @param reportId - Report ID
   * @returns Bucket path prefix
   */
  PATIENT_REPORT_PDFS: (practiceId: string, reportId: string) =>
    `patient-report-pdfs/${practiceId}/${reportId}`,

  /**
   * Education materials
   * Path: gs://bucket/education-materials/{practiceId}/{filename}
   *
   * @param practiceId - Practice ID
   * @returns Bucket path prefix
   */
  EDUCATION_MATERIALS: (practiceId: string) =>
    `education-materials/${practiceId}`,

  /**
   * Temporary uploads during processing
   * Path: gs://bucket/temp/{userId}/{filename}
   * Auto-cleanup after 7 days recommended
   *
   * @param userId - User ID
   * @returns Bucket path prefix
   */
  TEMP: (userId: string) =>
    `temp/${userId}`,
} as const;

/**
 * Type-safe document reference builder
 *
 * Helper function to build typed Firestore document paths with auto-completion.
 */
export class FirestorePath {
  /**
   * Build path to patient document
   *
   * @param patientId - Patient ID
   * @returns Path string: `patients/{patientId}`
   */
  static patient(patientId: string): string {
    return `${COLLECTIONS.PATIENTS}/${patientId}`;
  }

  /**
   * Build path to procedure document
   *
   * @param procedureId - Procedure ID
   * @returns Path string: `procedures/{procedureId}`
   */
  static procedure(procedureId: string): string {
    return `${COLLECTIONS.PROCEDURES}/${procedureId}`;
  }

  /**
   * Build path to finding document
   *
   * @param procedureId - Procedure ID
   * @param findingId - Finding ID
   * @returns Path string: `procedures/{procedureId}/findings/{findingId}`
   */
  static finding(procedureId: string, findingId: string): string {
    return `${COLLECTIONS.FINDINGS(procedureId)}/${findingId}`;
  }

  /**
   * Build path to report document
   *
   * @param reportId - Report ID
   * @returns Path string: `reports/{reportId}`
   */
  static report(reportId: string): string {
    return `${COLLECTIONS.REPORTS}/${reportId}`;
  }

  /**
   * Build path to user document
   *
   * @param userId - User ID
   * @returns Path string: `users/{userId}`
   */
  static user(userId: string): string {
    return `${COLLECTIONS.USERS}/${userId}`;
  }

  /**
   * Build path to practice document
   *
   * @param practiceId - Practice ID
   * @returns Path string: `practices/{practiceId}`
   */
  static practice(practiceId: string): string {
    return `${COLLECTIONS.PRACTICES}/${practiceId}`;
  }

  /**
   * Build path to practice settings document
   *
   * @param practiceId - Practice ID
   * @returns Path string: `practices/{practiceId}/settings/default`
   */
  static practiceSettings(practiceId: string): string {
    return `${COLLECTIONS.PRACTICE_SETTINGS(practiceId)}/default`;
  }

  /**
   * Build path to clinic document
   *
   * @param practiceId - Practice ID
   * @param clinicId - Clinic ID
   * @returns Path string: `practices/{practiceId}/clinics/{clinicId}`
   */
  static clinic(practiceId: string, clinicId: string): string {
    return `${COLLECTIONS.CLINICS(practiceId)}/${clinicId}`;
  }

  /**
   * Build path to audit log entry
   *
   * @param entryId - Audit entry ID
   * @returns Path string: `auditLog/{entryId}`
   */
  static auditEntry(entryId: string): string {
    return `${COLLECTIONS.AUDIT_LOG}/${entryId}`;
  }

  /**
   * Build path to notification document
   *
   * @param notificationId - Notification ID
   * @returns Path string: `notifications/{notificationId}`
   */
  static notification(notificationId: string): string {
    return `${COLLECTIONS.NOTIFICATIONS}/${notificationId}`;
  }

  /**
   * Build path to education material document
   *
   * @param materialId - Material ID
   * @returns Path string: `educationMaterials/{materialId}`
   */
  static educationMaterial(materialId: string): string {
    return `${COLLECTIONS.EDUCATION_MATERIALS}/${materialId}`;
  }

  /**
   * Build path to capsule inventory item
   *
   * @param practiceId - Practice ID
   * @param inventoryId - Inventory item ID
   * @returns Path string: `practices/{practiceId}/capsuleInventory/{inventoryId}`
   */
  static capsuleInventory(practiceId: string, inventoryId: string): string {
    return `${COLLECTIONS.CAPSULE_INVENTORY(practiceId)}/${inventoryId}`;
  }

  /**
   * Build path to annotation document
   *
   * @param procedureId - Procedure ID
   * @param annotationId - Annotation ID
   * @returns Path string: `procedures/{procedureId}/annotations/{annotationId}`
   */
  static annotation(procedureId: string, annotationId: string): string {
    return `${COLLECTIONS.ANNOTATIONS(procedureId)}/${annotationId}`;
  }

  /**
   * Build path to ICD favorite document
   *
   * @param practiceId - Practice ID
   * @param favoriteId - Favorite ID
   * @returns Path string: `practices/{practiceId}/icdFavorites/{favoriteId}`
   */
  static icdFavorite(practiceId: string, favoriteId: string): string {
    return `${COLLECTIONS.ICD_FAVORITES(practiceId)}/${favoriteId}`;
  }

  /**
   * Build path to scheduled report document
   *
   * @param practiceId - Practice ID
   * @param reportId - Report ID
   * @returns Path string: `practices/{practiceId}/scheduledReports/{reportId}`
   */
  static scheduledReport(practiceId: string, reportId: string): string {
    return `${COLLECTIONS.SCHEDULED_REPORTS(practiceId)}/${reportId}`;
  }

  /**
   * Build path to capsule recall document
   *
   * @param practiceId - Practice ID
   * @param recallId - Recall ID
   * @returns Path string: `practices/{practiceId}/capsuleRecalls/{recallId}`
   */
  static capsuleRecall(practiceId: string, recallId: string): string {
    return `${COLLECTIONS.CAPSULE_RECALLS(practiceId)}/${recallId}`;
  }

  /**
   * Build path to education assignment document
   *
   * @param patientId - Patient ID
   * @param assignmentId - Assignment ID
   * @returns Path string: `patients/{patientId}/educationAssignments/{assignmentId}`
   */
  static educationAssignment(patientId: string, assignmentId: string): string {
    return `${COLLECTIONS.EDUCATION_ASSIGNMENTS(patientId)}/${assignmentId}`;
  }

  /**
   * Build path to subscription document
   *
   * @param practiceId - Practice ID
   * @returns Path string: `practices/{practiceId}/subscription`
   */
  static subscription(practiceId: string): string {
    return `${COLLECTIONS.SUBSCRIPTION(practiceId)}`;
  }

  /**
   * Build path to user preference document
   *
   * @param userId - User ID
   * @param preferenceId - Preference ID
   * @returns Path string: `users/{userId}/preferences/{preferenceId}`
   */
  static userPreference(userId: string, preferenceId: string): string {
    return `${COLLECTIONS.USER_PREFERENCES(userId)}/${preferenceId}`;
  }

  /**
   * Build path to user notification document
   *
   * @param userId - User ID
   * @param notificationId - Notification ID
   * @returns Path string: `users/{userId}/notifications/{notificationId}`
   */
  static userNotification(userId: string, notificationId: string): string {
    return `${COLLECTIONS.USER_NOTIFICATIONS(userId)}/${notificationId}`;
  }
}
