import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/hooks';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

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
  const { practiceId } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!practiceId) return;

    const auditRef = collection(db, `practices/${practiceId}/auditLog`);
    const q = query(auditRef, orderBy('timestamp', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditEntry));
      setEntries(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [practiceId]);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Activity Log</h1>

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
                  ) : entries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">No activity recorded yet.</td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
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
