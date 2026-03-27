import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../lib/hooks';
import { LogOut, User } from 'lucide-react';
import { USER_ROLE_LABELS, UserRole } from '../types/enums';

/**
 * ViewerHeader — Slim header for the Viewer screen (~32px).
 * Replaces the full Header + WorkflowStepper to maximize image area.
 * Shows: ZoCW logo, compact stepper dots, user avatar dropdown.
 */

const STEPS = ['Check-in', 'Capsule Upload', 'Viewer', 'Summary', 'Report', 'Sign & Deliver'];

export const ViewerHeader: React.FC<{ currentStep?: number }> = ({ currentStep = 3 }) => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const roleLabel = role ? (USER_ROLE_LABELS[role as UserRole] || role) : 'User';
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <header className="bg-gray-900 border-b border-gray-700 px-4 py-1.5 flex items-center justify-between">
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-white tracking-tight">ZoCW</span>
        <span className="text-gray-600 text-xs">|</span>
        {/* Compact stepper dots */}
        <div className="flex items-center gap-1">
          {STEPS.map((step, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === currentStep;
            const isCompleted = stepNum < currentStep;
            return (
              <div key={step} className="flex items-center gap-1">
                <div
                  className={`rounded-full transition-all ${
                    isActive
                      ? 'w-2 h-2 bg-indigo-400'
                      : isCompleted
                        ? 'w-1.5 h-1.5 bg-indigo-600'
                        : 'w-1.5 h-1.5 bg-gray-600'
                  }`}
                  title={step}
                />
                {i < STEPS.length - 1 && (
                  <div className={`w-3 h-px ${isCompleted ? 'bg-indigo-600' : 'bg-gray-700'}`} />
                )}
              </div>
            );
          })}
        </div>
        <span className="text-xs text-gray-500 ml-1">Viewer</span>
      </div>

      {/* Right: User avatar */}
      <div className="relative" ref={profileRef}>
        <button
          onClick={() => setProfileOpen(prev => !prev)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <div className="h-5 w-5 rounded-full bg-gray-700 flex items-center justify-center">
            <User className="h-3 w-3 text-gray-300" />
          </div>
          <span>{displayName}</span>
        </button>

        {profileOpen && (
          <div className="absolute right-0 mt-1 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
              {user?.email && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
              )}
              <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
                {roleLabel}
              </span>
            </div>
            <div className="py-1">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
