/**
 * Notification Dispatcher Utility
 * Provides centralized notification creation and channel routing.
 *
 * Checks user notification preferences for channel routing.
 * Supports in-app, email (SendGrid/Mailgun TODO), and push (FCM TODO) channels.
 */

import * as admin from 'firebase-admin';
import { randomUUID } from 'crypto';
import { NotificationType } from '../enums';

/**
 * Parameters for notification dispatch
 */
export interface NotificationDispatchParams {
  /** Practice ID */
  practiceId: string;
  /** User ID - recipient of notification */
  userId: string;
  /** Notification type */
  type: NotificationType;
  /** Notification title */
  title: string;
  /** Notification body/message */
  body: string;
  /** Route path to navigate to when clicked (optional) */
  routeTo?: string;
  /** Entity type if notification links to specific entity (optional) */
  entityType?: string;
  /** Entity ID if notification links to specific entity (optional) */
  entityId?: string;
  /** Whether notification is mandatory and cannot be dismissed (optional) */
  isMandatory?: boolean;
}

/**
 * Dispatch a notification to a user.
 *
 * Creates an in-app notification entry and routes to additional channels
 * based on user preferences (email, push).
 *
 * Stores at: practices/{practiceId}/notifications/{notificationId}
 *
 * @param params - Notification dispatch parameters
 * @throws Error if write to Firestore fails
 *
 * @example
 * ```typescript
 * await dispatchNotification({
 *   practiceId: 'practice-123',
 *   userId: 'clinician-456',
 *   type: 'study_assigned',
 *   title: 'New Study Assigned',
 *   body: 'Patient John Doe - Upper GI Evaluation',
 *   routeTo: '/procedures/proc-789',
 *   entityType: 'procedure',
 *   entityId: 'proc-789'
 * });
 * ```
 */
export async function dispatchNotification(params: NotificationDispatchParams): Promise<void> {
  const db = admin.firestore();

  try {
    // Generate unique notification ID
    const notificationId = randomUUID();

    // Fetch user preferences to determine routing channels
    let userPreferences: any = {};
    try {
      const userDoc = await db.collection('users').doc(params.userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        userPreferences = userData?.notificationPreferences || {};
      }
    } catch (error) {
      console.warn(`[NOTIFICATION] Could not fetch user preferences for ${params.userId}:`, error);
      // Continue with default channels
    }

    // Determine notification channels (default to in-app)
    const channels = userPreferences.channels || ['in_app'];

    // Determine if notification respects quiet hours
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let isInQuietHours = false;
    if (userPreferences.quietHoursStart && userPreferences.quietHoursEnd) {
      const [startHour, startMin] = userPreferences.quietHoursStart.split(':').map(Number);
      const [endHour, endMin] = userPreferences.quietHoursEnd.split(':').map(Number);
      const [currentHour, currentMin] = currentTime.split(':').map(Number);
      const currentTimeMinutes = currentHour * 60 + currentMin;
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      isInQuietHours = currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes;
    }

    // Filter channels if in quiet hours (unless mandatory)
    const activeChannels = isInQuietHours && !params.isMandatory
      ? channels.filter((c: string) => c === 'in_app')
      : channels;

    // Create in-app notification entry
    const notification = {
      id: notificationId,
      practiceId: params.practiceId,
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      routeTo: params.routeTo || null,
      entityType: params.entityType || null,
      entityId: params.entityId || null,
      isRead: false,
      isMandatory: params.isMandatory || false,
      channels: activeChannels,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    };

    // Write notification to Firestore
    await db
      .collection('practices')
      .doc(params.practiceId)
      .collection('notifications')
      .doc(notificationId)
      .set(notification, { merge: false });

    // TODO: Email channel integration (SendGrid/Mailgun)
    // if (activeChannels.includes('email')) {
    //   await sendEmailNotification({
    //     userId: params.userId,
    //     title: params.title,
    //     body: params.body,
    //   });
    // }

    // TODO: Push notification integration (FCM)
    // if (activeChannels.includes('push')) {
    //   await sendPushNotification({
    //     userId: params.userId,
    //     title: params.title,
    //     body: params.body,
    //   });
    // }

    console.log(`[NOTIFICATION] ${params.type} dispatched to ${params.userId} via ${activeChannels.join(', ')}`);
  } catch (error) {
    console.error(`[NOTIFICATION ERROR] Failed to dispatch notification:`, error);
    throw error;
  }
}

