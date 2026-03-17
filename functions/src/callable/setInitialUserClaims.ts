/**
 * Set Initial User Custom Claims
 *
 * Identity Orchestration function that bootstraps a new user's Firebase Auth
 * custom claims (role, practiceId, clinicIds). This is the single entry point
 * for claim provisioning — called by an admin after creating a user document
 * in the `users` collection.
 *
 * Why this exists:
 * Firebase Auth custom claims are the authoritative source for RBAC in ZoCW.
 * Firestore security rules evaluate `request.auth.token.role` and
 * `request.auth.token.practiceId` on every read/write. If these claims are
 * absent (e.g., first login after account creation), the user is locked out
 * of all practice-scoped data. This function ensures claims are set before
 * the user's first meaningful interaction.
 *
 * Call flow:
 * 1. Admin creates user document in `users/{uid}` with role, practiceId, clinicIds
 * 2. Admin calls `setInitialUserClaims({ userId, role, practiceId, clinicIds })`
 * 3. Function validates caller is admin/clinician_admin in the same practice
 * 4. Function sets custom claims via Admin SDK
 * 5. Function updates user document with `claimsProvisioned: true` timestamp
 * 6. Function creates audit log entry
 *
 * BRD Requirements: ZCW-BRD-0005 (RBAC), ZCW-BRD-0088 (Custom Role Config)
 */

import * as functions from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Input Schema
// ---------------------------------------------------------------------------

const SetInitialUserClaimsSchema = z.object({
  /** UID of the user whose claims are being set */
  userId: z.string().min(1, 'userId is required'),

  /** Role to assign — must be one of the 5 RBAC roles */
  role: z.enum([
    'clinician_auth',
    'clinician_noauth',
    'clinician_admin',
    'admin',
    'clinical_staff',
  ]),

  /** Practice ID to associate the user with */
  practiceId: z.string().min(1, 'practiceId is required'),

  /** Clinic IDs the user has access to (empty array = all clinics in practice) */
  clinicIds: z.array(z.string()).default([]),
});

type SetInitialUserClaimsInput = z.infer<typeof SetInitialUserClaimsSchema>;

// ---------------------------------------------------------------------------
// Callable Function
// ---------------------------------------------------------------------------

export const setInitialUserClaims = functions.onCall(
  {
    // Require authenticated caller
    enforceAppCheck: false, // Enable in production with App Check
  },
  async (request) => {
    const db = admin.firestore();
    const auth = admin.auth();

    // -----------------------------------------------------------------------
    // 1. Authenticate caller
    // -----------------------------------------------------------------------
    if (!request.auth) {
      throw new functions.HttpsError(
        'unauthenticated',
        'Caller must be authenticated.'
      );
    }

    const callerUid = request.auth.uid;
    const callerClaims = request.auth.token;

    // -----------------------------------------------------------------------
    // 2. Authorize caller — must be admin or clinician_admin
    // -----------------------------------------------------------------------
    const callerRole = callerClaims.role as string | undefined;
    if (!callerRole || !['admin', 'clinician_admin'].includes(callerRole)) {
      throw new functions.HttpsError(
        'permission-denied',
        'Only admin or clinician_admin can provision user claims.'
      );
    }

    // -----------------------------------------------------------------------
    // 3. Validate input
    // -----------------------------------------------------------------------
    const parseResult = SetInitialUserClaimsSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw new functions.HttpsError(
        'invalid-argument',
        `Invalid input: ${parseResult.error.issues.map((i) => i.message).join(', ')}`
      );
    }

    const { userId, role, practiceId, clinicIds }: SetInitialUserClaimsInput =
      parseResult.data;

    // -----------------------------------------------------------------------
    // 4. Enforce same-practice scoping
    //    Caller must belong to the same practice as the target user.
    //    This prevents cross-practice privilege escalation.
    // -----------------------------------------------------------------------
    const callerPracticeId = callerClaims.practiceId as string | undefined;
    if (callerPracticeId !== practiceId) {
      throw new functions.HttpsError(
        'permission-denied',
        'Cannot provision claims for a user in a different practice.'
      );
    }

    // -----------------------------------------------------------------------
    // 5. Verify target user exists in Firebase Auth
    // -----------------------------------------------------------------------
    let targetUser: admin.auth.UserRecord;
    try {
      targetUser = await auth.getUser(userId);
    } catch (error) {
      throw new functions.HttpsError(
        'not-found',
        `User ${userId} does not exist in Firebase Auth.`
      );
    }

    // -----------------------------------------------------------------------
    // 6. Verify user document exists in Firestore
    // -----------------------------------------------------------------------
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
      throw new functions.HttpsError(
        'not-found',
        `User document users/${userId} does not exist. Create the user document first.`
      );
    }

    // -----------------------------------------------------------------------
    // 7. Check for existing claims (prevent accidental overwrite)
    // -----------------------------------------------------------------------
    const existingClaims = targetUser.customClaims;
    if (existingClaims?.role && existingClaims?.practiceId) {
      throw new functions.HttpsError(
        'already-exists',
        `User ${userId} already has claims (role: ${existingClaims.role}, practiceId: ${existingClaims.practiceId}). ` +
        'Use updateUserRole to modify existing claims.'
      );
    }

    // -----------------------------------------------------------------------
    // 8. Set custom claims via Admin SDK
    // -----------------------------------------------------------------------
    const customClaims = {
      role,
      practiceId,
      clinicIds,
    };

    try {
      await auth.setCustomUserClaims(userId, customClaims);
    } catch (error) {
      throw new functions.HttpsError(
        'internal',
        `Failed to set custom claims: ${(error as Error).message}`
      );
    }

    // -----------------------------------------------------------------------
    // 9. Update user document with provisioning metadata
    // -----------------------------------------------------------------------
    await userDocRef.update({
      role,
      practiceId,
      clinicIds,
      claimsProvisioned: true,
      claimsProvisionedAt: admin.firestore.FieldValue.serverTimestamp(),
      claimsProvisionedBy: callerUid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // -----------------------------------------------------------------------
    // 10. Create audit log entry
    // -----------------------------------------------------------------------
    await db.collection('auditLog').add({
      action: 'user_claims_provisioned',
      targetUserId: userId,
      targetUserEmail: targetUser.email || '',
      role,
      practiceId,
      clinicIds,
      performedBy: callerUid,
      performedByRole: callerRole,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        isInitialProvisioning: true,
        source: 'setInitialUserClaims',
      },
    });

    // -----------------------------------------------------------------------
    // 11. Return success with claim propagation guidance
    // -----------------------------------------------------------------------
    return {
      success: true,
      message: `Claims set for user ${userId}: role=${role}, practiceId=${practiceId}`,
      userId,
      claims: customClaims,
      note: 'The user must call getIdTokenResult(true) to force-refresh their ID token and pick up the new claims. Until they do, Firestore security rules will deny access.',
    };
  }
);
