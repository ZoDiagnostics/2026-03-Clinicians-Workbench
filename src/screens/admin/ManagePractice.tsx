import React, { useState, useEffect } from 'react';
import { usePracticeSettings } from '../../lib/hooks';
import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { PracticeSettings } from '../../types/practice';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { COLLECTIONS } from '../../types/firestore-paths';
import { useAuth } from '../../lib/hooks';

const ManagePractice: React.FC = () => {
  const { practiceId } = useAuth();
  const practiceSettings = usePracticeSettings();
  const [settings, setSettings] = useState<PracticeSettings | null>(null);

  useEffect(() => {
    if (practiceSettings) {
      setSettings(practiceSettings);
    }
  }, [practiceSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!settings) return;
    const { name, value } = e.target;
    setSettings({ ...settings, [name]: value });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!settings) return;
    const { name, checked } = e.target;
    setSettings({ ...settings, [name]: checked });
  };

  const handleSave = async () => {
    if (settings && practiceId) {
      const settingsRef = doc(db, COLLECTIONS.PRACTICE_SETTINGS(practiceId), 'default');
      await updateDoc(settingsRef, { ...settings });
    }
  };

  if (!settings) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Manage Practice</h1>
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-6">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Practice Name</label>
                    <input type="text" name="name" id="name" value={settings.name} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  </div>
                  <div className="sm:col-span-6">
                    <label htmlFor="defaultFromEmail" className="block text-sm font-medium text-gray-700">Default "From" Email</label>
                    <input type="email" name="defaultFromEmail" id="defaultFromEmail" value={settings.defaultFromEmail} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  </div>
                  <div className="sm:col-span-6">
                    <label htmlFor="reportBranding.logoUrl" className="block text-sm font-medium text-gray-700">Logo URL</label>
                    <input type="text" name="reportBranding.logoUrl" id="reportBranding.logoUrl" value={settings.reportBranding.logoUrl} onChange={handleInputChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                  </div>
                  <div className="sm:col-span-6">
                    <div className="flex items-center">
                      <input id="allowUnscheduledProcedures" name="allowUnscheduledProcedures" type="checkbox" checked={settings.allowUnscheduledProcedures} onChange={handleCheckboxChange} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                      <label htmlFor="allowUnscheduledProcedures" className="ml-3 block text-sm font-medium text-gray-700">Allow Unscheduled Procedures</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                <button onClick={handleSave} className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Save
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ManagePractice;
