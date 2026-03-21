import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, useProcedures } from '../lib/hooks';
import { Patient } from '../types/patient';
import { COLLECTIONS } from '../types/firestore-paths';
import { ProcedureStatus } from '../types/enums';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { routeByStatus } from '../lib/routeByStatus';

// BRD: ZCW-BRD-0014 — Patient overview with procedure history
export function PatientOverview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { practiceId, loading: authLoading } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const allProcedures = useProcedures();

  // BUG-46: Status filter and date sort for procedure history
  const [procStatusFilter, setProcStatusFilter] = useState<ProcedureStatus | 'all'>('all');
  const [procDateSort, setProcDateSort] = useState<'desc' | 'asc'>('desc');

  // Filter and sort procedures for this patient
  const patientProcedures = useMemo(() => {
    let procs = allProcedures.filter(p => p.patientId === id);
    if (procStatusFilter !== 'all') {
      procs = procs.filter(p => p.status === procStatusFilter);
    }
    return procs.sort((a, b) => {
      const diff = (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0);
      return procDateSort === 'desc' ? -diff : diff;
    });
  }, [allProcedures, id, procStatusFilter, procDateSort]);

  useEffect(() => {
    if (!practiceId || !id) return;

    const fetchPatient = async () => {
      try {
        setLoading(true);
        const patientRef = doc(db, COLLECTIONS.PATIENTS, id);
        const docSnap = await getDoc(patientRef);

        if (docSnap.exists() && docSnap.data().practiceId === practiceId) {
          setPatient({ ...docSnap.data(), id: docSnap.id } as Patient);
        } else {
          setError("Patient not found or access denied.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch patient data.");
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [practiceId, id]);

  if (authLoading || loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">Loading patient...</p>
          </main>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <p className="text-red-500">{error || 'Patient not found.'}</p>
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
            <button onClick={() => navigate('/patients')} className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 flex items-center gap-1">&larr; Back to Patients</button>

            <h1 className="text-3xl font-bold text-gray-900 mb-6">Patient Overview</h1>

            {/* Demographics Card — BRD ZCW-BRD-0011 */}
            <div className="bg-white shadow sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">{patient.firstName} {patient.lastName}</h3>
                <p className="mt-1 text-sm text-gray-500">MRN: {patient.mrn}</p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.dateOfBirth?.toDate?.() ? patient.dateOfBirth.toDate().toLocaleDateString() : '-'}</dd>
                  </div>
                  <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Sex</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.sex}</dd>
                  </div>
                  <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.email}</dd>
                  </div>
                  <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.phone}</dd>
                  </div>
                  <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Language</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.preferredLanguage || 'en'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Procedure History — BRD ZCW-BRD-0014, ZCW-BRD-0250 */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-lg font-medium text-gray-900">Procedure History ({patientProcedures.length})</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* BUG-46: Status filter */}
                  <select
                    value={procStatusFilter}
                    onChange={e => setProcStatusFilter(e.target.value as ProcedureStatus | 'all')}
                    className="text-xs border border-gray-300 rounded-md pl-2 pr-6 py-1.5 focus:outline-none focus:ring-indigo-500"
                  >
                    <option value="all">All Statuses</option>
                    {Object.values(ProcedureStatus).map(s => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  {/* BUG-46: Date sort toggle */}
                  <button
                    onClick={() => setProcDateSort(d => d === 'desc' ? 'asc' : 'desc')}
                    className="text-xs border border-gray-300 rounded-md px-2 py-1.5 hover:bg-gray-50"
                    title="Toggle date sort"
                  >
                    Date {procDateSort === 'desc' ? '↓ Newest' : '↑ Oldest'}
                  </button>
                  <button
                    onClick={() => navigate(`/procedures`)}
                    className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700"
                  >
                    + New Procedure
                  </button>
                </div>
              </div>
              <div className="border-t border-gray-200">
                {patientProcedures.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Study Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Urgency</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {patientProcedures.map((proc) => (
                        <tr key={proc.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">{proc.studyType?.replace(/_/g, ' ') || '-'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              proc.status === 'completed' || proc.status === 'completed_appended' ? 'bg-green-100 text-green-800' :
                              proc.status === 'ready_for_review' ? 'bg-yellow-100 text-yellow-800' :
                              proc.status === 'draft' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {proc.status?.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{proc.urgency || 'routine'}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {proc.createdAt?.toDate?.() ? proc.createdAt.toDate().toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <button
                              onClick={() => navigate(routeByStatus(proc.status, proc.id))}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-6 py-8 text-center text-gray-500">
                    No procedures found for this patient.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
