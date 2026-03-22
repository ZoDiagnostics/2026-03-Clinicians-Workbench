import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth, useNotifications, markNotificationRead, markAllNotificationsRead } from '../lib/hooks';
import { LogOut, User, ChevronDown } from 'lucide-react';
import { NotificationDrawer } from './NotificationDrawer';
import { AppNotification } from '../types/notification';
import { USER_ROLE_LABELS, UserRole } from '../types/enums';

// Global header with avatar menu, role display, and notification bell

export const Header: React.FC = () => {
  const { user, role } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const navigate = useNavigate();
  // BUG-02: Avatar/profile dropdown state
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // BUG-07: Mark individual notification as read + BUG-06: navigate to linked entity
  const handleNotificationClick = (notification: AppNotification) => {
    if (!user) return;
    markNotificationRead(user.uid, notification.id);
    // Navigation is handled inside NotificationDrawer via resolveNotificationRoute
  };

  const handleMarkAllRead = () => {
    if (!user) return;
    markAllNotificationsRead(user.uid);
  };

  // BUG-08: Passed as prop but actual routing is handled in NotificationDrawer
  const handleNotificationSettingsClick = () => {
    // Non-admin fallback — NotificationDrawer shows "Contact your admin"
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const roleLabel = role ? (USER_ROLE_LABELS[role as UserRole] || role) : 'User';
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">ZoCW Demo</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* BUG-15: Notification bell with numeric unread badge — rendered via NotificationDrawer */}
          <NotificationDrawer
            notifications={notifications}
            unreadCount={unreadCount}
            onNotificationClick={handleNotificationClick}
            onMarkAllRead={handleMarkAllRead}
            onNotificationSettingsClick={handleNotificationSettingsClick}
            userRole={role}
          />

          {/* BUG-02: Avatar/profile dropdown with user name, role, and sign-out */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(prev => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center">
                <User className="h-4 w-4 text-indigo-600" />
              </div>
              <span className="font-medium">{displayName}</span>
              <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                  {user?.email && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                  )}
                  <span className="inline-block mt-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
                    {roleLabel}
                  </span>
                </div>
                <div className="py-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
