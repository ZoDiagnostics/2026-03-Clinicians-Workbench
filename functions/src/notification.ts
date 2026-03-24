import * as admin from 'firebase-admin';
import { NotificationType } from './enums';

/**
 * App Notification
 * In-app notification record for system alerts and user notifications.
 *
 * @remarks
 * Notifications are created automatically by Cloud Functions.
 * Notifications support multiple delivery channels (in-app, email, push).
 * Users can read and update their own notifications.
 * Notifications expire after 90 days for automatic cleanup.
 *
 * Related to ZCW-BRD-0259, ZCW-BRD-0260, and Screen Registry SCR-01.
 */
export interface AppNotification {
  /** Unique notification identifier (UUID) */
  id: string;

  /** Practice ID - notification belongs to this practice */
  practiceId: string;

  /** User ID - recipient of this notification */
  userId: string;

  /** Notification type (study_assigned, signature_required, qa_alert, etc.) */
  type: NotificationType;

  /** Notification title (short summary) */
  title: string;

  /** Notification body (detailed message) */
  body: string;

  /** Route path to navigate to when notification is clicked (e.g., "/procedures/proc-123") */
  routeTo?: string;

  /** Entity type if notification links to a specific entity (procedure, report, etc.) */
  entityType?: string;

  /** Entity ID if notification links to a specific entity */
  entityId?: string;

  /** Whether user has marked notification as read */
  isRead: boolean;

  /** Whether notification is mandatory and cannot be dismissed */
  isMandatory: boolean;

  /** Delivery channels for this notification (in_app, email, push) */
  channels: ('in_app' | 'email' | 'push')[];

  /** Timestamp when notification was created */
  createdAt: admin.firestore.Timestamp;

  /** Timestamp when user read/acknowledged the notification (if applicable) */
  readAt?: admin.firestore.Timestamp;

  /** Timestamp when notification should be automatically archived/deleted */
  expiresAt?: admin.firestore.Timestamp;
}
