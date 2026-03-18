import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/hooks';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { ShieldExclamationIcon, UsersIcon, BuildingOfficeIcon, CogIcon, CommandLineIcon, CreditCardIcon } from '@heroicons/react/24/outline';

// SCR-06: Admin Dashboard
export const Admin: React.FC = () => {
  const currentUser = useAuth();

  // Role-based access control: Admin or Clinician Admin can see this page
  // Subscription management is further restricted to Admins only.
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'clinician_admin')) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="m-auto text-center">
          <ShieldExclamationIcon className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">Access Denied</h1>
          <p className="mt-6 text-base leading-7 text-gray-600">Sorry, you don&apos;t have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'Manage Staff', href: '/admin/staff', icon: UsersIcon, description: 'Add, edit, and manage user accounts and roles.' },
    { name: 'Practice Settings', href: '/admin/practice', icon: CogIcon, description: 'Configure practice-wide settings and operational parameters.' },
    { name: 'Clinic Locations', href: '/admin/clinics', icon: BuildingOfficeIcon, description: 'Set up and manage physical clinic locations.' },
    { name: 'Subscription & Billing', href: '/admin/subscription', icon: CreditCardIcon, description: 'View subscription details and billing history.', adminOnly: true },
    { name: 'ICD & CPT Code Management', href: '/admin/icd-codes', icon: CommandLineIcon, description: 'Manage favorite codes for Copilot suggestions.' },
  ];

  // Filter items based on user role (e.g., hide subscription for clinician_admin)
  const filteredNavItems = navItems.filter(item => !item.adminOnly || currentUser?.role === 'admin');

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto focus:outline-none">
          <div className="py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Admin & Settings
              </h1>
              <p className="text-sm text-gray-500 mb-8">
                Manage staff, practice configuration, and system settings.
              </p>
            </div>
            <div className="max-w-3xl mx-auto grid grid-cols-1 gap-6 sm:grid-cols-2">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="group relative flex flex-col items-start rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 p-3">
                      <item.icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {item.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Admin;
