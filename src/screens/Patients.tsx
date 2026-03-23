import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/hooks';
import { Patient } from '../types/patient';
import { COLLECTIONS } from '../types/firestore-paths';
import { Link } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { ErrorState } from '../components/ErrorState';
import { LoadingSkeleton } from '../components/LoadingSkeleton';

// BRD ZCW-BRD-0011 — Patient Registration
// Required: First Name, Last Name, DOB, Gender, MRN, Phone, Email
// Optional: Middle Name, Preferred Language
// Validation: MRN unique within tenant, DOB in the past

interface NewPatientForm {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: string;
  mrn: string;
  phone: string;
  email: string;
  preferredLanguage: string;
}

const EMPTY_FORM: NewPatientForm = {
  firstName: '', lastName: '', dateOfBirth: '', sex: 'male', mrn: '', phone: '', email: '', preferredLanguage: 'en',
};

export function Patients() {
  const { practiceId, user, loading: authLoading } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewPatientForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPatients = async () => {
    if (!practiceId) return;
    try {
      setLoading(true);
      const patientsRef = collection(db, COLLECTIONS.PATIENTS);
      const q = query(patientsRef, where('practiceId', '==', practiceId));
      const querySnapshot = await getDocs(q);
      const patientList = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Patient[];
      setPatients(patientList);
      setFilteredPatients(patientList);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch patients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatients(); }, [practiceId]);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = patients.filter(p =>
      p.firstName?.toLowerCase().includes(term) ||
      p.lastName?.toLowerCase().includes(term) ||
      p.mrn?.toLowerCase().includes(term)
    );
    setFilteredPatients(filtered);
  }, [searchTerm, patients]);

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // BRD validation: MRN unique, DOB in past
    if (!form.firstName || !form.lastName || !form.mrn || !form.dateOfBirth) {
      setFormError('First Name, Last Name, MRN, and Date of Birth are required.');
      return;
    }

    const dob = new Date(form.dateOfBirth);
    if (dob >= new Date()) {
      setFormError('Date of Birth must be in the past.');
      return;
    }

    // Check MRN uniqueness within practice
    const existingMrn = patients.find(p => p.mrn?.toUpperCase() === form.mrn.toUpperCase());
    if (existingMrn) {
      setFormError(`MRN "${form.mrn}" already exists for ${existingMrn.firstName} ${existingMrn.lastName}.`);
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, COLLECTIONS.PATIENTS), {
        practiceId,
        firstName: form.firstName,
        lastName: form.lastName,
        dateOfBirth: Timestamp.fromDate(dob),
        sex: form.sex,
        mrn: form.mrn.toUpperCase(),
        phone: form.phone,
        email: form.email,
        preferredLanguage: form.preferredLanguage || 'en',
        isArchived: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: user?.uid || 'unknown',
      });
      setForm(EMPTY_FORM);
      setShowModal(false);
      await fetchPatients(); // Refresh list
    } catch (err) {
      console.error(err);
      setFormError('Failed to create patient. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <ErrorState
              title="Couldn't load patients"
              message={error}
              onRetry={fetchPatients}
            />
          </main>
        </div>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <LoadingSkeleton rows={8} />
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
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Patients</h1>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-indigo-700 text-sm"
            >
              + Register Patient
            </button>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by name or MRN..."
              className="w-full px-3 py-2 placeholder-gray-400 border border-gray-300 rounded-md shadow-sm"
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MRN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date of Birth</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sex</th>
                  <th className="relative px-6 py-3"><span className="sr-only">View</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient.lastName}, {patient.firstName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.mrn}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.dateOfBirth?.toDate?.() ? patient.dateOfBirth.toDate().toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.sex}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/patient/${patient.id}`} className="text-indigo-600 hover:text-indigo-900">View</Link>
                    </td>
                  </tr>
                ))}
                {filteredPatients.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No patients found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Registration Modal — BRD ZCW-BRD-0011 */}
          {showModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={() => setShowModal(false)} />
                <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                  <form onSubmit={handleAddPatient}>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Register New Patient</h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">First Name *</label>
                        <input type="text" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                        <input type="text" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">MRN *</label>
                        <input type="text" value={form.mrn} onChange={e => setForm({...form, mrn: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Date of Birth *</label>
                        <input type="date" value={form.dateOfBirth} onChange={e => setForm({...form, dateOfBirth: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Sex</label>
                        <select value={form.sex} onChange={e => setForm({...form, sex: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Preferred Language</label>
                        <select value={form.preferredLanguage} onChange={e => setForm({...form, preferredLanguage: e.target.value})}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500">
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="zh">Chinese</option>
                          <option value="vi">Vietnamese</option>
                        </select>
                      </div>
                    </div>

                    {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}

                    <div className="mt-6 flex justify-end gap-3">
                      <button type="button" onClick={() => { setShowModal(false); setFormError(null); }}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-700 bg-white hover:bg-gray-50">
                        Cancel
                      </button>
                      <button type="submit" disabled={submitting}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm text-sm hover:bg-indigo-700 disabled:bg-gray-400">
                        {submitting ? 'Registering...' : 'Register Patient'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
