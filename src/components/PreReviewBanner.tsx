import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/hooks';
import { Menu, Bell, LogOut, Settings } from 'lucide-react';

// Progressive disclosure configuration banner

export const PreReviewBanner: React.FC = () => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <p className="text-blue-800 text-sm">
        Review settings are configured. <button className="font-semibold underline">Edit</button>
      </p>
    </div>
  );
};
