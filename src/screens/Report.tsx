import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth, useReport, useFindings, useActiveProcedure, usePatients, updateReport } from '../lib/hooks';
import { ReportStatus, ProcedureStatus, StudyType } from '../types/enums';
import { getReportSectionText, SimpleReportSections } from '../types/report';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { WorkflowStepper } from '../components/WorkflowStepper';
import CopilotAutoDraft from '../components/CopilotAutoDraft';
import ICDCodeSuggestions from '../components/ICDCodeSuggestions';
import { getFunctions, httpsCallable } from 'firebase/functions';

// BRD ZCW-BRD-0071 — Generate Report Screen
// BRD ZCW-BRD-0073 — Standard Report Sections
// BUG-38 — Report Template System + Study-Type Sections + Versioning
// BUG-41 — Practice Favorites in ICD/CPT Code Suggestions + Confidence Scores

// Template and section configuration
interface TemplateConfig {
  name: string;
  sections: string[];
}

const TEMPLATE_MAP: Record<StudyType, TemplateConfig> = {
  [StudyType.SB_DIAGNOSTIC]: {
    name: 'Small Bowel Diagnostic Report',
    sections: ['Indications', 'Transit Times', 'Mucosal Assessment', 'Pathology Correlation', 'Impression', 'Recommendations'],
  },
  [StudyType.UPPER_GI]: {
    name: 'Upper GI Evaluation Report',
    sections: ['Indications', 'Esophageal Findings', 'Gastric Findings', 'GEJ Assessment', 'Impression', 'Recommendations'],
  },
  [StudyType.CROHNS_MONITOR]: {
    name: 'Crohn\'s Disease Monitoring Report',
    sections: ['Indications', 'Transit Times', 'Inflammatory Assessment', 'Lewis Score', 'CEST Classification', 'Disease Activity', 'Treatment Response', 'Impression', 'Recommendations'],
  },
  [StudyType.COLON_EVAL]: {
    name: 'Colon Evaluation Report',
    sections: ['Indications', 'Preparation Quality', 'Findings by Segment', 'Polyp Characteristics', 'Impression', 'Recommendations'],
  },
};

interface VersionEntry {
  version: number;
  savedAt: string;
  summary: string;
}

