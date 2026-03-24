import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, useActiveProcedure, usePatients, useFindings } from '../lib/hooks';
import { ProcedureStatus, StudyType } from '../types/enums';
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

  // Helper function to determine Lewis Score interpretation
  const getLewisInterpretation = (score: number) => {
    if (score < 135) return { text: 'Normal', color: 'bg-green-100 text-green-800' };
    if (score <= 790) return { text: 'Mild', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Moderate-Severe', color: 'bg-red-100 text-red-800' };
  };

  // Helper function to format time in seconds to HH:MM:SS
  const formatTime = (seconds?: number): string => {
    if (seconds === undefined || seconds === null) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper function to determine risk tier based on study type and findings
  const getRiskTier = () => {
    if (procedure.studyType === StudyType.CROHNS_MONITOR) {
      return { tier: 'moderate', label: 'Moderate Risk', color: 'bg-yellow-100 text-yellow-800' };
    }
    if (procedure.studyType === StudyType.COLON_EVAL) {
      return { tier: 'moderate', label: 'Moderate Risk', color: 'bg-yellow-100 text-yellow-800' };
    }
    return { tier: 'low', label: 'Low Risk', color: 'bg-green-100 text-green-800' };
  };

  const getSurveillanceRecommendation = (tier: string) => {
    switch (tier) {
      case 'low':
        return 'Routine follow-up in 5 years';
      case 'moderate':
        return 'Repeat procedure in 1-3 years';
      case 'high':
        return 'Repeat procedure in 6-12 months, consider specialist referral';
      default:
        return 'Follow-up per clinical judgment';
    }
  };

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

            {/* BUG-35: Lewis Score Panel */}
            <div className="bg-white shadow sm:rounded-lg mt-6">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Lewis Score</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                {procedure.qualityScore !== undefined ? (
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center justify-center h-16 w-16 rounded-full text-2xl font-bold ${getLewisInterpretation(procedure.qualityScore).color}`}>
                        {procedure.qualityScore}
                      </span>
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm text-gray-600">Score Interpretation</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {getLewisInterpretation(procedure.qualityScore).text}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {getLewisInterpretation(procedure.qualityScore).text === 'Normal' && 'Score < 135'}
                        {getLewisInterpretation(procedure.qualityScore).text === 'Mild' && 'Score 135–790'}
                        {getLewisInterpretation(procedure.qualityScore).text === 'Moderate-Severe' && 'Score > 790'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-lg text-gray-600">⏳</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Pending — requires findings review</p>
                      <p className="text-xs text-gray-500 mt-0.5">Lewis Score will be calculated once findings are documented.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* BUG-35: Transit Times Table */}
            <div className="bg-white shadow sm:rounded-lg mt-6">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Transit Times</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                {procedure.transitTimes ? (
                  <div>
                    <table className="min-w-full divide-y divide-gray-200">
                      <tbody className="divide-y divide-gray-200">
                        <tr>
                          <td className="py-3 text-sm font-medium text-gray-700">Gastric Transit</td>
                          <td className="py-3 text-sm text-gray-900">
                            {procedure.transitTimes.gastricEntryTime && procedure.transitTimes.duodenalEntryTime
                              ? formatTime((procedure.transitTimes.duodenalEntryTime - procedure.transitTimes.gastricEntryTime) / 1000)
                              : 'Not recorded'}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 text-sm font-medium text-gray-700">Small Bowel Transit</td>
                          <td className="py-3 text-sm text-gray-900">
                            {procedure.transitTimes.smallBowelTransitSeconds
                              ? formatTime(procedure.transitTimes.smallBowelTransitSeconds)
                              : procedure.transitTimes.jejunalEntryTime && procedure.transitTimes.cecalEntryTime
                              ? formatTime((procedure.transitTimes.cecalEntryTime - procedure.transitTimes.jejunalEntryTime) / 1000)
                              : 'Not recorded'}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-3 text-sm font-medium text-gray-700">Colonic Transit</td>
                          <td className="py-3 text-sm text-gray-900">
                            {procedure.transitTimes.cecalEntryTime && procedure.transitTimes.rectalEntryTime
                              ? formatTime((procedure.transitTimes.rectalEntryTime - procedure.transitTimes.cecalEntryTime) / 1000)
                              : 'Not recorded'}
                          </td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="py-3 text-sm font-medium text-gray-900">Total Duration</td>
                          <td className="py-3 text-sm font-semibold text-gray-900">
                            {formatTime(procedure.transitTimes.totalDurationSeconds)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="mt-4">
                      <button
                        disabled
                        title="Requires Cloud Function wiring"
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md cursor-not-allowed"
                      >
                        Calculate
                      </button>
                      <p className="text-xs text-gray-500 mt-1">Requires Cloud Function</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-lg text-gray-600">⏳</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Transit times will be calculated after landmark identification</p>
                      <p className="text-xs text-gray-500 mt-0.5">Complete anatomical landmark marking to enable transit time calculations.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* BUG-35: Study-Specific Panel */}
            <div className="bg-white shadow sm:rounded-lg mt-6">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {procedure.studyType === StudyType.CROHNS_MONITOR && "Crohn's Disease Assessment"}
                  {procedure.studyType === StudyType.UPPER_GI && "Upper GI Assessment"}
                  {procedure.studyType === StudyType.SB_DIAGNOSTIC && "Small Bowel Diagnostic"}
                  {procedure.studyType === StudyType.COLON_EVAL && "Colon Evaluation"}
                </h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                {procedure.studyType === StudyType.CROHNS_MONITOR && (
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">CEST Classification</p>
                    <ul className="list-disc list-inside text-gray-500 text-xs space-y-1">
                      <li>Villous edema</li>
                      <li>Ulcerations</li>
                      <li>Stenosis</li>
                      <li>Take-home findings</li>
                    </ul>
                  </div>
                )}
                {procedure.studyType === StudyType.UPPER_GI && (
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">Esophageal & Gastric Evaluation</p>
                    <ul className="list-disc list-inside text-gray-500 text-xs space-y-1">
                      <li>Esophageal patency</li>
                      <li>Gastric mucosa findings</li>
                      <li>Pylorus assessment</li>
                      <li>Gastroesophageal reflux signs</li>
                    </ul>
                  </div>
                )}
                {procedure.studyType === StudyType.SB_DIAGNOSTIC && (
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">Standard Findings Checklist</p>
                    <ul className="list-disc list-inside text-gray-500 text-xs space-y-1">
                      <li>Villous architecture</li>
                      <li>Vascular patterns</li>
                      <li>Mucosal ulcerations</li>
                      <li>Strictures or stenosis</li>
                    </ul>
                  </div>
                )}
                {procedure.studyType === StudyType.COLON_EVAL && (
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">Polyp Characteristics</p>
                    <ul className="list-disc list-inside text-gray-500 text-xs space-y-1">
                      <li>Morphology (sessile/pedunculated)</li>
                      <li>Size estimation</li>
                      <li>Location</li>
                      <li>Pit pattern classification</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* BUG-36: Quality Metrics Section */}
            <div className="mt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quality Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Bowel Prep Adequacy */}
                <div className="bg-white shadow sm:rounded-lg px-4 py-5 sm:px-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Bowel Prep Adequacy</h4>
                  {procedure.qualityScore !== undefined ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold text-gray-900">{procedure.qualityScore}%</span>
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                          procedure.qualityScore > 90 ? 'bg-green-100 text-green-800' :
                          procedure.qualityScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {procedure.qualityScore > 90 ? 'Excellent' :
                           procedure.qualityScore >= 70 ? 'Adequate' :
                           'Inadequate'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            procedure.qualityScore > 90 ? 'bg-green-500' :
                            procedure.qualityScore >= 70 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(procedure.qualityScore, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Not assessed</p>
                  )}
                </div>

                {/* Procedure Duration */}
                <div className="bg-white shadow sm:rounded-lg px-4 py-5 sm:px-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Procedure Duration</h4>
                  {procedure.transitTimes?.totalDurationSeconds ? (
                    <p className="text-2xl font-bold text-gray-900">
                      {formatTime(procedure.transitTimes.totalDurationSeconds)}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">N/A</p>
                  )}
                </div>

                {/* Completion Rate */}
                <div className="bg-white shadow sm:rounded-lg px-4 py-5 sm:px-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Completion Rate</h4>
                  {procedure.transitTimes?.cecalEntryFrame ? (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl text-green-500">✓</span>
                      <div>
                        <p className="text-sm font-semibold text-green-800">Complete</p>
                        <p className="text-xs text-gray-500">Cecum reached</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl text-red-500">✗</span>
                      <div>
                        <p className="text-sm font-semibold text-red-800">Incomplete</p>
                        <p className="text-xs text-gray-500">Cecum not reached</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* BUG-39: Risk Assessment & Surveillance Recommendations */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Risk Tier Card */}
              <div className="bg-white shadow sm:rounded-lg px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Assessment</h3>
                {(() => {
                  const risk = getRiskTier();
                  return (
                    <div className="flex items-center gap-4">
                      <div className={`inline-flex items-center justify-center h-14 w-14 rounded-full font-bold text-sm ${risk.color}`}>
                        {risk.tier === 'low' && '✓'}
                        {risk.tier === 'moderate' && '!'}
                        {risk.tier === 'high' && '⚠'}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Current Risk Tier</p>
                        <p className="text-base font-semibold text-gray-900">{risk.label}</p>
                        <p className="text-xs text-gray-500 mt-1">Based on study type and findings</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Surveillance Recommendation Card */}
              <div className="bg-white shadow sm:rounded-lg px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Surveillance Recommendation</h3>
                <div className="space-y-3">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">{getSurveillanceRecommendation(getRiskTier().tier)}</span>
                  </p>
                  <p className="text-xs text-gray-500 border-l-4 border-gray-300 pl-3 italic">
                    Recommendations are guidelines only. Clinical judgment should guide all follow-up decisions.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
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
