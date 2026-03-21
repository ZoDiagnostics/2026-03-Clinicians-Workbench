// Type definitions for ZoCW application

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'clinical_staff' | 'clinician_admin' | 'admin';
  avatar?: string;
}

export interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  diagnosis: string;
  status: 'active' | 'inactive' | 'archived';
}

export interface Procedure {
  id: string;
  patientId: string;
  procedureType: string;
  status: 'draft' | 'ready' | 'in_progress' | 'completed' | 'signed' | 'delivered';
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
}

export interface Notification {
  id: string;
  message: string;
  read: boolean;
  timestamp: string;
  type?: 'info' | 'warning' | 'error' | 'success';
}

export interface WorkflowState {
  currentStep: number;
  status: 'active' | 'paused' | 'completed';
  procedureId: string;
  startedAt: string;
}
