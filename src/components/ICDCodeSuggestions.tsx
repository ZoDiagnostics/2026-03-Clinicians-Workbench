import React, { useState } from 'react';
import { TagIcon } from '@heroicons/react/24/solid';

interface ICDCodeSuggestionsProps {
  // procedureId: string;
  // findings: Finding[];
  // onAccept: (codes: any[]) => void;
}

const ICDCodeSuggestions: React.FC<ICDCodeSuggestionsProps> = () => {
  const [selectedTab, setSelectedTab] = useState('ICD-10');

  const handleAccept = (code: any) => {
    // TODO: Implement accept functionality
    console.log(`Accepted code:`, code);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center mb-4">
        <TagIcon className="h-6 w-6 text-blue-500 mr-2" />
        <h2 className="text-lg font-bold">Suggested Codes</h2>
      </div>
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button onClick={() => setSelectedTab('ICD-10')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${selectedTab === 'ICD-10' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            ICD-10
          </button>
          <button onClick={() => setSelectedTab('CPT')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${selectedTab === 'CPT' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
            CPT
          </button>
        </nav>
      </div>

      {selectedTab === 'ICD-10' && (
        <div>
          {/* Placeholder for ICD-10 suggestions */}
          <div className="flex items-center justify-between p-2 border-b">
            <div>
              <div className="font-bold">K21.9</div>
              <div className="text-sm text-gray-500">Gastro-esophageal reflux disease without esophagitis</div>
            </div>
            <input type="checkbox" className="form-checkbox h-5 w-5 text-indigo-600" onChange={() => handleAccept({ code: 'K21.9'})} />
          </div>
        </div>
      )}

      {selectedTab === 'CPT' && (
        <div>
          {/* Placeholder for CPT suggestions */}
          <div className="flex items-center justify-between p-2 border-b">
            <div>
              <div className="font-bold">91110</div>
              <div className="text-sm text-gray-500">Gastrointestinal tract imaging, intraluminal...</div>
            </div>
            <input type="checkbox" className="form-checkbox h-5 w-5 text-indigo-600" onChange={() => handleAccept({ code: '91110'})} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ICDCodeSuggestions;
