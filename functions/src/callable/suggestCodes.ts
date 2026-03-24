/**
 * Suggest Codes Callable Function
 * HTTPS callable function for suggesting ICD-10 and CPT codes based on findings.
 *
 * Defined in ZCW-BRD-0299.
 * Maps finding classifications to standardized medical codes with confidence scoring.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { suggestCodesInputSchema } from '../utils/validators';
import { Finding } from '../finding';
import { CodeEntry } from '../report';
import { CodeSuggestionStatus } from '../enums';

/**
 * Comprehensive ICD-10 code mapping for GI findings
 * Maps finding classifications to ICD-10 diagnostic codes
 */
const ICD10_MAPPINGS: Record<string, { code: string; description: string }[]> = {
  polyp: [
    { code: 'K63.5', description: 'Polyp of colon' },
    { code: 'D12.6', description: 'Benign neoplasm of colon' },
    { code: 'D13.3', description: 'Benign neoplasm of duodenum' },
  ],
  ulcer: [
    { code: 'K25.9', description: 'Gastric ulcer, unspecified' },
    { code: 'K26.9', description: 'Duodenal ulcer, unspecified' },
    { code: 'K27.9', description: 'Peptic ulcer, site unspecified' },
  ],
  bleeding: [
    { code: 'K92.1', description: 'Melena' },
    { code: 'K92.2', description: 'Gastrointestinal hemorrhage, unspecified' },
    { code: 'K92.0', description: 'Hematemesis' },
  ],
  stricture: [
    { code: 'K56.69', description: 'Other intestinal obstruction' },
    { code: 'K31.5', description: 'Pyloric stenosis' },
  ],
  crohns: [
    { code: 'K50.90', description: "Crohn's disease, unspecified, with unspecified complications" },
    { code: 'K50.919', description: "Crohn's disease of small intestine with unspecified complications" },
  ],
  barrett: [
    { code: 'K22.70', description: "Barrett's esophagus without dysplasia" },
    { code: 'K22.710', description: "Barrett's esophagus with low grade dysplasia" },
    { code: 'K22.711', description: "Barrett's esophagus with high grade dysplasia" },
  ],
  varix: [
    { code: 'I85.00', description: 'Esophageal varices without bleeding' },
    { code: 'I85.01', description: 'Esophageal varices with bleeding' },
  ],
  mass: [
    { code: 'D13.9', description: 'Benign neoplasm of digestive system, unspecified' },
    { code: 'C78.89', description: 'Secondary malignant neoplasm of other digestive organs' },
  ],
  erosion: [
    { code: 'K25.3', description: 'Acute gastric ulcer without hemorrhage' },
    { code: 'K25.1', description: 'Acute gastric ulcer with perforation' },
  ],
  inflammation: [
    { code: 'K52.9', description: 'Noninfective gastroenteritis and colitis, unspecified' },
    { code: 'K50.919', description: "Crohn's disease inflammation" },
  ],
  villous_atrophy: [
    { code: 'K90.0', description: 'Celiac disease' },
  ],
  lymphangiectasia: [
    { code: 'I89.0', description: 'Lymphedema, not elsewhere classified' },
  ],
  angiodysplasia: [
    { code: 'K55.20', description: 'Angiodysplasia of colon without bleeding' },
    { code: 'K55.21', description: 'Angiodysplasia of colon with bleeding' },
  ],
  diverticulum: [
    { code: 'K57.90', description: 'Diverticulosis' },
    { code: 'K57.30', description: 'Diverticulitis of both small and large intestine' },
  ],
};

/**
 * CPT code mappings for capsule endoscopy procedures
 */
const CPT_MAPPINGS: Record<string, { code: string; description: string }> = {
  capsule_endoscopy: { code: '91110', description: 'Gastrointestinal tract imaging, capsule endoscopy' },
  esophageal: { code: '91111', description: 'Esophageal capsule endoscopy' },
  with_pathology: { code: '91112', description: 'Gastrointestinal capsule endoscopy with pathology interpretation' },
};

/**
 * Suggest ICD-10 and CPT codes based on procedure findings
 *
 * Maps finding classifications to standardized medical codes.
 * Calculates confidence based on: AI confidence, classification specificity, number of findings.
 * Returns codes sorted by confidence descending.
 *
 * Input: { procedureId: string }
 * Output: { codes: CodeEntry[] }
 *
 * @callable
 * @auth requires clinician role
 *
 * @example
 * ```typescript
 * const result = await functions.httpsCallable('suggestCodes')({
 *   procedureId: 'proc-123'
 * });
 * // Returns codes sorted by confidence
 * ```
 */
