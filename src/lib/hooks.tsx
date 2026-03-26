import { useState, useEffect } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db } from './firebase';
import { useStore } from './store';
import { UserRole } from '../types/enums';
import { User } from '../types/user';
import { Procedure } from '../types/procedure';
import { Patient } from '../types/patient';
import { Finding } from '../types/finding';
import { Report } from '../types/report';
import { Clinic, Practice, PracticeSettings } from '../types/practice';
import { COLLECTIONS } from '../types/firestore-paths';
import { AppNotification } from '../types/notification';

const functions = getFunctions();

export interface AuthState {
  user: FirebaseUser | null;
  role: UserRole | null;
  practiceId: string | null;
  loading: boolean;
  error: Error | null;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let retries = 5;
        while (retries > 0) {
          try {
            const idTokenResult = await firebaseUser.getIdTokenResult(true);
            const claims = idTokenResult.claims;
            if (claims.role && claims.practiceId) {
              setUser(firebaseUser);
              setRole(claims.role as UserRole);
              setPracticeId(claims.practiceId as string);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error("Error fetching token:", e);
          }
          retries--;
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        setError(new Error("Failed to get user claims. Please try again later."));
        setLoading(false);

      } else {
        setUser(null);
        setRole(null);
        setPracticeId(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, role, practiceId, loading, error };
}

export function usePatients(): Patient[] {
  const [patients, setPatients] = useState<Patient[]>([]);
  const { practiceId } = useAuth();

  useEffect(() => {
    if (!practiceId) return;

    const patientsRef = collection(db, 'patients');
    const q = query(patientsRef, where('practiceId', '==', practiceId));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const patientsData = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
      setPatients(patientsData);
    });

    return () => unsubscribe();
  }, [practiceId]);

  return patients;
}

export function useProcedures() {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const { practiceId } = useAuth();

  useEffect(() => {
    if (!practiceId) return;

    const proceduresRef = collection(db, 'procedures');
    const q = query(proceduresRef, where('practiceId', '==', practiceId));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const proceduresData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Procedure));
      setProcedures(proceduresData);
    });

    return () => unsubscribe();
  }, [practiceId]);

  return procedures;
}

export function useActiveProcedure(procedureId: string | undefined) {
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const { practiceId } = useAuth();

  useEffect(() => {
    if (!practiceId || !procedureId) {
      setProcedure(null);
      return;
    }

    const procedureRef = doc(db, 'procedures', procedureId);

    const unsubscribe = onSnapshot(procedureRef, (doc) => {
      if (doc.exists()) {
        const procedureData = { id: doc.id, ...doc.data() } as Procedure;
        if (procedureData.practiceId === practiceId) {
          setProcedure(procedureData);
        } else {
          setProcedure(null);
          console.warn('Attempted to fetch procedure from another practice');
        }
      } else {
        setProcedure(null);
      }
    });

    return () => unsubscribe();
  }, [practiceId, procedureId]);

  return procedure;
}

export function useStaff(): User[] {
  const [staff, setStaff] = useState<User[]>([]);
  const { practiceId } = useAuth();

  useEffect(() => {
    if (!practiceId) return;

    const usersRef = collection(db, COLLECTIONS.USERS);
    const q = query(usersRef, where('practiceId', '==', practiceId));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const staffData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setStaff(staffData);
    });

    return () => unsubscribe();
  }, [practiceId]);

  return staff;
}

export function useClinics(): Clinic[] {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const { practiceId } = useAuth();

  useEffect(() => {
    if (!practiceId) return;

    const clinicsRef = collection(db, COLLECTIONS.CLINICS(practiceId));
    const q = query(clinicsRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const clinicsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Clinic));
      setClinics(clinicsData);
    });

    return () => unsubscribe();
  }, [practiceId]);

  return clinics;
}

export function usePractice(): Practice | null {
  const [practice, setPractice] = useState<Practice | null>(null);
  const { practiceId } = useAuth();

  useEffect(() => {
    if (!practiceId) return;

    const practiceRef = doc(db, COLLECTIONS.PRACTICES, practiceId);

    const unsubscribe = onSnapshot(practiceRef, (doc) => {
      if (doc.exists()) {
        setPractice({ id: doc.id, ...doc.data() } as Practice);
      } else {
        setPractice(null);
      }
    });

    return () => unsubscribe();
  }, [practiceId]);

  return practice;
}

export function usePracticeSettings(): PracticeSettings | null {
  const [settings, setSettings] = useState<PracticeSettings | null>(null);
  const { practiceId } = useAuth();

  useEffect(() => {
    if (!practiceId) return;

    const settingsRef = doc(db, COLLECTIONS.PRACTICE_SETTINGS(practiceId), 'default');

    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        setSettings({ id: doc.id, ...doc.data() } as PracticeSettings);
      } else {
        setSettings(null);
      }
    });

    return () => unsubscribe();
  }, [practiceId]);

  return settings;
}

