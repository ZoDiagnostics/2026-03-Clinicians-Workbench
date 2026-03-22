import React, { useState } from 'react';
import { Bell, X, Settings, CheckCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppNotification } from '../types/notification';
import { NotificationType } from '../types/enums';
import { routeByStatus } from '../lib/routeByStatus';

interface NotificationDrawerProps {
  notifications: AppNotification[];
  unreadCount: number;
  onNotificationClick: (notification: AppNotification) => void;
  onMarkAllRead: () => void;
  onNotificationSettingsClick: () => void;
  userRole?: string | null;
}

// BUG-06: Map notification type to route using routeTo field or entity context
const resolveNotificationRoute = (notification: AppNotification): string | null => {
  // Prefer explicit routeTo field if present
  if (notification.routeTo) {
    return notification.routeTo;
  }
  // Fallback: infer route from type and entityId
  if (notification.entityId) {
    switch (notification.type) {
      case NotificationType.STUDY_ASSIGNED:
      case NotificationType.SIGNATURE_REQUIRED:
      case NotificationType.QA_ALERT:
      case NotificationType.TRANSFER_REQUEST:
      case NotificationType.DELIVERY_CONFIRMED:
        return `/summary/${notification.entityId}`;
      default:
        return null;
    }
  }
  return null;
};

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  notifications,
  unreadCount,
  onNotificationClick,
  onMarkAllRead,
  onNotificationSettingsClick,
  userRole,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const toggleDrawer = () => setIsOpen(!isOpen);

  // BUG-06: Navigate on notification click; BUG-07: mark as read
  const handleNotificationClick = (notification: AppNotification) => {
    onNotificationClick(notification); // marks as read
    const route = resolveNotificationRoute(notification);
    if (route) {
      navigate(route);
      setIsOpen(false);
    }
  };

  // BUG-08: Wire settings button to /admin or show message for non-admin
  const handleSettingsClick = () => {
    if (userRole === 'admin' || userRole === 'clinician_admin') {
      navigate('/admin');
      setIsOpen(false);
    } else {
      onNotificationSettingsClick();
    }
  };

  return (
    <>
      {/* BUG-15: Bell icon with numeric unread badge */}
      <button onClick={toggleDrawer} className="relative p-1" aria-label="Notifications">
        <Bell className="h-6 w-6 text-gray-500 hover:text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 rounded-full bg-red-500 ring-2 ring-white">
            <span className="text-white text-xs font-bold leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-gray-600 opacity-75" onClick={toggleDrawer}></div>
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col">

            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b bg-white">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <button onClick={toggleDrawer} aria-label="Close">
                <X className="h-6 w-6 text-gray-500 hover:text-gray-700" />
              </button>
            </div>

            {/* BUG-03: Mark All Read + Clear visual action row */}
            {notifications.length > 0 && (
              <div className="flex items-center justify-end gap-2 px-4 py-2 border-b bg-gray-50">
                <button
                  onClick={onMarkAllRead}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              </div>
            )}

            {/* Notification list */}
            <div className="flex-grow overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-16">
                  <Bell className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No notifications</p>
                  <p className="text-gray-400 text-sm mt-1">You're all caught up!</p>
                </div>
              ) : (
                <ul>
                  {notifications.map(notification => {
                    const hasRoute = !!resolveNotificationRoute(notification);
                    return (
                      <li
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 border-b cursor-pointer transition-colors ${
                          !notification.isRead
                            ? 'bg-blue-50 hover:bg-blue-100'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm truncate ${!notification.isRead ? 'text-blue-900' : 'text-gray-900'}`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{notification.body}</p>
                            {notification.createdAt && (
                              <p className="text-xs text-gray-400 mt-1">
                                {notification.createdAt.toDate?.()?.toLocaleString() || ''}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {!notification.isRead && (
                              <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                            )}
                            {hasRoute && (
                              <span className="text-xs text-blue-400">→</span>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
              {/* BUG-08: Settings links to /admin for admins, or info for others */}
              <button
                onClick={handleSettingsClick}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                <Settings className="h-4 w-4" />
                {userRole === 'admin' || userRole === 'clinician_admin'
                  ? 'Notification settings'
                  : 'Contact your admin'
                }
              </button>
              <span className="text-xs text-gray-400">{notifications.length} total</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
