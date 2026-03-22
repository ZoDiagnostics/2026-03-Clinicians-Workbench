import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, useActiveProcedure, usePatients, useFindings } from '../lib/hooks';
import { ProcedureStatus } from '../types/enums';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { WorkflowStepper } from '../components/WorkflowStepper';

export const Summary: React.FC = () => {
  const { procedureId } = useParams<{ procedureId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const procedure = useActiveProcedure(procedureId);
  const allPatients = usePatients();
  const findings = useFindings(procedureId);

  const patientMap = useMemo(() =>
    new Map(allPatients.map(p => [p.id, p])),
    [allPatients]
  );

  const patient = procedure ? patientMap.get(procedure.patientId) : null;

  // BUG-40: Bowel prep quality state and save draft
  const [bowelPrep, setBowelPrep] = useState<string>(
    (procedure as any)?.bowelPrepQuality || ''
  );
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const handleSaveDraft = async () => {
    if (!procedureId || isReadOnly) return;
    setSavingDraft(true);
    try {
      await updateDoc(doc(db, 'procedures', procedureId), {
        bowelPrepQuality: bowelPrep,
        updatedAt: serverTimestamp(),
      });
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save draft:', err);
    } finally {
      setSavingDraft(false);
    }
  };

  // BUG-12: Determine read-only banner conditions for closed/void/completed procedures
  const isReadOnly = procedure
    ? [ProcedureStatus.CLOSED, ProcedureStatus.VOID, ProcedureStatus.COMPLETED, ProcedureStatus.COMPLETED_APPENDED].includes(procedure.status as ProcedureStatus)
    : false;
  const isClosedOrVoid = procedure
    ? [ProcedureStatus.CLOSED, ProcedureStatus.VOID].includes(procedure.status as ProcedureStatus)
    : false;

  if (!procedure) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">Loading procedure summary...</p>
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
        {/* BUG-31: Workflow stepper — Summary is step 4 */}
        <WorkflowStepper currentStep={4} />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* BUG-12: Read-only banner for closed/void procedures */}
            {isClosedOrVoid && (
              <div className="bg-gray-100 border border-gray-400 rounded-lg p-4 mb-4 flex items-center gap-3">
                <span className="text-gray-600 text-xl">🔒</span>
                <div>
                  <p className="text-gray-800 font-semibold text-sm">Read-Only — Procedure {procedure?.status?.replace(/_/g, ' ')}</p>
                  <p className="text-gray-600 text-xs mt-0.5">This procedure record is archived and cannot be modified.</p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Procedure Summary</h1>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                procedure.status === 'completed' || procedure.status === 'completed_appended'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {procedure.status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Patient Info */}
            <div className="bg-white shadow sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Patient Information</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient'}
                    </dd>
                  </div>
                  <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">MRN</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {patient?.mrn || '-'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Procedure Details */}
            <div className="bg-white shadow sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Procedure Details</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Study Type</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {procedure.studyType?.replace(/_/g, ' ') || '-'}
                    </dd>
                  </div>
                  <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Urgency</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {procedure.urgency || 'Routine'}
                    </dd>
                  </div>
                  <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {procedure.createdAt?.toDate?.() ? procedure.createdAt.toDate().toLocaleDateString() : '-'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* BUG-40: Bowel Prep Quality + Save Draft */}
            {!isReadOnly && (
              <div className="bg-white shadow sm:rounded-lg mb-6">
                <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Quality Metrics</h3>
                  <button
                    onClick={handleSaveDraft}
                    disabled={savingDraft}
                    className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 disabled:bg-gray-400"
                  >
                    {savingDraft ? 'Saving...' : draftSaved ? '✓ Saved' : 'Save Draft'}
                  </button>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bowel Prep Quality
                  </label>
                  <select
                    value={bowelPrep}
                    onChange={e => setBowelPrep(e.target.value)}
                    className="block w-48 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                  >
                    <option value="">Not recorded</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                    <option value="inadequate">Inadequate</option>
                  </select>
                </div>
              </div>
            )}

            {/* Findings */}
            <div className="bg-white shadow sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Findings ({findings.length})</h3>
              </div>
              <div className="border-t border-gray-200">
                {findings.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {findings.map((finding) => (
                      <li key={finding.id} className="px-6 py-4">
                        <p className="text-sm text-gray-900">{finding.description || finding.classification || finding.id}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-6 py-8 text-center text-gray-500">
                    No findings recorded for this procedure.
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => navigate(`/report/${procedureId}`)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                View Report
              </button>
              <button
                onClick={() => navigate('/worklist')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Back to Worklist
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Summary;
