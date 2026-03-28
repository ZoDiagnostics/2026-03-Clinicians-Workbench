import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { Dashboard } from '../screens/Dashboard';
import { Worklist } from '../screens/Worklist';
import { Patients } from '../screens/Patients';
import { Procedures } from '../screens/Procedures';
import { ReportsHub } from '../screens/ReportsHub';
import { Education } from '../screens/Education';
import { Admin } from '../screens/Admin';
import ManageStaff from '../screens/admin/ManageStaff';
import ManagePractice from '../screens/admin/ManagePractice';
import ManageClinics from '../screens/admin/ManageClinics';
import ManageSubscription from '../screens/admin/ManageSubscription';
import ManageICDCodes from '../screens/admin/ManageICDCodes';
import { ActivityLog } from '../screens/ActivityLog';
import { AIQA } from '../screens/AIQA';
import { Operations } from '../screens/Operations';
import { Analytics } from '../screens/Analytics';
import { CheckIn } from '../screens/CheckIn';
import { CapsuleUpload } from '../screens/CapsuleUpload';
import { Viewer } from '../screens/Viewer';
import { Summary } from '../screens/Summary';
import Report from '../screens/Report';
import SignDeliver from '../screens/SignDeliver';
import { PatientOverview } from '../screens/PatientOverview';
import LoginScreen from '../screens/Login';
import { useAuth } from './hooks';
import { UserRole } from '../types/enums';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (!user) {
    // BUG-6: Pass the intended destination so Login can redirect back after auth
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
};

const CLINICAL_ROLES: UserRole[] = [
  UserRole.CLINICIAN_AUTH,
  UserRole.CLINICIAN_NOAUTH,
  UserRole.CLINICIAN_ADMIN,
  UserRole.CLINICAL_STAFF,
];

const ClinicalRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  // BUG-69: Wait for both auth AND custom claims to resolve before rendering
  if (loading || (user && !role)) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // BUG-69: Treat null/missing role as unauthorized (redirect to dashboard)
  if (!role || !CLINICAL_ROLES.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const router = createBrowserRouter([
  { path: '/login', element: <LoginScreen /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/worklist',
    element: (
      <ProtectedRoute>
        <Worklist />
      </ProtectedRoute>
    ),
  },
  {
    path: '/patients',
    element: (
      <ProtectedRoute>
        <Patients />
      </ProtectedRoute>
    ),
  },
  {
    path: '/procedures',
    element: (
      <ProtectedRoute>
        <Procedures />
      </ProtectedRoute>
    ),
  },
  {
    path: '/reports-hub',
    element: (
      <ProtectedRoute>
        <ReportsHub />
      </ProtectedRoute>
    ),
  },
  {
    path: '/education',
    element: (
      <ProtectedRoute>
        <Education />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <Admin />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/staff',
    element: (
      <ProtectedRoute>
        <ManageStaff />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/practice',
    element: (
      <ProtectedRoute>
        <ManagePractice />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/clinics',
    element: (
      <ProtectedRoute>
        <ManageClinics />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/subscription',
    element: (
      <ProtectedRoute>
        <ManageSubscription />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/icd-codes',
    element: (
      <ProtectedRoute>
        <ManageICDCodes />
      </ProtectedRoute>
    ),
  },
  {
    path: '/activity',
    element: (
      <ProtectedRoute>
        <ActivityLog />
      </ProtectedRoute>
    ),
  },
  {
    path: '/qa',
    element: (
      <ProtectedRoute>
        <AIQA />
      </ProtectedRoute>
    ),
  },
  {
    path: '/operations',
    element: (
      <ProtectedRoute>
        <Operations />
      </ProtectedRoute>
    ),
  },
  {
    path: '/analytics',
    element: (
      <ProtectedRoute>
        <Analytics />
      </ProtectedRoute>
    ),
  },
  {
    path: '/checkin/:procedureId',
    element: (
      <ClinicalRoute>
        <CheckIn />
      </ClinicalRoute>
    ),
  },
  {
    path: '/capsule-upload/:procedureId',
    element: (
      <ClinicalRoute>
        <CapsuleUpload />
      </ClinicalRoute>
    ),
  },
  {
    path: '/viewer/:procedureId',
    element: (
      <ClinicalRoute>
        <Viewer />
      </ClinicalRoute>
    ),
  },
  {
    path: '/summary/:procedureId',
    element: (
      <ClinicalRoute>
        <Summary />
      </ClinicalRoute>
    ),
  },
  {
    // BUG-72: Changed from ClinicalRoute to ProtectedRoute so admin can view reports (read-only).
    // Report component itself handles isReadOnly for admin (hides generate/sign controls).
    // Spec PR-018 requires admin read access to signed reports.
    path: '/report/:procedureId',
    element: (
      <ProtectedRoute>
        <Report />
      </ProtectedRoute>
    ),
  },
  {
    path: '/sign-deliver/:procedureId',
    element: (
      <ClinicalRoute>
        <SignDeliver />
      </ClinicalRoute>
    ),
  },
  {
    path: '/patient/:id',
    element: (
      <ProtectedRoute>
        <PatientOverview />
      </ProtectedRoute>
    ),
  },
]);

export const Router = () => <RouterProvider router={router} />;
