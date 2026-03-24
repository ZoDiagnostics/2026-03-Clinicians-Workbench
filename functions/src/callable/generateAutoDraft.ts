/**
 * Generate Auto-Draft Callable Function
 * HTTPS callable function for generating auto-drafted reports using Copilot.
 *
 * Defined in ZCW-BRD-0297.
 * Generates structured report sections with linked evidence from confirmed findings.
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { generateAutoDraftInputSchema } from '../utils/validators';
import { Finding } from '../finding';
import { Procedure } from '../procedure';
import { AutoDraftReport, AutoDraftSection } from '../report';
import { StudyType, DraftSectionStatus } from '../enums';

/**
 * Generate auto-drafted report sections from confirmed findings
 *
 * Reads all confirmed findings, groups by anatomical region, and generates
 * structured report sections with linked evidence.
 *
 * Input: { procedureId: string }
 * Output: AutoDraftReport
 *
 * @callable
 * @auth requires clinician or clinician_admin role
 *
 * @example
 * ```typescript
 * const result = await functions.httpsCallable('generateAutoDraft')({
 *   procedureId: 'proc-123'
 * });
 * ```
 */
export const generateAutoDraft = functions.https.onCall(async (data, context) => {
  const db = admin.firestore();

  try {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const userRole = context.auth.token.role as string;

    // Validate authorization
    if (userRole !== 'clinician' && userRole !== 'clinician_admin' && userRole !== 'clinician_auth' && userRole !== 'clinician_noauth') {
      throw new functions.https.HttpsError('permission-denied', 'Only clinicians can generate auto-drafts');
    }

    // Validate input
    const validInput = generateAutoDraftInputSchema.parse(data);
    const { procedureId } = validInput;

    // Extract practice ID from user claims
    const practiceId = context.auth.token.practiceId as string;
    if (!practiceId) {
      throw new functions.https.HttpsError('permission-denied', 'User not associated with a practice');
    }

    // Fetch procedure
    const procedureDoc = await db
      .collection('practices')
      .doc(practiceId)
      .collection('procedures')
      .doc(procedureId)
      .get();

    if (!procedureDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Procedure not found');
    }

    const procedure = procedureDoc.data() as Procedure;

    // Verify caller is assigned clinician or clinician_admin
    if (userRole === 'clinician' || userRole === 'clinician_auth' || userRole === 'clinician_noauth') {
      if (userId !== procedure.assignedClinicianId && userId !== procedure.coveringClinicianId) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Only the assigned clinician can generate auto-draft'
        );
      }
    }

    // Fetch all confirmed findings
    const findingsSnapshot = await db
      .collection('practices')
      .doc(practiceId)
      .collection('procedures')
      .doc(procedureId)
      .collection('findings')
      .where('reviewStatus', '==', 'confirmed')
      .get();

    const findings: Finding[] = [];
    findingsSnapshot.forEach(doc => {
      findings.push(doc.data() as Finding);
    });

    if (findings.length === 0) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'No confirmed findings available for auto-draft generation'
      );
    }

    // Generate auto-draft report
    const autoDraft = generateAutoDraftReport(findings, procedure.studyType);

    // Return auto-draft structure
    return {
      success: true,
      autoDraft,
      findingCount: findings.length,
      sectionCount: autoDraft.sections.length,
    };
  } catch (error) {
    console.error('[AUTO-DRAFT] Error generating auto-draft:', error);

    if (error instanceof Error && error.message.includes('Zod')) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid input parameters');
    }

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Failed to generate auto-draft');
  }
});

/**
 * Generate auto-draft report from findings
 *
 * Groups findings by anatomical region and generates:
 * - Findings section: Lists each finding with classification, size, location, and evidence
 * - Impressions section: Template-based clinical impressions
 * - Recommendations section: Study-type-appropriate recommendations
 *
 * @param findings - Array of confirmed findings
 * @param studyType - Study type to determine template
 * @returns AutoDraftReport
 */
function generateAutoDraftReport(findings: Finding[], studyType: StudyType): AutoDraftReport {
  // Group findings by anatomical region
  const findingsByRegion: Record<string, Finding[]> = {};
  findings.forEach(finding => {
    if (!findingsByRegion[finding.anatomicalRegion]) {
      findingsByRegion[finding.anatomicalRegion] = [];
    }
    findingsByRegion[finding.anatomicalRegion].push(finding);
  });

  // Generate sections
  const sections: AutoDraftSection[] = [];

  // 1. Findings Section
  const findingsSection = generateFindingsSection(findings, findingsByRegion);
  sections.push(findingsSection);

  // 2. Impressions Section
  const impressionsSection = generateImpressionsSection(findings, studyType);
  sections.push(impressionsSection);

  // 3. Recommendations Section
  const recommendationsSection = generateRecommendationsSection(findings, studyType);
  sections.push(recommendationsSection);

  return {
    generatedAt: admin.firestore.Timestamp.now(),
    modelVersion: '1.0.0', // TODO: Use actual Copilot model version
    sections,
    acceptanceStatus: 'pending',
  };
}

