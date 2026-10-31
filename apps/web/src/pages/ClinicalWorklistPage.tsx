import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  AlertCircle,
  Clock,
  Heart,
  Send,
  Stethoscope,
  Filter,
  Search,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  PhoneCall,
} from 'lucide-react';
import { swasthyaApi, PatientRecord, DispatchedAlert } from '../api/swasthyaApi';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';

export const ClinicalWorklistPage: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedLane, setSelectedLane] = useState<'all' | 'clinical' | 'administrative'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [priorityOnly, setPriorityOnly] = useState<boolean>(false);

  // Reminder Modal State
  const [reminderPatient, setReminderPatient] = useState<PatientRecord | null>(null);
  const [reminderChannel, setReminderChannel] = useState<'WhatsApp' | 'SMS'>('WhatsApp');
  const [reminderType, setReminderType] = useState<string>('ROUTINE_REMINDER');
  const [sendingReminder, setSendingReminder] = useState<boolean>(false);
  const [reminderReceipt, setReminderReceipt] = useState<DispatchedAlert | null>(null);

  const loadData = () => {
    setLoading(true);
    swasthyaApi.fetchPatients({
      lane: selectedLane !== 'all' ? selectedLane : undefined,
      priorityOnly: priorityOnly || undefined,
      search: searchQuery || undefined,
    })
      .then(setPatients)
      .catch((err) => console.error('Error fetching worklist:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [selectedLane, priorityOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleSendReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderPatient) return;
    setSendingReminder(true);
    try {
      const receipt = await swasthyaApi.sendReminder(reminderPatient.patient_id, {
        channel: reminderChannel,
        message_type: reminderType,
        sender: 'Sunita Devi (Frontline ASHA Worker)',
      });
      setReminderReceipt(receipt);
    } catch (err: any) {
      alert(`Error sending reminder: ${err.message}`);
    } finally {
      setSendingReminder(false);
    }
  };

  // Metrics
  const totalCount = patients.length;
  const pendingConsultationCount = patients.filter((p) => p.status === 'PENDING_DOCTOR_CONSULTATION').length;
  const urgentCount = patients.filter((p) => p.is_high_priority).length;
  const overdueCount = patients.filter((p) => (p.overdue_days || 0) > 0).length;

  return (
    <div style={{ padding: '20px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div
        className="pn"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
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
            <Users size={22} color="var(--acc)" />
            <h1 style={{ fontFamily: 'var(--fs)', fontSize: '20px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Frontline Triage & Longitudinal Follow-Up Worklist
            </h1>
          </div>
          <p style={{ fontFamily: 'var(--fs)', fontSize: '12px', color: 'var(--mut)', margin: '4px 0 0 0' }}>
            Authorized Frontline Health Worker Desk • Tracking Missed Visits, Concerning Biomarkers & Clinician Escalations
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <SecondaryButton onClick={() => navigate('/lab-intake')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} />
            + New Lab Report Intake
          </SecondaryButton>
          <PrimaryButton onClick={() => navigate('/doctor-consultation')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Stethoscope size={15} />
            Doctor's 3D Station
          </PrimaryButton>
        </div>
      </div>

      {/* Metrics Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div className="pn" style={{ borderLeft: '3px solid var(--bd)' }}>
          <div style={{ fontSize: '11px', color: 'var(--mut)' }}>Total Registry Cohort</div>
          <div style={{ fontFamily: 'var(--fm)', fontSize: '24px', fontWeight: 600, color: 'var(--ink)' }}>{totalCount}</div>
          <div style={{ fontSize: '10px', color: 'var(--mut)' }}>Synthetically Calibrated</div>
        </div>

        <div className="pn" style={{ borderLeft: '3px solid var(--high)' }}>
          <div style={{ fontSize: '11px', color: 'var(--mut)' }}>High-Priority Urgent Alerts</div>
          <div style={{ fontFamily: 'var(--fm)', fontSize: '24px', fontWeight: 600, color: 'var(--high)' }}>{urgentCount}</div>
          <div style={{ fontSize: '10px', color: 'var(--high)' }}>Immediate Walk-in OPD Required</div>
        </div>

        <div className="pn" style={{ borderLeft: '3px solid var(--mod)' }}>
          <div style={{ fontSize: '11px', color: 'var(--mut)' }}>Pending Doctor Review</div>
          <div style={{ fontFamily: 'var(--fm)', fontSize: '24px', fontWeight: 600, color: 'var(--mod)' }}>{pendingConsultationCount}</div>
          <div style={{ fontSize: '10px', color: 'var(--mut)' }}>Awaiting Clinician Opinion</div>
        </div>

        <div className="pn" style={{ borderLeft: '3px solid var(--acc)' }}>
          <div style={{ fontSize: '11px', color: 'var(--mut)' }}>Overdue Follow-ups</div>
          <div style={{ fontFamily: 'var(--fm)', fontSize: '24px', fontWeight: 600, color: 'var(--acc)' }}>{overdueCount}</div>
          <div style={{ fontSize: '10px', color: 'var(--mut)' }}>Administrative Reminders Due</div>
        </div>
      </div>

      {/* Two-Lane Triage Selector & Search Toolbar */}
      <div
        className="pn"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        {/* Lane Tabs */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type="button"
            onClick={() => setSelectedLane('all')}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontFamily: 'var(--fs)',
              fontWeight: selectedLane === 'all' ? 600 : 400,
              borderRadius: 'var(--radius)',
              border: '1px solid var(--bd)',
              backgroundColor: selectedLane === 'all' ? 'var(--acc)' : 'var(--panel)',
              color: selectedLane === 'all' ? '#fff' : 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            All Patients ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedLane('clinical')}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontFamily: 'var(--fs)',
              fontWeight: selectedLane === 'clinical' ? 600 : 400,
              borderRadius: 'var(--radius)',
              border: '1px solid var(--bd)',
              backgroundColor: selectedLane === 'clinical' ? 'var(--high)' : 'var(--panel)',
              color: selectedLane === 'clinical' ? '#fff' : 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            🔴 Clinical Review Lane (Vitals & Ischemia)
          </button>
          <button
            type="button"
            onClick={() => setSelectedLane('administrative')}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontFamily: 'var(--fs)',
              fontWeight: selectedLane === 'administrative' ? 600 : 400,
              borderRadius: 'var(--radius)',
              border: '1px solid var(--bd)',
              backgroundColor: selectedLane === 'administrative' ? 'var(--mod)' : 'var(--panel)',
              color: selectedLane === 'administrative' ? '#fff' : 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            🟡 Administrative Follow-Up Lane (Overdue Visits)
          </button>
        </div>

        {/* Search & Priority Filter */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--ink)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={priorityOnly}
              onChange={(e) => setPriorityOnly(e.target.checked)}
            />
            Urgent Alerts Only
          </label>
          <input
            type="text"
            placeholder="Search patient, ID, cohort..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '5px 8px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--bd)',
              backgroundColor: 'var(--panel)',
              color: 'var(--ink)',
              fontSize: '12px',
              width: '180px',
            }}
          />
          <SecondaryButton type="submit" style={{ padding: '4px 10px', fontSize: '11px' }}>
            Filter
          </SecondaryButton>
        </form>
      </div>

      {/* Patient Worklist Table */}
      <div className="pn" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--hov)', borderBottom: '1px solid var(--bd)', textAlign: 'left', color: 'var(--mut)' }}>
              <th style={{ padding: '10px 14px' }}>Patient / ID</th>
              <th style={{ padding: '10px 14px' }}>Cohort</th>
              <th style={{ padding: '10px 14px' }}>Triage Lane & Tier</th>
              <th style={{ padding: '10px 14px' }}>CAD / Artery Risk</th>
              <th style={{ padding: '10px 14px' }}>Doctor Review Status</th>
              <th style={{ padding: '10px 14px' }}>Follow-Up Status</th>
              <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => {
              const isPending = patient.status === 'PENDING_DOCTOR_CONSULTATION';
              const isUrgent = patient.is_high_priority;
              const overdueDays = patient.overdue_days || 0;
              const ladRisk = Math.round((patient.predictions?.vessels?.lad?.probability || 0) * 100);
              const cadRisk = Math.round((patient.predictions?.overall_cad?.probability || 0) * 100);

              return (
                <tr
                  key={patient.patient_id}
                  style={{
                    borderBottom: '1px solid var(--bd)',
                    backgroundColor: isUrgent && isPending ? 'rgba(200, 29, 58, 0.04)' : 'transparent',
                  }}
                >
                  {/* Patient Info */}
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isUrgent && <span title="Urgent High Priority Alert">🚨</span>}
                      <strong style={{ color: 'var(--ink)' }}>{patient.full_name}</strong>
                    </div>
                    <div style={{ fontFamily: 'var(--fm)', fontSize: '11px', color: 'var(--mut)' }}>
                      {patient.patient_id} • {patient.Age || patient.age}y {patient.Sex || patient.sex}
                    </div>
                  </td>

                  {/* Cohort */}
                  <td style={{ padding: '10px 14px', color: 'var(--mut)', fontSize: '11px' }}>
                    {patient.cohort}
                  </td>

                  {/* Triage Lane */}
                  <td style={{ padding: '10px 14px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 'var(--radius)',
                        fontSize: '10px',
                        fontFamily: 'var(--fm)',
                        fontWeight: 600,
                        backgroundColor: patient.triage_lane === 'clinical' ? 'rgba(200, 29, 58, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                        color: patient.triage_lane === 'clinical' ? 'var(--high)' : 'var(--mod)',
                        border: `1px solid ${patient.triage_lane === 'clinical' ? 'var(--high)' : 'var(--mod)'}`,
                      }}
                    >
                      {patient.triage_lane === 'clinical' ? '🔴 Clinical Review' : '🟡 Administrative'}
                    </span>
                  </td>

                  {/* CAD Risk */}
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--fm)' }}>
                    <div>CAD: <strong>{cadRisk}%</strong></div>
                    <div style={{ fontSize: '11px', color: ladRisk >= 70 ? 'var(--high)' : 'var(--mut)' }}>
                      LAD: {ladRisk}%
                    </div>
                  </td>

                  {/* Doctor Status */}
                  <td style={{ padding: '10px 14px' }}>
                    {isPending ? (
                      <span style={{ color: 'var(--high)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} /> Awaiting Doctor Review
                      </span>
                    ) : (
                      <span style={{ color: 'var(--low)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={13} /> Consulted by {patient.doctor_consultation?.doctor_name?.split(',')[0] || 'Dr. Aditi'}
                      </span>
                    )}
                  </td>

                  {/* Follow-up / Overdue */}
                  <td style={{ padding: '10px 14px' }}>
                    {overdueDays > 0 ? (
                      <span style={{ color: 'var(--high)', fontFamily: 'var(--fm)', fontWeight: 600 }}>
                        ⚠️ {overdueDays} Days Overdue
                      </span>
                    ) : (
                      <span style={{ color: 'var(--mut)', fontSize: '11px' }}>
                        Scheduled: {patient.next_scheduled_date ? patient.next_scheduled_date.slice(0, 10) : 'Next Week'}
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setReminderPatient(patient);
                          setReminderReceipt(null);
                        }}
                        title="Send Simulated WhatsApp / SMS Reminder"
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          borderRadius: 'var(--radius)',
                          border: '1px solid var(--bd)',
                          backgroundColor: 'var(--hov)',
                          color: 'var(--ink)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Send size={12} color="#25D366" />
                        Remind
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/doctor-consultation?patient_id=${patient.patient_id}`)}
                        title="Open in Doctor's 3D Station"
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          borderRadius: 'var(--radius)',
                          border: '1px solid var(--acc)',
                          backgroundColor: 'var(--acc)',
                          color: '#fff',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Stethoscope size={12} />
                        Doctor 3D
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Simulated Reminder Modal */}
      {reminderPatient && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            className="pn"
            style={{
              backgroundColor: 'var(--panel)',
              maxWidth: '500px',
              width: '100%',
              borderRadius: 'var(--radius)',
              border: '2px solid var(--acc)',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={18} color="#25D366" />
                <h3 style={{ fontFamily: 'var(--fs)', fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                  Dispatch Simulated Follow-Up Notification
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReminderPatient(null)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--mut)' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--mut)', margin: '0 0 14px 0' }}>
              Recipient: <strong>{reminderPatient.full_name}</strong> ({reminderPatient.phone || reminderPatient.masked_phone}) • {reminderPatient.cohort}
            </p>

            <form onSubmit={handleSendReminder}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '4px' }}>Channel:</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="radio"
                      name="channel"
                      value="WhatsApp"
                      checked={reminderChannel === 'WhatsApp'}
                      onChange={() => setReminderChannel('WhatsApp')}
                    />
                    WhatsApp
                  </label>
                  <label style={{ fontSize: '12px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="radio"
                      name="channel"
                      value="SMS"
                      checked={reminderChannel === 'SMS'}
                      onChange={() => setReminderChannel('SMS')}
                    />
                    SMS
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '4px' }}>Reminder Template:</label>
                <select
                  value={reminderType}
                  onChange={(e) => setReminderType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--bd)',
                    backgroundColor: 'var(--panel)',
                    color: 'var(--ink)',
                    fontSize: '12px',
                  }}
                >
                  <option value="ROUTINE_REMINDER">Routine Scheduled Follow-Up Check-in</option>
                  <option value="OVERDUE_ALERT">Missed Follow-up Overdue Warning</option>
                  <option value="MEDICATION_CHECK">Daily Medication Adherence Reminder</option>
                </select>
              </div>

              {reminderReceipt && (
                <div
                  style={{
                    backgroundColor: 'rgba(37, 211, 102, 0.1)',
                    border: '1px solid #25D366',
                    borderRadius: 'var(--radius)',
                    padding: '10px',
                    marginBottom: '14px',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ color: 'var(--low)', fontWeight: 600, marginBottom: '4px' }}>✓ Simulated Message Dispatched!</div>
                  <div style={{ fontFamily: 'var(--fm)', color: 'var(--ink)' }}>{reminderReceipt.body}</div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <SecondaryButton onClick={() => setReminderPatient(null)}>Close</SecondaryButton>
                <PrimaryButton type="submit" disabled={sendingReminder}>
                  {sendingReminder ? 'Sending...' : 'Send Message'}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicalWorklistPage;
