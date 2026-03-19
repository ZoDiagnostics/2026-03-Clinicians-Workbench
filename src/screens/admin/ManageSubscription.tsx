import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';

const ManageSubscription: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto py-8">
            <button onClick={() => navigate('/admin')} className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 flex items-center gap-1">&larr; Back to Admin</button>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Subscription & Billing</h1>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Current Plan</h2>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">Spark (Free)</span>
                <p className="text-gray-600 mt-2">Plan details and billing management coming soon.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ManageSubscription;
