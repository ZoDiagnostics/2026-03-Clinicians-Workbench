import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useNotifications, markNotificationRead, markAllNotificationsRead } from '../lib/hooks';
import { Menu, Bell, LogOut, Settings } from 'lucide-react';
import { NotificationDrawer } from './NotificationDrawer';
import { AppNotification } from '../types/notification';

// Global header with role switcher and notification bell

export const Header: React.FC = () => {
  const { user, role } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: AppNotification) => {
    if (!user) return;
    markNotificationRead(user.uid, notification.id);
    // navigate(notification.link); // TODO: Implement navigation to the relevant page
  };

  const handleMarkAllRead = () => {
    if (!user) return;
    markAllNotificationsRead(user.uid);
  };

  const handleNotificationSettingsClick = () => {
    // TODO: Implement navigation to notification settings page
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">ZoCW Demo</h1>
        </div>
        <div className="flex items-center gap-4">
            <NotificationDrawer
                notifications={notifications}
                unreadCount={unreadCount}
                onNotificationClick={handleNotificationClick}
                onMarkAllRead={handleMarkAllRead}
                onNotificationSettingsClick={handleNotificationSettingsClick}
            />
          <button className="px-3 py-1 bg-gray-100 rounded text-sm text-gray-700">
            {role || 'User'}
          </button>
        </div>
      </div>
    </header>
  );
};
