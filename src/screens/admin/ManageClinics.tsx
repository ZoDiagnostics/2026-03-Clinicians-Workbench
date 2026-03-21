import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClinics, useAuth } from '../../lib/hooks';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { Clinic } from '../../types/practice';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { COLLECTIONS } from '../../types/firestore-paths';

const ManageClinics: React.FC = () => {
  const navigate = useNavigate();
  const { practiceId, role } = useAuth();
  const clinics = useClinics();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);

  // BUG-10: Role gate — only admin and clinician_admin may access admin sub-routes
  if (role !== 'admin' && role !== 'clinician_admin') {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">This page is restricted to administrators only.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const openAddModal = () => {
    setEditingClinic(null);
    setIsModalOpen(true);
  };

  const openEditModal = (clinic: Clinic) => {
    setEditingClinic(clinic);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto py-8">
            <button onClick={() => navigate('/admin')} className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 flex items-center gap-1">&larr; Back to Admin</button>
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Manage Clinics</h1>
              <button
                onClick={openAddModal}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-indigo-700"
              >
                Add Clinic
              </button>
            </div>
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul className="divide-y divide-gray-200">
                {clinics.map((clinic) => (
                  <li key={clinic.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {clinic.name}
                        </p>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <button
                            onClick={() => openEditModal(clinic)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </main>
      </div>
      {isModalOpen && (
        <AddEditClinicModal
          clinic={editingClinic}
          practiceId={practiceId!}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

interface AddEditClinicModalProps {
  clinic: Clinic | null;
  practiceId: string;
  onClose: () => void;
}

const AddEditClinicModal: React.FC<AddEditClinicModalProps> = ({ clinic, practiceId, onClose }) => {
  const [name, setName] = useState(clinic?.name || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clinic) {
      const clinicRef = doc(db, COLLECTIONS.CLINICS(practiceId), clinic.id);
      await updateDoc(clinicRef, { name });
    } else {
      await addDoc(collection(db, COLLECTIONS.CLINICS(practiceId)), { name });
    }
    onClose();
  };

  return (
    <div className="fixed z-10 inset-0 overflow-y-auto">
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <form onSubmit={handleSubmit}>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{clinic ? 'Edit' : 'Add'} Clinic</h3>
                    <div className="mt-6">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Clinic Name</label>
                        <input type="text" name="name" id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                    </div>
                    <div className="mt-8 sm:flex sm:flex-row-reverse">
                        <button type="submit" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm">
                            Save
                        </button>
                        <button type="button" onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm">
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
  );
};

export default ManageClinics;
