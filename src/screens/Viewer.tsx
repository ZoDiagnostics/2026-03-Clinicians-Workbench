import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useActiveProcedure, useFindings, createFinding, deleteFinding } from '../lib/hooks';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { PreReviewBanner } from '../components/PreReviewBanner';
import { AnatomicalRegion, FindingProvenance, FindingReviewStatus, ProcedureStatus } from '../types/enums';
import { Finding } from '../types/finding';

// SCR-10: Viewer
export const Viewer: React.FC = () => {
  const { procedureId } = useParams<{ procedureId: string }>();
  const procedure = useActiveProcedure(procedureId);
  const findings = useFindings(procedureId);

  const [newFindingClassification, setNewFindingClassification] = useState('');

  const showPreReviewBanner = procedure?.status === ProcedureStatus.READY_FOR_REVIEW && findings.length > 0;

  const handleAddFinding = async () => {
    if (!procedureId || !newFindingClassification) return;

    const newFinding: Omit<Finding, 'id' | 'createdAt' | 'updatedAt'> = {
      procedureId,
      classification: newFindingClassification,
      provenance: FindingProvenance.CLINICIAN_MARKED,
      reviewStatus: FindingReviewStatus.PENDING,
      isIncidental: false,
      anatomicalRegion: AnatomicalRegion.COLON,
      primaryFrameNumber: 0, // Placeholder
      primaryFrameTimestamp: 0, // Placeholder
      additionalFrames: [],
      modificationHistory: [],
      annotations: [],
    };

    await createFinding(procedureId, newFinding);
    setNewFindingClassification('');
  };
  
  const handleDeleteFinding = async (findingId: string) => {
    if (procedureId) {
      await deleteFinding(procedureId, findingId);
    }
  };

  return (
    <div className="flex h-screen bg-gray-800 text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 flex overflow-hidden">
          {/* Main Content: Video Player and Timeline */}
          <div className="flex-1 flex flex-col">
            {showPreReviewBanner && <PreReviewBanner />}
            <div className="flex-1 bg-black flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl text-gray-500">Video Player Placeholder</h2>
                <p className="text-gray-600">Actual video playback will be implemented here.</p>
                 <p className="mt-4 text-sm text-yellow-400">// TODO: External Infrastructure — AI model integration</p>
              </div>
            </div>
            <div className="h-24 bg-gray-900 border-t border-gray-700">
              {/* Timeline will go here */}
              <p className="text-center text-gray-400 pt-2">Timeline Placeholder</p>
            </div>
          </div>

          {/* Right Sidebar: Findings and Annotations */}
          <div className="w-96 bg-gray-900 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold">Findings</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {findings.map((finding) => (
                <div key={finding.id} className="bg-gray-800 p-3 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{finding.classification}</p>
                    <p className="text-sm text-gray-400">Status: {finding.reviewStatus}</p>
                    <p className="text-sm text-gray-400">@{finding.primaryFrameTimestamp}ms</p>
                  </div>
                  <button onClick={() => handleDeleteFinding(finding.id)} className="text-red-500 hover:text-red-400">Delete</button>
                </div>
              ))}
              {findings.length === 0 && (
                <p className="text-gray-500">No findings for this procedure yet.</p>
              )}
            </div>
            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                 <input
                   type="text"
                   value={newFindingClassification}
                   onChange={(e) => setNewFindingClassification(e.target.value)}
                   placeholder="Enter finding classification"
                   className="flex-grow bg-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                 />
                 <button 
                    onClick={handleAddFinding} 
                    className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-500"
                    disabled={!newFindingClassification}
                  >
                    Add
                 </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Viewer;
