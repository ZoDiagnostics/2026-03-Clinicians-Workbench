import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { AppNotification } from '../types/notification';

interface NotificationDrawerProps {
  notifications: AppNotification[];
  unreadCount: number;
  onNotificationClick: (notification: AppNotification) => void;
  onMarkAllRead: () => void;
  onNotificationSettingsClick: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  notifications,
  unreadCount,
  onNotificationClick,
  onMarkAllRead,
  onNotificationSettingsClick
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDrawer = () => setIsOpen(!isOpen);

  return (
    <>
      <button onClick={toggleDrawer} className="relative">
        <Bell className="h-6 w-6 text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-gray-600 opacity-75" onClick={toggleDrawer}></div>
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold">Notifications</h2>
              <button onClick={toggleDrawer}><X className="h-6 w-6" /></button>
            </div>
            <div className="flex-grow overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No notifications</p>
                </div>
              ) : (
                <ul>
                  {notifications.map(notification => (
                    <li key={notification.id} onClick={() => onNotificationClick(notification)} className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${!notification.isRead ? 'bg-blue-50' : ''}`}>
                      <p className="font-bold">{notification.title}</p>
                      <p className="text-sm text-gray-600">{notification.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="p-4 border-t">
                <button onClick={onMarkAllRead} className="w-full text-center text-sm text-blue-600 hover:underline">Mark all as read</button>
                <button onClick={onNotificationSettingsClick} className="w-full text-center text-sm text-gray-600 hover:underline mt-2">Notification settings</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
