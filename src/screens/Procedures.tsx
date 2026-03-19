import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useProcedures, usePatients } from '../lib/hooks';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { ProcedureStatus } from '../types/enums';
import { routeByStatus } from '../lib/routeByStatus';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
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
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

export const Procedures: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const procedures = useProcedures();
  const allPatients = usePatients();

  const patientMap = useMemo(() =>
    new Map(allPatients.map(p => [p.id, `${p.firstName} ${p.lastName}`])),
    [allPatients]
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">All Procedures</h1>
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Study Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {procedures.map((proc) => (
                    <tr
                      key={proc.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(routeByStatus(proc.status, proc.id))}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {patientMap.get(proc.patientId) || 'Unknown Patient'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {proc.studyType?.replace(/_/g, ' ') || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={proc.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {proc.createdAt?.toDate?.() ? proc.createdAt.toDate().toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                  {procedures.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        No procedures found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Procedures;
