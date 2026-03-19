import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';

const ManageICDCodes: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">ICD & CPT Code Management</h1>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">Code management interface coming soon.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ManageICDCodes;
