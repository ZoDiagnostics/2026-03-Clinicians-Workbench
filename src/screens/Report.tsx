import React from 'react';
import { useParams } from 'react-router-dom';
import { useReport, useFindings } from '../lib/hooks';
import CopilotAutoDraft from '../components/CopilotAutoDraft';
import ICDCodeSuggestions from '../components/ICDCodeSuggestions';

const Report: React.FC = () => {
  const { procedureId } = useParams<{ procedureId: string }>();
  const report = useReport(procedureId);
  const findings = useFindings(procedureId);

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 p-4">
          <h1 className="text-2xl font-bold">Report</h1>
          <div className="flex flex-wrap">
            <div className="w-full lg:w-3/4 pr-4">
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <h2 className="text-lg font-bold mb-2">Findings</h2>
                {/* Findings will be displayed here */}
              </div>
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <h2 className="text-lg font-bold mb-2">Clinical Impression</h2>
                {/* Editable clinical impression */}
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-bold mb-2">Recommendations</h2>
                {/* Editable recommendations */}
              </div>
            </div>
            <div className="w-full lg:w-1/4">
              <CopilotAutoDraft />
              <ICDCodeSuggestions />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Report;
