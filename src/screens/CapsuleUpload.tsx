import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth, useActiveProcedure } from '../lib/hooks';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { ProcedureStatus } from '../types/enums';
import { db } from '../lib/firebase';
import { routeByStatus } from '../lib/routeByStatus';

export const CapsuleUpload: React.FC = () => {
  const { procedureId } = useParams<{ procedureId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const procedure = useActiveProcedure(procedureId);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileReady, setFileReady] = useState(false);

  useEffect(() => {
    if (procedure && procedure.status !== ProcedureStatus.CAPSULE_RECEIVED) {
      alert(`This procedure is not ready for upload (current status: ${procedure.status.replace(/_/g, ' ')}). Redirecting...`);
      navigate(routeByStatus(procedure.status, procedure.id));
    }
  }, [procedure, navigate]);

  // This simulates a file being dropped or selected.
  useEffect(() => {
    if (!fileReady) {
      const timer = setTimeout(() => setFileReady(true), 2000); // Simulate processing
      return () => clearTimeout(timer);
    }
  }, [fileReady]);

  const handleSubmit = async () => {
    if (!procedure || !user) {
      setError('Missing procedure or user information.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const procedureRef = doc(db, 'procedures', procedure.id);
      await updateDoc(procedureRef, {
        status: ProcedureStatus.READY_FOR_REVIEW,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
        uploadCompletedAt: serverTimestamp(),
        uploadCompletedBy: user.uid,
      });

      // TODO: This should trigger the `validateCapsule` Cloud Function.

      // Navigate to the next step (viewer)
      navigate(routeByStatus(ProcedureStatus.READY_FOR_REVIEW, procedure.id));

    } catch (err) {
      console.error("Error updating procedure status:", err);
      setError('Failed to complete upload. Please try again.');
      setIsSubmitting(false);
    }
  };
  
  if (!procedure) {
    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <p className="text-gray-500">Loading procedure details...</p>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Capsule Data Upload
            </h1>
            <p className="text-sm text-gray-500 mb-6">Procedure ID: {procedure.id}</p>
            
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                   {/* Heroicon name: solid/check-circle */}
                  <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    Patient Check-in complete. Procedure <span className="font-medium">{procedure.id}</span> is ready for capsule data upload.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="mt-1 text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                     {/* Heroicon name: outline/upload */}
                    <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <h3 className="mt-2 text-lg leading-6 font-medium text-gray-900">Upload Capsule Data</h3>
                  <p className="mt-1 text-sm text-gray-500">This is a placeholder for the real data uploader. Clicking the button below will simulate the upload process.</p>
                  <div className="mt-6">
                    <div className="border-2 border-gray-300 border-dashed rounded-lg px-6 py-10">
                      {!fileReady ? (
                        <div className="text-center">
                          <p className="text-gray-500">Simulating file processing...</p>
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                             <div className="bg-blue-600 h-2.5 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                           {/* Heroicon name: solid/shield-check */}
                          <svg className="mx-auto h-12 w-12 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <p className="mt-2 text-green-600 font-semibold">Data file ready for import.</p>
                          <p className="text-sm text-gray-500">capsule-data-XYZ123.zip (2.4 GB)</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {error && (
                    <div className="mt-4 rounded-md bg-red-50 p-4">
                        <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                )}
                <div className="mt-6 flex justify-end">
                  <button
                      onClick={handleSubmit}
                      disabled={!fileReady || isSubmitting}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                      {isSubmitting ? 'Processing...' : 'Confirm Upload & Start Pre-Review'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default CapsuleUpload;
