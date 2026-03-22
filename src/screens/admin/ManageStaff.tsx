import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useStaff, useClinics } from '../../lib/hooks';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { User } from '../../types/user';
import { UserRole, USER_ROLE_LABELS } from '../../types/enums';
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

const ManageStaff: React.FC = () => {
  const navigate = useNavigate();
  const { practiceId, role } = useAuth();
  const staff = useStaff();
  const clinics = useClinics();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

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
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
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
              <h1 className="text-3xl font-bold text-gray-900">Manage Staff</h1>
              <button
                onClick={openAddModal}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-indigo-700"
              >
                Add Staff
              </button>
            </div>
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul className="divide-y divide-gray-200">
                {staff.map((user) => (
                  <li key={user.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {user.isActive ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            {user.email}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            {USER_ROLE_LABELS[user.role]}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <button
                            onClick={() => openEditModal(user)}
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
        <AddEditStaffModal
          user={editingUser}
          clinics={clinics}
          practiceId={practiceId!}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

interface AddEditStaffModalProps {
  user: User | null;
  clinics: { id: string; name: string }[];
  practiceId: string;
  onClose: () => void;
}

const AddEditStaffModal: React.FC<AddEditStaffModalProps> = ({ user, clinics, practiceId, onClose }) => {
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    role: user?.role || UserRole.CLINICAL_STAFF,
    clinicIds: user?.clinicIds || [],
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleClinicChange = (clinicId: string) => {
    const newClinicIds = formData.clinicIds.includes(clinicId)
      ? formData.clinicIds.filter((id) => id !== clinicId)
      : [...formData.clinicIds, clinicId];
    setFormData({ ...formData, clinicIds: newClinicIds });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userManagement = httpsCallable(functions, 'userManagement');
    if (user) {
      await userManagement({ action: 'update', userId: user.id, data: formData });
    } else {
      await userManagement({ action: 'create', practiceId, data: formData });
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
            <h3 className="text-lg leading-6 font-medium text-gray-900">{user ? 'Edit' : 'Add'} Staff Member</h3>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
                <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
                <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              <div className="sm:col-span-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="email" id="email" value={formData.email} onChange={handleInputChange} disabled={!!user} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
              </div>
              <div className="sm:col-span-6">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                <select id="role" name="role" value={formData.role} onChange={handleInputChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                  {Object.values(UserRole).map(role => <option key={role} value={role}>{USER_ROLE_LABELS[role]}</option>)}
                </select>
              </div>
              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-gray-700">Clinics</label>
                <div className="mt-2 space-y-2">
                  {clinics.map(clinic => (
                    <div key={clinic.id} className="flex items-center">
                      <input id={`clinic-${clinic.id}`} name="clinics" type="checkbox" checked={formData.clinicIds.includes(clinic.id)} onChange={() => handleClinicChange(clinic.id)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                      <label htmlFor={`clinic-${clinic.id}`} className="ml-3 text-sm text-gray-700">{clinic.name}</label>
                    </div>
                  ))}
                </div>
              </div>
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

export default ManageStaff;
