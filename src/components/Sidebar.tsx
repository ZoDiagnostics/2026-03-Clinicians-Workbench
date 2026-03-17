import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/hooks';
import { Menu, Bell, LogOut, Settings } from 'lucide-react';

// Sidebar navigation component with role-based filtering

export const Sidebar: React.FC = () => {
  const currentUser = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside className={`w-64 bg-gray-900 text-white transition-all ${collapsed ? 'w-20' : ''}`}>
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-lg font-bold">ZoCW</h2>
      </div>
      {/* Navigation items will be filled in after extraction */}
    </aside>
  );
};
