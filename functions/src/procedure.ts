import * as admin from 'firebase-admin';
import { ProcedureStatus, StudyType, UrgencyLevel, CapsuleScanMethod, ConsentMethod } from './enums';

/**
 * Contraindication Review
 * Tracks screening results for procedure contraindications.
 */
export interface ContraindicationReview {
  /** Pacemaker or implanted medical device present */
  hasPacemaker: boolean;
  /** Swallowing disorder documented */
  hasSwallowingDisorder: boolean;
  /** Bowel obstruction documented */
  hasBowelObstruction: boolean;
  /** Known drug allergies to consent agents */
  hasKnownAllergy: boolean;
  /** Additional notes on contraindications */
  notes?: string;
  /** Timestamp of contraindication review */
  reviewedAt: admin.firestore.Timestamp;
  /** User ID of staff member who performed review */
  reviewedBy: string;
}

/**
 * Pre-Procedure Check
 * Individual checklist item for pre-procedure protocol.
 */
export interface PreProcedureCheck {
  /** Unique identifier for check item */
  id: string;
  /** Human-readable label for check (e.g., "NPO Status Confirmed") */
  label: string;
  /** Whether this check item was completed/satisfied */
  isCompleted: boolean;
  /** Notes specific to this check */
  notes?: string;
  /** Timestamp when check was completed */
  completedAt?: admin.firestore.Timestamp;
}

/**
 * Pre-Review Configuration
 * Settings that control the AI analysis focus before Viewer review.
 * Defined in ZCW-BRD-0244.
 */
export interface PreReviewConfig {
  /** Primary study type focus (from selected study type) */
  studyType: StudyType;
  /** Enable Crohn's inflammatory focus if applicable */
  crohnsMode: boolean;
  /** AI sensitivity threshold for finding detection (0-100) */
  sensitivityThreshold: number;
  /** Timestamp when pre-review config was set */
  configuredAt: admin.firestore.Timestamp;
  /** User ID who configured pre-review settings */
  configuredBy: string;
}

/**
 * Transit Times
 * Anatomical landmark timing data for GI tract transit analysis.
 * Extended in v2.2.1 to include additional landmarks.
 */
export interface TransitTimes {
  /** Frame number at esophageal entry (first frame with esophageal mucosa visible) */
  esophagealEntryFrame?: number;
  /** Timestamp at esophageal entry in milliseconds */
  esophagealEntryTime?: number;

  /** Frame number at gastric entry (first frame with gastric mucosa) */
  gastricEntryFrame?: number;
  /** Timestamp at gastric entry in milliseconds */
  gastricEntryTime?: number;

  /** Frame number at GEJ (gastroesophageal junction crossing) */
  gejFrame?: number;
  /** Timestamp at GEJ crossing in milliseconds */
  gejTime?: number;

  /** Frame number at duodenal entry (duodenal bulb visible) */
  duodenalEntryFrame?: number;
  /** Timestamp at duodenal entry in milliseconds */
  duodenalEntryTime?: number;

  /** Frame number at jejunal entry */
  jejunalEntryFrame?: number;
  /** Timestamp at jejunal entry in milliseconds */
  jejunalEntryTime?: number;

  /** Frame number at ileal entry */
  ilealEntryFrame?: number;
  /** Timestamp at ileal entry in milliseconds */
  ilealEntryTime?: number;

  /** Frame number at cecal entry (indicates small bowel completion) */
  cecalEntryFrame?: number;
  /** Timestamp at cecal entry in milliseconds */
  cecalEntryTime?: number;

  /** Frame number at rectal/colonic entry */
  rectalEntryFrame?: number;
  /** Timestamp at rectal entry in milliseconds */
  rectalEntryTime?: number;

  /** Total video duration in seconds */
  totalDurationSeconds?: number;

  /** Small bowel transit time in seconds (jejunal to ileal entry) */
  smallBowelTransitSeconds?: number;
}

/**
 * Procedure
 * Core procedure record for a capsule endoscopy study.
 *
 * @remarks
 * Procedures follow a strict state machine defined by ProcedureStatus enum.
 * Each procedure is assigned to a clinician for review and signing.
 * Procedures capture all metadata from check-in through report delivery.
 *
 * Defined in BRD Appendix B and referenced in ZCW-BRD-0226 through ZCW-BRD-0245.
 */
