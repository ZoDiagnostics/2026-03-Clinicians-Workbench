import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

export const ActivityLog: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Activity Log</h1>
            {/* Placeholder for filter bar */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
              <h2 className="text-lg font-semibold text-gray-700">Filters</h2>
              {/* Filter controls will be implemented here */}
            </div>
            {/* Placeholder for activity table */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Activity log entries will be populated here */}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
