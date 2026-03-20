import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, useActiveProcedure, usePatients, useFindings } from '../lib/hooks';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

export const Summary: React.FC = () => {
  const { procedureId } = useParams<{ procedureId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const procedure = useActiveProcedure(procedureId);
  const allPatients = usePatients();
  const findings = useFindings(procedureId);

  const patientMap = useMemo(() =>
    new Map(allPatients.map(p => [p.id, p])),
    [allPatients]
  );

  const patient = procedure ? patientMap.get(procedure.patientId) : null;

  if (!procedure) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">Loading procedure summary...</p>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Procedure Summary</h1>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                procedure.status === 'completed' || procedure.status === 'completed_appended'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {procedure.status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Patient Info */}
            <div className="bg-white shadow sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Patient Information</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient'}
                    </dd>
                  </div>
                  <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">MRN</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {patient?.mrn || '-'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Procedure Details */}
            <div className="bg-white shadow sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Procedure Details</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Study Type</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {procedure.studyType?.replace(/_/g, ' ') || '-'}
                    </dd>
                  </div>
                  <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Urgency</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {procedure.urgency || 'Routine'}
                    </dd>
                  </div>
                  <div className="py-3 sm:py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {procedure.createdAt?.toDate?.() ? procedure.createdAt.toDate().toLocaleDateString() : '-'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Findings */}
            <div className="bg-white shadow sm:rounded-lg mb-6">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Findings ({findings.length})</h3>
              </div>
              <div className="border-t border-gray-200">
                {findings.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {findings.map((finding) => (
                      <li key={finding.id} className="px-6 py-4">
                        <p className="text-sm text-gray-900">{(finding as any).description || finding.classification || finding.id}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-6 py-8 text-center text-gray-500">
                    No findings recorded for this procedure.
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => navigate(`/report/${procedureId}`)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                View Report
              </button>
              <button
                onClick={() => navigate('/worklist')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Back to Worklist
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Summary;