export function useNotifications() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
  
    useEffect(() => {
      if (!user) return;
  
      const q = query(
        collection(db, `users/${user.uid}/notifications`)
      );
  
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AppNotification));
        setNotifications(notifs);
        const unread = notifs.filter(n => !n.isRead).length;
        setUnreadCount(unread)
      });
  
      return () => unsubscribe();
    }, [user]);
  
    return { notifications, unreadCount };
}

export const markNotificationRead = async (userId: string, notificationId: string) => {
    const notifRef = doc(db, `users/${userId}/notifications`, notificationId);
    await updateDoc(notifRef, { isRead: true, readAt: serverTimestamp() });
};
  
export const markAllNotificationsRead = async (userId: string) => {
    const notificationsRef = collection(db, `users/${userId}/notifications`);
    const q = query(notificationsRef, where("isRead", "==", false));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(document => {
        batch.update(document.ref, { isRead: true, readAt: serverTimestamp() });
    });
    await batch.commit();
};
  
export const deleteNotification = async (userId: string, notificationId: string) => {
    const notifRef = doc(db, `users/${userId}/notifications`, notificationId);
    await deleteDoc(notifRef);
};

export function useFindings(procedureId: string | undefined) {
  const [findings, setFindings] = useState<Finding[]>([]);

  useEffect(() => {
    if (!procedureId) {
      setFindings([]);
      return;
    }

    const findingsRef = collection(db, COLLECTIONS.FINDINGS(procedureId));
    const q = query(findingsRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const findingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Finding));
      setFindings(findingsData);
    });

    return () => unsubscribe();
  }, [procedureId]);

  return findings;
}

export const createFinding = async (procedureId: string, findingData: Omit<Finding, 'id' | 'createdAt' | 'updatedAt'>) => {
  const findingsRef = collection(db, COLLECTIONS.FINDINGS(procedureId));
  const now = serverTimestamp();
  const docRef = await addDoc(findingsRef, {
    ...findingData,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
};

export const updateFinding = async (procedureId: string, findingId: string, updates: Partial<Finding>) => {
  const findingRef = doc(db, COLLECTIONS.FINDINGS(procedureId), findingId);
  await updateDoc(findingRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const deleteFinding = async (procedureId: string, findingId: string) => {
  const findingRef = doc(db, COLLECTIONS.FINDINGS(procedureId), findingId);
  await deleteDoc(findingRef);
};

export const updateProcedure = async (procedureId: string, updates: Partial<Procedure>) => {
  const procedureRef = doc(db, 'procedures', procedureId);
  await updateDoc(procedureRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

// --- Capsule Image Pipeline Hooks ---

import { GetCapsuleFramesResponse } from '../types/capsule-image';

/**
 * Fetch all capsule frames + AI analysis for a procedure's capsule serial number.
 * Calls the getCapsuleFrames Cloud Function which proxies reads from the
 * pipeline project (podium-capsule-ingest) and returns signed URLs.
 *
 * One-time fetch on mount (not real-time) — capsule data is static at read time.
 * Skips fetch when capsuleSerial is undefined (no pipeline data for this procedure).
 *
 * @param capsuleSerial - The capsuleSerialNumber from the ZoCW procedure document
 * @returns { data, loading, error }
 */
export function useCapsuleFrames(capsuleSerial: string | undefined) {
  const [data, setData] = useState<GetCapsuleFramesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!capsuleSerial) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const getCapsuleFrames = httpsCallable(functions, 'getCapsuleFrames');
    getCapsuleFrames({ capsuleSerial })
      .then((result) => {
        if (!cancelled) {
          setData(result.data as GetCapsuleFramesResponse);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          console.error('[useCapsuleFrames] Error fetching capsule frames:', err);
          setError(err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [capsuleSerial]);

  return { data, loading, error };
}

// --- Report Hooks ---

export function useReport(procedureId: string | undefined) {
  const [report, setReport] = useState<Report | null>(null);
  const { practiceId } = useAuth();

  useEffect(() => {
    if (!procedureId || !practiceId) {
      setReport(null);
      return;
    }

    const reportsRef = collection(db, 'reports');
    const q = query(reportsRef, where('procedureId', '==', procedureId), where('practiceId', '==', practiceId));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (querySnapshot.empty) {
        setReport(null);
      } else {
        const reportDoc = querySnapshot.docs[0];
        setReport({ id: reportDoc.id, ...reportDoc.data() } as Report);
      }
    });

    return () => unsubscribe();
  }, [procedureId, practiceId]);

  return report;
}

export const generateReport = async (procedureId: string) => {
  // TODO: External Infrastructure
  const generateAutoDraft = httpsCallable(functions, 'generateAutoDraft');
  return generateAutoDraft({ procedureId });
};

export const updateReport = async (reportId: string, updates: Partial<Report>) => {
  const reportRef = doc(db, 'reports', reportId);
  return updateDoc(reportRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
};

export const signReport = async (reportId: string) => {
  const signReportFunction = httpsCallable(functions, 'signReport');
  return signReportFunction({ reportId });
};

export const deliverReport = async (reportId: string, methods: any[]) => {
  const deliverReportFunction = httpsCallable(functions, 'deliverReport');
  return deliverReportFunction({ reportId, methods });
};