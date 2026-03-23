import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useProcedures, usePatients, useAuth } from '../lib/hooks';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { ErrorState } from '../components/ErrorState';

// BUG-50: BarChart with optional drill-down navigation per bar
const BarChart: React.FC<{
  title: string;
  data: Record<string, number>;
  color: string;
  onBarClick?: (label: string) => void;
}> = ({ title, data, color, onBarClick }) => {
  const max = Math.max(...Object.values(data), 1);
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
      <div className="space-y-3">
        {Object.entries(data).map(([label, count]) => (
          <div
            key={label}
            className={`flex items-center gap-3 ${onBarClick ? 'cursor-pointer group' : ''}`}
            onClick={() => onBarClick?.(label)}
            title={onBarClick ? `Click to drill down: ${label}` : undefined}
          >
            <div className="w-36 text-sm text-gray-600 text-right truncate group-hover:text-indigo-600 transition-colors" title={label}>{label}</div>
            <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
              <div
                className={`${color} h-6 rounded-full flex items-center justify-end pr-2 transition-opacity group-hover:opacity-90`}
                style={{ width: `${Math.max((count / max) * 100, 12)}%` }}
              >
                <span className="text-white text-xs font-semibold">{count}</span>
              </div>
            </div>
            {onBarClick && (
              <span className="text-xs text-gray-400 group-hover:text-indigo-500 transition-colors">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const { practiceId } = useAuth();
  const procedures = useProcedures();
  const patients = usePatients();

  const [screenError, setScreenError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!practiceId) return;
    setScreenError(null);
    getDocs(query(collection(db, 'procedures'), where('practiceId', '==', practiceId), limit(1)))
      .catch((err: Error) => setScreenError(err));
  }, [practiceId, retryKey]);

  const stats = useMemo(() => {
    const studyTypes: Record<string, number> = {};
    const statuses: Record<string, number> = {};
    const urgencies: Record<string, number> = {};

    procedures.forEach(p => {
      const type = p.studyType?.replace(/_/g, ' ') || 'Unknown';
      studyTypes[type] = (studyTypes[type] || 0) + 1;
      const status = p.status?.replace(/_/g, ' ') || 'Unknown';
      statuses[status] = (statuses[status] || 0) + 1;
      const urgency = p.urgency || 'unknown';
      urgencies[urgency] = (urgencies[urgency] || 0) + 1;
    });

    const sexDistribution: Record<string, number> = {};
    patients.forEach(p => {
      const sex = p.sex || 'unknown';
      sexDistribution[sex] = (sexDistribution[sex] || 0) + 1;
    });

    return { studyTypes, statuses, urgencies, sexDistribution };
  }, [procedures, patients]);

  if (screenError) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <ErrorState
              title="Couldn't load analytics"
              message="There was a problem fetching analytics data. Check your connection and try again."
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Workbench</h1>
            <p className="text-sm text-gray-500 mb-6">Procedure and patient analytics for your practice.</p>

            {/* BUG-50: KPI cards with drill-down navigation */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <button
                onClick={() => navigate('/worklist')}
                className="bg-white p-6 rounded-lg shadow-md text-center hover:shadow-lg hover:ring-2 hover:ring-indigo-200 transition-all group"
              >
                <p className="text-3xl font-bold text-indigo-600">{procedures.length}</p>
                <p className="text-sm text-gray-500">Total Procedures</p>
                <p className="text-xs text-indigo-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">View worklist →</p>
              </button>
              <button
                onClick={() => navigate('/patients')}
                className="bg-white p-6 rounded-lg shadow-md text-center hover:shadow-lg hover:ring-2 hover:ring-green-200 transition-all group"
              >
                <p className="text-3xl font-bold text-green-600">{patients.length}</p>
                <p className="text-sm text-gray-500">Total Patients</p>
                <p className="text-xs text-green-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">View patients →</p>
              </button>
              <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <p className="text-3xl font-bold text-blue-600">
                  {procedures.length > 0 ? (procedures.length / Math.max(patients.length, 1)).toFixed(1) : '0'}
                </p>
                <p className="text-sm text-gray-500">Procedures / Patient</p>
              </div>
              <button
                onClick={() => navigate('/worklist?urgency=urgent')}
                className="bg-white p-6 rounded-lg shadow-md text-center hover:shadow-lg hover:ring-2 hover:ring-yellow-200 transition-all group"
              >
                <p className="text-3xl font-bold text-yellow-600">{stats.urgencies['urgent'] || 0}</p>
                <p className="text-sm text-gray-500">Urgent Cases</p>
                <p className="text-xs text-yellow-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">View urgent cases →</p>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BarChart
                title="Procedures by Study Type"
                data={stats.studyTypes}
                color="bg-indigo-500"
                onBarClick={(label) => navigate(`/worklist?studyType=${label.replace(/ /g, '_')}`)}
              />
              <BarChart
                title="Procedures by Status"
                data={stats.statuses}
                color="bg-green-500"
                onBarClick={(label) => navigate(`/worklist?status=${label.replace(/ /g, '_')}`)}
              />
              <BarChart title="Urgency Distribution" data={stats.urgencies} color="bg-yellow-500"
                onBarClick={(label) => navigate(`/worklist?urgency=${label}`)}
              />
              <BarChart title="Patient Demographics (Sex)" data={stats.sexDistribution} color="bg-blue-500" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
