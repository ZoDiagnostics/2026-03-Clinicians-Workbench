import { Timestamp } from 'firebase/firestore';
import { StudyType, DeliveryMethod } from './enums';
import { Address } from './patient';

/**
 * Subscription Information
 * Tracks practice subscription tier and billing status.
 */
export interface SubscriptionInfo {
  /** Subscription tier (free, standard, professional, enterprise) */
  tier: 'free' | 'standard' | 'professional' | 'enterprise';
  /** Subscription start date */
  startDate: Timestamp;
  /** Subscription renewal date */
  renewalDate: Timestamp;
  /** Whether subscription is currently active */
  isActive: boolean;
  /** Maximum procedures allowed per month (null for unlimited) */
  monthlyProcedureLimit?: number;
  /** Current month procedure usage count */
  currentMonthUsage: number;
  /** Contact email for billing inquiries */
  billingEmail: string;
  /** Primary contact name */
  billingContactName: string;
}

/**
 * Delivery Defaults
 * Practice-level defaults for report delivery to patients and providers.
 * Defined in ZCW-BRD-0298.
 */
export interface DeliveryDefaults {
  /** Default delivery methods for new reports */
  defaultMethods: DeliveryMethod[];
  /** Whether to auto-populate patient email if available */
  autoCheckPatientEmail: boolean;
  /** Whether to auto-populate referring physician email if available */
  autoCheckReferringEmail: boolean;
  /** Default cover letter text to include with reports */
  defaultCoverLetter?: string;
  /** Default recipient email addresses always included */
  defaultRecipients: string[];
  /** Preferred report format (PDF, HTML, DICOM SR, etc.) */
  preferredFormat: 'pdf' | 'html' | 'dicom_sr';
}

/**
 * Practice Notification Configuration
 * Settings for notification behavior and routing across the practice.
 * Related to ZCW-BRD-0259 and ZCW-BRD-0260.
 */
export interface PracticeNotificationConfig {
  /** Whether notifications include patient PHI (governed by role masking) */
  includePhiInNotifications: boolean;
  /** Default notification channels (in_app, email, push) */
  defaultChannels: ('in_app' | 'email' | 'push')[];
  /** Enable system-wide quiet hours (applies to all users unless overridden) */
  globalQuietHoursEnabled: boolean;
  /** Global quiet hours start time (HH:MM) */
  globalQuietHoursStart?: string;
  /** Global quiet hours end time (HH:MM) */
  globalQuietHoursEnd?: string;
}

/**
 * PHI Masking Rule
 * Define what PHI fields are visible to each role.
 * Related to ZCW-BRD-0281 and Screen Registry SCR-01, SCR-02, SCR-14.
 */
export interface PhiMaskingRule {
  /** Role to which this rule applies */
  role: string;
  /** List of PHI fields that should be masked for this role (e.g., "ssn", "full_dob", "insurance_id") */
  maskedFields: string[];
  /** Whether role can request unmasking of sensitive fields */
  canRequestUnmask: boolean;
  /** Whether to show EMR source badges on demographic fields */
  showEmrBadges: boolean;
}

/**
 * EMR Configuration
 * Settings for EMR/PACS integration and synchronization.
 * Related to ZCW-BRD-0279 and ZCW-BRD-0280.
 */
export interface EmrConfig {
  /** Whether EMR integration is enabled */
  enabled: boolean;
  /** EMR system type (Epic, Cerner, Allscripts, etc.) */
  emrSystem: string;
  /** Integration endpoint URL */
  endpointUrl?: string;
  /** API key or authentication credentials (encrypted in storage) */
  apiKey?: string;
  /** Which fields should sync from EMR (patient demographics, diagnoses, etc.) */
  syncFields: string[];
  /** Whether to allow local override of EMR-sourced fields */
  allowLocalOverride: boolean;
  /** Timestamp of last successful EMR sync */
  lastSyncAt?: Timestamp;
}

/**
 * Annotation Template
 * Pre-configured annotation template for clinician use.
 * Allows standardization of annotation workflows.
 */
export interface AnnotationTemplate {
  /** Template identifier */
  id: string;
  /** Template name for display */
  name: string;
  /** Description of template purpose */
  description?: string;
  /** Template content/fields (varies by annotation type) */
  content: Record<string, any>;
  /** Applicable study types for this template */
  studyTypes: StudyType[];
  /** Display order */
  order: number;
  /** Whether template is active/available */
  isActive: boolean;
  /** Timestamp when template was created */
  createdAt: Timestamp;
  /** Timestamp when template was last updated */
  updatedAt: Timestamp;
}

