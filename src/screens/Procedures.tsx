import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, addDoc, Timestamp, query, where, getDocs, limit, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, useProcedures, usePatients } from '../lib/hooks';
import { UserRole } from '../types/enums';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { ErrorState } from '../components/ErrorState';
import { routeByStatus } from '../lib/routeByStatus';

// BRD ZCW-BRD-0250 — New Procedure from Patient List
// Creates procedure in capsule_return_pending status with study type, urgency, indications

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, role, practiceId } = useAuth();
  const isReadOnly = role === UserRole.ADMIN;
  const procedures = useProcedures();
  const allPatients = usePatients();

  const [screenError, setScreenError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!practiceId) return;
    setScreenError(null);
    getDocs(query(collection(db, 'procedures'), where('practiceId', '==', practiceId), limit(1)))
      .catch((err: Error) => setScreenError(err));
  }, [practiceId, retryKey]);

  const [showModal, setShowModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');

  // Auto-open modal with pre-selected patient from query param (e.g., from Patient Overview)
  useEffect(() => {
    const patientIdParam = searchParams.get('patientId');
    if (patientIdParam && allPatients.length > 0) {
      setSelectedPatientId(patientIdParam);
      setShowModal(true);
      // Clear the param so refreshing doesn't re-trigger
      searchParams.delete('patientId');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, allPatients]);
  const [studyType, setStudyType] = useState('sb_diagnostic');
  const [urgency, setUrgency] = useState('routine');
  const [indications, setIndications] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // BUG-22: Inline metadata editing
  const [editingProcId, setEditingProcId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ studyType: '', urgency: '', notes: '' });

  // BUG-23: Duplicate acknowledgment
  const [dupAcknowledged, setDupAcknowledged] = useState(false);

  const patientMap = useMemo(() =>
    new Map(allPatients.map(p => [p.id, `${p.firstName} ${p.lastName}`])),
    [allPatients]
  );

  // BUG-23: Duplicate check — 30 day lookback
  const hasDuplicate = useMemo(() => {
    if (!selectedPatientId || !studyType) return null;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const match = procedures.find(p =>
      p.patientId === selectedPatientId &&
      p.studyType === studyType &&
      p.createdAt?.toDate?.() > thirtyDaysAgo
    );
    return match ? { studyType: match.studyType, createdAt: match.createdAt?.toDate?.() } : null;
  }, [selectedPatientId, studyType, procedures]);

  // BUG-23: Smart prefill — find most recent procedure for patient
  useEffect(() => {
    if (!selectedPatientId) {
      setStudyType('sb_diagnostic');
      setUrgency('routine');
      return;
    }
    const mostRecent = procedures
      .filter(p => p.patientId === selectedPatientId)
      .sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0))[0];
    if (mostRecent) {
      setStudyType(mostRecent.studyType || 'sb_diagnostic');
      setUrgency(mostRecent.urgency || 'routine');
    }
  }, [selectedPatientId, procedures]);

  const handleCreateProcedure = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedPatientId) {
      setFormError('Please select a patient.');
      return;
    }

    // BUG-23: Duplicate check
    if (hasDuplicate && !dupAcknowledged) {
      const dateStr = hasDuplicate.createdAt?.toLocaleDateString();
      setFormError(`This patient already has a ${hasDuplicate.studyType?.replace(/_/g, ' ')} procedure from ${dateStr}. Check the box below to continue anyway.`);
      return;
    }

    setSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'procedures'), {
        patientId: selectedPatientId,
        practiceId,
        clinicId: 'clinic_main',
        assignedClinicianId: user?.uid,
        status: 'capsule_return_pending',
        studyType,
        urgency,
        indications: indications ? [indications] : ['Capsule endoscopy evaluation'],
        contraindications: {
          hasPacemaker: false,
          hasSwallowingDisorder: false,
          hasBowelObstruction: false,
          hasKnownAllergy: false,
          reviewedAt: Timestamp.now(),
          reviewedBy: user?.uid,
        },
        preProcedureChecks: [],
        preReviewConfig: {
          studyType,
          crohnsMode: studyType === 'crohns_monitor',
          sensitivityThreshold: 50,
          configuredAt: Timestamp.now(),
          configuredBy: user?.uid,
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: user?.uid,
      });

      setShowModal(false);
      setSelectedPatientId('');
      setStudyType('sb_diagnostic');
      setUrgency('routine');
      setIndications('');
      setDupAcknowledged(false);
      // Navigate to the new procedure's checkin
      navigate(`/checkin/${docRef.id}`);
    } catch (err) {
      console.error(err);
      setFormError('Failed to create procedure.');
    } finally {
      setSubmitting(false);
    }
  };

  // BUG-22: Handle inline edit save
  const handleSaveInlineEdit = async (procId: string) => {
    try {
      await updateDoc(doc(db, 'procedures', procId), {
        studyType: editForm.studyType,
        urgency: editForm.urgency,
        updatedAt: Timestamp.now(),
      });
      setEditingProcId(null);
      setEditForm({ studyType: '', urgency: '', notes: '' });
    } catch (err) {
      console.error('Failed to save inline edit:', err);
      setFormError('Failed to save changes.');
    }
  };

  if (screenError) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <ErrorState
              title="Couldn't load procedures"
              message="There was a problem fetching procedures. Check your connection and try again."
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
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">All Procedures</h1>
              {!isReadOnly && (
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-indigo-700 text-sm"
                >
                  + New Procedure
                </button>
              )}
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Study Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Urgency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {procedures.map((proc) => {
                    const isEditing = editingProcId === proc.id;
                    const canEdit = ['capsule_return_pending', 'capsule_received', 'ready_for_review', 'draft'].includes(proc.status);
                    return (
                      <tr
                        key={proc.id}
                        className={isEditing ? 'bg-blue-50' : 'hover:bg-gray-50 cursor-pointer'}
                        onClick={() => !isEditing && navigate(routeByStatus(proc.status, proc.id))}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {patientMap.get(proc.patientId) || 'Unknown Patient'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {isEditing ? (
                            <select
                              value={editForm.studyType}
                              onChange={e => setEditForm({ ...editForm, studyType: e.target.value })}
                              className="border border-gray-300 rounded-md py-1 px-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              <option value="sb_diagnostic">Small Bowel — Diagnostic</option>
                              <option value="upper_gi">Upper GI — Evaluation</option>
                              <option value="crohns_monitor">Small Bowel — Crohn's Monitoring</option>
                              <option value="colon_eval">Colon — Evaluation</option>
                            </select>
                          ) : (
                            proc.studyType?.replace(/_/g, ' ') || '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={proc.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {isEditing ? (
                            <select
                              value={editForm.urgency}
                              onChange={e => setEditForm({ ...editForm, urgency: e.target.value })}
                              className="border border-gray-300 rounded-md py-1 px-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            >
                              <option value="routine">Routine</option>
                              <option value="urgent">Urgent</option>
                              <option value="emergent">Emergent</option>
                            </select>
                          ) : (
                            proc.urgency || '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {proc.createdAt?.toDate?.() ? proc.createdAt.toDate().toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveInlineEdit(proc.id);
                                }}
                                className="text-white bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs"
                              >
                                Save
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingProcId(null);
                                  setEditForm({ studyType: '', urgency: '', notes: '' });
                                }}
                                className="text-gray-700 bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : canEdit && !isReadOnly ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingProcId(proc.id);
                                setEditForm({ studyType: proc.studyType, urgency: proc.urgency, notes: '' });
                              }}
                              className="text-indigo-600 hover:text-indigo-900 font-medium text-xs"
                            >
                              Edit
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {procedures.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No procedures found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* New Procedure Modal — BRD ZCW-BRD-0250 */}
            {showModal && (
              <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                  <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={() => {
                    setShowModal(false);
                    setDupAcknowledged(false);
                    setFormError(null);
                  }} />
                  <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                    <form onSubmit={handleCreateProcedure}>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">New Procedure</h3>
                      {selectedPatientId && procedures.filter(p => p.patientId === selectedPatientId).length > 0 && (
                        <p className="text-xs text-gray-600 mb-4">Prefilled from last procedure</p>
                      )}

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Patient *</label>
                          <select value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="">Select patient...</option>
                            {allPatients.map(p => (
                              <option key={p.id} value={p.id}>{p.lastName}, {p.firstName} (MRN: {p.mrn})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Study Type *</label>
                          <select value={studyType} onChange={e => setStudyType(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="sb_diagnostic">Small Bowel — Diagnostic</option>
                            <option value="upper_gi">Upper GI — Evaluation</option>
                            <option value="crohns_monitor">Small Bowel — Crohn's Monitoring</option>
                            <option value="colon_eval">Colon — Evaluation</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Urgency</label>
                          <select value={urgency} onChange={e => setUrgency(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="routine">Routine</option>
                            <option value="urgent">Urgent</option>
                            <option value="emergent">Emergent</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Clinical Indication</label>
                          <input type="text" value={indications} onChange={e => setIndications(e.target.value)}
                            placeholder="e.g., Chronic diarrhea, GI bleeding evaluation"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                      </div>

                      {formError && (
                        <div className="mt-3">
                          <p className="text-sm text-red-600 mb-2">{formError}</p>
                          {hasDuplicate && !dupAcknowledged && (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={dupAcknowledged}
                                onChange={e => setDupAcknowledged(e.target.checked)}
                                className="rounded border-gray-300"
                              />
                              <span className="text-sm text-gray-700">I understand and want to continue</span>
                            </label>
                          )}
                        </div>
                      )}

                      <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={() => {
                          setShowModal(false);
                          setDupAcknowledged(false);
                          setFormError(null);
                        }}
                          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-700 bg-white hover:bg-gray-50">
                          Cancel
                        </button>
                        <button type="submit" disabled={submitting}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm text-sm hover:bg-indigo-700 disabled:bg-gray-400">
                          {submitting ? 'Creating...' : 'Create & Begin Check-In'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Procedures;
