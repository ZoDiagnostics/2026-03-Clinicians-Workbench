import React, { useState, useEffect } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/hooks';

interface ChecklistItem {
  id: string;
  label: string;
  category: 'clinical' | 'config';
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  // Clinical verification items
  { id: 'patient_identity', label: 'Patient identity confirmed', category: 'clinical' },
  { id: 'consent_on_file', label: 'Informed consent on file', category: 'clinical' },
  { id: 'contraindications_reviewed', label: 'Contraindications reviewed — no blocking conditions', category: 'clinical' },
  { id: 'prior_studies_checked', label: 'Prior studies and history reviewed', category: 'clinical' },
  // BRD spec configuration items
  { id: 'study_type_verified', label: 'Study type confirmed and matches indication', category: 'config' },
  { id: 'sensitivity_threshold', label: 'AI sensitivity threshold set appropriately', category: 'config' },
  { id: 'crohns_mode', label: 'Crohn\'s monitoring mode configured (if applicable)', category: 'config' },
  { id: 'region_focus', label: 'Primary anatomical focus region verified', category: 'config' },
];

interface PreReviewBannerProps {
  procedureId: string;
  studyType?: string;
  onReviewStarted?: () => void;
}

export const PreReviewBanner: React.FC<PreReviewBannerProps> = ({ procedureId, studyType, onReviewStarted }) => {
  const { user } = useAuth();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const allChecked = checkedItems.size === CHECKLIST_ITEMS.length;

  const toggleItem = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBeginReview = async () => {
    if (!allChecked || !user || submitting) return;
    setSubmitting(true);

    try {
      const procedureRef = doc(db, 'procedures', procedureId);
      await updateDoc(procedureRef, {
        'preReviewConfig.checklistCompletedAt': serverTimestamp(),
        'preReviewConfig.checklistCompletedBy': user.uid,
        'preReviewConfig.checklistItems': Array.from(checkedItems),
        status: 'draft',
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      onReviewStarted?.();
    } catch (err) {
      console.error('Failed to start review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const completedCount = checkedItems.size;
  const totalCount = CHECKLIST_ITEMS.length;
  const progressPercent = (completedCount / totalCount) * 100;

  return (
    <div className="bg-blue-900 text-white">
      <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-800 flex items-center justify-center text-sm font-bold">
              {completedCount}/{totalCount}
            </div>
          </div>
          <div>
            <h3 className="font-bold">Pre-Review Checklist</h3>
            <p className="text-sm text-blue-200">
              {allChecked ? 'All items confirmed — ready to begin review' : `${totalCount - completedCount} items remaining`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {studyType && (
            <span className="px-2 py-1 bg-blue-800 rounded text-xs">
              {studyType.replace(/_/g, ' ')}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleBeginReview(); }}
            disabled={!allChecked || submitting}
            className={`font-bold py-2 px-4 rounded transition-colors ${
              allChecked
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {submitting ? 'Starting...' : 'Confirm & Begin Review'}
          </button>
          <span className="text-blue-300">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-1">
        <div className="w-full bg-blue-800 rounded-full h-1.5">
          <div className="bg-green-400 h-1.5 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
            <div>
              <h4 className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2">Clinical Verification</h4>
              {CHECKLIST_ITEMS.filter(i => i.category === 'clinical').map(item => (
                <label key={item.id} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-blue-800/50 rounded px-2 -mx-2">
                  <input
                    type="checkbox"
                    checked={checkedItems.has(item.id)}
                    onChange={() => toggleItem(item.id)}
                    className="h-4 w-4 rounded border-blue-400 text-green-500 focus:ring-green-500 focus:ring-offset-0 bg-blue-800"
                  />
                  <span className={`text-sm ${checkedItems.has(item.id) ? 'text-green-300 line-through' : 'text-blue-100'}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2">Configuration</h4>
              {CHECKLIST_ITEMS.filter(i => i.category === 'config').map(item => (
                <label key={item.id} className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-blue-800/50 rounded px-2 -mx-2">
                  <input
                    type="checkbox"
                    checked={checkedItems.has(item.id)}
                    onChange={() => toggleItem(item.id)}
                    className="h-4 w-4 rounded border-blue-400 text-green-500 focus:ring-green-500 focus:ring-offset-0 bg-blue-800"
                  />
                  <span className={`text-sm ${checkedItems.has(item.id) ? 'text-green-300 line-through' : 'text-blue-100'}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
