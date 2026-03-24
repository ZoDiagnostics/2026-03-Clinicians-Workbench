import * as admin from 'firebase-admin';
import { UserRole } from './enums';

/**
 * Notification Preferences
 * User-specific notification settings and delivery preferences.
 * Related to ZCW-BRD-0259 and ZCW-BRD-0260.
 */
export interface NotificationPreferences {
  /** Channels through which notifications should be delivered */
  channels: ('in_app' | 'email' | 'push')[];

  /** Quiet hours start time (HH:MM format) - notifications suppressed during quiet hours */
  quietHoursStart?: string;

  /** Quiet hours end time (HH:MM format) */
  quietHoursEnd?: string;

  /** Enable digest mode for low-priority notifications (daily summary) */
  digestMode: boolean;

  /** Study assignment notifications enabled */
  studyAssignmentEnabled: boolean;

  /** Signature required notifications enabled */
  signatureRequiredEnabled: boolean;

  /** QA alert notifications enabled */
  qaAlertEnabled: boolean;

  /** Recall notice notifications enabled */
  recallNoticeEnabled: boolean;

  /** Transfer request notifications enabled */
  transferRequestEnabled: boolean;

  /** Timestamp when preferences were last updated */
  updatedAt: admin.firestore.Timestamp;
}

/**
 * Delegation
 * Represents delegation of responsibilities to another clinician.
 * Allows covering clinician to review assigned studies during absence.
 * Related to ZCW-BRD-0281.
 */
export interface Delegation {
  /** Unique delegation identifier */
  id: string;

  /** User ID of clinician delegating their work */
  fromClinicianId: string;

  /** User ID of covering clinician who will handle delegated work */
  toClinicianId: string;

  /** Start date/time of delegation */
  startAt: admin.firestore.Timestamp;

  /** End date/time of delegation */
  endAt: admin.firestore.Timestamp;

  /** Scope of delegation (all assignments or specific procedure types) */
  scope: 'all' | 'urgent_only' | 'specific_procedure_types';

  /** Specific procedure types if scope is 'specific_procedure_types' */
  procedureTypes?: string[];

  /** Notes about the delegation reason */
  reason?: string;

  /** Whether delegation is currently active */
  isActive: boolean;

  /** Timestamp when delegation was created */
  createdAt: admin.firestore.Timestamp;
}

/**
 * User
 * System user account with role-based access control.
 *
 * @remarks
 * User ID matches Firebase Auth UID for seamless authentication integration.
 * Roles determine permissions across the platform (see enums.ts for role hierarchy).
 * Notifications and preferences are user-specific.
 * Delegations allow covering clinicians to manage assigned studies.
 *
 * Defined in BRD Appendix B and related to ZCW-BRD-0259 through ZCW-BRD-0281.
 */
export interface User {
  /** Unique user identifier (matches Firebase Auth UID) */
  id: string;

  /** Practice ID - user belongs to this practice */
  practiceId: string;

  /** List of clinic IDs where user is authorized to work */
  clinicIds: string[];

  /** User role determining permissions and capabilities */
  role: UserRole;

  /** User first name */
  firstName: string;

  /** User last name */
  lastName: string;

  /** User email address (unique within Firebase Auth) */
  email: string;

  /** NPI (National Provider Identifier) for clinicians */
  npiNumber?: string;

  /** Clinical credentials (MD, DO, NP, etc.) */
  credentials?: string;

  /** Medical specialties (Gastroenterology, Internal Medicine, etc.) */
  specialties?: string[];

  /** Preferred language for UI and reports (ISO 639-1 code) */
  preferredLanguage: string;

  /** Notification and delivery preferences */
  notificationPreferences: NotificationPreferences;

  /** Active delegations where this user delegates or receives delegated work */
  delegations: Delegation[];

  /** Whether user account is active (not disabled/suspended) */
  isActive: boolean;

  /** Timestamp of user's most recent login */
  lastLoginAt?: admin.firestore.Timestamp;

  /** Timestamp when user account was created */
  createdAt: admin.firestore.Timestamp;

  /** Timestamp when user account was last updated */
  updatedAt: admin.firestore.Timestamp;
}
