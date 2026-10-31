import React from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Panel } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';

export const SupervisorHomePage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <AppLayout title="Supervisor Overview">
      <Panel className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="type-section-heading">Welcome, {user?.displayName}</h3>
          <span className="font-mono text-xs text-mut">{user?.maskedId}</span>
        </div>
        <p className="type-body text-mut">
          Program monitoring, escalation ladders, SLA breach alerts, and alert-quality dashboard.
        </p>
      </Panel>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Panel>
          <h4 className="font-medium text-sm mb-1">Escalations</h4>
          <p className="text-xs text-mut">Cases breaching SLA or unresolved follow-up cycles.</p>
        </Panel>
        <Panel>
          <h4 className="font-medium text-sm mb-1">Alert Quality Metrics</h4>
          <p className="text-xs text-mut">Clinician override rates, reason distributions, and false-alarm frequency.</p>
        </Panel>
      </div>
    </AppLayout>
  );
};
