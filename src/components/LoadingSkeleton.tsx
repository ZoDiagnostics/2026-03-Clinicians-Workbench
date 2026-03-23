import React from 'react';

interface LoadingSkeletonProps {
  /** Number of skeleton rows to show */
  rows?: number;
  /** Whether to show stat cards at the top */
  showStats?: boolean;
  /** Number of stat cards */
  statCount?: number;
}

/**
 * Reusable loading skeleton for data screens.
 * Shows animated placeholder blocks while content loads.
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  rows = 5,
  showStats = false,
  statCount = 4,
}) => {
  return (
    <div className="animate-pulse">
      {/* Stat cards skeleton */}
      {showStats && (
        <div className={`grid grid-cols-1 md:grid-cols-${statCount} gap-6 mb-8`}>
          {Array.from({ length: statCount }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Table skeleton */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-3 flex gap-8">
          <div className="h-3 bg-gray-200 rounded w-24" />
          <div className="h-3 bg-gray-200 rounded w-20" />
          <div className="h-3 bg-gray-200 rounded w-16" />
          <div className="h-3 bg-gray-200 rounded w-20" />
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-4 border-t border-gray-100 flex gap-8 items-center">
            <div className="h-4 bg-gray-200 rounded w-32" />
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="h-5 bg-gray-200 rounded-full w-20" />
            <div className="h-4 bg-gray-200 rounded w-20" />
          </div>
        ))}
      </div>
    </div>
  );
};
