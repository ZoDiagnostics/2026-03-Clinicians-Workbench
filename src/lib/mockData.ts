// Mock data extracted from Demo v3.1.0
// FIREBASE: Replace these with Firestore collections in production

export const USERS = [
  {
    id: 'U-001',
    name: 'Dr. Sarah Chen',
    email: 'sarah.chen@zoclinic.com',
    role: 'clinical_staff',
    avatar: '👩‍⚕️',
  },
  {
    id: 'U-002',
    name: 'Dr. James Wilson',
    email: 'james.wilson@zoclinic.com',
    role: 'clinician_admin',
    avatar: '👨‍⚕️',
  },
  {
    id: 'U-003',
    name: 'Admin User',
    email: 'admin@zoclinic.com',
    role: 'admin',
    avatar: '👤',
  },
];

export const PATIENTS = [
  {
    id: 'PAT-001',
    name: 'John Doe',
    dateOfBirth: '1985-03-15',
    email: 'john.doe@email.com',
    phone: '555-0101',
    diagnosis: 'Crohn\'s disease, small intestine',
    status: 'active',
  },
  {
    id: 'PAT-002',
    name: 'Jane Smith',
    dateOfBirth: '1990-07-22',
    email: 'jane.smith@email.com',
    phone: '555-0102',
    diagnosis: 'Ulcerative colitis',
    status: 'active',
  },
];

export const PROCEDURES = [
  {
    id: 'PROC-001',
    patientId: 'PAT-001',
    procedureType: 'Capsule Endoscopy',
    status: 'draft',
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-01T10:00:00Z',
    capsuleModel: 'Model X',
    icdCodes: [{ code: 'Z13.811', description: 'Encounter for screening for malignant neoplasm of colon' }],
  },
];

export const NOTIFICATIONS = [
  {
    id: 'N-001',
    message: 'Procedure PAT-001 is ready for review',
    read: false,
    timestamp: new Date().toISOString(),
  },
];