/**
 * Generate findings section
 *
 * Lists each finding with classification, size, location, and linked evidence.
 *
 * @param findings - All findings
 * @param findingsByRegion - Findings grouped by region
 * @returns AutoDraftSection for findings
 */
function generateFindingsSection(
  findings: Finding[],
  findingsByRegion: Record<string, Finding[]>
): AutoDraftSection {
  let content = '';

  // Sort regions for consistent output
  const regions = Object.keys(findingsByRegion).sort();

  for (const region of regions) {
    const regionFindings = findingsByRegion[region];
    content += `\n**${region.charAt(0).toUpperCase() + region.slice(1)}:**\n`;

    for (const finding of regionFindings) {
      content += `- ${finding.classification}`;
      if (finding.subClassification) {
        content += ` (${finding.subClassification})`;
      }
      if (finding.sizeMillimeters) {
        content += `, Size: ${finding.sizeMillimeters}mm`;
      }
      content += `\n`;
    }
  }

  return {
    id: 'findings',
    title: 'Findings',
    content,
    status: DraftSectionStatus.PENDING,
    linkedEvidence: findings.map(f => f.id),
    draftedAt: admin.firestore.Timestamp.now(),
  };
}

/**
 * Generate impressions section
 *
 * Template-based clinical impression text based on finding patterns.
 * TODO: Replace with Vertex AI generation for study-type-specific impressions.
 *
 * @param findings - All findings
 * @param studyType - Study type
 * @returns AutoDraftSection for impressions
 */
function generateImpressionsSection(findings: Finding[], studyType: StudyType): AutoDraftSection {
  let content = '';

  // TODO: Vertex AI integration for dynamic impression generation
  // For now, use template-based approach

  const findingClassifications = findings.map(f => f.classification);
  const uniqueClassifications = [...new Set(findingClassifications)];

  content = `Based on capsule endoscopy findings, the following ${uniqueClassifications.length} unique abnormality type(s) were identified:\n\n`;

  for (const classification of uniqueClassifications) {
    const count = findingClassifications.filter(c => c === classification).length;
    content += `- ${classification}: ${count} finding(s)\n`;
  }

  // Add study-type-specific impression template
  switch (studyType) {
    case 'upper_gi':
      content += '\n**Esophageal/Gastric Assessment:** ';
      if (findingClassifications.includes('varix')) {
        content += 'Esophageal varices noted - recommend variceal surveillance.\n';
      } else {
        content += 'No significant esophageal findings.\n';
      }
      break;

    case 'sb_diagnostic':
      content += '\n**Small Bowel Findings:** The identified small bowel lesions warrant close clinical correlation and possible follow-up.\n';
      break;

    case 'crohns_monitor':
      content += '\n**Crohn\'s Disease Assessment:** Inflammatory changes documented. Lewis Score components identified.\n';
      break;

    case 'colon_eval':
      content += '\n**Colonic Findings:** Polyps and mass lesions documented as noted above.\n';
      break;
  }

  return {
    id: 'impressions',
    title: 'Impressions',
    content,
    status: DraftSectionStatus.PENDING,
    linkedEvidence: findings.map(f => f.id),
    draftedAt: admin.firestore.Timestamp.now(),
  };
}

/**
 * Generate recommendations section
 *
 * Study-type-appropriate recommendations based on findings.
 * TODO: Replace with Vertex AI generation for personalized recommendations.
 *
 * @param findings - All findings
 * @param studyType - Study type
 * @returns AutoDraftSection for recommendations
 */
function generateRecommendationsSection(findings: Finding[], studyType: StudyType): AutoDraftSection {
  let content = '';

  // TODO: Vertex AI integration for dynamic recommendation generation

  switch (studyType) {
    case 'upper_gi':
      content = '1. Recommend follow-up esophagogastroduodenoscopy for further evaluation if clinically indicated.\n';
      content += '2. Consider proton pump inhibitor therapy if erosive changes present.\n';
      content += '3. Endoscopic ultrasound if concern for submucosal lesions.\n';
      break;

    case 'sb_diagnostic':
      content = '1. Recommend correlation with clinical presentation and laboratory findings.\n';
      content += '2. Consider double-balloon enteroscopy for therapeutic intervention if indicated.\n';
      content += '3. Follow-up imaging and endoscopy as clinically appropriate.\n';
      break;

    case 'crohns_monitor':
      content = '1. Recommend continued medical management per gastroenterology.\n';
      content += '2. Consider repeat capsule endoscopy in 1-2 years for disease monitoring.\n';
      content += '3. Correlate findings with clinical symptoms and laboratory markers.\n';
      break;

    case 'colon_eval':
      content = '1. Recommend colonoscopy for polyp removal and complete colon evaluation.\n';
      content += '2. Biopsy of any concerning lesions.\n';
      content += '3. Surveillance interval per guidelines based on polyp characteristics.\n';
      break;
  }

  return {
    id: 'recommendations',
    title: 'Recommendations',
    content,
    status: DraftSectionStatus.PENDING,
    linkedEvidence: findings.map(f => f.id),
    draftedAt: admin.firestore.Timestamp.now(),
  };
}
