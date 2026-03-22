import React from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';

export const Education: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Education Library</h1>
            {/* Placeholder for search and filter bar */}
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
              <h2 className="text-lg font-semibold text-gray-700">Search & Filter</h2>
              {/* Search and filter controls will be implemented here */}
            </div>
            {/* Placeholder for material list */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Education materials will be populated here */}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
