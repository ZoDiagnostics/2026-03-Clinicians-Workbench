import React, { createContext, useReducer, useContext } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'clinical_staff' | 'clinician_admin' | 'admin';
  avatar?: string;
}

export interface Procedure {
  id: string;
  patientId: string;
  procedureType: string;
  status: 'draft' | 'ready' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface AppState {
  currentUser: User | null;
  notifications: Array<{ id: string; message: string; read: boolean; timestamp: string }>;
  activeProcedure: Procedure | null;
  workflowActive: boolean;
  sidebarCollapsed: boolean;
}

type AppAction =
  | { type: 'SET_CURRENT_USER'; payload: User }
  | { type: 'SET_ACTIVE_PROCEDURE'; payload: Procedure | null }
  | { type: 'ADD_NOTIFICATION'; payload: { message: string } }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_WORKFLOW_ACTIVE'; payload: boolean };

const initialState: AppState = {
  currentUser: null,
  notifications: [],
  activeProcedure: null,
  workflowActive: false,
  sidebarCollapsed: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    case 'SET_ACTIVE_PROCEDURE':
      return { ...state, activeProcedure: action.payload };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            id: Date.now().toString(),
            message: action.payload.message,
            read: false,
            timestamp: new Date().toISOString(),
          },
        ],
      };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'SET_WORKFLOW_ACTIVE':
      return { ...state, workflowActive: action.payload };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};
