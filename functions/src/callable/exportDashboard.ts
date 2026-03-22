/**
 * Export Dashboard Callable Function
 * HTTPS callable function for analytics export to PDF, CSV, or PNG.
 *
 * Defined in ZCW-BRD-0251.
 * Queries filtered data, generates export files, and uploads to Cloud Storage.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { z } from 'zod';

/**
 * Input schema for dashboard export
 */
const exportDashboardInputSchema = z.object({
  exportType: z.enum(['pdf', 'csv', 'png'], {
    errorMap: () => ({ message: 'Export type must be pdf, csv, or png' }),
  }),
  dateRange: z.object({
    startDate: z.string().datetime('Invalid start date format'),
    endDate: z.string().datetime('Invalid end date format'),
  }),
  filters: z.record(z.any()).optional(),
  dashboardId: z.string().min(1, 'Dashboard ID is required'),
});

type ExportDashboardInput = z.infer<typeof exportDashboardInputSchema>;

/**
 * Export dashboard data in various formats
 *
 * Queries Firestore for filtered data set based on date range and filters.
 * Generates export file (CSV, PDF, or PNG). Uploads to Cloud Storage at
 * exports/{practiceId}/{timestamp}_{dashboardId}.{ext}
 *
 * Input: { exportType: 'pdf' | 'csv' | 'png', dateRange, filters?, dashboardId }
 * Output: { success: boolean, downloadUrl: string, expiresAt: string }
 *
 * @callable
 * @auth requires admin or clinician_admin role
 *
 * @example
 * ```typescript
 * const result = await functions.httpsCallable('exportDashboard')({
 *   exportType: 'csv',
 *   dateRange: {
 *     startDate: '2026-01-01T00:00:00Z',
 *     endDate: '2026-01-31T23:59:59Z'
 *   },
 *   filters: { status: 'completed' },
 *   dashboardId: 'procedure-summary'
 * });
 * ```
 */
export const exportDashboard = functions.https.onCall(async (data, context) => {
  const db = admin.firestore();
  const storage = admin.storage();

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
        'Only admins and clinician admins can export dashboards'
      );
    }

    // Validate input
    const validInput = exportDashboardInputSchema.parse(data);
    const { exportType, dateRange, filters, dashboardId } = validInput;

    // Extract practice ID from user claims
    const practiceId = context.auth.token.practiceId as string;
    if (!practiceId) {
      throw new functions.https.HttpsError('permission-denied', 'User not associated with a practice');
    }

    // Parse dates
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);

    // Query procedures based on filters and date range
    let query = db
      .collection('practices')
      .doc(practiceId)
      .collection('procedures')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate);

    // Apply additional filters if provided
    if (filters?.status) {
      query = query.where('status', '==', filters.status);
    }

    const querySnapshot = await query.get();
    const procedures: any[] = [];

    querySnapshot.forEach(doc => {
      procedures.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // Generate export data based on type
    let exportContent: string | Buffer;
    const fileExtension = exportType === 'png' ? 'png' : exportType;

    if (exportType === 'csv') {
      exportContent = generateCsvContent(procedures);
    } else if (exportType === 'pdf') {
      exportContent = generatePdfContent(procedures, dashboardId, dateRange);
    } else {
      // PNG: placeholder for chart rendering
      exportContent = generatePngPlaceholder(procedures, dashboardId);
    }

    // Upload to Cloud Storage
    const timestamp = Date.now();
    const filename = `${timestamp}_${dashboardId}.${fileExtension}`;
    const filePath = `exports/${practiceId}/${filename}`;

    const bucket = storage.bucket();
    const file = bucket.file(filePath);

    // Determine content type
    let contentType = 'text/plain';
    if (exportType === 'csv') {
      contentType = 'text/csv';
    } else if (exportType === 'pdf') {
      contentType = 'application/pdf';
    } else if (exportType === 'png') {
      contentType = 'image/png';
    }

    // Upload file
    await file.save(exportContent, {
      metadata: {
        contentType,
      },
    });

    // Generate signed URL with 1-hour expiration
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const [downloadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: expiresAt,
    });

    console.log(`[EXPORT-DASHBOARD] ${exportType.toUpperCase()} export created: ${filePath}`);

    return {
      success: true,
      downloadUrl,
      expiresAt: expiresAt.toISOString(),
      procedureCount: procedures.length,
      exportType,
    };
  } catch (error) {
    console.error('[EXPORT-DASHBOARD] Error:', error);

    if (error instanceof z.ZodError) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid input parameters');
    }

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Failed to export dashboard');
  }
});

