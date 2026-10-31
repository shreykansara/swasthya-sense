/**
 * Swasthya Sense API Client
 * Connects frontend UI to FastAPI backend endpoints for:
 * - Patient registry & triage worklists
 * - Lab technician standard report upload & profile creation
 * - Doctor manual clinical opinion sign-off & 3D heart data
 * - Simulated WhatsApp/SMS communications & audit logs
 */

const API_BASE = '/api/v1/registry';

export interface StandardPreset {
  preset_id: string;
  title: string;
  severity: string;
  badge: string;
  summary: string;
  expected_action: string;
  report: Record<string, any>;
}

export interface DispatchedAlert {
  message_id: string;
  patient_id: string;
  patient_name: string;
  phone: string;
  channel: string;
  message_type: string;
  body: string;
  sender: string;
  status: string;
  timestamp: string;
}

export interface PatientRecord {
  patient_id: string;
  patient_masked_id: string;
  full_name: string;
  phone?: string;
  masked_phone: string;
  cohort: string;
  assigned_worker_id: string;
  created_at: string;
  status: 'PENDING_DOCTOR_CONSULTATION' | 'CONSULTED' | 'UNDER_FOLLOW_UP';
  is_high_priority: boolean;
  urgent_reasons?: string[];
  triage_lane: 'clinical' | 'administrative';
  triage_tier: string;
  overdue_days: number;
  next_scheduled_date: string;
  report_data?: {
    lab_name: string;
    technician_name: string;
    upload_timestamp: string;
    vitals: { BP: number; Diastolic_BP: number; PR: number; BMI: number };
    chemistry: { FBS: number; CR: number; BUN: number; ESR: number; HB: number };
    lipids: { TG: number; LDL: number; HDL: number };
    cardiac_ecg: {
      EF_TTE: number;
      St_Elevation: string;
      St_Depression: string;
      Tinversion: string;
      Q_Wave: string;
      Region_RWMA: string;
      Typical_Chest_Pain: string;
      Dyspnea: string;
    };
  };
  predictions?: {
    overall_cad: { probability: number; risk_tier: string; stenosis_suspected: boolean; color_hex: string };
    vessels: {
      lad: { probability: number; risk_tier: string; stenosis_suspected: boolean; color_hex: string; emissive_pulse: boolean };
      lcx: { probability: number; risk_tier: string; stenosis_suspected: boolean; color_hex: string; emissive_pulse: boolean };
      rca: { probability: number; risk_tier: string; stenosis_suspected: boolean; color_hex: string; emissive_pulse: boolean };
    };
    high_risk_vessels: string[];
    clinical_summary: string;
  };
  explanations?: Record<string, any>;
  uniforms?: {
    lad: [number, number, number];
    lcx: [number, number, number];
    rca: [number, number, number];
  };
  doctor_consultation?: {
    consulted: boolean;
    doctor_name?: string | null;
    doctor_id?: string | null;
    consultation_date?: string | null;
    clinical_notes?: string | null;
    recommendation?: string | null;
    triage_decision?: string | null;
  };
  last_urgent_alert?: DispatchedAlert;
  [key: string]: any;
}

export interface AuditRecord {
  audit_id: string;
  timestamp: string;
  actor_id: string;
  actor_role: string;
  action: string;
  patient_id: string;
  details: Record<string, any>;
}

export const swasthyaApi = {
  async fetchPresets(): Promise<StandardPreset[]> {
    const res = await fetch(`${API_BASE}/standard-report-presets`);
    if (!res.ok) throw new Error('Failed to load standard report presets');
    return res.json();
  },

  async fetchPatients(params?: {
    lane?: string;
    status?: string;
    priorityOnly?: boolean;
    search?: string;
  }): Promise<PatientRecord[]> {
    const query = new URLSearchParams();
    if (params?.lane) query.append('lane', params.lane);
    if (params?.status) query.append('status', params.status);
    if (params?.priorityOnly) query.append('priority_only', 'true');
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`${API_BASE}/patients?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to load patient registry');
    return res.json();
  },

  async fetchPatient(patientId: string): Promise<PatientRecord> {
    const res = await fetch(`${API_BASE}/patients/${patientId}`);
    if (!res.ok) throw new Error(`Patient ${patientId} not found`);
    return res.json();
  },

  async uploadReport(report: Record<string, any>, uploadedBy?: string): Promise<{
    success: boolean;
    patient_id: string;
    patient: PatientRecord;
    dispatched_alert?: DispatchedAlert;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/upload-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        report,
        uploaded_by: uploadedBy || 'Rajesh Kumar (Sr. Lab Tech)',
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload report');
    }
    return res.json();
  },

  async submitDoctorOpinion(patientId: string, opinion: {
    clinical_notes: string;
    recommendation: string;
    triage_decision: string;
    doctor_name?: string;
    doctor_id?: string;
  }): Promise<{ success: boolean; patient: PatientRecord; message: string }> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/doctor-opinion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...opinion,
        doctor_name: opinion.doctor_name || 'Dr. Aditi Sharma, MD',
        doctor_id: opinion.doctor_id || 'DOC-CARDIO-01',
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit clinical opinion');
    }
    return res.json();
  },

  async sendReminder(patientId: string, data: {
    channel?: string;
    message_type?: string;
    custom_body?: string;
    sender?: string;
  }): Promise<DispatchedAlert> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/send-reminder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: data.channel || 'WhatsApp',
        message_type: data.message_type || 'ROUTINE_REMINDER',
        custom_body: data.custom_body,
        sender: data.sender || 'Frontline ASHA Worker',
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to dispatch reminder');
    }
    return res.json();
  },

  async fetchAuditTrail(): Promise<AuditRecord[]> {
    const res = await fetch(`${API_BASE}/audit-trail?limit=100`);
    if (!res.ok) throw new Error('Failed to load audit trail');
    return res.json();
  },

  async fetchDispatchedMessages(): Promise<DispatchedAlert[]> {
    const res = await fetch(`${API_BASE}/dispatched-messages?limit=100`);
    if (!res.ok) throw new Error('Failed to load dispatched messages');
    return res.json();
  },
};
