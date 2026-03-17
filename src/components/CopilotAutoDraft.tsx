import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/solid';

interface CopilotAutoDraftProps {
  // procedureId: string;
  // findings: Finding[];
  // onAccept: (section: string, content: string) => void;
  // onEdit: (section: string, content: string) => void;
  // isLoading?: boolean;
}

const CopilotAutoDraft: React.FC<CopilotAutoDraftProps> = () => {

  const handleAccept = (section: string, content: string) => {
    // TODO: Implement accept functionality
    console.log(`Accepted ${section}: ${content}`);
  };

  const handleEdit = (section: string, content: string) => {
    // TODO: Implement edit functionality
    console.log(`Edited ${section}: ${content}`);
  };

  const handleRegenerate = (section: string) => {
    // TODO: External Infrastructure
    console.log(`Regenerating ${section}`);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="flex items-center mb-4">
        <SparklesIcon className="h-6 w-6 text-blue-500 mr-2" />
        <h2 className="text-lg font-bold">Copilot Auto-Draft</h2>
      </div>
      {/* Clinical Impression Section */}
      <div className="mb-4 p-4 border rounded-lg">
        <h3 className="font-bold mb-2">Clinical Impression</h3>
        <p className="text-sm text-gray-700 mb-2">This is an AI-generated clinical impression based on the findings.</p>
        <div className="flex justify-end space-x-2">
          <button className="px-3 py-1 text-sm font-semibold text-white bg-green-500 rounded hover:bg-green-600" onClick={() => handleAccept('impression', '...')}>Accept</button>
          <button className="px-3 py-1 text-sm font-semibold text-gray-700 bg-gray-200 rounded hover:bg-gray-300" onClick={() => handleEdit('impression', '...')}>Edit</button>
          <button className="px-3 py-1 text-sm font-semibold text-gray-700 bg-gray-200 rounded hover:bg-gray-300" onClick={() => handleRegenerate('impression')}>Regenerate</button>
        </div>
      </div>
      {/* Recommendations Section */}
      <div className="p-4 border rounded-lg">
        <h3 className="font-bold mb-2">Recommendations</h3>
        <p className="text-sm text-gray-700 mb-2">These are AI-generated recommendations.</p>
        <div className="flex justify-end space-x-2">
          <button className="px-3 py-1 text-sm font-semibold text-white bg-green-500 rounded hover:bg-green-600" onClick={() => handleAccept('recommendations', '...')}>Accept</button>
          <button className="px-3 py-1 text-sm font-semibold text-gray-700 bg-gray-200 rounded hover:bg-gray-300" onClick={() => handleEdit('recommendations', '...')}>Edit</button>
          <button className="px-3 py-1 text-sm font-semibold text-gray-700 bg-gray-200 rounded hover:bg-gray-300" onClick={() => handleRegenerate('recommendations')}>Regenerate</button>
        </div>
      </div>
    </div>
  );
};

export default CopilotAutoDraft;