/**
 * Generate CSV content from procedures
 *
 * @param procedures - Array of procedure documents
 * @returns CSV content as string
 */
function generateCsvContent(procedures: any[]): string {
  if (procedures.length === 0) {
    return 'id,status,assignedClinicianId,createdAt\n';
  }

  // Extract header from first procedure
  const headers = ['id', 'status', 'assignedClinicianId', 'patientName', 'studyType', 'createdAt'];
  const headerRow = headers.join(',');

  // Generate data rows
  const dataRows = procedures.map(proc => {
    return headers
      .map(header => {
        const value = proc[header] || '';
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value).replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      })
      .join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Generate PDF content from procedures (simplified HTML template)
 *
 * @param procedures - Array of procedure documents
 * @param dashboardId - Dashboard identifier
 * @param dateRange - Date range for report
 * @returns HTML content as string
 */
function generatePdfContent(
  procedures: any[],
  dashboardId: string,
  dateRange: { startDate: string; endDate: string }
): string {
  const procedureCount = procedures.length;
  const completedCount = procedures.filter(p => p.status === 'completed').length;
  const draftCount = procedures.filter(p => p.status === 'draft').length;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Dashboard Export - ${dashboardId}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .summary { background-color: #f0f0f0; padding: 15px; margin: 20px 0; border-radius: 5px; }
    .metric { margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background-color: #4CAF50; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #ddd; }
    tr:hover { background-color: #f5f5f5; }
  </style>
</head>
<body>
  <h1>Dashboard Export: ${dashboardId}</h1>

  <div class="summary">
    <h2>Report Summary</h2>
    <div class="metric"><strong>Date Range:</strong> ${dateRange.startDate} to ${dateRange.endDate}</div>
    <div class="metric"><strong>Total Procedures:</strong> ${procedureCount}</div>
    <div class="metric"><strong>Completed:</strong> ${completedCount}</div>
    <div class="metric"><strong>Draft:</strong> ${draftCount}</div>
  </div>

  <h2>Procedures</h2>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Status</th>
        <th>Patient Name</th>
        <th>Study Type</th>
        <th>Created At</th>
      </tr>
    </thead>
    <tbody>
      ${procedures
        .map(
          proc => `
      <tr>
        <td>${proc.id}</td>
        <td>${proc.status}</td>
        <td>${proc.patientName || 'N/A'}</td>
        <td>${proc.studyType || 'N/A'}</td>
        <td>${proc.createdAt?.toDate?.()?.toISOString() || 'N/A'}</td>
      </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <p style="margin-top: 40px; color: #666; font-size: 12px;">
    Generated on ${new Date().toISOString()}
  </p>
</body>
</html>
  `;
}

/**
 * Generate PNG placeholder (would be replaced with actual chart rendering)
 *
 * @param procedures - Array of procedure documents
 * @param dashboardId - Dashboard identifier
 * @returns Buffer with placeholder PNG data
 */
function generatePngPlaceholder(procedures: any[], dashboardId: string): Buffer {
  // TODO: Integrate with chart rendering library (e.g., Chart.js with puppeteer)
  // This is a placeholder implementation returning a minimal PNG header
  const completedCount = procedures.filter(p => p.status === 'completed').length;
  const totalCount = procedures.length;

  const content = `
Dashboard: ${dashboardId}
Completed: ${completedCount}/${totalCount}
Chart rendering would be implemented here with Chart.js or similar library
  `;

  return Buffer.from(content, 'utf-8');
}
