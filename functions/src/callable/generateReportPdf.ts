/**
 * Generate Report PDF Callable Function
 * HTTPS callable function for generating PDF reports (internal and patient-facing).
 *
 * Creates HTML template, renders to PDF, and stores in Cloud Storage.
 * TODO: Integration with Puppeteer or pdf-lib for actual PDF rendering.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { generateReportPdfInputSchema } from '../utils/validators';
import { Report } from '@types/report';
import { Procedure } from '@types/procedure';
import { Patient } from '@types/patient';
import { Finding } from '@types/finding';

/**
 * Generate report PDF
 *
 * Generates PDF report in internal or patient-facing variant.
 * Internal variant includes codes and technical measurements.
 * Patient variant uses simplified language and excludes codes.
 *
 * Input: { reportId: string, variant: 'internal' | 'patient' }
 * Output: { pdfUrl: string, storagePath: string }
 *
 * @callable
 * @auth requires clinician or clinician_admin role
 *
 * @example
 * ```typescript
 * const result = await functions.httpsCallable('generateReportPdf')({
 *   reportId: 'report-123',
 *   variant: 'internal'
 * });
 * // Returns signed download URL and storage path
 * ```
 */
export const generateReportPdf = functions.https.onCall(async (data, context) => {
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
    if (!userRole?.includes('clinician') && userRole !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only clinicians can generate PDFs');
    }

    // Validate input
    const validInput = generateReportPdfInputSchema.parse(data);
    const { reportId, variant } = validInput;

    // Extract practice ID
    const practiceId = context.auth.token.practiceId as string;
    if (!practiceId) {
      throw new functions.https.HttpsError('permission-denied', 'User not associated with a practice');
    }

    // Fetch report
    const reportDoc = await db
      .collection('practices')
      .doc(practiceId)
      .collection('reports')
      .doc(reportId)
      .get();

    if (!reportDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Report not found');
    }

    const report = reportDoc.data() as Report;

    // Verify authorization (clinician must be assigned to procedure)
    if (userRole?.includes('clinician')) {
      const procedureDoc = await db
        .collection('practices')
        .doc(practiceId)
        .collection('procedures')
        .doc(report.procedureId)
        .get();

      const procedure = procedureDoc.data() as Procedure;
      if (userId !== procedure.assignedClinicianId && userId !== procedure.coveringClinicianId) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'You are not assigned to this procedure'
        );
      }
    }

    // Fetch supporting data (procedure, patient, findings)
    const procedureDoc = await db
      .collection('practices')
      .doc(practiceId)
      .collection('procedures')
      .doc(report.procedureId)
      .get();

    const patientDoc = await db
      .collection('practices')
      .doc(practiceId)
      .collection('patients')
      .doc(report.patientId)
      .get();

    const findingsSnapshot = await db
      .collection('practices')
      .doc(practiceId)
      .collection('procedures')
      .doc(report.procedureId)
      .collection('findings')
      .where('reviewStatus', '==', 'confirmed')
      .get();

    const procedure = procedureDoc.data() as Procedure;
    const patient = patientDoc.data() as Patient;
    const findings: Finding[] = [];
    findingsSnapshot.forEach(doc => {
      findings.push(doc.data() as Finding);
    });

    // Generate HTML template
    const htmlContent = generatePdfHtml(
      report,
      procedure,
      patient,
      findings,
      variant
    );

    // TODO: Render HTML to PDF using Puppeteer or pdf-lib
    // For now, store HTML as placeholder
    const fileName = variant === 'internal'
      ? `report_${reportId}.pdf`
      : `report_patient_${reportId}.pdf`;

    const storagePath = `report-pdfs/${practiceId}/${reportId}/${fileName}`;
    const bucket = storage.bucket();

    // TODO: Actual PDF rendering
    // const pdfBuffer = await renderHtmlToPdf(htmlContent);
    // For now, store HTML as proof of concept
    const htmlBuffer = Buffer.from(htmlContent, 'utf-8');

    await bucket.file(storagePath).save(htmlBuffer, {
      metadata: {
        contentType: 'text/html', // TODO: Change to 'application/pdf'
        cacheControl: 'public, max-age=31536000',
      },
    });

    // Generate signed download URL (valid for 24 hours)
    const [url] = await bucket.file(storagePath).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000,
    });

    // Update report with PDF storage path
    const pdfField = variant === 'internal' ? 'pdfStoragePath' : 'patientPdfStoragePath';
    await db
      .collection('practices')
      .doc(practiceId)
      .collection('reports')
      .doc(reportId)
      .update({
        [pdfField]: storagePath,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return {
      success: true,
      pdfUrl: url,
      storagePath,
      variant,
      expiresIn: '24 hours',
    };
  } catch (error) {
    console.error('[PDF] Error generating report PDF:', error);

    if (error instanceof Error && error.message.includes('Zod')) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid input parameters');
    }

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Failed to generate PDF');
  }
});

