import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/hooks';
import { Menu, Bell, LogOut, Settings } from 'lucide-react';

// 6-step clinical workflow stepper

export const WorkflowStepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
  const steps = [
    { id: 1, label: 'Check-in' },
    { id: 2, label: 'Capsule Upload' },
    { id: 3, label: 'Viewer' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Report' },
    { id: 6, label: 'Sign & Deliver' }
  ];

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className={step.id <= currentStep ? 'text-blue-600 font-semibold' : 'text-gray-400'}>
              {step.label}
            </div>
            {index < steps.length - 1 && (
              <div className={step.id < currentStep ? 'bg-blue-600' : 'bg-gray-300'} style={{height: '2px', flex: 1, margin: '0 8px'}} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
