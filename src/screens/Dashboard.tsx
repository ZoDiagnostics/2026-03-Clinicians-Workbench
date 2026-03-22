import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth, useProcedures, usePatients } from '../lib/hooks';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { Procedure } from '../types/procedure';
import { ProcedureStatus, UserRole } from '../types/enums';
import { routeByStatus } from '../lib/routeByStatus';

// A simple stat card component
const StatCard: React.FC<{ title: string; value: number | string; }> = ({ title, value }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
  </div>
);

// A simple procedure status badge component
const StatusBadge: React.FC<{ status: ProcedureStatus }> = ({ status }) => {
    const statusStyles: Record<ProcedureStatus, string> = {
        capsule_return_pending: 'bg-yellow-100 text-yellow-800',
        capsule_received: 'bg-blue-100 text-blue-800',
        ready_for_review: 'bg-green-100 text-green-800',
        draft: 'bg-indigo-100 text-indigo-800',
        appended_draft: 'bg-purple-100 text-purple-800',
        completed: 'bg-gray-100 text-gray-800',
        completed_appended: 'bg-gray-100 text-gray-800',
        closed: 'bg-gray-100 text-gray-800',
        void: 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
            {status.replace(/_/g, ' ')}
        </span>
    );
};


export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const allProcedures = useProcedures();
  const allPatients = usePatients();

  const patientMap = useMemo(() =>
    new Map(allPatients.map(p => [p.id, `${p.firstName} ${p.lastName}`])),
    [allPatients]
  );

  const isClinicianAdmin = role === UserRole.CLINICIAN_ADMIN || role === UserRole.ADMIN;

  const myProcedures = isClinicianAdmin
    ? allProcedures
    : allProcedures.filter(p => p.assignedClinicianId === user?.uid);

  const awaitingReviewCount = myProcedures.filter(p =>
    p.status === ProcedureStatus.READY_FOR_REVIEW || p.status === ProcedureStatus.APPENDED_DRAFT
  ).length;

  const inProgressCount = myProcedures.filter(p => p.status === ProcedureStatus.DRAFT).length;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const completedThisWeekCount = allProcedures.filter(p => {
    const signedAtDate = p.signedAt?.toDate();
    const isCompleted = p.status === ProcedureStatus.COMPLETED || p.status === ProcedureStatus.COMPLETED_APPENDED;
    const signedRecently = signedAtDate && signedAtDate > sevenDaysAgo;
    
    if (isClinicianAdmin) {
        return isCompleted && signedRecently;
    }
    return isCompleted && signedRecently && p.signedBy === user?.uid;
  }).length;
  
  const proceduresForRecentList = isClinicianAdmin ? allProcedures : myProcedures;
  const recentProcedures = proceduresForRecentList
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
    .slice(0, 5);

  const handleStartNextReview = () => {
    const nextProcedure = myProcedures
      .filter(p => p.status === ProcedureStatus.READY_FOR_REVIEW)
      .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis())[0];

    if (nextProcedure) {
      navigate(routeByStatus(nextProcedure.status, nextProcedure.id));
    } else {
      alert('No studies awaiting review.');
    }
  };
  
  const handleProcedureClick = (proc: Procedure) => {
    navigate(routeByStatus(proc.status, proc.id));
  }
  

  // TODO: Create a `usePatients` hook to get patient names
  // For now, we will display patient IDs.

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">
                Dashboard
                </h1>
                <button
                    onClick={handleStartNextReview}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Start Next Review
                </button>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <StatCard title="Awaiting Review" value={awaitingReviewCount} />
              <StatCard title="In Progress" value={inProgressCount} />
              <StatCard title="Completed This Week" value={completedThisWeekCount} />
            </div>

            {/* Recent Procedures Table */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul role="list" className="divide-y divide-gray-200">
                  {recentProcedures.map((proc) => (
                    <li key={proc.id} className="cursor-pointer hover:bg-gray-50" onClick={() => handleProcedureClick(proc)}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            {patientMap.get(proc.patientId) || 'Unknown Patient'}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <StatusBadge status={proc.status} />
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              {proc.studyType.replace(/_/g, ' ')}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <p>
                              Created on {proc.createdAt.toDate().toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                {recentProcedures.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No recent procedures.
                    </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