/**
 * Generate PDF HTML template
 *
 * Creates HTML representation of the report ready for PDF rendering.
 * TODO: Replace with proper PDF rendering library output.
 *
 * @param report - Report data
 * @param procedure - Procedure data
 * @param patient - Patient data
 * @param findings - Confirmed findings
 * @param variant - PDF variant (internal or patient-facing)
 * @returns HTML string
 */
function generatePdfHtml(
  report: Report,
  procedure: Procedure,
  patient: Patient,
  findings: Finding[],
  variant: 'internal' | 'patient'
): string {
  const patientName = `${patient.firstName} ${patient.lastName}`;
  const patientDob = patient.dateOfBirth.toDate().toLocaleDateString();

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
    .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { margin: 0; }
    .patient-info { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
    .section { margin: 30px 0; }
    .section h2 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
    .findings-list { margin-left: 20px; }
    .finding-item { margin: 10px 0; padding: 10px; background: #fff; border-left: 4px solid #007bff; }
    .code-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .code-table th, .code-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    .code-table th { background-color: #f5f5f5; font-weight: bold; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    .disclaimer { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Capsule Endoscopy Report</h1>
    <p><strong>Report ID:</strong> ${report.id}</p>
    <p><strong>Procedure ID:</strong> ${procedure.id}</p>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
  </div>

  <div class="patient-info">
    <h3>Patient Information</h3>
    <p><strong>Name:</strong> ${patientName}</p>
    <p><strong>Date of Birth:</strong> ${patientDob}</p>
    <p><strong>MRN:</strong> ${patient.mrn}</p>
    <p><strong>Sex:</strong> ${patient.sex.charAt(0).toUpperCase() + patient.sex.slice(1)}</p>
  </div>

  <div class="section">
    <h2>Procedure Information</h2>
    <p><strong>Study Type:</strong> ${procedure.studyType}</p>
    <p><strong>Urgency:</strong> ${procedure.urgency}</p>
    <p><strong>Capsule Lot:</strong> ${procedure.capsuleLotNumber || 'Not recorded'}</p>
    <p><strong>Video Duration:</strong> ${procedure.videoDuration ? Math.round(procedure.videoDuration / 60) + ' minutes' : 'N/A'}</p>
  </div>

  <div class="section">
    <h2>Findings Summary</h2>
    <p><strong>Total Findings:</strong> ${findings.length}</p>
    <div class="findings-list">
  `;

  findings.forEach(finding => {
    html += `
      <div class="finding-item">
        <strong>${finding.classification}</strong>
        ${finding.subClassification ? ` (${finding.subClassification})` : ''}
        <br>
        <small>Location: ${finding.anatomicalRegion}</small>
        ${finding.sizeMillimeters ? `<br><small>Size: ${finding.sizeMillimeters}mm</small>` : ''}
      </div>
    `;
  });

  html += `
    </div>
  </div>

  <div class="section">
    <h2>Clinical Impression</h2>
    <p>${report.clinicalImpression}</p>
  </div>

  <div class="section">
    <h2>Recommendations</h2>
    <p>${report.recommendations}</p>
  </div>
  `;

  // Add codes section for internal variant
  if (variant === 'internal') {
    html += `
    <div class="section">
      <h2>ICD-10 Diagnostic Codes</h2>
      <table class="code-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Description</th>
            <th>Confidence</th>
          </tr>
        </thead>
        <tbody>
    `;

    report.icdCodes.forEach(code => {
      html += `
        <tr>
          <td>${code.code}</td>
          <td>${code.description}</td>
          <td>${Math.round(code.confidence * 100)}%</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>

      <h2>CPT Procedural Codes</h2>
      <table class="code-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Description</th>
            <th>Confidence</th>
          </tr>
        </thead>
        <tbody>
    `;

    report.cptCodes.forEach(code => {
      html += `
        <tr>
          <td>${code.code}</td>
          <td>${code.description}</td>
          <td>${Math.round(code.confidence * 100)}%</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    </div>
    `;
  }

  // Add footer
  html += `
  <div class="footer">
    <p><strong>Clinician:</strong> ${report.clinicianId}</p>
    <p><strong>Signed:</strong> ${report.signedAt ? report.signedAt.toDate().toLocaleString() : 'Not signed'}</p>
    ${variant === 'patient' ? '<div class="disclaimer"><strong>Patient Notice:</strong> This report has been de-identified for your privacy. For complete clinical information, consult with your healthcare provider.</div>' : ''}
  </div>

  <!-- TODO: Add finding thumbnails when image rendering is implemented -->

</body>
</html>
  `;

  return html;
}

/**
 * TODO: Render HTML to PDF
 *
 * This function will integrate with Puppeteer or pdf-lib
 * to convert HTML to actual PDF format.
 *
 * @param htmlContent - HTML string
 * @returns Promise<Buffer> with PDF content
 */
async function renderHtmlToPdf(htmlContent: string): Promise<Buffer> {
  // TODO: Implement using:
  // - Puppeteer: Launch headless Chrome to render and save PDF
  // - pdf-lib: Create PDF programmatically from HTML
  // - html-pdf: Node module for HTML to PDF conversion

  console.log('[TODO] Implement HTML to PDF rendering');

  // For now, return empty buffer
  return Buffer.alloc(0);
}
