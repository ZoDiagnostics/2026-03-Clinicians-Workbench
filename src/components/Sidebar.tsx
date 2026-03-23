import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../lib/hooks';
import { UserRole } from '../types/enums';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  FileText,
  BookOpen,
  Settings,
  Activity,
  BarChart2,
  Cpu,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles?: UserRole[];
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Clinical',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Worklist', path: '/worklist', icon: ClipboardList },
      { label: 'Patients', path: '/patients', icon: Users },
      { label: 'Procedures', path: '/procedures', icon: Briefcase },
    ],
  },
  {
    title: 'Reports',
    items: [
      { label: 'Reports Hub', path: '/reports-hub', icon: FileText },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Operations', path: '/operations', icon: Activity },
      { label: 'Analytics', path: '/analytics', icon: BarChart2 },
      { label: 'AI QA', path: '/qa', icon: Cpu },
      { label: 'Activity Log', path: '/activity', icon: FileText },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'Education', path: '/education', icon: BookOpen },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Admin & Settings',
        path: '/admin',
        icon: Settings,
        roles: [UserRole.ADMIN, UserRole.CLINICIAN_ADMIN],
      },
    ],
  },
];

interface SidebarProps {
  /** Controlled collapse state (from parent layout). If not provided, Sidebar manages its own state. */
  collapsed?: boolean;
  onToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed: controlledCollapsed, onToggle }) => {
  const { role } = useAuth();
  // Default collapsed on mobile (< md = 768px)
  const [internalCollapsed, setInternalCollapsed] = useState(() => window.innerWidth < 768);

  // Auto-collapse when viewport drops below md breakpoint; expand when back above it
  React.useEffect(() => {
    const handleResize = () => {
      if (controlledCollapsed === undefined) {
        setInternalCollapsed(window.innerWidth < 768);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [controlledCollapsed]);

  // Support both controlled (parent passes collapsed + onToggle) and uncontrolled (internal state)
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const handleToggle = onToggle ?? (() => setInternalCollapsed(c => !c));

  const isVisible = (item: NavItem): boolean => {
    if (!item.roles) return true;
    if (!role) return false;
    return item.roles.includes(role);
  };

  return (
    <aside
      className={`${isCollapsed ? 'w-16' : 'w-64'} bg-gray-900 text-white flex flex-col min-h-screen transition-all duration-200 ease-in-out flex-shrink-0`}
    >
      {/* Logo / collapse toggle */}
      <div className={`p-4 border-b border-gray-800 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <div>
            <h2 className="text-lg font-bold">ZoCW</h2>
            <p className="text-xs text-gray-400 mt-1">Clinicians Workbench</p>
          </div>
        )}
        <button
          onClick={handleToggle}
          className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter(isVisible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="mb-4">
              {!isCollapsed && (
                <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {section.title}
                </h3>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={isCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center ${isCollapsed ? 'justify-center px-0 py-3' : 'px-4 py-2'} text-sm transition-colors ${
                        isActive
                          ? 'bg-gray-800 text-white border-l-2 border-indigo-500'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`
                    }
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${isCollapsed ? '' : 'mr-2.5'}`} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className={`p-4 border-t border-gray-800 text-xs text-gray-500 ${isCollapsed ? 'text-center' : ''}`}>
        {isCollapsed ? 'v3' : 'v3.1.0'}
      </div>
    </aside>
  );
};
