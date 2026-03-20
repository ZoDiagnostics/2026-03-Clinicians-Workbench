import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useActiveProcedure, useFindings, usePatients, createFinding, deleteFinding } from '../lib/hooks';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { PreReviewBanner } from '../components/PreReviewBanner';
import { FrameViewer } from '../components/FrameViewer';
import { AnatomicalRegion, FindingProvenance, FindingReviewStatus, ProcedureStatus } from '../types/enums';
import { Finding } from '../types/finding';

// SCR-10: Viewer — Capsule endoscopy review screen
export const Viewer: React.FC = () => {
  const { procedureId } = useParams<{ procedureId: string }>();
  const navigate = useNavigate();
  const procedure = useActiveProcedure(procedureId);
  const findings = useFindings(procedureId);
  const allPatients = usePatients();

  const [currentFrame, setCurrentFrame] = useState(0);
  const [newFindingClass, setNewFindingClass] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>(AnatomicalRegion.COLON);

  const patient = procedure ? allPatients.find(p => p.id === procedure.patientId) : null;
  const showPreReview = procedure?.status === ProcedureStatus.READY_FOR_REVIEW;

  // TODO: Load actual frames from Firebase Storage
  // For now, frames array is empty — FrameViewer shows "No Capsule Frames Loaded" state
  // When frames are uploaded, populate this array with Storage URLs:
  // const frames = procedure?.frameUrls || [];
  const frames: string[] = [];

  const handleAddFinding = async () => {
    if (!procedureId || !newFindingClass) return;

    const newFinding: Omit<Finding, 'id' | 'createdAt' | 'updatedAt'> = {
      procedureId,
      classification: newFindingClass,
      provenance: FindingProvenance.CLINICIAN_MARKED,
      reviewStatus: FindingReviewStatus.PENDING,
      isIncidental: false,
      anatomicalRegion: selectedRegion as AnatomicalRegion,
      primaryFrameNumber: currentFrame,
      primaryFrameTimestamp: currentFrame * 250, // ~4fps
      additionalFrames: [],
      modificationHistory: [],
      annotations: [],
    };

    await createFinding(procedureId, newFinding);
    setNewFindingClass('');
  };

  const handleDeleteFinding = async (findingId: string) => {
    if (procedureId) {
      await deleteFinding(procedureId, findingId);
    }
  };

  const handleReviewStarted = () => {
    // Procedure status will update via real-time listener
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
              procedure.status === 'ready_for_review' ? 'bg-green-700 text-green-200' :
              procedure.status === 'draft' ? 'bg-indigo-700 text-indigo-200' :
              'bg-gray-700 text-gray-300'
            }`}>
              {procedure.status.replace(/_/g, ' ')}
            </span>
            <button
              onClick={() => navigate(`/report/${procedureId}`)}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded"
            >
              Go to Report →
            </button>
          </div>
        </div>

        {/* Pre-review banner (only for ready_for_review status) */}
        {showPreReview && (
          <PreReviewBanner
            procedureId={procedure.id}
            studyType={procedure.studyType}
            onReviewStarted={handleReviewStarted}
          />
        )}

        <main className="flex-1 flex overflow-hidden">
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
          <div className="w-96 bg-gray-900 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Findings ({findings.length})</h2>
            </div>

            {/* Findings list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {findings.map((finding) => (
                <div key={finding.id} className="bg-gray-800 p-3 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{finding.classification || finding.type || 'Unnamed finding'}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {finding.anatomicalRegion || finding.region || '-'} • Frame {finding.primaryFrameNumber || finding.frameNumber || 0}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          finding.provenance === 'ai_detected' ? 'bg-blue-900 text-blue-300' : 'bg-green-900 text-green-300'
                        }`}>
                          {finding.provenance === 'ai_detected' ? 'AI' : 'Manual'}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          finding.reviewStatus === 'confirmed' ? 'bg-green-900 text-green-300' :
                          finding.reviewStatus === 'rejected' ? 'bg-red-900 text-red-300' :
                          'bg-yellow-900 text-yellow-300'
                        }`}>
                          {finding.reviewStatus || 'pending'}
                        </span>
                        {(finding.aiConfidence || finding.confidence) && (
                          <span className="text-xs text-gray-500">{finding.aiConfidence || finding.confidence}%</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteFinding(finding.id)}
                      className="text-red-500 hover:text-red-400 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {findings.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No findings yet</p>
                  <p className="text-xs mt-1">Add findings manually or start AI detection</p>
                </div>
              )}
            </div>

            {/* Add finding form */}
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default Viewer;
