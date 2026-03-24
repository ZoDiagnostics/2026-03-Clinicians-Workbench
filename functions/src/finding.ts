import * as admin from 'firebase-admin';
import { FindingProvenance, FindingReviewStatus, AnatomicalRegion, UrgencyLevel } from './enums';

/**
 * Frame Reference
 * Reference to a specific frame in the procedure video.
 */
export interface FrameReference {
  /** Frame number in video sequence (0-indexed) */
  frameNumber: number;
  /** Timestamp in video in milliseconds */
  frameTimestamp: number;
  /** Description of what is shown in this frame */
  description?: string;
}

/**
 * Modification Entry
 * Tracks clinician modifications to AI-detected findings.
 * Maintains audit trail for clinician actions on findings.
 */
export interface ModificationEntry {
  /** Timestamp of modification */
  modifiedAt: admin.firestore.Timestamp;
  /** User ID of clinician who modified */
  modifiedBy: string;
  /** Type of modification (size, location, classification, etc.) */
  modificationType: string;
  /** Previous value before modification */
  previousValue: any;
  /** New value after modification */
  newValue: any;
  /** Reason for modification if provided by clinician */
  reason?: string;
}

/**
 * Annotation
 * Clinician annotation on a finding (drawn marks, notes, etc.).
 * Used for visual markup and documentation.
 */
export interface Annotation {
  /** Unique annotation identifier */
  id: string;
  /** Annotation type (e.g., "circle", "arrow", "text", "measurement") */
  type: string;
  /** Annotation data (coordinates, text content, etc.) - varies by type */
  data: Record<string, any>;
  /** User who created annotation */
  createdBy: string;
  /** Timestamp of annotation creation */
  createdAt: admin.firestore.Timestamp;
  /** User-entered label for annotation */
  label?: string;
}

/**
 * Finding
 * Represents an identified abnormality, lesion, or point of clinical interest.
 *
 * @remarks
 * Findings originate from AI detection or clinician marking.
 * Each finding has a review status tracking clinician acceptance/rejection/modification.
 * Incidental findings (outside primary focus) are tracked separately for referral generation.
 *
 * Findings are stored as sub-collection under procedures/{procedureId}/findings/{findingId}
 * Defined in BRD Appendix B and ZCW-BRD-0046 through ZCW-BRD-0048.
 */
export interface Finding {
  /** Unique finding identifier (UUID) */
  id: string;

  /** Procedure ID - parent procedure for this finding */
  procedureId: string;

  /** Source/origin of this finding (AI-detected, clinician-marked, clinician-modified) */
  provenance: FindingProvenance;

  /** Clinician's review decision on this finding */
  reviewStatus: FindingReviewStatus;

  /** Flag indicating finding is outside primary study type focus (ZCW-BRD-0048) */
  isIncidental: boolean;

  // ========== CLINICAL CLASSIFICATION ==========

  /** Finding type/classification (e.g., "polyp", "ulcer", "bleeding", "stricture") */
  classification: string;

  /** Sub-classification if more specific (e.g., "adenomatous polyp", "benign ulcer") */
  subClassification?: string;

  /** Anatomical region where finding is located */
  anatomicalRegion: AnatomicalRegion;

  // ========== MEASUREMENTS ==========

  /** Estimated size of finding in millimeters */
  sizeMillimeters?: number;

  /** Confidence level in size measurement (0-1.0) */
  sizeConfidence?: number;

  // ========== FRAME REFERENCES ==========

  /** Primary/best frame showing this finding */
  primaryFrameNumber: number;

  /** Timestamp in video (milliseconds) of primary frame */
  primaryFrameTimestamp: number;

  /** Additional frames showing this finding from different angles */
  additionalFrames: FrameReference[];

  // ========== AI METADATA ==========

  /** AI model version that detected this finding (if AI-originated) */
  aiModelVersion?: string;

  /** AI confidence score for detection (0-1.0) */
  aiConfidence?: number;

  /** Backward-compatible confidence field (alias for aiConfidence, used in seed data) */
  confidence?: number;

  /** Backward-compatible type field (alias for classification, used in seed data) */
  type?: string;

  /** Backward-compatible region field (alias for anatomicalRegion, used in seed data) */
  region?: string;

  /** Backward-compatible frameNumber field (alias for primaryFrameNumber, used in seed data) */
  frameNumber?: number;

  /** Human-readable description of the finding */
  description?: string;

  // ========== CLINICIAN REVIEW ACTIONS ==========

  /** User ID of clinician who confirmed this finding */
  confirmedBy?: string;

  /** Timestamp when finding was confirmed */
  confirmedAt?: admin.firestore.Timestamp;

  /** User ID of clinician who rejected this finding */
  rejectedBy?: string;

  /** Timestamp when finding was rejected */
  rejectedAt?: admin.firestore.Timestamp;

  /** User ID of clinician who modified this finding */
  modifiedBy?: string;

  /** Timestamp when finding was last modified */
  modifiedAt?: admin.firestore.Timestamp;

  /** History of all modifications made to this finding */
  modificationHistory: ModificationEntry[];

  // ========== ANNOTATIONS ==========

  /** Visual annotations on frames (drawn marks, measurements, etc.) */
  annotations: Annotation[];

  // ========== INCIDENTAL FINDING ACTIONS ==========

  /** Whether a referral was generated for this incidental finding */
  referralGenerated?: boolean;

  /** Type of referral if generated (colonoscopy, specialty consult, etc.) */
  referralType?: string;

  /** Urgency level of referral if generated */
  referralUrgency?: UrgencyLevel;

  // ========== AUDIT & METADATA ==========

  /** Timestamp when finding record was created */
  createdAt: admin.firestore.Timestamp;

  /** Timestamp of last update to finding */
  updatedAt: admin.firestore.Timestamp;
}
