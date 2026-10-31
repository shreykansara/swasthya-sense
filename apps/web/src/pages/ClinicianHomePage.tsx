import React from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Panel } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';

export const ClinicianHomePage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <AppLayout title="Clinician Review Queue">
      <Panel className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="type-section-heading">Welcome, {user?.displayName}</h3>
          <span className="font-mono text-xs text-mut">{user?.maskedId}</span>
        </div>
        <p className="type-body text-mut">
          Clinician assessment gate. No care plan, reminder schedule, or escalation can exist without a human clinician assessment.
        </p>
      </Panel>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Panel className="text-center p-3">
          <div className="text-2xl font-mono font-semibold text-high">0</div>
          <div className="text-xs text-mut mt-1">Urgent SLA Cases</div>
        </Panel>
        <Panel className="text-center p-3">
          <div className="text-2xl font-mono font-semibold text-mod">0</div>
          <div className="text-xs text-mut mt-1">Soon Cases</div>
        </Panel>
        <Panel className="text-center p-3">
          <div className="text-2xl font-mono font-semibold text-acc">0</div>
          <div className="text-xs text-mut mt-1">Assessed Today</div>
        </Panel>
      </div>
    </AppLayout>
  );
};
