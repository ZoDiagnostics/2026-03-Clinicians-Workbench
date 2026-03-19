import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/hooks';
import { Patient } from '../types/patient';
import { COLLECTIONS } from '../types/firestore-paths';
import { Link } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

export function Patients() {
  const { practiceId, loading: authLoading } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!practiceId) return;

    const fetchPatients = async () => {
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

    fetchPatients();
  }, [practiceId]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filteredData = patients.filter(item =>
      item.firstName.toLowerCase().includes(lowercasedFilter) ||
      item.lastName.toLowerCase().includes(lowercasedFilter) ||
      item.mrn.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredPatients(filteredData);
  }, [searchTerm, patients]);

  if (authLoading || loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Patients</h1>
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
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MRN</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Birth</th>
                        <th scope="col" className="relative px-6 py-3">
                            <span className="sr-only">View</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPatients.map((patient) => (
                        <tr key={patient.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient.lastName}, {patient.firstName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.mrn}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.dateOfBirth.toDate().toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <Link to={`/patient/${patient.id}`} className="text-indigo-600 hover:text-indigo-900">View</Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        </main>
      </div>
    </div>
  );
}
