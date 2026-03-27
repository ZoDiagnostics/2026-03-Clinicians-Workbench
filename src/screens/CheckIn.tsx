import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth, useActiveProcedure, usePatients } from '../lib/hooks';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { ProcedureStatus } from '../types/enums';
import { db } from '../lib/firebase';
import { routeByStatus } from '../lib/routeByStatus';

export const CheckIn: React.FC = () => {
  const { procedureId } = useParams<{ procedureId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const procedure = useActiveProcedure(procedureId);
  const allPatients = usePatients();
  const patient = procedure ? allPatients.find(p => p.id === procedure.patientId) : null;

  const [consentGiven, setConsentGiven] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  // BUG-60: Replace blocking alert() with non-blocking redirect.
  // alert() froze the browser tab when navigating directly to /checkin/{id}.
  useEffect(() => {
    if (procedure && procedure.status !== ProcedureStatus.CAPSULE_RETURN_PENDING) {
      setRedirecting(true);
      navigate(routeByStatus(procedure.status, procedure.id), { replace: true });
    }
  }, [procedure, navigate]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!procedure || !user) {
      setError('Missing procedure or user information.');
      return;
    }
    if (!consentGiven) {
      setError('Patient consent is required to proceed.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const procedureRef = doc(db, 'procedures', procedure.id);
      await updateDoc(procedureRef, {
        status: ProcedureStatus.CAPSULE_RECEIVED,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
        checkInCompletedAt: serverTimestamp(),
        checkInCompletedBy: user.uid,
        'patientConsent.given': true,
        'patientConsent.timestamp': serverTimestamp(),
      });

      // Navigate to the next step (upload)
      navigate(routeByStatus(ProcedureStatus.CAPSULE_RECEIVED, procedure.id));

    } catch (err) {
      console.error("Error updating procedure status:", err);
      setError('Failed to submit check-in. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (!procedure || redirecting) {
    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <p className="text-gray-500">{redirecting ? 'Redirecting to current step...' : 'Loading procedure details...'}</p>
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
              Patient Check-In
            </h1>
            <p className="text-sm text-gray-500 mb-6">Procedure ID: {procedure.id}</p>

            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Patient Consent</h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500">
                    {/* TODO: Fetch patient name from usePatients hook */}
                    <p className="mb-4">Patient: <span className="font-semibold">{patient ? `${patient.firstName} ${patient.lastName} (MRN: ${patient.mrn})` : procedure.patientId}</span></p>
                    <p>
                        Please review the consent form with the patient. By checking the box below, you confirm that the patient has read, understood, and agreed to the terms of the procedure.
                    </p>
                </div>
                <form className="mt-5" onSubmit={handleSubmit}>
                    <div className="rounded-md bg-gray-50 p-6 border border-gray-200">
                        <h4 className="text-md font-semibold text-gray-700 mb-3">Consent for Capsule Endoscopy</h4>
                        <p className="text-sm text-gray-600 mb-4">I, the patient, hereby consent to undergo a capsule endoscopy procedure. I understand the potential risks and benefits, which have been explained to me by the clinical staff. I confirm that I have followed all pre-procedure instructions. I authorize the release of my medical information related to this procedure to the necessary medical personnel.</p>
                        <div className="relative flex items-start">
                            <div className="flex items-center h-5">
                                <input
                                id="consent"
                                name="consent"
                                type="checkbox"
                                checked={consentGiven}
                                onChange={(e) => setConsentGiven(e.target.checked)}
                                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="consent" className="font-medium text-gray-700">
                                I confirm the patient has given their informed consent.
                                </label>
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
                            type="submit"
                            disabled={!consentGiven || isSubmitting}
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Submitting...' : 'Complete Check-In'}
                        </button>
                    </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CheckIn;
