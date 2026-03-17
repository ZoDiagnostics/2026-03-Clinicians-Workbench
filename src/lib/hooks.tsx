import { useState, useEffect, useContext } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useStore } from './store';
import { UserRole } from '../types/enums';
import { User } from '../types/user';
import { Procedure } from '../types/procedure';

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
