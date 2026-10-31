import React from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Panel } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';

export const HealthWorkerHomePage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <AppLayout title="Health Worker Worklist">
      <Panel className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="type-section-heading">Welcome, {user?.displayName}</h3>
          <span className="font-mono text-xs text-mut">{user?.maskedId}</span>
        </div>
        <p className="type-body text-mut">
          Community health worker triage center. Displays clinical urgency and administrative overdue lanes with transparent reasons.
        </p>
      </Panel>

      <div className="flex flex-col gap-3">
        <Panel className="border-l-4 border-l-high">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-high uppercase">Clinical Urgency Lane</span>
            <span className="text-[11px] font-mono text-mut">Sorted by SLA Remaining</span>
          </div>
          <p className="text-xs text-mut">Prioritized cases flagged by versioned clinical rules for review.</p>
        </Panel>

        <Panel className="border-l-4 border-l-mod">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-mod uppercase">Administrative Lane</span>
            <span className="text-[11px] font-mono text-mut">Overdue Follow-ups</span>
          </div>
          <p className="text-xs text-mut">Missed check-ins, scheduled reminders, and escalation actions.</p>
        </Panel>
      </div>
    </AppLayout>
  );
};
