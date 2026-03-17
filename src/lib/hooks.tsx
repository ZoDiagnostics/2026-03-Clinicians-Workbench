import { useContext } from 'react';
import { useStore, User, Procedure } from './store';
import { USERS, PATIENTS, PROCEDURES } from './mockData';

export function useAuth(): User | null {
  const { state } = useStore();
  return state.currentUser;
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