export const suggestCodes = functions.https.onCall(async (data, context) => {
  const db = admin.firestore();

  try {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userRole = context.auth.token.role as string;

    // Validate authorization
    if (!userRole?.includes('clinician') && userRole !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only clinicians can suggest codes');
    }

    // Validate input
    const validInput = suggestCodesInputSchema.parse(data);
    const { procedureId } = validInput;

    // Extract practice ID
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

    // Fetch practice favorites
    let favoritesCodes: string[] = [];
    try {
      const settingsDoc = await db
        .collection('practices')
        .doc(practiceId)
        .collection('settings')
        .doc('default')
        .get();

      if (settingsDoc.exists) {
        // TODO: Implement favorite codes tracking in PracticeSettings
      }
    } catch (error) {
      console.warn('[CODES] Could not fetch practice favorites:', error);
    }

    // Suggest codes
    const suggestedCodes = suggestCodesFromFindings(findings, favoritesCodes);

    // Sort by confidence descending
    suggestedCodes.sort((a, b) => b.confidence - a.confidence);

    return {
      success: true,
      codes: suggestedCodes,
      totalCount: suggestedCodes.length,
      findingCount: findings.length,
    };
  } catch (error) {
    console.error('[CODES] Error suggesting codes:', error);

    if (error instanceof Error && error.message.includes('Zod')) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid input parameters');
    }

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Failed to suggest codes');
  }
});

/**
 * Suggest codes from findings
 *
 * Maps finding classifications to ICD-10 and CPT codes with confidence scoring.
 *
 * @param findings - Array of confirmed findings
 * @param favoritesCodes - User's favorite codes (IDs)
 * @returns Array of CodeEntry suggestions
 */
function suggestCodesFromFindings(findings: Finding[], favoritesCodes: string[]): CodeEntry[] {
  const allCodes: CodeEntry[] = [];
  const processedCodes = new Set<string>();

  // Process each finding
  findings.forEach(finding => {
    const classification = finding.classification.toLowerCase();

    // Look up ICD-10 codes
    const icd10Options = ICD10_MAPPINGS[classification] || [];
    icd10Options.forEach(option => {
      if (processedCodes.has(option.code)) {
        return; // Skip duplicates
      }

      const confidence = calculateConfidence(
        finding.aiConfidence || 0,
        classification,
        findings.filter(f => f.classification.toLowerCase() === classification).length
      );

      allCodes.push({
        id: `icd10-${option.code}`,
        code: option.code,
        description: option.description,
        confidence,
        status: CodeSuggestionStatus.SUGGESTED,
        isFavorite: favoritesCodes.includes(option.code),
        linkedFindingId: finding.id,
        addedAt: admin.firestore.Timestamp.now(),
      });

      processedCodes.add(option.code);
    });
  });

  // Always suggest procedure code (CPT)
  const procedureCode = CPT_MAPPINGS['capsule_endoscopy'];
  if (!processedCodes.has(procedureCode.code)) {
    allCodes.push({
      id: `cpt-${procedureCode.code}`,
      code: procedureCode.code,
      description: procedureCode.description,
      confidence: 0.95, // High confidence for procedure code
      status: CodeSuggestionStatus.SUGGESTED,
      isFavorite: favoritesCodes.includes(procedureCode.code),
      addedAt: admin.firestore.Timestamp.now(),
    });
  }

  return allCodes;
}

/**
 * Calculate confidence score for code suggestion
 *
 * Based on:
 * - AI confidence score (if AI-detected)
 * - Classification specificity
 * - Number of supporting findings
 *
 * @param aiConfidence - AI confidence score (0-1)
 * @param classification - Finding classification
 * @param countInProcedure - Number of similar findings in procedure
 * @returns Confidence score (0-1)
 */
function calculateConfidence(aiConfidence: number, classification: string, countInProcedure: number): number {
  let confidence = aiConfidence;

  // Boost confidence if multiple findings of same type
  if (countInProcedure > 1) {
    confidence = Math.min(1, confidence + 0.1);
  }

  // Classification-specific confidence adjustments
  const highSpecificityClassifications = ['varix', 'barrett', 'crohns'];
  if (highSpecificityClassifications.includes(classification)) {
    confidence = Math.min(1, confidence + 0.05);
  }

  return confidence;
}
