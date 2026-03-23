import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/hooks';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { ErrorState } from '../components/ErrorState';

interface AuditEntry {
  id: string;
  event: string;
  entity: string;
  details: string;
  userId: string;
  userName: string;
  timestamp: any;
}

const eventColors: Record<string, string> = {
  'procedure.created': 'bg-blue-100 text-blue-800',
  'procedure.status_changed': 'bg-yellow-100 text-yellow-800',
  'procedure.checkin': 'bg-green-100 text-green-800',
  'report.signed': 'bg-indigo-100 text-indigo-800',
  'report.delivered': 'bg-purple-100 text-purple-800',
  'finding.created': 'bg-orange-100 text-orange-800',
  'user.login': 'bg-gray-100 text-gray-800',
  'user.role_changed': 'bg-red-100 text-red-800',
};

export const ActivityLog: React.FC = () => {
  const { practiceId, role } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // UX-09: User filter
  const [selectedUser, setSelectedUser] = useState('');
  // UX-10: Date range filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // BUG-09/49: Role gate — only admin and clinician_admin may view the activity log
  const hasAccess = role === 'admin' || role === 'clinician_admin';

  useEffect(() => {
    if (!practiceId) return;
    setFetchError(null);
    setLoading(true);

    const auditRef = collection(db, `practices/${practiceId}/auditLog`);
    const q = query(auditRef, orderBy('timestamp', 'desc'), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditEntry));
        setEntries(data);
        setLoading(false);
      },
      (err: Error) => {
        console.error('ActivityLog fetch error:', err);
        setFetchError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [practiceId, retryKey]);

  if (!hasAccess) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">The Activity Log is restricted to administrators and clinician administrators.</p>
              <p className="text-sm text-gray-500 mt-1">Your current role: <span className="font-medium">{role || 'unknown'}</span></p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <ErrorState
              title="Couldn't load activity log"
              message="There was a problem fetching audit log entries. Check your connection and try again."
              onRetry={() => setRetryKey(k => k + 1)}
            />
          </main>
        </div>
      </div>
    );
  }

  // UX-09 + UX-10: Derive unique user list and apply combined filters (client-side on fetched 50)
  const uniqueUsers = [...new Set(entries.map(l => l.userName).filter(Boolean))];

  let filteredLogs = entries;
  if (selectedUser) filteredLogs = filteredLogs.filter(l => l.userName === selectedUser);
  if (dateFrom) filteredLogs = filteredLogs.filter(l =>
    new Date(l.timestamp?.toDate?.() || l.timestamp) >= new Date(dateFrom)
  );
  if (dateTo) filteredLogs = filteredLogs.filter(l =>
    new Date(l.timestamp?.toDate?.() || l.timestamp) <= new Date(dateTo + 'T23:59:59')
  );

  const hasActiveFilters = selectedUser !== '' || dateFrom !== '' || dateTo !== '';

  const clearFilters = () => {
    setSelectedUser('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Activity Log</h1>

            {/* UX-09 + UX-10: Filter row */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {/* UX-09: User filter dropdown */}
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-sm"
                aria-label="Filter by user"
              >
                <option value="">All Users</option>
                {uniqueUsers.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              {/* UX-10: Date range inputs */}
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                From
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-sm"
                />
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                To
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-white rounded px-3 py-1.5 text-sm"
                />
              </label>

              {/* Clear filters button */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
                >
                  Clear Filters
                </button>
              )}

              {/* Entry count */}
              <span className="text-xs text-gray-400 ml-auto">
                Showing {filteredLogs.length} of {entries.length} entries
              </span>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">Loading activity log...</td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        {entries.length === 0 ? 'No activity recorded yet.' : 'No entries match the current filters.'}
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.timestamp?.toDate?.() ? entry.timestamp.toDate().toLocaleString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${eventColors[entry.event] || 'bg-gray-100 text-gray-800'}`}>
                            {entry.event}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.userName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {entry.details}
                        </td>
                      </tr>
                    ))
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
