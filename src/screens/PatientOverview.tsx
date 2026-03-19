import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/hooks';
import { Patient } from '../types/patient';
import { COLLECTIONS } from '../types/firestore-paths';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

export function PatientOverview() {
  const { id } = useParams<{ id: string }>();
  const { practiceId, loading: authLoading } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!practiceId || !id) return;

    const fetchPatient = async () => {
      try {
        setLoading(true);
        const patientRef = doc(db, COLLECTIONS.PATIENTS, id);
        const docSnap = await getDoc(patientRef);

        if (docSnap.exists() && docSnap.data().practiceId === practiceId) {
          setPatient({ ...docSnap.data(), id: docSnap.id } as Patient);
        } else {
          setError("Patient not found or access denied.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch patient data.");
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [practiceId, id]);

  if (authLoading || loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-6">{error}</div>;
  }

  if (!patient) {
    return <div className="p-6">Patient not found.</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Patient Overview</h1>
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {patient.firstName} {patient.lastName}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            MRN: {patient.mrn}
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.dateOfBirth.toDate().toLocaleDateString()}</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Sex</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.sex}</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Email address</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.email}</dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{patient.phone}</dd>
            </div>
          </dl>
        </div>
      </div>
        </main>
      </div>
    </div>
  );
}
