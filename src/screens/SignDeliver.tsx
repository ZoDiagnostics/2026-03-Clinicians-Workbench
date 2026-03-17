import React from 'react';
import { useParams } from 'react-router-dom';
import { useReport } from '../lib/hooks';
import { LockClosedIcon, DocumentCheckIcon } from '@heroicons/react/24/solid';

const SignDeliver: React.FC = () => {
  const { procedureId } = useParams<{ procedureId: string }>();
  const report = useReport(procedureId);

  const handleSign = () => {
    // TODO: Implement sign functionality
    console.log('Signing report...');
  };

  const handleDeliver = (method: string) => {
    // TODO: Implement deliver functionality
    console.log(`Delivering report via ${method}...`);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Sign & Deliver</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center">
            <DocumentCheckIcon className="h-6 w-6 mr-2" />
            Final Report Preview
          </h2>
          <div className="prose max-w-none">
            {/* Full report content will be displayed here */}
            <p>This is where the full, finalized report content will be rendered for preview before signing.</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <LockClosedIcon className="h-6 w-6 mr-2" />
              E-Signature
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              By signing below, you attest that you have reviewed this report and confirm its accuracy.
            </p>
            <button
              onClick={handleSign}
              className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign Report
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">Delivery Options</h2>
            <div className="space-y-4">
              <button
                onClick={() => handleDeliver('ehr')}
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Deliver to EHR
              </button>
              <button
                onClick={() => handleDeliver('pacs')}
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Deliver to PACS
              </button>
              <button
                onClick={() => handleDeliver('print')}
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Print PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignDeliver;
