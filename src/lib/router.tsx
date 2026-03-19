import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
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

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (!user) {
    return <Navigate to="/login" replace />;
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
      <ProtectedRoute>
        <CheckIn />
      </ProtectedRoute>
    ),
  },
  {
    path: '/capsule-upload/:procedureId',
    element: (
      <ProtectedRoute>
        <CapsuleUpload />
      </ProtectedRoute>
    ),
  },
  {
    path: '/viewer/:procedureId',
    element: (
      <ProtectedRoute>
        <Viewer />
      </ProtectedRoute>
    ),
  },
  {
    path: '/summary/:procedureId',
    element: (
      <ProtectedRoute>
        <Summary />
      </ProtectedRoute>
    ),
  },
  {
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
      <ProtectedRoute>
        <SignDeliver />
      </ProtectedRoute>
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
