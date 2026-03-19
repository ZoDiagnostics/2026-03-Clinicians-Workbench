import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';

const ManageSubscription: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Subscription & Billing</h1>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Current Plan</h2>
                <p className="text-gray-600">Plan details and billing information coming soon.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ManageSubscription;
