import React, { useState, useEffect } from 'react';
import { ShieldCheck, MessageSquare, History, FileCheck2, AlertCircle } from 'lucide-react';
import { swasthyaApi, AuditRecord, DispatchedAlert } from '../api/swasthyaApi';

export const AuditGovernancePage: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);
  const [messages, setMessages] = useState<DispatchedAlert[]>([]);
  const [activeTab, setActiveTab] = useState<'audit' | 'messages'>('audit');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([swasthyaApi.fetchAuditTrail(), swasthyaApi.fetchDispatchedMessages()])
      .then(([logs, msgs]) => {
        setAuditLogs(logs);
        setMessages(msgs);
      })
      .catch((err) => console.error('Error fetching audit logs:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '20px 24px', maxWidth: '1300px', margin: '0 auto' }}>
      {/* Header */}
      <div
        className="pn"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
          backgroundColor: 'var(--panel)',
          borderLeft: '4px solid var(--acc)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={22} color="var(--acc)" />
            <h1 style={{ fontFamily: 'var(--fs)', fontSize: '18px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Immutable Audit Trail & Clinical Decision Governance
            </h1>
          </div>
          <p style={{ fontFamily: 'var(--fs)', fontSize: '12px', color: 'var(--mut)', margin: '4px 0 0 0' }}>
            Role-Based Access Enforcement, Communication Dispatches & Regulatory Traceability Log
          </p>
        </div>

        <span
          style={{
            fontFamily: 'var(--fm)',
            fontSize: '11px',
            padding: '4px 10px',
            backgroundColor: 'var(--hov)',
            border: '1px solid var(--bd)',
            borderRadius: 'var(--radius)',
            color: 'var(--ink)',
          }}
        >
          APPEND-ONLY AUDIT ENGINE
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: activeTab === 'audit' ? 600 : 400,
            borderRadius: 'var(--radius)',
            border: '1px solid var(--bd)',
            backgroundColor: activeTab === 'audit' ? 'var(--acc)' : 'var(--panel)',
            color: activeTab === 'audit' ? '#fff' : 'var(--ink)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <History size={14} />
          Clinical Action Audit Log ({auditLogs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('messages')}
          style={{
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: activeTab === 'messages' ? 600 : 400,
            borderRadius: 'var(--radius)',
            border: '1px solid var(--bd)',
            backgroundColor: activeTab === 'messages' ? 'var(--acc)' : 'var(--panel)',
            color: activeTab === 'messages' ? '#fff' : 'var(--ink)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <MessageSquare size={14} />
          Dispatched WhatsApp & SMS Simulator History ({messages.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--mut)' }}>Loading governance records...</div>
      ) : activeTab === 'audit' ? (
        <div className="pn" style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--hov)', borderBottom: '1px solid var(--bd)', textAlign: 'left', color: 'var(--mut)' }}>
                <th style={{ padding: '10px 14px' }}>Timestamp (UTC)</th>
                <th style={{ padding: '10px 14px' }}>Medical Actor & Role</th>
                <th style={{ padding: '10px 14px' }}>Action Executed</th>
                <th style={{ padding: '10px 14px' }}>Patient ID</th>
                <th style={{ padding: '10px 14px' }}>Metadata / Details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.audit_id} style={{ borderBottom: '1px solid var(--bd)' }}>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--fm)', fontSize: '11px', color: 'var(--mut)' }}>
                    {log.timestamp.slice(0, 19).replace('T', ' ')}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <strong>{log.actor_id}</strong>
                    <div style={{ fontSize: '10px', color: 'var(--mut)', textTransform: 'uppercase' }}>{log.actor_role}</div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: 'var(--radius)',
                        fontSize: '10px',
                        fontFamily: 'var(--fm)',
                        fontWeight: 600,
                        backgroundColor: 'var(--hov)',
                        border: '1px solid var(--bd)',
                        color: 'var(--ink)',
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--fm)' }}>{log.patient_id}</td>
                  <td style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--mut)' }}>
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="pn" style={{ overflowX: 'auto', padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--hov)', borderBottom: '1px solid var(--bd)', textAlign: 'left', color: 'var(--mut)' }}>
                <th style={{ padding: '10px 14px' }}>Timestamp</th>
                <th style={{ padding: '10px 14px' }}>Channel</th>
                <th style={{ padding: '10px 14px' }}>Recipient & Phone</th>
                <th style={{ padding: '10px 14px' }}>Message Type</th>
                <th style={{ padding: '10px 14px' }}>Message Body</th>
                <th style={{ padding: '10px 14px' }}>Delivery Status</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((msg) => (
                <tr key={msg.message_id} style={{ borderBottom: '1px solid var(--bd)' }}>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--fm)', fontSize: '11px', color: 'var(--mut)' }}>
                    {msg.timestamp.slice(0, 19).replace('T', ' ')}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{msg.channel}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div><strong>{msg.patient_name}</strong></div>
                    <div style={{ fontFamily: 'var(--fm)', fontSize: '11px', color: 'var(--mut)' }}>{msg.phone}</div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: 'var(--radius)',
                        fontSize: '10px',
                        fontFamily: 'var(--fm)',
                        fontWeight: 600,
                        backgroundColor: msg.message_type.includes('URGENT') ? 'rgba(200, 29, 58, 0.12)' : 'var(--hov)',
                        color: msg.message_type.includes('URGENT') ? 'var(--high)' : 'var(--ink)',
                        border: '1px solid var(--bd)',
                      }}
                    >
                      {msg.message_type}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: '11px', maxWidth: '380px', lineHeight: 1.35 }}>
                    {msg.body}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ color: 'var(--low)', fontWeight: 600, fontSize: '11px' }}>✓ {msg.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuditGovernancePage;
