import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/hooks';
import { Menu, Bell, LogOut, Settings } from 'lucide-react';

// Global header with role switcher and notification bell

export const Header: React.FC = () => {
  const currentUser = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">ZoCW Demo</h1>
        </div>
        <div className="flex items-center gap-4">
          <Bell className="w-5 h-5 text-gray-600" />
          <button className="px-3 py-1 bg-gray-100 rounded text-sm text-gray-700">
            {currentUser?.role || 'User'}
          </button>
        </div>
      </div>
    </header>
  );
};
