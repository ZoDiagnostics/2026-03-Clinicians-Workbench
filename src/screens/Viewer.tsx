import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useActiveProcedure, useFindings, usePatients, createFinding, deleteFinding, updateFinding } from '../lib/hooks';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { PreReviewBanner } from '../components/PreReviewBanner';
import { FrameViewer } from '../components/FrameViewer';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { AnatomicalRegion, FindingProvenance, FindingReviewStatus, ProcedureStatus } from '../types/enums';
import { Finding } from '../types/finding';

// SCR-10: Viewer — Capsule endoscopy review screen
// UX Flow:
// 1. If status=ready_for_review → show Pre-Review checklist first, everything else gated
// 2. After checklist complete (status changes to draft) → unlock findings panel + navigation
// 3. Frame viewer shows "No frames" state until image pipeline is connected

export const Viewer: React.FC = () => {
  const { procedureId } = useParams<{ procedureId: string }>();
  const navigate = useNavigate();
  const procedure = useActiveProcedure(procedureId);
  const findings = useFindings(procedureId);
  const allPatients = usePatients();

  const [currentFrame, setCurrentFrame] = useState(0);
  const [newFindingClass, setNewFindingClass] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>(AnatomicalRegion.COLON);
  // BUG-11: Confirmation dialog state for finding deletion
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const pendingDeleteFinding = pendingDeleteId ? findings.find(f => f.id === pendingDeleteId) : null;

  const patient = procedure ? allPatients.find(p => p.id === procedure.patientId) : null;
  const isPreReview = procedure?.status === ProcedureStatus.READY_FOR_REVIEW;
  const isReviewActive = procedure?.status === ProcedureStatus.DRAFT || procedure?.status === ProcedureStatus.APPENDED_DRAFT;
  const isCompleted = procedure?.status === ProcedureStatus.COMPLETED || procedure?.status === ProcedureStatus.COMPLETED_APPENDED || procedure?.status === ProcedureStatus.CLOSED;

  // Review is unlocked once pre-review checklist is completed (status moves past ready_for_review)
  const reviewUnlocked = !isPreReview;

  // TODO: Load actual frames from Firebase Storage via useCapsuleFrames hook
  const frames: string[] = [];

  const handleAddFinding = async () => {
    if (!procedureId || !newFindingClass || !reviewUnlocked) return;

    const newFinding: Omit<Finding, 'id' | 'createdAt' | 'updatedAt'> = {
      procedureId,
      classification: newFindingClass,
      provenance: FindingProvenance.CLINICIAN_MARKED,
      reviewStatus: FindingReviewStatus.PENDING,
      isIncidental: false,
      anatomicalRegion: selectedRegion as AnatomicalRegion,
      primaryFrameNumber: currentFrame,
      primaryFrameTimestamp: currentFrame * 250,
      additionalFrames: [],
      modificationHistory: [],
      annotations: [],
    };

    await createFinding(procedureId, newFinding);
    setNewFindingClass('');
  };

  // BUG-11: Two-step delete — show confirmation dialog first
  const handleRequestDelete = (findingId: string) => {
    setPendingDeleteId(findingId);
  };

  const handleConfirmDelete = async () => {
    if (procedureId && pendingDeleteId && reviewUnlocked) {
      await deleteFinding(procedureId, pendingDeleteId);
    }
    setPendingDeleteId(null);
  };

  const handleDismissFinding = async (findingId: string) => {
    if (procedureId && reviewUnlocked) {
      await deleteFinding(procedureId, findingId);
    }
  };

  // BUG-33: Toggle dismissed status on finding badge click
  const handleToggleDismiss = async (finding: Finding) => {
    if (!procedureId || !reviewUnlocked) return;
    const isDismissed = finding.reviewStatus === FindingReviewStatus.REJECTED;
    await updateFinding(procedureId, finding.id, {
      reviewStatus: isDismissed ? FindingReviewStatus.PENDING : FindingReviewStatus.REJECTED,
    });
  };

  if (!procedure) {
    return (
      <div className="flex h-screen bg-gray-800">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center text-white">
            <p>Loading procedure...</p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-800 text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />

        {/* BUG-31: Workflow stepper — Viewer is step 3 */}
        <WorkflowStepper currentStep={3} />

        {/* Patient info bar */}
        <div className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {patient ? `${patient.firstName} ${patient.lastName}` : 'Loading...'}
            </span>
            {patient?.mrn && <span className="text-xs text-gray-400">MRN: {patient.mrn}</span>}
            <span className="text-xs text-gray-400">|</span>
            <span className="text-xs text-gray-400">{procedure.studyType?.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              isPreReview ? 'bg-yellow-700 text-yellow-200' :
              isReviewActive ? 'bg-indigo-700 text-indigo-200' :
              isCompleted ? 'bg-green-700 text-green-200' :
              'bg-gray-700 text-gray-300'
            }`}>
              {isPreReview ? 'Pre-Review Required' : procedure.status.replace(/_/g, ' ')}
            </span>
            {reviewUnlocked && (
              <button
                onClick={() => navigate(`/report/${procedureId}`)}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded"
              >
                Go to Report →
              </button>
            )}
          </div>
        </div>

        {/* Pre-review checklist (only for ready_for_review status) */}
        {isPreReview && (
          <PreReviewBanner
            procedureId={procedure.id}
            studyType={procedure.studyType}
          />
        )}

        {/* Workflow guidance banner */}
        {isPreReview && (
          <div className="bg-yellow-900/50 border-b border-yellow-700 px-4 py-3 text-center">
            <p className="text-yellow-200 text-sm">
              Complete the Pre-Review Checklist above to unlock the review tools and findings panel.
            </p>
          </div>
        )}

        <main className="flex-1 flex overflow-hidden relative">
          {/* Main Content: Frame Viewer */}
          <div className="flex-1 flex flex-col">
            <FrameViewer
              frames={frames}
              currentFrame={currentFrame}
              onFrameChange={setCurrentFrame}
              fps={4}
            />
          </div>

          {/* Right Sidebar: Findings Panel */}
          <div className={`w-96 bg-gray-900 border-l border-gray-700 flex flex-col transition-opacity ${
            reviewUnlocked ? 'opacity-100' : 'opacity-40 pointer-events-none'
          }`}>
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Findings ({findings.length})</h2>
              {!reviewUnlocked && (
                <span className="text-xs text-yellow-400 bg-yellow-900/50 px-2 py-0.5 rounded">Locked</span>
              )}
            </div>

            {/* Findings list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {findings.map((finding) => {
                const isDismissed = finding.reviewStatus === FindingReviewStatus.REJECTED;
                return (
                  <div key={finding.id} className={`bg-gray-800 p-3 rounded-lg ${isDismissed ? 'opacity-50' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{finding.classification || finding.type || 'Unnamed finding'}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {finding.anatomicalRegion || finding.region || '-'} • Frame {finding.primaryFrameNumber || finding.frameNumber || 0}
                        </p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            finding.provenance === 'ai_detected' ? 'bg-blue-900 text-blue-300' : 'bg-green-900 text-green-300'
                          }`}>
                            {finding.provenance === 'ai_detected' ? 'AI' : 'Manual'}
                          </span>
                          {/* BUG-33: Clickable review status badge toggles dismissed state */}
                          <button
                            onClick={() => reviewUnlocked && !isCompleted && handleToggleDismiss(finding)}
                            className={`text-xs px-1.5 py-0.5 rounded cursor-pointer transition-opacity ${
                              finding.reviewStatus === 'confirmed' ? 'bg-green-900 text-green-300' :
                              finding.reviewStatus === 'rejected' ? 'bg-red-900 text-red-300 line-through' :
                              'bg-yellow-900 text-yellow-300'
                            } ${reviewUnlocked && !isCompleted ? 'hover:opacity-80' : ''}`}
                            title={reviewUnlocked && !isCompleted ? (isDismissed ? 'Click to un-dismiss' : 'Click to dismiss finding') : undefined}
                            disabled={!reviewUnlocked || isCompleted}
                          >
                            {finding.reviewStatus || 'pending'}
                          </button>
                          {/* UX-03: AI confidence tooltip with Info icon */}
                          {(finding.aiConfidence || finding.confidence) && (
                            <span
                              className="flex items-center gap-0.5 text-xs text-gray-500 cursor-help"
                              title="AI Confidence reflects model certainty from image analysis. High (≥85%): strong pattern match. Medium (50-84%): review recommended. Low (<50%): uncertain — manual review essential."
                            >
                              {finding.aiConfidence || finding.confidence}%
                              <Info
                                size={14}
                                className="text-gray-400 hover:text-gray-300"
                                aria-hidden="true"
                              />
                            </span>
                          )}
                        </div>
                      </div>
                      {/* BUG-11: Delete triggers confirmation dialog */}
                      {reviewUnlocked && !isCompleted && (
                        <button
                          onClick={() => handleRequestDelete(finding.id)}
                          className="text-red-500 hover:text-red-400 text-xs ml-2 flex-shrink-0"
                          title="Delete finding"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* UX-04: Context-aware empty state — distinguish "AI found nothing" from "hasn't started" */}
              {findings.length === 0 && (
                reviewUnlocked ? (
                  <div className="text-center py-8">
                    <Info size={20} className="text-blue-400 mx-auto mb-2" aria-hidden="true" />
                    <p className="text-blue-400 text-sm font-medium">AI analysis complete — no anomalies detected.</p>
                    <p className="text-xs text-blue-300/70 mt-1">Independent clinician review is still required.</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No findings yet</p>
                    <p className="text-xs mt-1">Complete the checklist to begin</p>
                  </div>
                )
              )}
            </div>

            {/* Add finding form — only when review is active (not completed) */}
            {reviewUnlocked && !isCompleted && (
              <div className="p-4 border-t border-gray-700 space-y-2">
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Object.values(AnatomicalRegion).map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFindingClass}
                    onChange={(e) => setNewFindingClass(e.target.value)}
                    placeholder="Finding type (e.g., polyp, ulcer)"
                    className="flex-grow bg-gray-700 text-white rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddFinding()}
                  />
                  <button
                    onClick={handleAddFinding}
                    disabled={!newFindingClass}
                    className="bg-indigo-600 text-white py-1.5 px-4 rounded-md text-sm hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    + Add
                  </button>
                </div>
                <p className="text-xs text-gray-600">@ Frame {currentFrame}</p>
              </div>
            )}

            {/* Completed state */}
            {isCompleted && (
              <div className="p-4 border-t border-gray-700 text-center">
                <p className="text-xs text-gray-500">This procedure is completed. Findings are read-only.</p>
                <button
                  onClick={() => navigate(`/summary/${procedureId}`)}
                  className="mt-2 text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded"
                >
                  View Summary
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
      {/* BUG-11: Finding delete confirmation dialog */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPendingDeleteId(null)} />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Finding</h3>
            <p className="text-sm text-gray-600 mb-1">
              Are you sure you want to permanently delete this finding?
            </p>
            {pendingDeleteFinding && (
              <p className="text-sm font-medium text-gray-800 bg-gray-100 rounded p-2 mb-4">
                {pendingDeleteFinding.classification || pendingDeleteFinding.type || 'Unnamed finding'}
                {' — '}{pendingDeleteFinding.anatomicalRegion || 'unknown region'}
              </p>
            )}
            <p className="text-xs text-gray-500 mb-4">
              To keep the finding in audit history but hide it from the report, use the status badge to dismiss it instead.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingDeleteId(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Viewer;