/**
 * TODO: Send email notification via SendGrid/Mailgun
 *
 * @param params - Email notification parameters
 */
async function sendEmailNotification(params: {
  userId: string;
  title: string;
  body: string;
}): Promise<void> {
  // TODO: Implement SendGrid/Mailgun integration
  console.log(`[TODO] Send email notification to ${params.userId}`);
}

/**
 * TODO: Send push notification via FCM
 *
 * @param params - Push notification parameters
 */
async function sendPushNotification(params: {
  userId: string;
  title: string;
  body: string;
}): Promise<void> {
  // TODO: Implement Firebase Cloud Messaging (FCM) integration
  console.log(`[TODO] Send push notification to ${params.userId}`);
}

/**
 * Dispatch a study assignment notification
 *
 * @param practiceId - Practice ID
 * @param userId - Assigned clinician user ID
 * @param patientName - Patient name for display
 * @param studyType - Type of study
 * @param procedureId - Procedure ID
 */
export async function dispatchStudyAssignedNotification(
  practiceId: string,
  userId: string,
  patientName: string,
  studyType: string,
  procedureId: string
): Promise<void> {
  await dispatchNotification({
    practiceId,
    userId,
    type: NotificationType.STUDY_ASSIGNED,
    title: 'New Study Assigned',
    body: `${patientName} - ${studyType}`,
    routeTo: `/procedures/${procedureId}`,
    entityType: 'procedure',
    entityId: procedureId,
  });
}

/**
 * Dispatch a signature required notification
 *
 * @param practiceId - Practice ID
 * @param userId - Clinician user ID
 * @param patientName - Patient name for display
 * @param reportId - Report ID
 */
export async function dispatchSignatureRequiredNotification(
  practiceId: string,
  userId: string,
  patientName: string,
  reportId: string
): Promise<void> {
  await dispatchNotification({
    practiceId,
    userId,
    type: NotificationType.SIGNATURE_REQUIRED,
    title: 'Report Signature Required',
    body: `${patientName} report awaiting your signature`,
    routeTo: `/reports/${reportId}`,
    entityType: 'report',
    entityId: reportId,
    isMandatory: true,
  });
}

/**
 * Dispatch a report delivery confirmed notification
 *
 * @param practiceId - Practice ID
 * @param userId - Clinician user ID
 * @param deliveryMethod - How report was delivered
 * @param reportId - Report ID
 */
export async function dispatchDeliveryConfirmedNotification(
  practiceId: string,
  userId: string,
  deliveryMethod: string,
  reportId: string
): Promise<void> {
  await dispatchNotification({
    practiceId,
    userId,
    type: NotificationType.DELIVERY_CONFIRMED,
    title: 'Report Delivered',
    body: `Report delivered via ${deliveryMethod}`,
    routeTo: `/reports/${reportId}`,
    entityType: 'report',
    entityId: reportId,
  });
}

/**
 * Dispatch a capsule recall notice
 *
 * @param practiceId - Practice ID
 * @param userId - Staff member user ID
 * @param lotNumber - Recalled lot number
 */
export async function dispatchRecallNoticeNotification(
  practiceId: string,
  userId: string,
  lotNumber: string
): Promise<void> {
  await dispatchNotification({
    practiceId,
    userId,
    type: NotificationType.RECALL_NOTICE,
    title: 'Capsule Recall Notice',
    body: `Capsule lot ${lotNumber} has been recalled. Withdraw from inventory immediately.`,
    isMandatory: true,
  });
}
