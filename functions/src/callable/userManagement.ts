import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { UserRole } from '../../../src/types/enums';
import { User } from '../../../src/types/user';

const db = admin.firestore();

export const createUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { email, firstName, lastName, role, clinicIds, practiceId } = data;

  // Create user in Firebase Auth
  const userRecord = await admin.auth().createUser({
    email,
    displayName: `${firstName} ${lastName}`,
  });

  // Set custom claims
  await admin.auth().setCustomUserClaims(userRecord.uid, { role, practiceId });

  // Create user document in Firestore
  const userDoc: Omit<User, 'id'> = {
    uid: userRecord.uid,
    practiceId,
    firstName,
    lastName,
    email,
    role,
    clinicIds,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection('users').doc(userRecord.uid).set(userDoc);

  return { uid: userRecord.uid };
});

export const updateUser = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { userId, ...updates } = data;

    // Update user document in Firestore
    await db.collection('users').doc(userId).update({
        ...updates,
        updatedAt: new Date(),
    });

    // Update custom claims if role is changed
    if (updates.role) {
        const user = await admin.auth().getUser(userId);
        const practiceId = user.customClaims?.['practiceId'];
        await admin.auth().setCustomUserClaims(userId, { role: updates.role, practiceId });
    }

    return { success: true };
});
