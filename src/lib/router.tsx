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
import { ActivityLog } from '../screens/ActivityLog';
import { AIQA } from '../screens/AIQA';
import { Operations } from '../screens/Operations';
import { Analytics } from '../screens/Analytics';
import { CheckIn } from '../screens/CheckIn';
import { CapsuleUpload } from '../screens/CapsuleUpload';
import { Viewer } from '../screens/Viewer';
import { Summary } from '../screens/Summary';
import { Report } from '../screens/Report';
import { SignDeliver } from '../screens/SignDeliver';
import { PatientOverview } from '../screens/PatientOverview';
import LoginScreen from '../screens/Login';
import { useAuth } from './hooks';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
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
    path: '/checkin',
    element: (
      <ProtectedRoute>
        <CheckIn />
      </ProtectedRoute>
    ),
  },
  {
    path: '/capsule-upload',
    element: (
      <ProtectedRoute>
        <CapsuleUpload />
      </ProtectedRoute>
    ),
  },
  {
    path: '/viewer',
    element: (
      <ProtectedRoute>
        <Viewer />
      </ProtectedRoute>
    ),
  },
  {
    path: '/summary',
    element: (
      <ProtectedRoute>
        <Summary />
      </ProtectedRoute>
    ),
  },
  {
    path: '/report',
    element: (
      <ProtectedRoute>
        <Report />
      </ProtectedRoute>
    ),
  },
  {
    path: '/sign-deliver',
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
