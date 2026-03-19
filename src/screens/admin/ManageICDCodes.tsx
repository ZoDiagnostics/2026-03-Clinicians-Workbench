import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';

const ManageICDCodes: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto py-8">
            <button onClick={() => navigate('/admin')} className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 flex items-center gap-1">&larr; Back to Admin</button>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">ICD & CPT Code Management</h1>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">Code management interface coming soon. This screen will allow you to manage favorite ICD-10 and CPT codes used by the Copilot for code suggestions.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ManageICDCodes;
