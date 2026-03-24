/**
 * Procedure Write Trigger
 * Firestore onWrite trigger for procedures/{procedureId}
 *
 * Handles procedure creation and updates:
 * - On CREATE: Validates required fields, sets initial audit entry, dispatches assignment notification
 * - On UPDATE: Validates state transitions, logs changes to audit, dispatches status-specific notifications
 *
 * Defined in ZCW-BRD-0226 through ZCW-BRD-0245.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Procedure } from '../procedure';
import { ProcedureStatus } from '../enums';
import { validateTransition, isTerminal } from '../stateMachine';
import { logAudit, logProcedureStatusChange } from '../utils/auditLogger';
import { dispatchStudyAssignedNotification, dispatchSignatureRequiredNotification } from '../utils/notificationDispatcher';

interface ProcedureData extends Procedure {
  [key: string]: any;
}

/**
 * Procedure write trigger - handles both CREATE and UPDATE events
 *
 * @fires when procedures/{procedureId} document is created or updated
 *
 * @example
 * - User creates new procedure → validates, sets audit entry, dispatches notification
 * - Status changes from 'ready_for_review' to 'draft' → validates transition, logs change, notifies clinician
 */
export const onProcedureWrite = functions.firestore
  .document('practices/{practiceId}/procedures/{procedureId}')
  .onWrite(async (change, context) => {
    const { practiceId, procedureId } = context.params;
    const db = admin.firestore();
    const auth = admin.auth();

    try {
      // Determine operation type
      const isCreate = !change.before.exists && change.after.exists;
      const isUpdate = change.before.exists && change.after.exists;

      if (isCreate) {
        // ========== CREATE OPERATION ==========
        await handleProcedureCreate(change.after.data() as ProcedureData, practiceId, procedureId, db, auth);
      } else if (isUpdate) {
        // ========== UPDATE OPERATION ==========
        await handleProcedureUpdate(
          change.before.data() as ProcedureData,
          change.after.data() as ProcedureData,
          practiceId,
          procedureId,
          db,
          auth
        );
      }

      console.log(`[PROCEDURE] ${isCreate ? 'Created' : 'Updated'}: ${procedureId}`);
    } catch (error) {
      console.error(`[PROCEDURE ERROR] Failed to process procedure write:`, error);
      throw new functions.https.HttpsError('internal', 'Failed to process procedure', {
        originalError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

/**
 * Handle procedure creation
 *
 * @param procedureData - New procedure data
 * @param practiceId - Practice ID
 * @param procedureId - Procedure ID
 * @param db - Firestore instance
 * @param auth - Firebase Auth instance
 */
async function handleProcedureCreate(
  procedureData: ProcedureData,
  practiceId: string,
  procedureId: string,
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth
): Promise<void> {
  // Validate required fields
  const requiredFields = [
    'practiceId',
    'clinicId',
    'patientId',
    'assignedClinicianId',
    'status',
    'studyType',
    'urgency',
    'indications',
    'contraindications',
    'preProcedureChecks',
    'preReviewConfig',
    'createdAt',
    'updatedAt',
    'createdBy',
  ];

  const missingFields = requiredFields.filter(field => !(field in procedureData));
  if (missingFields.length > 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Missing required fields: ${missingFields.join(', ')}`
    );
  }

  // Validate initial status
  const initialStatus: ProcedureStatus = procedureData.status;
  if (initialStatus !== 'capsule_return_pending') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `New procedures must have initial status 'capsule_return_pending', got '${initialStatus}'`
    );
  }

  // Create initial audit entry
  await logAudit({
    practiceId,
    procedureId,
    patientId: procedureData.patientId,
    userId: procedureData.createdBy,
    action: 'procedure_created',
    entityType: 'procedure',
    entityId: procedureId,
    details: {
      studyType: procedureData.studyType,
      urgency: procedureData.urgency,
      assignedClinicianId: procedureData.assignedClinicianId,
    },
    newState: {
      status: initialStatus,
      studyType: procedureData.studyType,
    },
  });

  // Fetch patient and clinician info for notification
  try {
    const patientDoc = await db.collection('practices').doc(practiceId).collection('patients').doc(procedureData.patientId).get();
    const patientData = patientDoc.data();
    const patientName = patientData ? `${patientData.firstName} ${patientData.lastName}` : 'Unknown Patient';

    // Dispatch study assignment notification to clinician
    await dispatchStudyAssignedNotification(
      practiceId,
      procedureData.assignedClinicianId,
      patientName,
      procedureData.studyType,
      procedureId
    );
  } catch (error) {
    console.warn(`[PROCEDURE] Could not dispatch study assigned notification:`, error);
    // Continue even if notification fails
  }
}

/**
 * Handle procedure update
 *
 * @param previousData - Previous procedure data
 * @param updatedData - Updated procedure data
 * @param practiceId - Practice ID
 * @param procedureId - Procedure ID
 * @param db - Firestore instance
 * @param auth - Firebase Auth instance
 */
async function handleProcedureUpdate(
  previousData: ProcedureData,
  updatedData: ProcedureData,
  practiceId: string,
  procedureId: string,
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth
): Promise<void> {
  const previousStatus = previousData.status as ProcedureStatus;
  const newStatus = updatedData.status as ProcedureStatus;

  // Check if status changed
  if (previousStatus !== newStatus) {
    // ========== STATUS CHANGE HANDLING ==========

    // Validate transition via state machine
    if (!validateTransition(previousStatus, newStatus)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Invalid status transition from '${previousStatus}' to '${newStatus}'`
      );
    }

    // Log status change to audit
    await logProcedureStatusChange(
      practiceId,
      procedureId,
      updatedData.updatedBy || 'system',
      previousStatus,
      newStatus
    );

    // Handle status-specific logic
    await handleStatusTransition(
      practiceId,
      procedureId,
      previousStatus,
      newStatus,
      updatedData,
      db
    );

    // Update procedure timestamps based on status
    if (newStatus === 'draft' || newStatus === 'appended_draft') {
      // Ensure reviewStartedAt is set
      if (!updatedData.reviewStartedAt) {
        await db
          .collection('practices')
          .doc(practiceId)
          .collection('procedures')
          .doc(procedureId)
          .update({
            reviewStartedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      }
    } else if (newStatus === 'completed' || newStatus === 'completed_appended') {
      // Set completion timestamps
      const updates: any = {
        reviewCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (updatedData.signedAt === undefined) {
        updates.signedAt = admin.firestore.FieldValue.serverTimestamp();
      }
      if (updatedData.signedBy === undefined) {
        updates.signedBy = updatedData.updatedBy || 'system';
      }

      await db
        .collection('practices')
        .doc(practiceId)
        .collection('procedures')
        .doc(procedureId)
        .update(updates);
    } else if (newStatus === 'closed') {
      // Set closed timestamp
      if (!updatedData.closedAt) {
        await db
          .collection('practices')
          .doc(practiceId)
          .collection('procedures')
          .doc(procedureId)
          .update({
            closedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      }
    } else if (newStatus === 'void') {
      // Set voided timestamp
      if (!updatedData.voidedAt) {
        await db
          .collection('practices')
          .doc(practiceId)
          .collection('procedures')
          .doc(procedureId)
          .update({
            voidedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      }
    }
  }

  // Check for other significant changes (reassignment, covering clinician, etc.)
  if (previousData.assignedClinicianId !== updatedData.assignedClinicianId) {
    await logAudit({
      practiceId,
      procedureId,
      patientId: updatedData.patientId,
      userId: updatedData.updatedBy || 'system',
      action: 'procedure_assigned',
      entityType: 'procedure',
      entityId: procedureId,
      details: {
        previousClinicianId: previousData.assignedClinicianId,
        newClinicianId: updatedData.assignedClinicianId,
      },
    });
  }

  if (previousData.coveringClinicianId !== updatedData.coveringClinicianId) {
    await logAudit({
      practiceId,
      procedureId,
      patientId: updatedData.patientId,
      userId: updatedData.updatedBy || 'system',
      action: 'procedure_delegated',
      entityType: 'procedure',
      entityId: procedureId,
      details: {
        previousCoveringId: previousData.coveringClinicianId || 'none',
        newCoveringId: updatedData.coveringClinicianId || 'none',
      },
    });
  }
}

/**
 * Handle status-specific transition logic and notifications
 *
 * @param practiceId - Practice ID
 * @param procedureId - Procedure ID
 * @param previousStatus - Previous status
 * @param newStatus - New status
 * @param procedureData - Updated procedure data
 * @param db - Firestore instance
 */
async function handleStatusTransition(
  practiceId: string,
  procedureId: string,
  previousStatus: ProcedureStatus,
  newStatus: ProcedureStatus,
  procedureData: ProcedureData,
  db: admin.firestore.Firestore
): Promise<void> {
  try {
    const patientDoc = await db
      .collection('practices')
      .doc(practiceId)
      .collection('patients')
      .doc(procedureData.patientId)
      .get();
    const patientName = patientDoc.exists
      ? `${patientDoc.data()?.firstName} ${patientDoc.data()?.lastName}`
      : 'Unknown Patient';

    // Dispatch notifications based on transition
    if (newStatus === 'ready_for_review') {
      // Notify clinician that study is ready for review
      await dispatchStudyAssignedNotification(
        practiceId,
        procedureData.assignedClinicianId,
        patientName,
        'Ready for Review',
        procedureId
      );
    } else if (newStatus === 'draft' || newStatus === 'appended_draft') {
      // Notify clinician when draft report is created
      await dispatchSignatureRequiredNotification(
        practiceId,
        procedureData.assignedClinicianId,
        patientName,
        procedureId
      );
    }
  } catch (error) {
    console.warn(`[PROCEDURE] Could not dispatch status transition notification:`, error);
    // Continue even if notification fails
  }
}
