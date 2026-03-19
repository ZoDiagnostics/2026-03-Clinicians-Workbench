import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useProcedures, usePatients } from '../lib/hooks';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { Procedure } from '../types/procedure';
import { ProcedureStatus, UserRole, StudyType, UrgencyLevel } from '../types/enums';
import { routeByStatus } from '../lib/routeByStatus';

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

const UrgencyBadge: React.FC<{ urgency: UrgencyLevel }> = ({ urgency }) => {
    const urgencyStyles: Record<UrgencyLevel, string> = {
        routine: 'bg-gray-200 text-gray-800',
        urgent: 'bg-amber-500 text-white',
        emergent: 'bg-red-600 text-white',
    };
    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${urgencyStyles[urgency] || 'bg-gray-200 text-gray-800'}`}>
            {urgency}
        </span>
    );
};

export const Worklist: React.FC = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const allProcedures = useProcedures();
  const allPatients = usePatients();

  const patientMap = useMemo(() =>
    new Map(allPatients.map(p => [p.id, `${p.firstName} ${p.lastName}`])),
    [allPatients]
  );

  const [statusFilter, setStatusFilter] = useState<ProcedureStatus | 'all'>('all');
  const [studyTypeFilter, setStudyTypeFilter] = useState<StudyType | 'all'>('all');

  const isClinicianAdmin = role === UserRole.CLINICIAN_ADMIN || role === UserRole.ADMIN;

  const filteredProcedures = useMemo(() => {
    let procedures = isClinicianAdmin
      ? allProcedures
      : allProcedures.filter(p => p.assignedClinicianId === user?.uid);

    if (statusFilter !== 'all') {
      procedures = procedures.filter(p => p.status === statusFilter);
    }
    if (studyTypeFilter !== 'all') {
      procedures = procedures.filter(p => p.studyType === studyTypeFilter);
    }

    return procedures.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }, [allProcedures, isClinicianAdmin, user?.uid, statusFilter, studyTypeFilter]);

  const handleRowClick = (procedure: Procedure) => {
    navigate(routeByStatus(procedure.status, procedure.id));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Worklist</h1>
            
            {/* Filter UI */}
            <div className="flex space-x-4 mb-6">
              <div className="flex-1">
                  <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">Status</label>
                  <select 
                    id="status-filter"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as ProcedureStatus | 'all')}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                      <option value="all">All</option>
                      {Object.values(ProcedureStatus).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
              </div>
              <div className="flex-1">
                <label htmlFor="study-type-filter" className="block text-sm font-medium text-gray-700">Study Type</label>
                  <select 
                    id="study-type-filter"
                    value={studyTypeFilter}
                    onChange={e => setStudyTypeFilter(e.target.value as StudyType | 'all')}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                      <option value="all">All</option>
                      {Object.values(StudyType).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
              </div>
            </div>

            {/* Procedures Table */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul role="list" className="divide-y divide-gray-200">
                {filteredProcedures.map((proc) => (
                  <li key={proc.id} onClick={() => handleRowClick(proc)} className="cursor-pointer hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {patientMap.get(proc.patientId) || 'Unknown Patient'}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex space-x-2">
                          <UrgencyBadge urgency={proc.urgency} />
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
              {filteredProcedures.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                      No procedures match the selected filters.
                  </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Worklist;
