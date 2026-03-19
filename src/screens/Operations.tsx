import React, { useMemo } from 'react';
import { useProcedures } from '../lib/hooks';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { ProcedureStatus } from '../types/enums';

const StatCard: React.FC<{ title: string; value: number; color?: string }> = ({ title, value, color = 'text-gray-900' }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h2 className="text-sm font-medium text-gray-500">{title}</h2>
    <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
  </div>
);

const FunnelBar: React.FC<{ label: string; count: number; max: number; color: string }> = ({ label, count, max, color }) => (
  <div className="flex items-center gap-4 py-2">
    <div className="w-48 text-sm text-gray-600 text-right">{label}</div>
    <div className="flex-1 bg-gray-100 rounded-full h-8 relative">
      <div
        className={`${color} h-8 rounded-full flex items-center justify-end pr-3`}
        style={{ width: max > 0 ? `${Math.max((count / max) * 100, 8)}%` : '8%' }}
      >
        <span className="text-white text-sm font-semibold">{count}</span>
      </div>
    </div>
  </div>
);

export const Operations: React.FC = () => {
  const procedures = useProcedures();

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const completedToday = procedures.filter(p => {
      const signedAt = p.signedAt?.toDate?.();
      return signedAt && signedAt >= todayStart &&
        (p.status === ProcedureStatus.COMPLETED || p.status === ProcedureStatus.COMPLETED_APPENDED);
    }).length;

    const inProgress = procedures.filter(p =>
      p.status === ProcedureStatus.DRAFT || p.status === ProcedureStatus.APPENDED_DRAFT
    ).length;

    const awaitingReview = procedures.filter(p =>
      p.status === ProcedureStatus.READY_FOR_REVIEW
    ).length;

    const signedThisWeek = procedures.filter(p => {
      const signedAt = p.signedAt?.toDate?.();
      return signedAt && signedAt >= weekStart &&
        (p.status === ProcedureStatus.COMPLETED || p.status === ProcedureStatus.COMPLETED_APPENDED || p.status === ProcedureStatus.CLOSED);
    }).length;

    const pending = procedures.filter(p => p.status === ProcedureStatus.CAPSULE_RETURN_PENDING).length;
    const received = procedures.filter(p => p.status === ProcedureStatus.CAPSULE_RECEIVED).length;
    const completed = procedures.filter(p =>
      p.status === ProcedureStatus.COMPLETED || p.status === ProcedureStatus.COMPLETED_APPENDED
    ).length;
    const closed = procedures.filter(p => p.status === ProcedureStatus.CLOSED).length;
    const voided = procedures.filter(p => p.status === ProcedureStatus.VOID).length;

    return { completedToday, inProgress, awaitingReview, signedThisWeek, pending, received, completed, closed, voided };
  }, [procedures]);

  const maxFunnel = Math.max(stats.pending, stats.received, stats.awaitingReview, stats.inProgress, stats.completed, stats.closed, 1);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Operations Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Completed Today" value={stats.completedToday} color="text-green-600" />
              <StatCard title="In Progress (Draft)" value={stats.inProgress} color="text-indigo-600" />
              <StatCard title="Awaiting Review" value={stats.awaitingReview} color="text-yellow-600" />
              <StatCard title="Signed This Week" value={stats.signedThisWeek} color="text-blue-600" />
            </div>

            <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Procedure Funnel</h2>
              <div className="space-y-1">
                <FunnelBar label="Capsule Pending" count={stats.pending} max={maxFunnel} color="bg-yellow-400" />
                <FunnelBar label="Capsule Received" count={stats.received} max={maxFunnel} color="bg-blue-400" />
                <FunnelBar label="Awaiting Review" count={stats.awaitingReview} max={maxFunnel} color="bg-green-500" />
                <FunnelBar label="In Progress" count={stats.inProgress} max={maxFunnel} color="bg-indigo-500" />
                <FunnelBar label="Completed" count={stats.completed} max={maxFunnel} color="bg-gray-500" />
                <FunnelBar label="Closed" count={stats.closed} max={maxFunnel} color="bg-gray-400" />
                <FunnelBar label="Voided" count={stats.voided} max={maxFunnel} color="bg-red-400" />
              </div>
              <p className="mt-4 text-sm text-gray-500">Total procedures: {procedures.length}</p>
            </div>

            <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Status Breakdown</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-700">{stats.pending + stats.received}</p>
                  <p className="text-sm text-yellow-600">Pre-Review</p>
                </div>
                <div className="text-center p-4 bg-indigo-50 rounded-lg">
                  <p className="text-2xl font-bold text-indigo-700">{stats.awaitingReview + stats.inProgress}</p>
                  <p className="text-sm text-indigo-600">Active Review</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-700">{stats.completed + stats.closed}</p>
                  <p className="text-sm text-green-600">Completed</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
