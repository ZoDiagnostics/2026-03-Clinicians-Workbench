/**
 * Report Signing Trigger
 * Firestore onUpdate trigger for reports/{reportId}
 *
 * Fires when report status changes to 'signed':
 * - Reads delivery defaults from practice settings
 * - Creates delivery records for each configured method
 * - For email deliveries: creates notification entries (actual sending is TODO)
 * - Updates procedure status to 'completed'
 * - Logs signing and delivery events to audit trail
 *
 * Defined in ZCW-BRD-0298 (Delivery Defaults).
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { Report } from '../report';
import { ReportStatus, DeliveryMethod } from '../enums';
import { logReportSigned, logReportDelivered } from '../utils/auditLogger';
import { dispatchDeliveryConfirmedNotification } from '../utils/notificationDispatcher';

interface ReportData extends Report {
  [key: string]: any;
}

/**
 * Report signing trigger - handles report status changes to 'signed'
 *
 * @fires when reports/{reportId} document is updated with status='signed'
 *
 * @example
 * - Clinician signs report → Creates delivery records
 * - Email delivery configured → Creates notification entry for delivery
 * - Procedure status updated to 'completed'
 * - Audit trail logs all signing and delivery events
 */
export const onReportSign = functions.firestore
  .document('practices/{practiceId}/reports/{reportId}')
  .onUpdate(async (change, context) => {
    const { practiceId, reportId } = context.params;
    const db = admin.firestore();

    try {
      const previousData = change.before.data() as ReportData;
      const updatedData = change.after.data() as ReportData;

      const previousStatus = previousData.status as ReportStatus;
      const newStatus = updatedData.status as ReportStatus;

      // Only handle transitions to 'signed' status
      if (previousStatus !== 'signed' && newStatus === 'signed') {
        await handleReportSigning(updatedData, practiceId, reportId, db);
      }

      console.log(`[REPORT] Updated: ${reportId}, status: ${newStatus}`);
    } catch (error) {
      console.error(`[REPORT ERROR] Failed to process report signing:`, error);
      // Log error but don't throw - report signing should not break on delivery issues
      // Delivery will be retried through scheduled tasks
    }
  });

/**
 * Handle report signing and delivery creation
 *
 * @param reportData - Updated report data
 * @param practiceId - Practice ID
 * @param reportId - Report ID
 * @param db - Firestore instance
 */
