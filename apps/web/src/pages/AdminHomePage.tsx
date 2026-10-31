import React from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Panel } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';

export const AdminHomePage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <AppLayout title="System Administration">
      <Panel className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="type-section-heading">Welcome, {user?.displayName}</h3>
          <span className="font-mono text-xs text-mut">{user?.maskedId}</span>
        </div>
        <p className="type-body text-mut">
          Manage system rules, cohort schedule templates, clinician sign-offs, and data retention policies.
        </p>
      </Panel>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link to="/admin/rules" className="block text-left group">
          <Panel className="border-acc/40 hover:border-acc transition-colors h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-sm text-ink">Rule Engine Versions</h4>
                <span className="text-acc group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
              <p className="text-xs text-mut">Manage and sign off on transparent versioned clinical rules.</p>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 mt-3 block">Governance Gate Active</span>
          </Panel>
        </Link>

        <Panel>
          <h4 className="font-medium text-sm mb-1">Cohort Templates</h4>
          <p className="text-xs text-mut">Schedule intervals, grace periods, and escalation parameters.</p>
        </Panel>

        <Panel>
          <h4 className="font-medium text-sm mb-1">Retention & Erasure</h4>
          <p className="text-xs text-mut">Purge schedules, cryptographic audit verification, and erasure processing.</p>
        </Panel>
      </div>
    </AppLayout>
  );
};
