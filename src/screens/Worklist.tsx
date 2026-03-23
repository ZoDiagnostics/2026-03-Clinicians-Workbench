import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, useProcedures, usePatients } from '../lib/hooks';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { ErrorState } from '../components/ErrorState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Procedure } from '../types/procedure';
import { ProcedureStatus, UserRole, StudyType, UrgencyLevel } from '../types/enums';
import { routeByStatus } from '../lib/routeByStatus';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

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

type SortField = 'patient' | 'date' | 'status' | 'studyType' | 'urgency';
type SortDir = 'asc' | 'desc';

const SortIcon: React.FC<{ field: SortField; sortField: SortField | null; sortDir: SortDir }> = ({ field, sortField, sortDir }) => {
  if (sortField !== field) return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400 inline ml-1" />;
  return sortDir === 'asc'
    ? <ChevronUp className="h-3.5 w-3.5 text-indigo-600 inline ml-1" />
    : <ChevronDown className="h-3.5 w-3.5 text-indigo-600 inline ml-1" />;
};

// BUG-18: Filter count badge component
const FilterBadge: React.FC<{ count: number }> = ({ count }) =>
  count > 0 ? (
    <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-indigo-600 text-white text-xs font-bold">
      {count}
    </span>
  ) : null;

export const Worklist: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, practiceId } = useAuth();
  const allProcedures = useProcedures();
  const allPatients = usePatients();

  // Error + retry state
  const [screenError, setScreenError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!practiceId) return;
    setScreenError(null);
    getDocs(query(collection(db, 'procedures'), where('practiceId', '==', practiceId), limit(1)))
      .catch((err: Error) => setScreenError(err));
  }, [practiceId, retryKey]);

  // BUG-34: Persist filter state in URL query params
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilter = (searchParams.get('status') || 'all') as ProcedureStatus | 'all';
  const studyTypeFilter = (searchParams.get('studyType') || 'all') as StudyType | 'all';
  const urgencyFilter = (searchParams.get('urgency') || 'all') as UrgencyLevel | 'all'; // BUG-04: urgency filter
  const dateFrom = searchParams.get('dateFrom') || ''; // BUG-04: date range filter
  const dateTo = searchParams.get('dateTo') || '';

  // BUG-05: Sort state (not persisted to URL — too noisy)
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const patientMap = useMemo(() =>
    new Map(allPatients.map(p => [p.id, { name: `${p.firstName} ${p.lastName}`, id: p.id }])),
    [allPatients]
  );

  const isClinicianAdmin = role === UserRole.CLINICIAN_ADMIN || role === UserRole.ADMIN;

  // Helper: update a single search param
  const setParam = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === 'all' || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    });
  }, [setSearchParams]);

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
    // BUG-04: Urgency filter
    if (urgencyFilter !== 'all') {
      procedures = procedures.filter(p => p.urgency === urgencyFilter);
    }
    // BUG-04: Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      procedures = procedures.filter(p => {
        const d = p.createdAt?.toDate?.();
        return d && d >= from;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999); // end of day
      procedures = procedures.filter(p => {
        const d = p.createdAt?.toDate?.();
        return d && d <= to;
      });
    }

    // BUG-05: Sort by column
    if (sortField) {
      procedures = [...procedures].sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';
        switch (sortField) {
          case 'patient': {
            const aP = patientMap.get(a.patientId);
            const bP = patientMap.get(b.patientId);
            aVal = aP?.name || '';
            bVal = bP?.name || '';
            break;
          }
          case 'date':
            aVal = a.createdAt?.toMillis?.() || 0;
            bVal = b.createdAt?.toMillis?.() || 0;
            break;
          case 'status':
            aVal = a.status || '';
            bVal = b.status || '';
            break;
          case 'studyType':
            aVal = a.studyType || '';
            bVal = b.studyType || '';
            break;
          case 'urgency':
            aVal = a.urgency || '';
            bVal = b.urgency || '';
            break;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        }
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    } else {
      // Default: newest first
      procedures = [...procedures].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    }

    return procedures;
  }, [allProcedures, isClinicianAdmin, user?.uid, statusFilter, studyTypeFilter, urgencyFilter, dateFrom, dateTo, sortField, sortDir, patientMap]);

  // BUG-18: Count procedures matching each active filter for badge display
  const activeFilterCount = [
    statusFilter !== 'all',
    studyTypeFilter !== 'all',
    urgencyFilter !== 'all',
    !!dateFrom || !!dateTo,
  ].filter(Boolean).length;

  const handleSort = (field: SortField) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return field;
      }
      setSortDir('asc');
      return field;
    });
  };

  const handleRowClick = (procedure: Procedure) => {
    navigate(routeByStatus(procedure.status, procedure.id));
  };

  if (screenError) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <ErrorState
              title="Couldn't load worklist"
              message="There was a problem fetching your procedures. Check your connection and try again."
              onRetry={() => setRetryKey(k => k + 1)}
            />
          </main>
        </div>
      </div>
    );
  }

  if (!allProcedures.length && !allPatients.length) {
    // Show skeleton while initial data loads (before any Firestore snapshot arrives)
    const hasLoadedOnce = allProcedures.length > 0 || allPatients.length > 0;
    void hasLoadedOnce; // suppress unused variable lint
  }

  const thClass = "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none";

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Worklist</h1>
              {activeFilterCount > 0 && (
                <span className="text-sm text-gray-500">
                  {filteredProcedures.length} result{filteredProcedures.length !== 1 ? 's' : ''} with {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                </span>
              )}
            </div>

            {/* BUG-04, 18, 34: Filter UI with URL persistence and count badges */}
            <div className="bg-white rounded-lg shadow p-4 mb-6 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Status filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Status
                    <FilterBadge count={statusFilter !== 'all' ? filteredProcedures.length : 0} />
                  </label>
                  <select
                    value={statusFilter}
                    onChange={e => setParam('status', e.target.value)}
                    className="block w-full pl-3 pr-8 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                  >
                    <option value="all">All Statuses</option>
                    {Object.values(ProcedureStatus).map(s => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                {/* Study type filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Study Type
                    <FilterBadge count={studyTypeFilter !== 'all' ? filteredProcedures.length : 0} />
                  </label>
                  <select
                    value={studyTypeFilter}
                    onChange={e => setParam('studyType', e.target.value)}
                    className="block w-full pl-3 pr-8 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                  >
                    <option value="all">All Study Types</option>
                    {Object.values(StudyType).map(s => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                {/* BUG-04: Urgency filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Urgency
                    <FilterBadge count={urgencyFilter !== 'all' ? filteredProcedures.length : 0} />
                  </label>
                  <select
                    value={urgencyFilter}
                    onChange={e => setParam('urgency', e.target.value)}
                    className="block w-full pl-3 pr-8 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                  >
                    <option value="all">All Urgencies</option>
                    {Object.values(UrgencyLevel).map(u => (
                      <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                    ))}
                  </select>
                </div>

                {/* Reset filters */}
                <div className="flex items-end">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => setSearchParams({})}
                      className="w-full py-2 px-3 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Clear filters ({activeFilterCount})
                    </button>
                  )}
                </div>
              </div>

              {/* BUG-04: Date range filter */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Created From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setParam('dateFrom', e.target.value)}
                    className="block w-full pl-3 pr-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Created To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setParam('dateTo', e.target.value)}
                    className="block w-full pl-3 pr-3 py-2 text-sm border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Procedures Table with sortable columns — BUG-05 */}
            {/* overflow-x-auto: horizontal scroll on mobile so table doesn't truncate */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={thClass} onClick={() => handleSort('patient')}>
                      Patient <SortIcon field="patient" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th className={thClass} onClick={() => handleSort('studyType')}>
                      Study Type <SortIcon field="studyType" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th className={thClass} onClick={() => handleSort('urgency')}>
                      Urgency <SortIcon field="urgency" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th className={thClass} onClick={() => handleSort('status')}>
                      Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th className={thClass} onClick={() => handleSort('date')}>
                      Created <SortIcon field="date" sortField={sortField} sortDir={sortDir} />
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProcedures.map((proc) => (
                    <tr key={proc.id} onClick={() => handleRowClick(proc)} className="cursor-pointer hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-medium text-indigo-600">
                        {patientMap.get(proc.patientId)?.name || 'Unknown Patient'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {proc.studyType?.replace(/_/g, ' ') || '-'}
                      </td>
                      <td className="px-4 py-4">
                        <UrgencyBadge urgency={proc.urgency as UrgencyLevel} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={proc.status as ProcedureStatus} />
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {proc.createdAt?.toDate?.()?.toLocaleDateString() || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