async function handleReportSigning(
  reportData: ReportData,
  practiceId: string,
  reportId: string,
  db: admin.firestore.Firestore
): Promise<void> {
  // Log signing event to audit trail
  await logReportSigned(
    practiceId,
    reportData.procedureId,
    reportId,
    reportData.signedBy || 'system',
    reportData.signatureMethod || 'click'
  );

  // Fetch practice settings to get delivery defaults
  let deliveryDefaults: any = null;
  try {
    const settingsDoc = await db
      .collection('practices')
      .doc(practiceId)
      .collection('settings')
      .doc('default')
      .get();

    if (settingsDoc.exists) {
      deliveryDefaults = settingsDoc.data()?.deliveryDefaults;
    }
  } catch (error) {
    console.warn(`[REPORT] Could not fetch delivery defaults:`, error);
  }

  // Use provided defaults or fallback to empty list
  const deliveryMethods: DeliveryMethod[] = deliveryDefaults?.defaultMethods || [];
  const defaultRecipients: string[] = deliveryDefaults?.defaultRecipients || [];

  // Create delivery records for each configured method
  const deliveryRecords = [];

  for (const method of deliveryMethods) {
    const deliveryRecord = {
      id: `delivery-${Date.now()}`,
      method,
      recipient: getRecipientForMethod(method, reportData, defaultRecipients),
      deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'queued', // Initial status
      errorMessage: null,
      confirmedAt: null,
    };
    deliveryRecords.push(deliveryRecord);

    // For email delivery, create notification entry
    if ((method === 'email_patient' || method === 'email_referring')) {
      const recipient = getRecipientForMethod(method, reportData, defaultRecipients);
      if (recipient) {
        await createEmailDeliveryNotification(
          practiceId,
          reportData,
          method,
          recipient,
          db
        );
      }
    }

    // Log delivery event
    await logReportDelivered(
      practiceId,
      reportData.procedureId,
      reportId,
      method,
      getRecipientForMethod(method, reportData, defaultRecipients)
    );
  }

  // Update report with delivery records
  if (deliveryRecords.length > 0) {
    await db
      .collection('practices')
      .doc(practiceId)
      .collection('reports')
      .doc(reportId)
      .update({
        deliveryRecords,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  }

  // Update procedure status to 'completed'
  try {
    const procedureRef = db
      .collection('practices')
      .doc(practiceId)
      .collection('procedures')
      .doc(reportData.procedureId);

    const procedureDoc = await procedureRef.get();
    if (procedureDoc.exists) {
      const procedureData = procedureDoc.data();
      const currentStatus = procedureData?.status;

      // Only update if not already in a terminal state
      if (currentStatus !== 'completed' && currentStatus !== 'completed_appended' && currentStatus !== 'closed') {
        await procedureRef.update({
          status: 'completed',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  } catch (error) {
    console.warn(`[REPORT] Could not update procedure status:`, error);
  }

  // Notify clinician of delivery confirmation
  try {
    await dispatchDeliveryConfirmedNotification(
      practiceId,
      reportData.clinicianId,
      deliveryMethods.join(', '),
      reportId
    );
  } catch (error) {
    console.warn(`[REPORT] Could not dispatch delivery notification:`, error);
  }
}

/**
 * Get recipient email/identifier based on delivery method
 *
 * @param method - Delivery method
 * @param reportData - Report data
 * @param defaultRecipients - Default recipient list from settings
 * @returns Recipient email or identifier
 */
function getRecipientForMethod(
  method: DeliveryMethod,
  reportData: ReportData,
  defaultRecipients: string[]
): string {
  switch (method) {
    case 'email_patient':
      // TODO: Fetch patient email from patient collection
      return 'patient@example.com'; // Placeholder
    case 'email_referring':
      // TODO: Fetch referring physician email from procedure/patient data
      return defaultRecipients[0] || 'referring@example.com'; // Placeholder
    case 'pdf_download':
      return 'portal_download';
    case 'print':
      return 'clinic_printer';
    case 'hl7_fhir':
      return 'ehr_system';
    case 'dicom_sr':
      return 'pacs_system';
    default:
      return 'unknown';
  }
}

/**
 * Create notification entry for email delivery
 *
 * For email deliveries, create a notification entry that tracks
 * the delivery status. Actual email sending is TODO (SendGrid/Mailgun integration).
 *
 * @param practiceId - Practice ID
 * @param reportData - Report data
 * @param method - Email delivery method
 * @param recipient - Recipient email address
 * @param db - Firestore instance
 */
async function createEmailDeliveryNotification(
  practiceId: string,
  reportData: ReportData,
  method: DeliveryMethod,
  recipient: string,
  db: admin.firestore.Firestore
): Promise<void> {
  try {
    // TODO: SendGrid/Mailgun integration
    // For now, just log the delivery initiation
    console.log(`[TODO] Send email via ${method} to ${recipient} for report ${reportData.id}`);

    // Create a system notification to track delivery
    const notificationId = `email-delivery-${Date.now()}`;
    await db
      .collection('practices')
      .doc(practiceId)
      .collection('notifications')
      .doc(notificationId)
      .set({
        id: notificationId,
        practiceId,
        userId: 'system',
        type: 'delivery_confirmed',
        title: 'Report Email Delivery',
        body: `Report queued for delivery to ${recipient}`,
        routeTo: `/reports/${reportData.id}`,
        entityType: 'report',
        entityId: reportData.id,
        isRead: false,
        isMandatory: false,
        channels: ['in_app'],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      });
  } catch (error) {
    console.error(`[REPORT] Error creating email delivery notification:`, error);
    // Continue - email delivery tracking should not break the signing flow
  }
}
