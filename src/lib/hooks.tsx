import { useState, useEffect, useContext } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { useStore, Procedure } from './store';
import { USERS, PATIENTS, PROCEDURES } from './mockData';
import { UserRole } from '../types/enums';
import { User } from '../types/user';

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


export function useProcedures(): Procedure[] {
  // FIREBASE: Replace with Firestore hook
  return PROCEDURES;
}

export function useUsers(): User[] {
  // FIREBASE: Replace with Firestore hook
  return USERS;
}

export function useNotifications() {
  const { state } = useStore();
  return state.notifications;
}

export function useActiveProcedure() {
  const { state } = useStore();
  return state.activeProcedure;
}
