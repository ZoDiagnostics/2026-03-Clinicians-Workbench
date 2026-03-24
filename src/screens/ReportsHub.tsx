import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, useProcedures, usePatients } from '../lib/hooks';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { ErrorState } from '../components/ErrorState';

export const ReportsHub: React.FC = () => {
  const navigate = useNavigate();
  const { user, practiceId } = useAuth();
  const procedures = useProcedures();
  const allPatients = usePatients();

  const [screenError, setScreenError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!practiceId) return;
    setScreenError(null);
    getDocs(query(collection(db, 'procedures'), where('practiceId', '==', practiceId), limit(1)))
      .catch((err: Error) => setScreenError(err));
  }, [practiceId, retryKey]);

  const patientMap = useMemo(() =>
    new Map(allPatients.map(p => [p.id, `${p.firstName} ${p.lastName}`])),
    [allPatients]
  );

  // Show procedures that have reports (completed, closed, or draft status)
  const reportableProcedures = procedures.filter(p =>
    ['draft', 'appended_draft', 'completed', 'completed_appended', 'closed'].includes(p.status)
  );

  // Compute filter counts
  const pendingCount = reportableProcedures.filter(p =>
    ['draft', 'appended_draft'].includes(p.status)
  ).length;

  const signedCount = reportableProcedures.filter(p =>
    ['completed', 'completed_appended'].includes(p.status)
  ).length;

  const overdueCount = reportableProcedures.filter(p =>
    p.status === 'draft' && Date.now() - p.createdAt.toDate().getTime() > 14 * 24 * 60 * 60 * 1000
  ).length;

  const allCount = reportableProcedures.length;

  // Filter procedures based on active filter
  const filteredProcedures = useMemo(() => {
    if (!activeFilter || activeFilter === 'all') return reportableProcedures;
    if (activeFilter === 'pending') {
      return reportableProcedures.filter(p =>
        ['draft', 'appended_draft'].includes(p.status)
      );
    }
    if (activeFilter === 'signed') {
      return reportableProcedures.filter(p =>
        ['completed', 'completed_appended'].includes(p.status)
      );
    }
    if (activeFilter === 'overdue') {
      return reportableProcedures.filter(p =>
        p.status === 'draft' && Date.now() - p.createdAt.toDate().getTime() > 14 * 24 * 60 * 60 * 1000
      );
    }
    return reportableProcedures;
  }, [reportableProcedures, activeFilter]);

  if (screenError) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <ErrorState
              title="Couldn't load reports"
              message="There was a problem fetching reports. Check your connection and try again."
              onRetry={() => setRetryKey(k => k + 1)}
            />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Reports Hub</h1>
            <p className="text-sm text-gray-500 mb-6">View and manage reports for completed and in-progress procedures.</p>

            {/* Filter Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Pending Reports Card */}
              <div
                onClick={() => setActiveFilter('pending')}
                className={`bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-indigo-500 ${
                  activeFilter === 'pending' ? 'ring-2 ring-indigo-500' : ''
                }`}
              >
                <h3 className="text-sm font-medium text-gray-500">Pending Reports</h3>
                <p className="mt-2 text-3xl font-bold text-indigo-600">{pendingCount}</p>
              </div>

              {/* Signed Reports Card */}
              <div
                onClick={() => setActiveFilter('signed')}
                className={`bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-green-500 ${
                  activeFilter === 'signed' ? 'ring-2 ring-indigo-500' : ''
                }`}
              >
                <h3 className="text-sm font-medium text-gray-500">Signed Reports</h3>
                <p className="mt-2 text-3xl font-bold text-green-600">{signedCount}</p>
              </div>

              {/* Overdue Reports Card */}
              <div
                onClick={() => setActiveFilter('overdue')}
                className={`bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-red-500 ${
                  activeFilter === 'overdue' ? 'ring-2 ring-indigo-500' : ''
                }`}
              >
                <h3 className="text-sm font-medium text-gray-500">Overdue Reports</h3>
                <p className="mt-2 text-3xl font-bold text-red-600">{overdueCount}</p>
              </div>

              {/* All Reports Card */}
              <div
                onClick={() => setActiveFilter('all')}
                className={`bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-gray-500 ${
                  activeFilter === 'all' ? 'ring-2 ring-indigo-500' : ''
                }`}
              >
                <h3 className="text-sm font-medium text-gray-500">All Reports</h3>
                <p className="mt-2 text-3xl font-bold text-gray-900">{allCount}</p>
              </div>
            </div>

            {/* Clear Filter Button */}
            {activeFilter && (
              <button
                onClick={() => setActiveFilter(null)}
                className="text-sm text-indigo-600 hover:text-indigo-800 mb-4"
              >
                Clear filter
              </button>
            )}

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
                  {filteredProcedures.map((proc) => (
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
                  {filteredProcedures.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        {activeFilter ? 'No reports match this filter.' : 'No reports available. Complete a procedure review to generate a report.'}
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
