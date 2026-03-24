/**
 * Validate Capsule Callable Function
 * HTTPS callable function for validating capsule lot and serial numbers.
 *
 * Defined in ZCW-BRD-0276.
 * Validates:
 * 1. Lot not in recalled lots list
 * 2. Serial not already used in another active procedure
 * 3. Lot/serial format validation
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { validateCapsuleInputSchema } from '../utils/validators';
import { Procedure } from '../procedure';
import { PracticeSettings } from '../practice';

/**
 * Validate capsule lot and serial number
 *
 * Checks:
 * - Lot format (alphanumeric, 6-15 chars)
 * - Serial format (alphanumeric, 10-20 chars)
 * - Lot not in recalled lots list
 * - Serial not already used in active procedures
 *
 * Input: { serialNumber: string, lotNumber: string, practiceId: string }
 * Output: { valid: boolean, errors: string[], warnings: string[] }
 *
 * @callable
 * @auth requires clinical_staff, clinician, or admin role
 *
 * @example
 * ```typescript
 * const result = await functions.httpsCallable('validateCapsule')({
 *   serialNumber: 'ABC123XYZ456',
 *   lotNumber: 'LOT2024001',
 *   practiceId: 'practice-123'
 * });
 * // Returns { valid: true, errors: [], warnings: [] }
 * ```
 */
export const validateCapsule = functions.https.onCall(async (data, context) => {
  const db = admin.firestore();

  try {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userRole = context.auth.token.role as string;

    // Validate authorization (staff can validate capsules)
    if (!userRole?.includes('clinician') && userRole !== 'clinical_staff' && userRole !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only staff and clinicians can validate capsules'
      );
    }

    // Validate input
    const validInput = validateCapsuleInputSchema.parse(data);
    const { serialNumber, lotNumber, practiceId } = validInput;

    // Perform validation
    const validationResult = await performCapsuleValidation(
      serialNumber,
      lotNumber,
      practiceId,
      db
    );

    return validationResult;
  } catch (error) {
    console.error('[CAPSULE] Error validating capsule:', error);

    if (error instanceof Error && error.message.includes('Zod')) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid input parameters');
    }

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError('internal', 'Failed to validate capsule');
  }
});

/**
 * Perform capsule validation
 *
 * @param serialNumber - Capsule serial number
 * @param lotNumber - Capsule lot number
 * @param practiceId - Practice ID
 * @param db - Firestore instance
 * @returns Validation result with errors and warnings
 */
async function performCapsuleValidation(
  serialNumber: string,
  lotNumber: string,
  practiceId: string,
  db: admin.firestore.Firestore
): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Format validation
  const formatErrors = validateCapsuleFormat(serialNumber, lotNumber);
  errors.push(...formatErrors);

  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // 2. Check recalled lots
  const recallWarnings = await checkRecalledLots(lotNumber, practiceId, db);
  warnings.push(...recallWarnings);

  if (recallWarnings.some(w => w.includes('RECALLED'))) {
    errors.push('This capsule lot has been recalled. Do not use.');
    return { valid: false, errors, warnings };
  }

  // 3. Check serial number not already used
  const serialErrors = await checkSerialNumberUsage(serialNumber, practiceId, db);
  errors.push(...serialErrors);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate capsule lot and serial format
 *
 * @param serialNumber - Serial to validate
 * @param lotNumber - Lot to validate
 * @returns Array of format error messages
 */
function validateCapsuleFormat(serialNumber: string, lotNumber: string): string[] {
  const errors: string[] = [];

  // Serial format: alphanumeric, 10-20 chars
  if (!/^[A-Z0-9]{10,20}$/.test(serialNumber)) {
    errors.push(
      'Invalid serial number format. Must be 10-20 uppercase alphanumeric characters.'
    );
  }

  // Lot format: alphanumeric, 6-15 chars
  if (!/^[A-Z0-9]{6,15}$/.test(lotNumber)) {
    errors.push(
      'Invalid lot number format. Must be 6-15 uppercase alphanumeric characters.'
    );
  }

  return errors;
}

