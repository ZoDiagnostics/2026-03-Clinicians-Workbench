import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, addDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, useProcedures } from '../lib/hooks';
import { Patient } from '../types/patient';
import { COLLECTIONS } from '../types/firestore-paths';
import { ProcedureStatus, UserRole } from '../types/enums';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { ErrorState } from '../components/ErrorState';
import { routeByStatus } from '../lib/routeByStatus';

// BRD: ZCW-BRD-0014 — Patient overview with procedure history
export function PatientOverview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { practiceId, loading: authLoading, role } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const allProcedures = useProcedures();

  // BUG-46: Status filter and date sort for procedure history
  const [procStatusFilter, setProcStatusFilter] = useState<ProcedureStatus | 'all'>('all');
  const [procDateSort, setProcDateSort] = useState<'desc' | 'asc'>('desc');

  // Tab navigation
  const [activeTab, setActiveTab] = useState('overview');

  // BUG-44: Editable demographics
  const [editingDemographics, setEditingDemographics] = useState(false);
  const [demoForm, setDemoForm] = useState<{ firstName: string; lastName: string; email: string; phone: string }>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  // BUG-45: Medical History, Medications, Allergies
  const [medHistory, setMedHistory] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [allergies, setAllergies] = useState<any[]>([]);
  const [medHistoryForm, setMedHistoryForm] = useState({ name: '', notes: '' });
  const [medicationsForm, setMedicationsForm] = useState({ name: '', notes: '' });
  const [allergiesForm, setAllergiesForm] = useState({ name: '', notes: '' });
  const [loadingMedHistory, setLoadingMedHistory] = useState(false);
  const [loadingMedications, setLoadingMedications] = useState(false);
  const [loadingAllergies, setLoadingAllergies] = useState(false);

  // BUG-47: Reports
  const [signedReports, setSignedReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // BUG-48: Activity Log
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

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
          const patientData = { ...docSnap.data(), id: docSnap.id } as Patient;
          setPatient(patientData);
          // Initialize demographics form
          setDemoForm({
            firstName: patientData.firstName || '',
            lastName: patientData.lastName || '',
            email: patientData.email || '',
            phone: patientData.phone || '',
          });
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

  // Fetch medical history when tab changes
  useEffect(() => {
    if (activeTab === 'medical_history' && id) {
      fetchMedicalHistory();
    }
  }, [activeTab, id]);

  // Fetch medications when tab changes
  useEffect(() => {
    if (activeTab === 'medications' && id) {
      fetchMedications();
    }
  }, [activeTab, id]);

  // Fetch allergies when tab changes
  useEffect(() => {
    if (activeTab === 'allergies' && id) {
      fetchAllergies();
    }
  }, [activeTab, id]);

  // Fetch signed reports when tab changes
  useEffect(() => {
    if (activeTab === 'reports' && id) {
      fetchSignedReports();
    }
  }, [activeTab, id]);

  // Fetch activity log when tab changes
  useEffect(() => {
    if (activeTab === 'activity' && id) {
      fetchActivityLog();
    }
  }, [activeTab, id]);

  // BUG-45: Medical History CRUD
  const fetchMedicalHistory = async () => {
    if (!id) return;
    try {
      setLoadingMedHistory(true);
      const medHistRef = collection(db, COLLECTIONS.PATIENTS, id, 'medicalHistory');
      const snapshot = await getDocs(medHistRef);
      setMedHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error fetching medical history:', err);
    } finally {
      setLoadingMedHistory(false);
    }
  };

  const addMedicalHistory = async () => {
    if (!id || !medHistoryForm.name.trim()) return;
    try {
      const medHistRef = collection(db, COLLECTIONS.PATIENTS, id, 'medicalHistory');
      await addDoc(medHistRef, {
        ...medHistoryForm,
        createdAt: serverTimestamp(),
      });
      setMedHistoryForm({ name: '', notes: '' });
      await fetchMedicalHistory();
    } catch (err) {
      console.error('Error adding medical history:', err);
    }
  };

  const deleteMedicalHistory = async (itemId: string) => {
    if (!id) return;
    try {
      const medHistRef = doc(db, COLLECTIONS.PATIENTS, id, 'medicalHistory', itemId);
      await deleteDoc(medHistRef);
      await fetchMedicalHistory();
    } catch (err) {
      console.error('Error deleting medical history:', err);
    }
  };

  // BUG-45: Medications CRUD
  const fetchMedications = async () => {
    if (!id) return;
    try {
      setLoadingMedications(true);
      const medRef = collection(db, COLLECTIONS.PATIENTS, id, 'medications');
      const snapshot = await getDocs(medRef);
      setMedications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error fetching medications:', err);
    } finally {
      setLoadingMedications(false);
    }
  };

  const addMedication = async () => {
    if (!id || !medicationsForm.name.trim()) return;
    try {
      const medRef = collection(db, COLLECTIONS.PATIENTS, id, 'medications');
      await addDoc(medRef, {
        ...medicationsForm,
        createdAt: serverTimestamp(),
      });
      setMedicationsForm({ name: '', notes: '' });
      await fetchMedications();
    } catch (err) {
      console.error('Error adding medication:', err);
    }
  };

  const deleteMedication = async (itemId: string) => {
    if (!id) return;
    try {
      const medRef = doc(db, COLLECTIONS.PATIENTS, id, 'medications', itemId);
      await deleteDoc(medRef);
      await fetchMedications();
    } catch (err) {
      console.error('Error deleting medication:', err);
    }
  };

  // BUG-45: Allergies CRUD
  const fetchAllergies = async () => {
    if (!id) return;
    try {
      setLoadingAllergies(true);
      const allergyRef = collection(db, COLLECTIONS.PATIENTS, id, 'allergies');
      const snapshot = await getDocs(allergyRef);
      setAllergies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error fetching allergies:', err);
    } finally {
      setLoadingAllergies(false);
    }
  };

  const addAllergy = async () => {
    if (!id || !allergiesForm.name.trim()) return;
    try {
      const allergyRef = collection(db, COLLECTIONS.PATIENTS, id, 'allergies');
      await addDoc(allergyRef, {
        ...allergiesForm,
        createdAt: serverTimestamp(),
      });
      setAllergiesForm({ name: '', notes: '' });
      await fetchAllergies();
    } catch (err) {
      console.error('Error adding allergy:', err);
    }
  };

  const deleteAllergy = async (itemId: string) => {
    if (!id) return;
    try {
      const allergyRef = doc(db, COLLECTIONS.PATIENTS, id, 'allergies', itemId);
      await deleteDoc(allergyRef);
      await fetchAllergies();
    } catch (err) {
      console.error('Error deleting allergy:', err);
    }
  };

  // BUG-47: Signed Reports
  const fetchSignedReports = async () => {
    if (!id) return;
    try {
      setLoadingReports(true);
      // Query procedures for this patient that are completed/closed and should have reports
      const procRef = collection(db, 'procedures');
      const procQuery = query(
        procRef,
        where('patientId', '==', id),
        where('status', 'in', ['completed', 'completed_appended', 'closed'])
      );
      const procSnapshot = await getDocs(procQuery);
      const reportsList = procSnapshot.docs.map(doc => ({
        id: doc.id,
        procedureId: doc.id,
        studyType: doc.data().studyType,
        createdAt: doc.data().createdAt,
        status: doc.data().status,
      }));
      setSignedReports(reportsList);
    } catch (err) {
      console.error('Error fetching signed reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  // BUG-48: Activity Log
  const fetchActivityLog = async () => {
    if (!id) return;
    try {
      setLoadingActivity(true);
      const auditRef = collection(db, 'auditLog');
      const auditQuery = query(
        auditRef,
        where('entity', '==', id),
        orderBy('timestamp', 'desc'),
        limit(50)
      );
      const auditSnapshot = await getDocs(auditQuery);
      setActivityLog(auditSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error fetching activity log:', err);
      setActivityLog([]);
    } finally {
      setLoadingActivity(false);
    }
  };

  // BUG-44: Save demographics
  const saveDemographics = async () => {
    if (!id) return;
    try {
      const patientRef = doc(db, COLLECTIONS.PATIENTS, id);
      await updateDoc(patientRef, {
        ...demoForm,
        updatedAt: serverTimestamp(),
      });
      setPatient(prev => prev ? { ...prev, ...demoForm } : null);
      setEditingDemographics(false);
    } catch (err) {
      console.error('Error saving demographics:', err);
    }
  };

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

  if (error || (!loading && !patient)) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <ErrorState
              title="Patient not found"
              message={error || 'This patient record could not be loaded. It may have been removed or you may not have access.'}
              onRetry={() => window.location.reload()}
            />
          </main>
        </div>
      </div>
    );
  }

  // Narrowing guard: error/null cases are handled above; patient is non-null here
  if (!patient) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <button onClick={() => navigate('/patients')} className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 flex items-center gap-1">&larr; Back to Patients</button>

            <h1 className="text-3xl font-bold text-gray-900 mb-6">Patient Overview</h1>

            {/* Demographics Card — BRD ZCW-BRD-0011, BUG-44 */}
            <div className="bg-white shadow sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{patient.firstName} {patient.lastName}</h3>
                  <p className="mt-1 text-sm text-gray-500">MRN: {patient.mrn}</p>
                </div>
                {!editingDemographics && [UserRole.CLINICIAN_AUTH, UserRole.CLINICIAN_ADMIN, UserRole.ADMIN].includes(role!) && (
                  <button
                    onClick={() => setEditingDemographics(true)}
                    className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700"
                  >
                    Edit
                  </button>
                )}
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
                    {editingDemographics ? (
                      <dd className="mt-1 sm:mt-0 sm:col-span-2">
                        <input
                          type="email"
                          value={demoForm.email}
                          onChange={e => setDemoForm(prev => ({ ...prev, email: e.target.value }))}
                          className="border border-gray-300 rounded-md px-2 py-1 text-sm w-full"
                        />
                      </dd>
                    ) : (
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.email}</dd>
                    )}
                  </div>
                  <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    {editingDemographics ? (
                      <dd className="mt-1 sm:mt-0 sm:col-span-2">
                        <input
                          type="tel"
                          value={demoForm.phone}
                          onChange={e => setDemoForm(prev => ({ ...prev, phone: e.target.value }))}
                          className="border border-gray-300 rounded-md px-2 py-1 text-sm w-full"
                        />
                      </dd>
                    ) : (
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.phone}</dd>
                    )}
                  </div>
                  <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Language</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.preferredLanguage || 'en'}</dd>
                  </div>
                </dl>
              </div>
              {editingDemographics && (
                <div className="bg-gray-50 px-4 py-3 sm:px-6 flex gap-2 justify-end border-t border-gray-200">
                  <button
                    onClick={() => {
                      setEditingDemographics(false);
                      setDemoForm({
                        firstName: patient.firstName || '',
                        lastName: patient.lastName || '',
                        email: patient.email || '',
                        phone: patient.phone || '',
                      });
                    }}
                    className="text-sm border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveDemographics}
                    className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`border-b-2 pb-4 px-1 text-sm font-medium ${
                    activeTab === 'overview'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('medical_history')}
                  className={`border-b-2 pb-4 px-1 text-sm font-medium ${
                    activeTab === 'medical_history'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Medical History
                </button>
                <button
                  onClick={() => setActiveTab('medications')}
                  className={`border-b-2 pb-4 px-1 text-sm font-medium ${
                    activeTab === 'medications'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Medications
                </button>
                <button
                  onClick={() => setActiveTab('allergies')}
                  className={`border-b-2 pb-4 px-1 text-sm font-medium ${
                    activeTab === 'allergies'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Allergies
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`border-b-2 pb-4 px-1 text-sm font-medium ${
                    activeTab === 'reports'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Reports
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`border-b-2 pb-4 px-1 text-sm font-medium ${
                    activeTab === 'activity'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Activity
                </button>
              </nav>
            </div>

            {/* Overview Tab — Procedure History */}
            {activeTab === 'overview' && (
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
                      onClick={() => navigate(`/procedures?patientId=${id}`)}
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
            )}

            {/* Medical History Tab — BUG-45 */}
            {activeTab === 'medical_history' && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg font-medium text-gray-900">Medical History</h3>
                  <p className="mt-2 text-sm text-gray-600">Maintain patient medical history records.</p>
                </div>
                <div className="border-t border-gray-200">
                  {/* Add form */}
                  <div className="bg-gray-50 px-4 py-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Condition name"
                        value={medHistoryForm.name}
                        onChange={e => setMedHistoryForm(prev => ({ ...prev, name: e.target.value }))}
                        className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        value={medHistoryForm.notes}
                        onChange={e => setMedHistoryForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      />
                      <button
                        onClick={addMedicalHistory}
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700 whitespace-nowrap"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  {/* List */}
                  <div>
                    {loadingMedHistory ? (
                      <div className="px-6 py-8 text-center text-gray-500">Loading...</div>
                    ) : medHistory.length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {medHistory.map(item => (
                          <li key={item.id} className="px-4 py-3 sm:px-6 flex items-center justify-between hover:bg-gray-50">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{item.name}</p>
                              {item.notes && <p className="text-xs text-gray-500">{item.notes}</p>}
                            </div>
                            <button
                              onClick={() => deleteMedicalHistory(item.id)}
                              className="text-red-600 hover:text-red-900 text-sm"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-6 py-8 text-center text-gray-500">
                        No medical history recorded. Add one above.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Medications Tab — BUG-45 */}
            {activeTab === 'medications' && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg font-medium text-gray-900">Medications</h3>
                  <p className="mt-2 text-sm text-gray-600">Maintain patient medication records.</p>
                </div>
                <div className="border-t border-gray-200">
                  {/* Add form */}
                  <div className="bg-gray-50 px-4 py-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Medication name"
                        value={medicationsForm.name}
                        onChange={e => setMedicationsForm(prev => ({ ...prev, name: e.target.value }))}
                        className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Dosage/Notes (optional)"
                        value={medicationsForm.notes}
                        onChange={e => setMedicationsForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      />
                      <button
                        onClick={addMedication}
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700 whitespace-nowrap"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  {/* List */}
                  <div>
                    {loadingMedications ? (
                      <div className="px-6 py-8 text-center text-gray-500">Loading...</div>
                    ) : medications.length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {medications.map(item => (
                          <li key={item.id} className="px-4 py-3 sm:px-6 flex items-center justify-between hover:bg-gray-50">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{item.name}</p>
                              {item.notes && <p className="text-xs text-gray-500">{item.notes}</p>}
                            </div>
                            <button
                              onClick={() => deleteMedication(item.id)}
                              className="text-red-600 hover:text-red-900 text-sm"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-6 py-8 text-center text-gray-500">
                        No medications recorded. Add one above.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Allergies Tab — BUG-45 */}
            {activeTab === 'allergies' && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg font-medium text-gray-900">Allergies</h3>
                  <p className="mt-2 text-sm text-gray-600">Maintain patient allergy records.</p>
                </div>
                <div className="border-t border-gray-200">
                  {/* Add form */}
                  <div className="bg-gray-50 px-4 py-4 sm:px-6">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Allergy name"
                        value={allergiesForm.name}
                        onChange={e => setAllergiesForm(prev => ({ ...prev, name: e.target.value }))}
                        className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Reaction/Notes (optional)"
                        value={allergiesForm.notes}
                        onChange={e => setAllergiesForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      />
                      <button
                        onClick={addAllergy}
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700 whitespace-nowrap"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  {/* List */}
                  <div>
                    {loadingAllergies ? (
                      <div className="px-6 py-8 text-center text-gray-500">Loading...</div>
                    ) : allergies.length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {allergies.map(item => (
                          <li key={item.id} className="px-4 py-3 sm:px-6 flex items-center justify-between hover:bg-gray-50">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{item.name}</p>
                              {item.notes && <p className="text-xs text-gray-500">{item.notes}</p>}
                            </div>
                            <button
                              onClick={() => deleteAllergy(item.id)}
                              className="text-red-600 hover:text-red-900 text-sm"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-6 py-8 text-center text-gray-500">
                        No allergies recorded. Add one above.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Reports Tab — BUG-47 */}
            {activeTab === 'reports' && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg font-medium text-gray-900">Signed Reports</h3>
                  <p className="mt-2 text-sm text-gray-600">View and access signed procedure reports.</p>
                </div>
                <div className="border-t border-gray-200">
                  {loadingReports ? (
                    <div className="px-6 py-8 text-center text-gray-500">Loading...</div>
                  ) : signedReports.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                      {signedReports.map(report => (
                        <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{report.studyType?.replace(/_/g, ' ') || 'Procedure Report'}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {report.createdAt?.toDate?.() ? report.createdAt.toDate().toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                              {report.status?.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <button
                            onClick={() => navigate(`/report/${report.procedureId}`)}
                            className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                          >
                            View Report →
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-6 py-8 text-center text-gray-500">
                      No signed reports for this patient.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activity Tab — BUG-48 */}
            {activeTab === 'activity' && (
              <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg font-medium text-gray-900">Activity Log</h3>
                  <p className="mt-2 text-sm text-gray-600">Recent activity and changes for this patient.</p>
                </div>
                <div className="border-t border-gray-200">
                  {loadingActivity ? (
                    <div className="px-6 py-8 text-center text-gray-500">Loading...</div>
                  ) : activityLog.length > 0 ? (
                    <ul className="divide-y divide-gray-200">
                      {activityLog.map((entry, idx) => (
                        <li key={entry.id || idx} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <div className={`flex items-center justify-center h-8 w-8 rounded-full text-white text-xs font-semibold ${
                                entry.action?.includes('created') ? 'bg-blue-500' :
                                entry.action?.includes('status') ? 'bg-yellow-500' :
                                entry.action?.includes('signed') ? 'bg-indigo-500' :
                                'bg-gray-500'
                              }`}>
                                {entry.action?.charAt(0).toUpperCase() || '○'}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{entry.action?.replace(/_/g, ' ') || 'Activity'}</p>
                              {entry.details && <p className="text-xs text-gray-500 mt-1">{typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details)}</p>}
                              {entry.user && <p className="text-xs text-gray-500 mt-1">By {entry.user}</p>}
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <p className="text-xs text-gray-500 whitespace-nowrap">
                                {entry.timestamp?.toDate?.() ? entry.timestamp.toDate().toLocaleString() : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-6 py-8 text-center text-gray-500">
                      No activity recorded for this patient.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
