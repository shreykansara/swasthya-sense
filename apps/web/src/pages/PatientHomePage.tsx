import React from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { Panel } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';

export const PatientHomePage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <AppLayout title="Patient Home">
      <Panel className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="type-section-heading">Welcome, {user?.displayName}</h3>
          <span className="font-mono text-xs text-mut">{user?.maskedId}</span>
        </div>
        <p className="type-body text-mut">
          Your personal health record and follow-up hub. All features are gated by your explicit, revocable consent.
        </p>
      </Panel>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link to="/patient/consent" className="block text-left group">
          <Panel className="flex flex-col gap-1 border-acc/40 hover:border-acc transition-colors h-full">
            <span className="type-caption text-acc font-semibold uppercase flex items-center justify-between">
              <span>Step 1</span>
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </span>
            <h4 className="font-medium text-sm text-ink">Consent Preferences</h4>
            <p className="text-xs text-mut">Manage report storage, upload consent, and communication channels.</p>
          </Panel>
        </Link>

        <Panel className="flex flex-col gap-1">
          <span className="type-caption text-mut font-semibold uppercase">Step 2</span>
          <h4 className="font-medium text-sm">Upload Clinical Report</h4>
          <p className="text-xs text-mut">Submit lab or clinical documents (PDF or photo) for human confirmation.</p>
        </Panel>

        <Panel className="flex flex-col gap-1">
          <span className="type-caption text-mut font-semibold uppercase">Step 3</span>
          <h4 className="font-medium text-sm">Plain-Language Readout</h4>
          <p className="text-xs text-mut">Review your confirmed lab numbers and lab reference ranges simplified without diagnosis.</p>
        </Panel>

        <Panel className="flex flex-col gap-1">
          <span className="type-caption text-mut font-semibold uppercase">Security</span>
          <h4 className="font-medium text-sm">Access History & Erasure</h4>
          <p className="text-xs text-mut">Audit trail of who accessed your records and option to request full erasure.</p>
        </Panel>
      </div>
    </AppLayout>
  );
};
