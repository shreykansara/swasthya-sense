import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Panel } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';

interface ConsentItem {
  id: string;
  scope: 'data_storage' | 'report_upload' | 'messaging';
  channel?: 'sms' | 'whatsapp';
  title: string;
  description: string;
  grantedAt: string | null;
  revokedAt: string | null;
  version: string;
}

export const ConsentManagementPage: React.FC = () => {
  const { user } = useAuthStore();

  const [consents, setConsents] = useState<ConsentItem[]>([
    {
      id: 'c1',
      scope: 'data_storage',
      title: '1. Secure Data Storage',
      description: 'Allows basic record keeping (masked contacts, assigned worker and clinician) in the clinic registry.',
      grantedAt: '2026-10-31 10:00 UTC',
      revokedAt: null,
      version: 'v1.0',
    },
    {
      id: 'c2',
      scope: 'report_upload',
      title: '2. Report Value Extraction',
      description: 'Allows OCR extraction of numerical lab results and reference ranges. Never diagnoses any condition.',
      grantedAt: '2026-10-31 10:05 UTC',
      revokedAt: null,
      version: 'v1.0',
    },
    {
      id: 'c3',
      scope: 'messaging',
      channel: 'sms',
      title: '3. Follow-Up Reminders via SMS',
      description: 'Allows sending reminder messages between 08:00 and 21:00. Reply STOP anytime to opt out.',
      grantedAt: null,
      revokedAt: null,
      version: 'v1.0',
    },
    {
      id: 'c4',
      scope: 'messaging',
      channel: 'whatsapp',
      title: '4. Follow-Up Reminders via WhatsApp',
      description: 'Allows sending check-in and visit schedule notifications over WhatsApp.',
      grantedAt: null,
      revokedAt: null,
      version: 'v1.0',
    },
  ]);

  const [history, setHistory] = useState<Array<{ id: string; action: string; scope: string; timestamp: string }>>([
    { id: 'h1', action: 'GRANTED', scope: 'Secure Data Storage', timestamp: '2026-10-31 10:00 UTC' },
    { id: 'h2', action: 'GRANTED', scope: 'Report Value Extraction', timestamp: '2026-10-31 10:05 UTC' },
  ]);

  const handleToggle = (id: string) => {
    setConsents((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const isCurrentlyActive = item.grantedAt !== null && item.revokedAt === null;
          const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

          if (isCurrentlyActive) {
            // Revoke
            setHistory((h) => [
              { id: 'h_' + Date.now(), action: 'REVOKED', scope: item.title, timestamp: nowStr },
              ...h,
            ]);
            return { ...item, revokedAt: nowStr };
          } else {
            // Grant
            setHistory((h) => [
              { id: 'h_' + Date.now(), action: 'GRANTED', scope: item.title, timestamp: nowStr },
              ...h,
            ]);
            return { ...item, grantedAt: nowStr, revokedAt: null };
          }
        }
        return item;
      })
    );
  };

  return (
    <AppLayout title="Consent Management">
      <Panel className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="type-section-heading">Patient Consent Dashboard</h3>
          <span className="font-mono text-xs text-mut">{user?.maskedId}</span>
        </div>
        <p className="type-body text-mut text-sm">
          Consent is captured explicitly before storing any data, uploading reports, or sending reminders.
          You can grant or revoke permission for any category at any time with immediate effect.
        </p>
      </Panel>

      {/* Consent Toggles */}
      <div className="flex flex-col gap-3">
        {consents.map((item) => {
          const isActive = item.grantedAt !== null && item.revokedAt === null;

          return (
            <Panel
              key={item.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border transition-colors ${
                isActive ? 'border-acc/40 bg-panel' : 'border-bd/60 bg-page opacity-80'
              }`}
            >
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm text-ink">{item.title}</h4>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-wider font-semibold ${
                      isActive ? 'bg-low/20 text-low' : 'bg-mut/20 text-mut'
                    }`}
                  >
                    {isActive ? 'Active' : 'Not Granted'}
                  </span>
                </div>
                <p className="text-xs text-mut">{item.description}</p>
                {isActive && (
                  <span className="text-[11px] font-mono text-mut">
                    Granted: {item.grantedAt} &bull; Version: {item.version}
                  </span>
                )}
                {item.revokedAt && (
                  <span className="text-[11px] font-mono text-high">
                    Revoked: {item.revokedAt}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {isActive ? (
                  <button
                    onClick={() => handleToggle(item.id)}
                    className="px-3 py-1.5 rounded border border-high/40 text-high text-xs hover:bg-high/10 font-semibold transition-colors"
                  >
                    Revoke Consent
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggle(item.id)}
                    className="px-3 py-1.5 rounded bg-acc text-onacc text-xs hover:opacity-90 font-semibold transition-opacity"
                  >
                    Grant Consent
                  </button>
                )}
              </div>
            </Panel>
          );
        })}
      </div>

      {/* Immutable Consent Change History */}
      <Panel className="flex flex-col gap-3 mt-2">
        <div className="flex items-center justify-between">
          <h4 className="type-section-heading text-sm">Consent Audit History</h4>
          <span className="text-xs text-mut">Append-only log</span>
        </div>

        <div className="divide-y divide-bd/50 text-xs font-mono">
          {history.map((entry) => (
            <div key={entry.id} className="py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    entry.action === 'GRANTED' ? 'bg-low/20 text-low' : 'bg-high/20 text-high'
                  }`}
                >
                  {entry.action}
                </span>
                <span className="text-ink">{entry.scope}</span>
              </div>
              <span className="text-mut text-[11px]">{entry.timestamp}</span>
            </div>
          ))}
        </div>
      </Panel>
    </AppLayout>
  );
};
