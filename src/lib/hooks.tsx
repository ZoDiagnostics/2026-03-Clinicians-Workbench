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
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db } from './firebase';
import { useStore } from './store';
import { UserRole } from '../types/enums';
import { User } from '../types/user';
import { Procedure } from '../types/procedure';
import { Finding } from '../types/finding';
import { Report } from '../types/report';
import { COLLECTIONS } from '../types/firestore-paths';

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

export function useUsers(): User[] {
  // FIREBASE: Replace with Firestore hook
  return [];
}

export function useNotifications() {
  const { state } = useStore();
  return state.notifications;
}

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
