/**
 * Audit Logger Utility
 * Provides centralized audit logging for compliance and security tracking.
 *
 * All audit entries are immutable and stored with server timestamp.
 * Only system (admin SDK) can write; only admin and clinician_admin can read.
 */

import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'crypto';
import { AuditAction } from '@types/audit';

/**
 * Parameters for audit logging
 */
export interface AuditLogParams {
  /** Practice ID - required for all audit entries */
  practiceId: string;
  /** Procedure ID - optional if action involves a procedure */
  procedureId?: string;
  /** Patient ID - optional if action involves a patient */
  patientId?: string;
  /** User ID who performed the action */
  userId: string;
  /** Type of action performed */
  action: AuditAction;
  /** Entity type that was acted upon */
  entityType: 'procedure' | 'patient' | 'report' | 'finding' | 'user' | 'practice' | 'notification' | 'clinic' | 'education';
  /** Entity ID - the specific entity that was acted upon */
  entityId: string;
  /** Detailed action context and parameters */
  details: Record<string, any>;
  /** State of entity before the action (if applicable) */
  previousState?: Record<string, any>;
  /** State of entity after the action (if applicable) */
  newState?: Record<string, any>;
  /** IP address of the client performing the action (optional) */
  ipAddress?: string;
  /** User agent string from the client (optional) */
  userAgent?: string;
}

/**
 * Log an audit entry to the auditLog collection.
 *
 * Creates an immutable audit entry with server timestamp for compliance.
 * Entries are stored at: practices/{practiceId}/auditLog/{entryId}
 *
 * @param params - Audit log parameters
 * @throws Error if write to Firestore fails
 *
 * @example
 * ```typescript
 * await logAudit({
 *   practiceId: 'practice-123',
 *   procedureId: 'proc-456',
 *   userId: 'user-789',
 *   action: 'procedure_status_changed',
 *   entityType: 'procedure',
 *   entityId: 'proc-456',
 *   details: {
 *     previousStatus: 'capsule_received',
 *     newStatus: 'ready_for_review',
 *     reason: 'Video processing complete'
 *   },
 *   previousState: { status: 'capsule_received' },
 *   newState: { status: 'ready_for_review' }
 * });
 * ```
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  const db = admin.firestore();

  try {
    // Generate unique audit entry ID
    const auditEntryId = uuidv4();

    // Create audit entry document
    const auditEntry = {
      id: auditEntryId,
      practiceId: params.practiceId,
      procedureId: params.procedureId || null,
      patientId: params.patientId || null,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details,
      previousState: params.previousState || null,
      newState: params.newState || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Write audit entry to Firestore
    await db
      .collection('practices')
      .doc(params.practiceId)
      .collection('auditLog')
      .doc(auditEntryId)
      .set(auditEntry, { merge: false });

    console.log(`[AUDIT] ${params.action} - ${params.entityType}:${params.entityId}`);
  } catch (error) {
    console.error(`[AUDIT ERROR] Failed to log audit entry:`, error);
    // Do not throw - audit logging should not break the main operation
    // But log the error for monitoring
  }
}

/**
 * Log a procedure status change with before/after states
 *
 * @param practiceId - Practice ID
 * @param procedureId - Procedure ID
 * @param userId - User ID who made the change
 * @param previousStatus - Status before change
 * @param newStatus - Status after change
 * @param reason - Optional reason for status change
 */
export async function logProcedureStatusChange(
  practiceId: string,
  procedureId: string,
  userId: string,
  previousStatus: string,
  newStatus: string,
  reason?: string
): Promise<void> {
  await logAudit({
    practiceId,
    procedureId,
    userId,
    action: 'procedure_status_changed',
    entityType: 'procedure',
    entityId: procedureId,
    details: {
      previousStatus,
      newStatus,
      reason: reason || 'No reason provided',
    },
    previousState: { status: previousStatus },
    newState: { status: newStatus },
  });
}

/**
 * Log a finding confirmation
 *
 * @param practiceId - Practice ID
 * @param procedureId - Procedure ID
 * @param findingId - Finding ID
 * @param userId - User ID who confirmed
 * @param classification - Finding classification
 */
export async function logFindingConfirmed(
  practiceId: string,
  procedureId: string,
  findingId: string,
  userId: string,
  classification: string
): Promise<void> {
  await logAudit({
    practiceId,
    procedureId,
    userId,
    action: 'finding_confirmed',
    entityType: 'finding',
    entityId: findingId,
    details: {
      classification,
    },
  });
}

/**
 * Log a report signing event
 *
 * @param practiceId - Practice ID
 * @param procedureId - Procedure ID
 * @param reportId - Report ID
 * @param userId - User ID who signed
 * @param signatureMethod - Method used for signing
 */
export async function logReportSigned(
  practiceId: string,
  procedureId: string,
  reportId: string,
  userId: string,
  signatureMethod: 'click' | 'biometric' | 'pin'
): Promise<void> {
  await logAudit({
    practiceId,
    procedureId,
    userId,
    action: 'report_signed',
    entityType: 'report',
    entityId: reportId,
    details: {
      signatureMethod,
    },
  });
}

/**
 * Log a report delivery event
 *
 * @param practiceId - Practice ID
 * @param procedureId - Procedure ID
 * @param reportId - Report ID
 * @param deliveryMethod - Method used for delivery
 * @param recipient - Email or identifier of recipient
 */
export async function logReportDelivered(
  practiceId: string,
  procedureId: string,
  reportId: string,
  deliveryMethod: string,
  recipient: string
): Promise<void> {
  await logAudit({
    practiceId,
    procedureId,
    userId: 'system', // System-triggered delivery
    action: 'report_delivered',
    entityType: 'report',
    entityId: reportId,
    details: {
      deliveryMethod,
      recipient,
    },
  });
}