/**
 * Check if lot number is in recalled lots list
 *
 * @param lotNumber - Lot number to check
 * @param practiceId - Practice ID
 * @param db - Firestore instance
 * @returns Array of warning messages
 */
async function checkRecalledLots(
  lotNumber: string,
  practiceId: string,
  db: admin.firestore.Firestore
): Promise<string[]> {
  const warnings: string[] = [];

  try {
    const settingsDoc = await db
      .collection('practices')
      .doc(practiceId)
      .collection('settings')
      .doc('default')
      .get();

    if (settingsDoc.exists) {
      const settings = settingsDoc.data() as PracticeSettings;
      const recalledLots = settings.recalledCapsuleLots || [];

      if (recalledLots.includes(lotNumber)) {
        warnings.push(`WARNING: Capsule lot ${lotNumber} is RECALLED. Do not use this capsule.`);
      }
    }
  } catch (error) {
    console.warn('[CAPSULE] Could not check recalled lots:', error);
    warnings.push('Could not verify recall status. Proceed with caution.');
  }

  return warnings;
}

/**
 * Check if serial number is already used in an active procedure
 *
 * @param serialNumber - Serial number to check
 * @param practiceId - Practice ID
 * @param db - Firestore instance
 * @returns Array of error messages if serial is already used
 */
async function checkSerialNumberUsage(
  serialNumber: string,
  practiceId: string,
  db: admin.firestore.Firestore
): Promise<string[]> {
  const errors: string[] = [];

  try {
    // Query for procedures using this serial number in active/non-terminal status
    const proceduresSnapshot = await db
      .collection('practices')
      .doc(practiceId)
      .collection('procedures')
      .where('capsuleSerialNumber', '==', serialNumber)
      .get();

    for (const doc of proceduresSnapshot.docs) {
      const procedure = doc.data() as Procedure;
      const status = procedure.status;

      // Check if status is not terminal (not closed or void)
      if (status !== 'closed' && status !== 'void') {
        errors.push(
          `This serial number is already in use for procedure ${procedure.id} (Status: ${status}). ` +
          `Cannot reuse the same capsule.`
        );
        break;
      }
    }
  } catch (error) {
    console.warn('[CAPSULE] Could not check serial number usage:', error);
    errors.push('Could not verify serial number. Please try again.');
  }

  return errors;
}

/**
 * Get capsule inventory status
 *
 * Helper function to check capsule inventory availability
 * (Not part of validation but useful for clinic staff)
 *
 * @param practiceId - Practice ID
 * @param clinicId - Clinic ID
 * @param lotNumber - Lot number to check
 * @param db - Firestore instance
 * @returns Inventory item or null
 */
export async function getCapsuleInventoryStatus(
  practiceId: string,
  clinicId: string,
  lotNumber: string,
  db: admin.firestore.Firestore
): Promise<{
  available: boolean;
  quantityAvailable: number;
  expirationDate?: Date;
} | null> {
  try {
    const clinicDoc = await db
      .collection('practices')
      .doc(practiceId)
      .collection('clinics')
      .doc(clinicId)
      .get();

    if (!clinicDoc.exists) {
      return null;
    }

    const clinic = clinicDoc.data();
    if (!clinic) {
      return null;
    }
    const capsuleInventory = clinic.capsuleInventory || [];

    const inventoryItem = capsuleInventory.find((item: any) => item.lotNumber === lotNumber);
    if (!inventoryItem) {
      return null;
    }

    const available = inventoryItem.quantityReceived - inventoryItem.quantityUsed > 0;
    const quantityAvailable = Math.max(
      0,
      inventoryItem.quantityReceived - inventoryItem.quantityUsed
    );

    return {
      available,
      quantityAvailable,
      expirationDate: inventoryItem.expirationDate?.toDate(),
    };
  } catch (error) {
    console.warn('[CAPSULE] Could not get inventory status:', error);
    return null;
  }
}