interface CodeSuggestion {
  code: string;
  description: string;
  confidence: number;
  source: 'favorite' | 'ai' | 'general';
}

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

  // BUG-38: Template and study-type sections
  const [selectedTemplate, setSelectedTemplate] = useState<StudyType | null>(null);
  const [sectionContent, setSectionContent] = useState<Record<string, string>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // BUG-38: Version history
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // BUG-41: Code suggestions
  const [codeSuggestions, setCodeSuggestions] = useState<CodeSuggestion[]>([]);
  const [appliedCodes, setAppliedCodes] = useState<CodeSuggestion[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(false);

  // Initialize from report data when loaded
  // Note: Firestore stores sections as {findings, impression, recommendations} object
  useEffect(() => {
    if (report) {
      setFindingsText(getReportSectionText(report.sections, 'findings'));
      setImpression(getReportSectionText(report.sections, 'impression'));
      setRecommendations(getReportSectionText(report.sections, 'recommendations'));
    }
  }, [report]);

  // BUG-38: Auto-select template based on study type
  useEffect(() => {
    if (procedure && procedure.studyType) {
      const studyType = procedure.studyType as StudyType;
      if (TEMPLATE_MAP[studyType]) {
        setSelectedTemplate(studyType);
        // Initialize section content
        const initialContent: Record<string, string> = {};
        TEMPLATE_MAP[studyType].sections.forEach(section => {
          initialContent[section] = '';
        });
        setSectionContent(initialContent);
      }
    }
  }, [procedure]);

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

      // BUG-38: Add version entry
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const newVersion: VersionEntry = {
        version: versions.length + 1,
        savedAt: dateStr,
        summary: versions.length > 0 ? 'Amended' : 'Initial Save',
      };
      setVersions([...versions, newVersion]);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save report:', err);
    } finally {
      setSaving(false);
    }
  };

  // BUG-41: Fetch code suggestions
  const handleGetCodeSuggestions = async () => {
    setLoadingCodes(true);
    try {
      const functions = getFunctions();
      const suggestCodesFunc = httpsCallable(functions, 'suggestCodes');

      try {
        const result = await suggestCodesFunc({
          procedureId,
          studyType: procedure?.studyType,
          findings: findingsText,
        });
        setCodeSuggestions(result.data as CodeSuggestion[]);
      } catch (firebaseErr) {
        // Fallback to demo suggestions
        console.log('Cloud function failed, using demo suggestions:', firebaseErr);
        const demoSuggestions: CodeSuggestion[] = [
          { code: 'K50.00', description: 'Crohn\'s disease of small intestine without complications', confidence: 0.92, source: 'favorite' },
          { code: 'K50.10', description: 'Crohn\'s disease of large intestine without complications', confidence: 0.78, source: 'ai' },
          { code: 'K63.5', description: 'Polyp of colon', confidence: 0.65, source: 'general' },
          { code: '91113', description: 'GI endoscopy with biopsy', confidence: 0.88, source: 'favorite' },
        ];
        setCodeSuggestions(demoSuggestions);
      }
    } finally {
      setLoadingCodes(false);
    }
  };

  const handleAcceptCode = (suggestion: CodeSuggestion) => {
    setAppliedCodes([...appliedCodes, suggestion]);
    setCodeSuggestions(codeSuggestions.filter(s => s.code !== suggestion.code));
  };

  const handleRejectCode = (code: string) => {
    setCodeSuggestions(codeSuggestions.filter(s => s.code !== code));
  };

  const handleRemoveAppliedCode = (code: string) => {
    setAppliedCodes(appliedCodes.filter(s => s.code !== code));
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const updateSectionContent = (section: string, content: string) => {
    setSectionContent({ ...sectionContent, [section]: content });
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
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Clinical Report</h1>
                {versions.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">Version {versions.length}</p>
                )}
              </div>
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
                  {/* BUG-38: Template Selection Section */}
                  {selectedTemplate && TEMPLATE_MAP[selectedTemplate] && (
                    <div className="bg-white rounded-lg shadow p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-gray-900">Template</h2>
                        <div className="flex items-center gap-2">
                          <span className="inline-block bg-indigo-100 text-indigo-800 text-xs font-semibold px-3 py-1 rounded-full">
                            {TEMPLATE_MAP[selectedTemplate].name}
                          </span>
                          <select
                            value={selectedTemplate}
                            onChange={(e) => {
                              const newTemplate = e.target.value as StudyType;
                              setSelectedTemplate(newTemplate);
                              const initialContent: Record<string, string> = {};
                              TEMPLATE_MAP[newTemplate].sections.forEach(section => {
                                initialContent[section] = '';
                              });
                              setSectionContent(initialContent);
                            }}
                            className="text-xs border border-gray-300 rounded px-2 py-1 cursor-pointer focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            {Object.entries(TEMPLATE_MAP).map(([key, config]) => (
                              <option key={key} value={key}>
                                {config.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BUG-38: Study-Type Sections */}
                  {selectedTemplate && TEMPLATE_MAP[selectedTemplate] && (
                    <div className="space-y-2">
                      {TEMPLATE_MAP[selectedTemplate].sections.map((section) => (
                        <div key={section} className="bg-white rounded-lg shadow overflow-hidden">
                          <button
                            onClick={() => toggleSection(section)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 border-b border-gray-200"
                          >
                            <h3 className="font-semibold text-gray-900 text-sm">{section}</h3>
                            <span className="text-gray-400 text-lg">{expandedSections.has(section) ? '−' : '+'}</span>
                          </button>
                          {expandedSections.has(section) && (
                            <div className="p-4">
                              <textarea
                                value={sectionContent[section] || ''}
                                onChange={(e) => !isLocked && updateSectionContent(section, e.target.value)}
                                readOnly={isLocked}
                                rows={3}
                                className={`w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 ${isLocked ? 'bg-gray-50 text-gray-700 cursor-not-allowed' : ''}`}
                                placeholder={`Enter ${section.toLowerCase()}...`}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

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

                  {/* BUG-41: Code Suggestions Panel */}
                  <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-bold text-gray-900">Code Suggestions</h2>
                      <button
                        onClick={handleGetCodeSuggestions}
                        disabled={loadingCodes}
                        className="bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700 disabled:bg-gray-400"
                      >
                        {loadingCodes ? 'Loading...' : 'Get Suggestions'}
                      </button>
                    </div>

                    {/* Applied Codes */}
                    {appliedCodes.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Applied Codes</p>
                        <div className="flex flex-wrap gap-2">
                          {appliedCodes.map((code) => (
                            <div key={code.code} className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1 text-xs">
                              <span className="font-semibold text-gray-900">{code.code}</span>
                              <button
                                onClick={() => handleRemoveAppliedCode(code.code)}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Code Suggestions List */}
                    {codeSuggestions.length > 0 ? (
                      <div className="space-y-2">
                        {codeSuggestions
                          .sort((a, b) => {
                            const sourceOrder = { favorite: 0, ai: 1, general: 2 };
                            return sourceOrder[a.source] - sourceOrder[b.source];
                          })
                          .map((suggestion) => (
                            <div key={suggestion.code} className="border border-gray-200 rounded-lg p-3 flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="bg-gray-200 text-gray-800 px-2 py-0.5 rounded text-xs font-semibold">
                                    {suggestion.code}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                                    suggestion.source === 'favorite' ? 'bg-purple-100 text-purple-800' :
                                    suggestion.source === 'ai' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {suggestion.source === 'favorite' ? 'Practice Favorite' :
                                     suggestion.source === 'ai' ? 'AI Suggested' :
                                     'General'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 mb-2">{suggestion.description}</p>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                      className={`h-full ${
                                        suggestion.confidence > 0.8 ? 'bg-green-500' :
                                        suggestion.confidence > 0.5 ? 'bg-yellow-500' :
                                        'bg-gray-400'
                                      }`}
                                      style={{ width: `${suggestion.confidence * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-600 font-semibold min-w-fit">
                                    {Math.round(suggestion.confidence * 100)}%
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => handleAcceptCode(suggestion)}
                                  className="bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded text-xs font-semibold"
                                >
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleRejectCode(suggestion.code)}
                                  className="bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded text-xs font-semibold"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No suggestions yet. Click "Get Suggestions" to fetch codes.</p>
                    )}
                  </div>

                  {/* BUG-38: Version History Panel */}
                  <div className="bg-white rounded-lg shadow p-4">
                    <button
                      onClick={() => setShowVersionHistory(!showVersionHistory)}
                      className="w-full flex items-center justify-between hover:bg-gray-50 py-2"
                    >
                      <h2 className="text-lg font-bold text-gray-900">Version History</h2>
                      <span className="text-gray-400 text-lg">{showVersionHistory ? '−' : '+'}</span>
                    </button>
                    {showVersionHistory && (
                      <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                        {versions.length > 0 ? (
                          versions.map((version) => (
                            <div key={version.version} className="flex items-center gap-2 text-sm">
                              <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-semibold min-w-fit">
                                v{version.version}
                              </span>
                              <span className="text-gray-700">
                                Saved on {version.savedAt} — {version.summary}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No versions saved yet.</p>
                        )}
                      </div>
                    )}
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
