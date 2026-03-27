import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Info } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, useActiveProcedure, useFindings, usePatients, useCapsuleFrames, createFinding, deleteFinding, updateFinding } from '../lib/hooks';
import { Sidebar } from '../components/Sidebar';
import { ViewerHeader } from '../components/ViewerHeader';
import { PreReviewBanner } from '../components/PreReviewBanner';
import { FrameViewer } from '../components/FrameViewer';
import { AnatomicalRegion, FindingProvenance, FindingReviewStatus, ProcedureStatus, UserRole } from '../types/enums';
import { Finding } from '../types/finding';
import { cestToAnatomicalRegion, isImageQualityFinding } from '../types/capsule-image';

// SCR-10: Viewer — Capsule endoscopy review screen
// UX Flow:
// 1. If status=ready_for_review → show Pre-Review checklist first, everything else gated
// 2. After checklist complete (status changes to draft) → unlock findings panel + navigation
// 3. Frame viewer shows "No frames" state until image pipeline is connected

export const Viewer: React.FC = () => {
  const { procedureId } = useParams<{ procedureId: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const procedure = useActiveProcedure(procedureId);
  const findings = useFindings(procedureId);
  const allPatients = usePatients();
  // BUG-61: clinician_noauth can review/annotate but cannot sign
  const canSign = role === UserRole.CLINICIAN_AUTH || role === UserRole.CLINICIAN_ADMIN;

  const [currentFrame, setCurrentFrame] = useState(0);
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [imageQualityExpanded, setImageQualityExpanded] = useState(false);
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

  // BUILD_09: Fetch capsule frames + AI analysis from pipeline
  const { data: capsuleData, loading: framesLoading, error: framesError } =
    useCapsuleFrames(procedure?.capsuleSerialNumber);

  // Extract frame URLs for FrameViewer (signed HTTPS URLs from getCapsuleFrames)
  const frames = capsuleData?.frames.map(f => f.url) ?? [];

  // Clear finding selection when frame changes via playback or timeline scrub
  // (i.e., any navigation that isn't a finding click)
  const handleFrameChange = useCallback((frameIndex: number) => {
    setCurrentFrame(frameIndex);
    setSelectedFindingId(null);
  }, []);

  // Extract AI-detected anomaly frames for finding seeding
  const aiFrames = capsuleData?.frames.filter(f =>
    f.analysis?.anomaly_detected && f.status === 'processed'
  ) ?? [];

  // Ref to prevent duplicate AI finding seeding across re-renders
  const aiSeedingDone = useRef(false);

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

  // BUILD_09 §4D: One-time AI finding seed — create Finding documents from pipeline anomalies
  // Seeds on capsule data arrival regardless of review status so clinician can preview
  // AI findings (read-only) during pre-review configuration.
  useEffect(() => {
    if (!capsuleData || !procedureId || aiSeedingDone.current) return;

    // Check if AI findings already exist for this procedure
    const hasAiFindings = findings.some(f => f.provenance === FindingProvenance.AI_DETECTED);
    if (hasAiFindings) {
      aiSeedingDone.current = true;
      return;
    }

    // No anomaly frames → nothing to seed
    if (aiFrames.length === 0) {
      aiSeedingDone.current = true;
      return;
    }

    // Mark as done immediately to prevent re-entry from state updates
    aiSeedingDone.current = true;

    // Seed each anomaly as a Finding document
    // primaryFrameNumber stores the DEVICE frame number (e.g., 30019 from 00030019.bmp)
    // — this is clinically meaningful (position in full ~50K frame capsule transit).
    // Navigation mapping (device frame → array index) is handled in handleFindingClick.
    const seedFindings = async () => {
      for (const frame of aiFrames) {
        const analysis = frame.analysis!;
        try {
          await createFinding(procedureId, {
            procedureId,
            classification: analysis.primary_finding || 'Unknown anomaly',
            provenance: FindingProvenance.AI_DETECTED,
            reviewStatus: FindingReviewStatus.PENDING,
            isIncidental: false,
            anatomicalRegion: cestToAnatomicalRegion(analysis.anatomical_location),
            primaryFrameNumber: parseInt(frame.filename.replace(/\D/g, '')) || 0,
            primaryFrameTimestamp: 0,
            additionalFrames: [],
            modificationHistory: [],
            annotations: [],
            aiConfidence: Math.round((analysis.confidence_score || 0) * 100),
          });
        } catch (err) {
          console.error('[Viewer] Failed to seed AI finding:', err);
        }
      }
    };

    seedFindings();
  }, [capsuleData, procedureId, findings, aiFrames]);

  // BUILD_09 §4E: Frame-finding linking — click a finding to jump to its frame
  // primaryFrameNumber is the device frame number (e.g., 30019), NOT an array index.
  // Build a lookup from device frame number → array index for navigation.
  const frameNumberToIndex = useMemo(() => {
    if (!capsuleData?.frames) return new Map<number, number>();
    const map = new Map<number, number>();
    capsuleData.frames.forEach((f, idx) => {
      const deviceNum = parseInt(f.filename.replace(/\D/g, '')) || 0;
      map.set(deviceNum, idx);
    });
    return map;
  }, [capsuleData?.frames]);

  const handleFindingClick = (finding: Finding) => {
    setSelectedFindingId(finding.id);
    const deviceFrame = finding.primaryFrameNumber ?? finding.frameNumber ?? 0;
    const arrayIndex = frameNumberToIndex.get(deviceFrame);
    if (arrayIndex !== undefined) {
      setCurrentFrame(arrayIndex);
    }
  };

  if (!procedure) {
    return (
      <div className="flex h-screen bg-gray-800">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <ViewerHeader currentStep={3} procedureId={procedureId} />
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
        <ViewerHeader currentStep={3} />

        {/* Patient info bar */}
        <div className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {patient ? `${patient.firstName} ${patient.lastName}` : 'Loading...'}
            </span>
            {patient?.mrn && <span className="text-xs text-gray-400">MRN: {patient.mrn}</span>}
            <span className="text-xs text-gray-400">|</span>
            <span className="text-xs text-gray-400">{procedure.studyType?.replace(/_/g, ' ')}</span>
            {/* BUILD_09 §4C: Capsule metadata in info bar */}
            {capsuleData && (
              <>
                <span className="text-xs text-gray-400">|</span>
                <span className="text-xs text-gray-400">
                  Capsule: {capsuleData.capsuleSerial}
                </span>
                <span className="text-xs text-gray-400">
                  {capsuleData.totalFrames.toLocaleString()} frames
                  ({capsuleData.anomalyFrames} anomalies)
                </span>
              </>
            )}
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
            {/* BUG-08: Always visible; disabled during pre-review or for noauth role.
                BUG-61: noauth sees a role message instead of generic lock. */}
            <button
              onClick={reviewUnlocked && canSign ? () => navigate(`/report/${procedureId}`) : undefined}
              disabled={!reviewUnlocked || !canSign}
              title={!reviewUnlocked ? 'Complete pre-review checklist first' : !canSign ? 'Only authorized clinicians can sign reports' : undefined}
              className={`text-xs px-3 py-1 rounded transition-colors ${
                reviewUnlocked && canSign
                  ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-60'
              }`}
            >
              {!canSign && reviewUnlocked ? 'Sign Restricted' : 'Go to Report →'}
            </button>
          </div>
        </div>

        {/* Pre-review checklist (only for ready_for_review status) */}
        {isPreReview && (
          <PreReviewBanner
            procedureId={procedure.id}
            studyType={procedure.studyType}
          />
        )}

        {/* flex-col on mobile (frame stacked above findings), flex-row on md+ */}
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* Main Content: Frame Viewer */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* BUILD_09 §4B: Loading state while fetching pipeline frames */}
            {framesLoading && (
              <div className="flex-1 flex items-center justify-center bg-gray-900 text-gray-400">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
                  <p>Loading capsule frames...</p>
                  <p className="text-xs mt-1 text-gray-600">
                    {procedure?.capsuleSerialNumber}
                  </p>
                </div>
              </div>
            )}
            {/* BUILD_09 §4B: Error state if pipeline fetch fails */}
            {framesError && !framesLoading && (
              <div className="flex-1 flex items-center justify-center bg-gray-900 text-red-400">
                <div className="text-center">
                  <p>Failed to load capsule frames</p>
                  <p className="text-xs mt-1 text-gray-600">{framesError.message}</p>
                </div>
              </div>
            )}
            {/* Normal FrameViewer — shown when not loading and no error */}
            {!framesLoading && !framesError && (
              <FrameViewer
                frames={frames}
                currentFrame={currentFrame}
                onFrameChange={handleFrameChange}
                fps={4}
              />
            )}
          </div>

          {/* Findings Panel: full-width on mobile, fixed w-96 sidebar on md+ */}
          <div className={`w-full md:w-96 bg-gray-900 border-t border-gray-700 md:border-t-0 md:border-l flex flex-col transition-opacity ${
            reviewUnlocked ? 'opacity-100' : 'opacity-40 pointer-events-none'
          }`}>
            {(() => {
              // Split findings into clinical vs image quality, both sorted by frame number
              const sortByFrame = (a: Finding, b: Finding) =>
                (a.primaryFrameNumber ?? a.frameNumber ?? 0) - (b.primaryFrameNumber ?? b.frameNumber ?? 0);
              const clinicalFindings = [...findings].filter(f => !isImageQualityFinding(f.classification || '')).sort(sortByFrame);
              const imageQualityFindings = [...findings].filter(f => isImageQualityFinding(f.classification || '')).sort(sortByFrame);

              // Reusable finding card renderer
              const renderFindingCard = (finding: Finding) => {
                const isDismissed = finding.reviewStatus === FindingReviewStatus.REJECTED;
                const isSelected = finding.id === selectedFindingId;
                return (
                  <div
                    key={finding.id}
                    ref={isSelected ? (el: HTMLDivElement | null) => el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) : undefined}
                    className={`p-3 rounded-lg cursor-pointer transition-all border-2 ${
                      isSelected
                        ? 'bg-indigo-900/60 border-indigo-400 ring-1 ring-indigo-400/50'
                        : 'bg-gray-800 border-transparent hover:bg-gray-750 hover:border-gray-600'
                    } ${isDismissed ? 'opacity-50' : ''}`}
                    onClick={() => handleFindingClick(finding)}
                    title={`Jump to frame ${finding.primaryFrameNumber || finding.frameNumber || 0}`}
                  >
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
                          <button
                            onClick={(e) => { e.stopPropagation(); reviewUnlocked && !isCompleted && handleToggleDismiss(finding); }}
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
                          {(finding.aiConfidence || finding.confidence) && (
                            <span className="flex items-center gap-0.5 text-xs text-gray-500 cursor-help"
                              title="AI Confidence reflects model certainty from image analysis. High (≥85%): strong pattern match. Medium (50-84%): review recommended. Low (<50%): uncertain — manual review essential.">
                              {finding.aiConfidence || finding.confidence}%
                              <Info size={14} className="text-gray-400 hover:text-gray-300" aria-hidden="true" />
                            </span>
                          )}
                        </div>
                      </div>
                      {reviewUnlocked && !isCompleted && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRequestDelete(finding.id); }}
                          className="text-red-500 hover:text-red-400 text-xs ml-2 flex-shrink-0"
                          title="Delete finding"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              };

              return (
                <>
                  {/* Header */}
                  <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Findings ({findings.length})</h2>
                    {!reviewUnlocked && (
                      <span className="text-xs text-yellow-400 bg-yellow-900/50 px-2 py-0.5 rounded">Locked</span>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {/* Clinical Findings — expanded by default */}
                    <div className="border-b border-gray-700">
                      <div className="px-4 py-2 bg-gray-800/50 flex items-center justify-between">
                        <span className="text-sm font-semibold text-red-300">Clinical Findings</span>
                        <span className="text-xs bg-red-900/50 text-red-300 px-2 py-0.5 rounded-full font-medium">{clinicalFindings.length}</span>
                      </div>
                      <div className="px-4 py-2 space-y-2">
                        {clinicalFindings.map(renderFindingCard)}
                        {clinicalFindings.length === 0 && (
                          <p className="text-xs text-gray-500 text-center py-3">No clinical findings detected</p>
                        )}
                      </div>
                    </div>

                    {/* Image Quality — collapsed by default */}
                    <div>
                      <div
                        className="px-4 py-2 bg-gray-800/50 flex items-center justify-between cursor-pointer hover:bg-gray-800/70"
                        onClick={() => setImageQualityExpanded(prev => !prev)}
                      >
                        <span className="text-sm font-semibold text-gray-400">Image Quality</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full font-medium">{imageQualityFindings.length}</span>
                          <span className="text-gray-500 text-xs">{imageQualityExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      {imageQualityExpanded && (
                        <div className="px-4 py-2 space-y-2">
                          {imageQualityFindings.map(renderFindingCard)}
                          {imageQualityFindings.length === 0 && (
                            <p className="text-xs text-gray-500 text-center py-3">No image quality issues</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Empty state when no findings at all */}
                    {findings.length === 0 && (
                      <div className="px-4 py-6 text-center text-gray-500">
                        {capsuleData && capsuleData.anomalyFrames > 0 ? (
                          <>
                            <div className="w-10 h-10 rounded-full bg-indigo-900/50 flex items-center justify-center mx-auto mb-2">
                              <span className="text-sm font-bold text-indigo-300">{capsuleData.anomalyFrames}</span>
                            </div>
                            <p className="text-indigo-300 text-sm font-medium">AI-detected anomalies ready for review</p>
                            <p className="text-xs mt-1 text-gray-500">Complete the checklist to unlock findings</p>
                          </>
                        ) : (
                          <>
                            <p>No findings yet</p>
                            <p className="text-xs mt-1">Complete the checklist to begin</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

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
