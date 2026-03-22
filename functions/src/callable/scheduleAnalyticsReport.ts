/**
 * Schedule Analytics Report Callable Function
 * HTTPS callable function for scheduling automated analytics report delivery.
 *
 * Defined in ZCW-BRD-0252.
 * Creates scheduled report documents for Cloud Scheduler integration.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { z } from 'zod';
import { v4 as uuidv4 } from 'crypto';
import { logAudit } from '../utils/auditLogger';

/**
 * Input schema for scheduling analytics report
 */
const scheduleAnalyticsReportInputSchema = z.object({
  reportConfig: z.object({
    name: z.string().min(1, 'Report name is required').max(200, 'Report name too long'),
    dashboardId: z.string().min(1, 'Dashboard ID is required'),
    exportFormat: z.enum(['pdf', 'csv'], {
      errorMap: () => ({ message: 'Export format must be pdf or csv' }),
    }),
    filters: z.record(z.any()).optional(),
  }),
  schedule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly'], {
      errorMap: () => ({ message: 'Frequency must be daily, weekly, or monthly' }),
    }),
    time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
    dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
  }),
  recipients: z.array(z.string().email('Invalid email address')).min(1, 'At least one recipient is required'),
});

type ScheduleAnalyticsReportInput = z.infer<typeof scheduleAnalyticsReportInputSchema>;

/**
 * Schedule an analytics report for automated delivery
 *
 * Creates a scheduled report document in practices/{practiceId}/scheduledReports/{reportId}.
 * Validates recipients are in the same practice. Stores schedule configuration for
 * Cloud Scheduler integration.
 *
 * Input: { reportConfig, schedule: { frequency, time, dayOfWeek?, dayOfMonth? }, recipients }
 * Output: { scheduledReportId, nextRunAt, message }
 *
 * @callable
 * @auth requires admin or clinician_admin role
 *
 * @example
 * ```typescript
 * const result = await functions.httpsCallable('scheduleAnalyticsReport')({
 *   reportConfig: {
 *     name: 'Weekly Procedure Summary',
 *     dashboardId: 'procedure-summary',
 *     exportFormat: 'pdf',
 *     filters: { status: 'completed' }
 *   },
 *   schedule: {
 *     frequency: 'weekly',
 *     time: '09:00',
 *     dayOfWeek: 'monday'
 *   },
 *   recipients: ['admin@practice.com', 'manager@practice.com']
 * });
 * ```
 */
export const scheduleAnalyticsReport = functions.https.onCall(async (data, context) => {
  const db = admin.firestore();

  try {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const userRole = context.auth.token.role as string;

    // Validate authorization
    if (userRole !== 'admin' && userRole !== 'clinician_admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins and clinician admins can schedule reports'
      );
    }

    // Validate input
    const validInput = scheduleAnalyticsReportInputSchema.parse(data);
    const { reportConfig, schedule, recipients } = validInput;

    // Extract practice ID from user claims
    const practiceId = context.auth.token.practiceId as string;
    if (!practiceId) {
      throw new functions.https.HttpsError('permission-denied', 'User not associated with a practice');
    }

    // Validate recipients are in the same practice
    const userSnapshots = await Promise.all(
      recipients.map(email =>
        db
          .collection('users')
          .where('email', '==', email)
          .limit(1)
          .get()
      )
    );

    for (let i = 0; i < userSnapshots.length; i++) {
      if (userSnapshots[i].empty) {
        throw new functions.https.HttpsError(
          'not-found',
          `Recipient ${recipients[i]} not found`
        );
      }

      const recipientData = userSnapshots[i].docs[0].data();
      if (recipientData.practiceId !== practiceId) {
        throw new functions.https.HttpsError(
          'permission-denied',
          `Recipient ${recipients[i]} is not in the same practice`
        );
      }
    }

    // Calculate next run time
    const nextRunAt = calculateNextRunTime(schedule);

    // Create scheduled report document
    const reportId = uuidv4();
    const reportRef = db
      .collection('practices')
      .doc(practiceId)
      .collection('scheduledReports')
      .doc(reportId);

    const scheduledReportData = {
      id: reportId,
      practiceId,
      reportConfig,
      schedule,
      recipients,
      createdBy: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      nextRunAt,
      lastRunAt: null,
      isActive: true,
      executionCount: 0,
      lastExecutionStatus: null,
      cloudSchedulerJobName: `scheduled-report-${reportId}`,
    };

    await reportRef.set(scheduledReportData);

    // Log audit entry
    await logAudit({
      practiceId,
      userId,
      action: 'scheduled_report_created',
      entityType: 'practice',
      entityId: practiceId,
      details: {
        reportId,
        reportName: reportConfig.name,
        frequency: schedule.frequency,
        recipientCount: recipients.length,
        nextRunAt: nextRunAt.toISOString(),
      },
    });

    console.log(
      `[SCHEDULE-REPORT] Scheduled report ${reportId} created. Next run: ${nextRunAt.toISOString()}`
    );

    return {
      success: true,
      scheduledReportId: reportId,
      nextRunAt: nextRunAt.toISOString(),
      message: `Report scheduled: ${reportConfig.name}. Next run: ${nextRunAt.toLocaleDateString()} at ${nextRunAt.toLocaleTimeString()}`,
    };
  } catch (error) {
    console.error('[SCHEDULE-REPORT] Error:', error);

    if (error instanceof z.ZodError) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid input parameters');
    }

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Failed to schedule analytics report');
  }
});

/**
 * Calculate the next run time based on schedule configuration
 *
 * @param schedule - Schedule configuration with frequency, time, and optional day fields
 * @returns Date object representing next scheduled run time
 */
function calculateNextRunTime(schedule: {
  frequency: string;
  time: string;
  dayOfWeek?: string;
  dayOfMonth?: string;
}): Date {
  const [hours, minutes] = schedule.time.split(':').map(Number);
  const now = new Date();

  let nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);

  if (nextRun <= now) {
    // Time has passed today, schedule for next occurrence
    nextRun.setDate(nextRun.getDate() + 1);
  }

  switch (schedule.frequency) {
    case 'daily':
      // Already set to next occurrence
      break;

    case 'weekly':
      if (schedule.dayOfWeek) {
        const dayMap: Record<string, number> = {
          sunday: 0,
          monday: 1,
          tuesday: 2,
          wednesday: 3,
          thursday: 4,
          friday: 5,
          saturday: 6,
        };

        const targetDay = dayMap[schedule.dayOfWeek];
        const currentDay = nextRun.getDay();

        let daysAhead = targetDay - currentDay;
        if (daysAhead <= 0) {
          daysAhead += 7;
        }

        nextRun.setDate(nextRun.getDate() + daysAhead);
      }
      break;

    case 'monthly':
      if (schedule.dayOfMonth) {
        const targetDay = schedule.dayOfMonth;
        nextRun.setDate(targetDay);

        if (nextRun <= now) {
          // Move to next month
          nextRun.setMonth(nextRun.getMonth() + 1);
          nextRun.setDate(targetDay);
        }
      }
      break;
  }

  return nextRun;
}
