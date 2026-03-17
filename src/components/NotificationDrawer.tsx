import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/hooks';
import { Menu, Bell, LogOut, Settings } from 'lucide-react';

// Notification panel

export const NotificationDrawer: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-80">
      <h3 className="font-bold text-lg mb-4">Notifications</h3>
      {/* Notifications will be populated from state */}
    </div>
  );
};