export interface Procedure {
  /** Unique procedure identifier (UUID) */
  id: string;

  /** Practice ID - procedure belongs to this practice */
  practiceId: string;

  /** Clinic ID - location where procedure originated */
  clinicId: string;

  /** Patient ID - the patient undergoing the procedure */
  patientId: string;

  /** Clinician ID - primary assigned clinician for this procedure */
  assignedClinicianId: string;

  /** Covering Clinician ID - clinician delegated to review if assigned clinician unavailable */
  coveringClinicianId?: string;

  /** Current status in procedure lifecycle (state machine) */
  status: ProcedureStatus;

  /** Study type indicating primary clinical focus */
  studyType: StudyType;

  /** Procedure urgency level (routine/urgent/emergent) */
  urgency: UrgencyLevel;

  // ========== CAPSULE IDENTIFICATION ==========

  /** Capsule lot number for traceability (ZCW-BRD-0239) */
  capsuleLotNumber?: string;

  /** Capsule serial number for unit identification (ZCW-BRD-0240) */
  capsuleSerialNumber?: string;

  /** Method used to capture capsule identifier (barcode, QR, manual) */
  capsuleScanMethod?: CapsuleScanMethod;

  /** Capsule expiration date from packaging */
  capsuleExpirationDate?: admin.firestore.Timestamp;

  // ========== CLINICAL CONTEXT ==========

  /** List of indications for the study (structured templates) */
  indications: string[];

  /** Free-text indication notes if not in template */
  indicationFreeText?: string;

  /** Contraindication screening results */
  contraindications: ContraindicationReview;

  /** Informed consent method (digital/paper/video) */
  consentMethod?: ConsentMethod;

  /** Timestamp when patient gave informed consent */
  consentTimestamp?: admin.firestore.Timestamp;

  /** Checklist items completed at pre-procedure check-in */
  preProcedureChecks: PreProcedureCheck[];

  /** Timestamp when capsule was ingested by patient */
  ingestionRecordedAt?: admin.firestore.Timestamp;

  // ========== PRE-REVIEW CONFIGURATION ==========

  /** AI analysis configuration applied before Viewer review */
  preReviewConfig: PreReviewConfig;

  // ========== VIDEO UPLOAD & PROCESSING ==========

  /** Timestamp when capsule video was uploaded to system */
  uploadedAt?: admin.firestore.Timestamp;

  /** Storage path to capsule video file in Cloud Storage */
  capsuleVideoStoragePath?: string;

  /** Number of frames in uploaded video */
  frameCount?: number;

  /** Video duration in seconds */
  videoDuration?: number;

  /** Automated quality score for uploaded video (0-100) */
  qualityScore?: number;

  // ========== ANATOMICAL LANDMARKS & TRANSIT ==========

  /** Transit time data for all anatomical landmarks */
  transitTimes?: TransitTimes;

  // ========== REVIEW WORKFLOW TIMESTAMPS ==========

  /** Timestamp when clinician opened study for review */
  reviewStartedAt?: admin.firestore.Timestamp;

  /** Timestamp when clinician completed review (all findings confirmed) */
  reviewCompletedAt?: admin.firestore.Timestamp;

  /** Timestamp when report was signed by authorized clinician */
  signedAt?: admin.firestore.Timestamp;

  /** User ID of clinician who signed the report */
  signedBy?: string;

  /** Timestamp when procedure was closed/archived */
  closedAt?: admin.firestore.Timestamp;

  /** Timestamp when procedure was voided */
  voidedAt?: admin.firestore.Timestamp;

  /** Reason for voiding if applicable */
  voidReason?: string;

  // ========== AUDIT & METADATA ==========

  /** Timestamp when procedure record was created */
  createdAt: admin.firestore.Timestamp;

  /** Timestamp of last update to procedure record */
  updatedAt: admin.firestore.Timestamp;

  /** User ID of clinical staff who created the procedure record */
  createdBy: string;
}
