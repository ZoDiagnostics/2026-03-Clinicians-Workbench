import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, useReport, useFindings, useActiveProcedure, usePatients, updateReport } from '../lib/hooks';
import { ReportStatus, ProcedureStatus } from '../types/enums';
import { getReportSectionText, SimpleReportSections } from '../types/report';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { WorkflowStepper } from '../components/WorkflowStepper';
import CopilotAutoDraft from '../components/CopilotAutoDraft';
import ICDCodeSuggestions from '../components/ICDCodeSuggestions';

// BRD ZCW-BRD-0071 — Generate Report Screen
// BRD ZCW-BRD-0073 — Standard Report Sections

const Report: React.FC = () => {
  const { procedureId } = useParams<{ procedureId: string }>();
  const navigate = useNavigate();
  const { user, practiceId } = useAuth();
  const report = useReport(procedureId);
  const findings = useFindings(procedureId);
  const procedure = useActiveProcedure(procedureId);
  const allPatients = usePatients();

  const patient = procedure ? allPatients.find(p => p.id === procedure.patientId) : null;

  // BUG-13: Report is read-only when procedure is in a terminal state
  const LOCKED_STATUSES: string[] = [
    ProcedureStatus.COMPLETED,
    ProcedureStatus.COMPLETED_APPENDED,
    ProcedureStatus.CLOSED,
    ProcedureStatus.VOID,
  ];
  const isLocked = procedure ? LOCKED_STATUSES.includes(procedure.status) : false;

  // Editable sections
  const [findingsText, setFindingsText] = useState('');
  const [impression, setImpression] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Initialize from report data when loaded
  // Note: Firestore stores sections as {findings, impression, recommendations} object
  useEffect(() => {
    if (report) {
      setFindingsText(getReportSectionText(report.sections, 'findings'));
      setImpression(getReportSectionText(report.sections, 'impression'));
      setRecommendations(getReportSectionText(report.sections, 'recommendations'));
    }
  }, [report]);

  // Auto-create report if none exists for this procedure
  const handleCreateReport = async () => {
    if (!procedureId || !practiceId || !user) return;

    // Build findings summary from actual findings
    const findingsSummary = findings.length > 0
      ? findings.map((f, i) => `${i + 1}. ${f.classification || f.type || 'Finding'} — ${f.anatomicalRegion || f.region || 'unknown region'} (${f.provenance === 'ai_detected' ? 'AI-detected' : 'clinician-marked'}, confidence: ${f.aiConfidence || f.confidence || 'N/A'}%)`).join('\n')
      : 'No findings recorded.';

    await addDoc(collection(db, 'reports'), {
      procedureId,
      practiceId,
      clinicianId: user.uid,
      status: ReportStatus.DRAFT,
      sections: {
        findings: findingsSummary,
        impression: '',
        recommendations: '',
      } satisfies SimpleReportSections,
      icdCodes: [],
      cptCodes: [{ code: '91110', description: 'GI tract imaging, capsule endoscopy', status: 'suggested' }],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  };

  const handleSave = async () => {
    if (!report) return;
    setSaving(true);
    try {
      await updateReport(report.id, {
        sections: { findings: findingsText, impression, recommendations } as SimpleReportSections,
        status: ReportStatus.IN_REVIEW,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save report:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />

        {/* BUG-31: Workflow stepper — Report is step 5 */}
        <WorkflowStepper currentStep={5} />

        {/* Patient/Procedure info bar */}
        {procedure && (
          <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">{patient ? `${patient.firstName} ${patient.lastName}` : 'Loading...'}</span>
              {patient?.mrn && <span className="text-xs text-gray-400">MRN: {patient.mrn}</span>}
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs text-gray-400">{procedure.studyType?.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(`/viewer/${procedureId}`)} className="text-xs text-indigo-600 hover:text-indigo-800">
                &larr; Back to Viewer
              </button>
              <button onClick={() => navigate(`/sign-deliver/${procedureId}`)}
                className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                Proceed to Sign & Deliver →
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* BUG-13: Read-only banner for locked procedures */}
            {isLocked && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4 flex items-center gap-3">
                <span className="text-amber-600 text-xl">🔒</span>
                <div>
                  <p className="text-amber-800 font-semibold text-sm">Read-Only — Procedure {procedure?.status?.replace(/_/g, ' ')}</p>
                  <p className="text-amber-700 text-xs mt-0.5">This report cannot be edited because the procedure has been {procedure?.status?.replace(/_/g, ' ')}. To make changes, create an addendum.</p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Clinical Report</h1>
              {report && (
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded ${
                    report.status === 'signed' ? 'bg-green-100 text-green-800' :
                    report.status === 'in_review' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {report.status?.replace(/_/g, ' ')}
                  </span>
                  {!isLocked && (
                    <button onClick={handleSave} disabled={saving}
                      className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 disabled:bg-gray-400">
                      {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Draft'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* No report yet — offer to create one */}
            {!report && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6 text-center">
                <p className="text-yellow-800 mb-4">No report exists for this procedure yet.</p>
                <button onClick={handleCreateReport}
                  className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700">
                  Generate Report from Findings ({findings.length} findings)
                </button>
              </div>
            )}

            {report && (
              <div className="flex gap-6">
                {/* Main report editor */}
                <div className="flex-1 space-y-4">
                  {/* Findings Section — BRD ZCW-BRD-0073 */}
                  <div className="bg-white rounded-lg shadow p-4">
                    <h2 className="text-lg font-bold mb-2 text-gray-900">Findings ({findings.length})</h2>
                    <textarea
                      value={findingsText}
                      onChange={e => !isLocked && setFindingsText(e.target.value)}
                      readOnly={isLocked}
                      rows={6}
                      className={`w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 ${isLocked ? 'bg-gray-50 text-gray-700 cursor-not-allowed' : ''}`}
                      placeholder="Enter findings summary..."
                    />
                  </div>

                  {/* Clinical Impression — BRD ZCW-BRD-0073 */}
                  <div className="bg-white rounded-lg shadow p-4">
                    <h2 className="text-lg font-bold mb-2 text-gray-900">Clinical Impression</h2>
                    <textarea
                      value={impression}
                      onChange={e => !isLocked && setImpression(e.target.value)}
                      readOnly={isLocked}
                      rows={4}
                      className={`w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 ${isLocked ? 'bg-gray-50 text-gray-700 cursor-not-allowed' : ''}`}
                      placeholder="Enter clinical impression..."
                    />
                  </div>

                  {/* Recommendations — BRD ZCW-BRD-0073 */}
                  <div className="bg-white rounded-lg shadow p-4">
                    <h2 className="text-lg font-bold mb-2 text-gray-900">Recommendations</h2>
                    <textarea
                      value={recommendations}
                      onChange={e => !isLocked && setRecommendations(e.target.value)}
                      readOnly={isLocked}
                      rows={4}
                      className={`w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 ${isLocked ? 'bg-gray-50 text-gray-700 cursor-not-allowed' : ''}`}
                      placeholder="Enter recommendations..."
                    />
                  </div>
                </div>

                {/* Sidebar: Copilot + ICD codes */}
                <div className="w-80 space-y-4">
                  <CopilotAutoDraft
                    findings={findings}
                    studyType={procedure?.studyType}
                    patientContext={patient ? `${patient.firstName} ${patient.lastName}, ${patient.sex}, MRN: ${patient.mrn}` : undefined}
                    onAcceptImpression={(text) => setImpression(text)}
                    onAcceptRecommendations={(text) => setRecommendations(text)}
                  />
                  <ICDCodeSuggestions />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Report;
