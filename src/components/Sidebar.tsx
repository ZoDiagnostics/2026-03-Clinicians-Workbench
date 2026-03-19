import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/hooks';
import { UserRole } from '../types/enums';

interface NavItem {
  label: string;
  path: string;
  roles?: UserRole[]; // If undefined, visible to all authenticated users
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Clinical',
    items: [
      { label: 'Dashboard', path: '/dashboard' },
      { label: 'Worklist', path: '/worklist' },
      { label: 'Patients', path: '/patients' },
      { label: 'Procedures', path: '/procedures' },
    ],
  },
  {
    title: 'Reports',
    items: [
      { label: 'Reports Hub', path: '/reports-hub' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Operations', path: '/operations' },
      { label: 'Analytics', path: '/analytics' },
      { label: 'AI QA', path: '/qa' },
      { label: 'Activity Log', path: '/activity' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'Education', path: '/education' },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Admin & Settings',
        path: '/admin',
        roles: [UserRole.ADMIN, UserRole.CLINICIAN_ADMIN],
      },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const { role } = useAuth();

  const isVisible = (item: NavItem): boolean => {
    if (!item.roles) return true;
    if (!role) return false;
    return item.roles.includes(role);
  };

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-bold">ZoCW</h2>
        <p className="text-xs text-gray-400 mt-1">Clinicians Workbench</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(isVisible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="mb-4">
              <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {section.title}
              </h3>
              {visibleItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `block px-4 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-gray-800 text-white border-l-3 border-indigo-500'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
        v3.1.0
      </div>
    </aside>
  );
};
