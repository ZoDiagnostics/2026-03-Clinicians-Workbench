import React from 'react';

export const PreReviewBanner: React.FC = () => {
  return (
    <div className="bg-blue-900 text-white p-4 flex justify-between items-center">
        <div>
            <h3 className="font-bold">Pre-Review Checklist</h3>
            <p className="text-sm text-blue-200">Confirm settings before starting the review.</p>
        </div>
        <button 
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
        >
            Confirm & Begin Review
        </button>
    </div>
  );
};