/**
 * Capsule Inventory Item
 * Tracks physical capsule inventory at a clinic location.
 */
export interface CapsuleInventoryItem {
  /** Unique inventory item identifier */
  id: string;
  /** Capsule lot number */
  lotNumber: string;
  /** Capsule serial number range start (if bulk entry) */
  serialNumberStart: string;
  /** Capsule serial number range end (if bulk entry) */
  serialNumberEnd?: string;
  /** Capsule expiration date */
  expirationDate: Timestamp;
  /** Quantity received */
  quantityReceived: number;
  /** Quantity used/depleted */
  quantityUsed: number;
  /** Whether this lot has been recalled */
  isRecalled: boolean;
  /** Recall reason if applicable */
  recallReason?: string;
  /** Timestamp when inventory was received */
  receivedAt: Timestamp;
  /** Timestamp of last usage from this lot */
  lastUsedAt?: Timestamp;
}

/**
 * Practice
 * Top-level organization/tenant entity.
 *
 * @remarks
 * A practice represents a healthcare organization or practice group.
 * All data is scoped to a practice (multi-tenancy).
 * Practices have subscription tier, contact info, and system settings.
 *
 * Defined in BRD Appendix B.
 */
export interface Practice {
  /** Unique practice identifier (UUID) */
  id: string;

  /** Practice legal name */
  name: string;

  /** NPI (National Provider Identifier) for the practice */
  npiNumber?: string;

  /** Practice physical address */
  address: Address;

  /** Practice phone number for patient contact */
  phone: string;

  /** Timezone for the practice (e.g., "America/Los_Angeles") */
  timezone: string;

  /** Default language for the practice */
  defaultLanguage: string;

  /** Subscription and billing information */
  subscription: SubscriptionInfo;

  /** Timestamp when practice was created */
  createdAt: Timestamp;

  /** Timestamp of last update to practice info */
  updatedAt: Timestamp;
}

/**
 * Practice Settings
 * System configuration and operational settings for a practice.
 * Stored in practices/{practiceId}/settings/{doc}
 *
 * @remarks
 * This is a singleton document (ID = 'default') containing all practice-level settings.
 * Accessible only to admin and clinician_admin roles.
 */
export interface PracticeSettings {
  /** Document ID - always 'default' for singleton */
  id: string;

  /** Practice ID - settings belong to this practice */
  practiceId: string;

  // ========== DELIVERY CONFIGURATION ==========

  /** Report delivery method defaults */
  deliveryDefaults: DeliveryDefaults;

  // ========== INCIDENTAL FINDINGS ==========

  /** AI sensitivity threshold for incidental findings (0-100) */
  incidentalSensitivityThreshold: number;

  // ========== NOTIFICATION CONFIGURATION ==========

  /** Practice-wide notification behavior settings */
  notificationConfig: PracticeNotificationConfig;

  // ========== PHI MASKING ==========

  /** PHI field masking rules per role */
  phiMaskingRules: PhiMaskingRule[];

  // ========== EMR INTEGRATION ==========

  /** EMR/PACS integration configuration */
  emrConfig?: EmrConfig;

  // ========== CAPSULE RECALLS ==========

  /** List of recalled capsule lot numbers (applies practice-wide) */
  recalledCapsuleLots: string[];

  // ========== REPORT TEMPLATES ==========

  /** Report template IDs by study type */
  reportTemplates: Record<StudyType, string>;

  // ========== ANNOTATION TEMPLATES ==========

  /** Pre-configured annotation templates for standardization */
  annotationTemplates: AnnotationTemplate[];

  // ========== AUDIT & METADATA ==========

  /** Timestamp when settings were last updated */
  updatedAt: Timestamp;

  /** User ID who last updated settings */
  updatedBy: string;
}

/**
 * Clinic
 * Physical clinic location within a practice.
 * Stored in practices/{practiceId}/clinics/{clinicId}
 *
 * @remarks
 * A practice can have multiple clinics.
 * Each clinic has its own staff, address, and capsule inventory.
 */
export interface Clinic {
  /** Unique clinic identifier (UUID) */
  id: string;

  /** Practice ID - clinic belongs to this practice */
  practiceId: string;

  /** Clinic name/location identifier */
  name: string;

  /** Clinic physical address */
  address: Address;

  /** Clinic phone number */
  phone: string;

  /** List of user IDs (staff members) assigned to this clinic */
  staffIds: string[];

  /** Physical capsule inventory at this clinic location */
  capsuleInventory: CapsuleInventoryItem[];

  /** Whether clinic is currently active and accepting procedures */
  isActive: boolean;

  /** Timestamp when clinic was created */
  createdAt: Timestamp;
}
