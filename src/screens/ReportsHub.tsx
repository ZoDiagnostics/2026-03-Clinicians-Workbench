import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useProcedures, usePatients } from '../lib/hooks';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

export const ReportsHub: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const procedures = useProcedures();
  const allPatients = usePatients();

  const patientMap = useMemo(() =>
    new Map(allPatients.map(p => [p.id, `${p.firstName} ${p.lastName}`])),
    [allPatients]
  );

  // Show procedures that have reports (completed, closed, or draft status)
  const reportableProcedures = procedures.filter(p =>
    ['draft', 'appended_draft', 'completed', 'completed_appended', 'closed'].includes(p.status)
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Reports Hub</h1>
            <p className="text-sm text-gray-500 mb-6">View and manage reports for completed and in-progress procedures.</p>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Study Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportableProcedures.map((proc) => (
                    <tr key={proc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {patientMap.get(proc.patientId) || 'Unknown Patient'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {proc.studyType?.replace(/_/g, ' ') || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          proc.status === 'completed' || proc.status === 'completed_appended'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {proc.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => navigate(`/report/${proc.id}`)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          View Report
                        </button>
                        {(proc.status === 'completed' || proc.status === 'completed_appended') && (
                          <button
                            onClick={() => navigate(`/summary/${proc.id}`)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Summary
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {reportableProcedures.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        No reports available. Complete a procedure review to generate a report.
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

export default ReportsHub;
