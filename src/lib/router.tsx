import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
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

export const router = createBrowserRouter([
  { path: '/', element: <Dashboard /> },
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/worklist', element: <Worklist /> },
  { path: '/patients', element: <Patients /> },
  { path: '/procedures', element: <Procedures /> },
  { path: '/reports-hub', element: <ReportsHub /> },
  { path: '/education', element: <Education /> },
  { path: '/admin', element: <Admin /> },
  { path: '/activity', element: <ActivityLog /> },
  { path: '/qa', element: <AIQA /> },
  { path: '/operations', element: <Operations /> },
  { path: '/analytics', element: <Analytics /> },
  { path: '/checkin', element: <CheckIn /> },
  { path: '/capsule-upload', element: <CapsuleUpload /> },
  { path: '/viewer', element: <Viewer /> },
  { path: '/summary', element: <Summary /> },
  { path: '/report', element: <Report /> },
  { path: '/sign-deliver', element: <SignDeliver /> },
  { path: '/patient/:id', element: <PatientOverview /> },
]);

export const Router = () => <RouterProvider router={router} />;
