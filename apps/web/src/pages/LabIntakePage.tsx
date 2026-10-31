import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Upload,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Send,
  Heart,
  Stethoscope,
  Activity,
  User,
  Phone,
  Building,
  RefreshCw,
  UserPlus,
} from 'lucide-react';
import { swasthyaApi, StandardPreset, PatientRecord, DispatchedAlert } from '../api/swasthyaApi';
import { useAuthStore } from '../store/useAuthStore';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';

export const LabIntakePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [presets, setPresets] = useState<StandardPreset[]>([]);
  const [existingPatients, setExistingPatients] = useState<PatientRecord[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('critical_lad_ischemia');
  const [intakeMode, setIntakeMode] = useState<'new' | 'existing'>('existing');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('PAT-0001');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState<Record<string, any>>({
    patient_id: 'PAT-0001',
    full_name: 'Ramesh Patel',
    age: 62,
    sex: 'Male',
    phone: '+91-98201-44123',
    cohort: 'Cohort B: Post-Event Discharge (Post-MI)',
    lab_name: 'Apex Central Diagnostic Center',
    technician_name: user?.full_name || 'Rajesh Kumar (Sr. Lab Tech)',
    BP: 168.0,
    Diastolic_BP: 98.0,
    PR: 92.0,
    Length: 170.0,
    Weight: 82.0,
    DM: '1',
    HTN: '1',
    Current_Smoker: '1',
    Typical_Chest_Pain: '1',
    Dyspnea: 'Y',
    Function_Class: '3',
    St_Elevation: '1',
    St_Depression: '0',
    Tinversion: '1',
    Q_Wave: '1',
    Region_RWMA: '1',
    EF_TTE: 42.0,
    FBS: 184.0,
    CR: 1.3,
    TG: 245.0,
    LDL: 165.0,
    HDL: 31.0,
    BUN: 24.0,
    ESR: 32.0,
    HB: 13.5,
    VHD: 'mild',
  });

  // Upload Result State
  const [uploadResult, setUploadResult] = useState<{
    patient_id: string;
    patient: PatientRecord;
    is_update?: boolean;
    dispatched_alert?: DispatchedAlert;
  } | null>(null);

  useEffect(() => {
    // 1. Load presets
    swasthyaApi.fetchPresets().then((data) => {
      setPresets(data);
    }).catch(console.warn);

    // 2. Load existing patients for the upsert selector
    swasthyaApi.fetchPatients().then((data) => {
      setExistingPatients(data);
      if (data.length > 0) {
        setSelectedPatientId(data[0].patient_id);
      }
    }).catch(console.warn);
  }, []);

  const handleSelectPreset = (preset: StandardPreset) => {
    setSelectedPresetId(preset.preset_id);
    setFormData((prev) => ({
      ...prev,
      ...preset.report,
      patient_id: intakeMode === 'existing' ? selectedPatientId : undefined,
    }));
    setUploadResult(null);
    setError(null);
  };

  const handleExistingPatientChange = (pid: string) => {
    setSelectedPatientId(pid);
    const matched = existingPatients.find((p) => p.patient_id === pid);
    if (matched) {
      setFormData((prev) => ({
        ...prev,
        patient_id: matched.patient_id,
        full_name: matched.full_name,
        age: matched.Age || matched.age,
        sex: matched.Sex || matched.sex,
        phone: matched.phone || matched.masked_phone,
        cohort: matched.cohort,
        BP: matched.BP || 130,
        Diastolic_BP: matched.Diastolic_BP || 80,
        PR: matched.PR || 72,
        FBS: matched.FBS || 100,
        LDL: matched.LDL || 95,
        TG: matched.TG || 120,
        EF_TTE: matched.EF_TTE || matched['EF-TTE'] || 55,
      }));
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = { ...formData };
    if (intakeMode === 'new') {
      delete payload.patient_id;
    } else {
      payload.patient_id = selectedPatientId;
    }

    try {
      const res = await swasthyaApi.uploadReport(payload, user?.full_name || 'Rajesh Kumar (Sr. Lab Tech)');
      setUploadResult({
        patient_id: res.patient_id,
        patient: res.patient,
        is_update: res.is_update,
        dispatched_alert: res.dispatched_alert,
      });

      // Refresh patients list so updated values reflect immediately
      swasthyaApi.fetchPatients().then(setExistingPatients).catch(console.warn);
    } catch (err: any) {
      setError(err.message || 'Error uploading report and updating patient profile.');
    } finally {
      setLoading(false);
    }
  };

  const isLabTechOnly = user?.role === 'lab_technician';

  return (
    <div className="landing-container" style={{ padding: '24px 16px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header Banner */}
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
          borderLeft: '4px solid var(--mod)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={22} color="var(--mod)" />
            <h1 style={{ fontFamily: 'var(--fs)', fontSize: '18px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Diagnostic Laboratory Intake & Patient Record Desk
            </h1>
          </div>
          <p style={{ fontFamily: 'var(--fs)', fontSize: '12px', color: 'var(--mut)', margin: '4px 0 0 0' }}>
            Logged in as: <strong>{user?.full_name || 'Rajesh Kumar'}</strong> (Laboratory Technician) • Dedicated Report Upload Terminal
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
            LAB TECHNICIAN DESK • STRICT REPORT INGESTION
          </span>
        </div>
      </div>

      {/* PATIENT IDENTIFICATION MODE SELECTOR (NEW VS EXISTING UPSERT) */}
      <div
        className="pn"
        style={{
          marginBottom: '20px',
          backgroundColor: 'var(--panel)',
          border: '1px solid var(--bd)',
          padding: '16px',
        }}
      >
        <div style={{ fontFamily: 'var(--fs)', fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>
          Patient Target Identification:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '14px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--ink)', cursor: 'pointer' }}>
            <input
              type="radio"
              name="intakeMode"
              checked={intakeMode === 'existing'}
              onChange={() => {
                setIntakeMode('existing');
                handleExistingPatientChange(selectedPatientId);
              }}
            />
            <strong>Update Existing Patient</strong> (Report supersedes previous records)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--ink)', cursor: 'pointer' }}>
            <input
              type="radio"
              name="intakeMode"
              checked={intakeMode === 'new'}
              onChange={() => {
                setIntakeMode('new');
                setFormData((prev) => ({
                  ...prev,
                  patient_id: undefined,
                  full_name: 'New Registered Patient',
                  phone: '+91-98765-43210',
                }));
              }}
            />
            <strong>Create New Patient Profile</strong> (First-Time Diagnostic Visit)
          </label>
        </div>

        {intakeMode === 'existing' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '12px', color: 'var(--mut)', minWidth: '150px' }}>Select Existing Patient:</label>
            <select
              value={selectedPatientId}
              onChange={(e) => handleExistingPatientChange(e.target.value)}
              style={{
                flex: 1,
                padding: '7px 10px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--bd)',
                backgroundColor: 'var(--panel)',
                color: 'var(--ink)',
                fontSize: '13px',
                fontFamily: 'var(--fs)',
                maxWidth: '460px',
              }}
            >
              {existingPatients.map((p) => (
                <option key={p.patient_id} value={p.patient_id}>
                  {p.patient_id} — {p.full_name} ({p.cohort})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 1-Click Demo Presets Bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontFamily: 'var(--fs)', fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
            Quick-Load Standard Lab Report Templates (Pre-fills Diagnostic Values):
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
          {presets.map((preset) => {
            const isSelected = selectedPresetId === preset.preset_id;
            const isCritical = preset.severity === 'CRITICAL';
            return (
              <button
                key={preset.preset_id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="pn"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'var(--hov)' : 'var(--panel)',
                  borderColor: isSelected ? 'var(--mod)' : 'var(--bd)',
                  borderWidth: isSelected ? '2px' : '1px',
                  borderRadius: 'var(--radius)',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--fs)', fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                    {preset.title}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--fm)',
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 'var(--radius)',
                      backgroundColor: isCritical ? 'rgba(200, 29, 58, 0.12)' : 'var(--hov)',
                      color: isCritical ? 'var(--high)' : 'var(--mut)',
                      border: `1px solid ${isCritical ? 'var(--high)' : 'var(--bd)'}`,
                    }}
                  >
                    {preset.badge}
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--fs)', fontSize: '11px', color: 'var(--mut)', margin: 0, lineHeight: 1.35 }}>
                  {preset.summary}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Result Card: Profile Created or Updated with Most Recent */}
      {uploadResult && (
        <div
          className="pn"
          style={{
            marginBottom: '24px',
            backgroundColor: 'var(--panel)',
            border: '2px solid var(--low)',
            borderRadius: 'var(--radius)',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={22} color="var(--low)" />
              <h2 style={{ fontFamily: 'var(--fs)', fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                {uploadResult.is_update
                  ? `✓ Existing Record Successfully Updated: ${uploadResult.patient.full_name} (${uploadResult.patient_id})`
                  : `✓ New Patient Profile Successfully Created: ${uploadResult.patient.full_name} (${uploadResult.patient_id})`}
              </h2>
            </div>
            <span
              style={{
                fontFamily: 'var(--fm)',
                fontSize: '11px',
                padding: '3px 8px',
                backgroundColor: 'rgba(31, 111, 69, 0.12)',
                color: 'var(--low)',
                fontWeight: 600,
                borderRadius: 'var(--radius)',
                border: '1px solid var(--low)',
              }}
            >
              {uploadResult.is_update ? 'MOST RECENT VALUES UPDATED' : 'NEW PROFILE REGISTERED'}
            </span>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--mut)', margin: '0 0 14px 0' }}>
            {uploadResult.is_update
              ? 'Patient parameters and risk scores have been strictly updated with the latest report findings. Historical consultation record preserved.'
              : 'New patient registered in the central repository. Initial baseline biomarkers recorded.'}
          </p>

          {/* Model Risk Scores Overview */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            <div className="pn" style={{ padding: '8px 12px' }}>
              <div style={{ fontFamily: 'var(--fs)', fontSize: '11px', color: 'var(--mut)' }}>Overall CAD Risk</div>
              <div style={{ fontFamily: 'var(--fm)', fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
                {Math.round((uploadResult.patient.predictions?.overall_cad?.probability || 0) * 100)}%
              </div>
            </div>
            <div className="pn" style={{ padding: '8px 12px' }}>
              <div style={{ fontFamily: 'var(--fs)', fontSize: '11px', color: 'var(--mut)' }}>LAD (Anterior)</div>
              <div style={{ fontFamily: 'var(--fm)', fontSize: '18px', fontWeight: 600, color: 'var(--high)' }}>
                {Math.round((uploadResult.patient.predictions?.vessels?.lad?.probability || 0) * 100)}%
              </div>
            </div>
            <div className="pn" style={{ padding: '8px 12px' }}>
              <div style={{ fontFamily: 'var(--fs)', fontSize: '11px', color: 'var(--mut)' }}>LCX (Circumflex)</div>
              <div style={{ fontFamily: 'var(--fm)', fontSize: '18px', fontWeight: 600, color: 'var(--mod)' }}>
                {Math.round((uploadResult.patient.predictions?.vessels?.lcx?.probability || 0) * 100)}%
              </div>
            </div>
            <div className="pn" style={{ padding: '8px 12px' }}>
              <div style={{ fontFamily: 'var(--fs)', fontSize: '11px', color: 'var(--mut)' }}>RCA (Inferior)</div>
              <div style={{ fontFamily: 'var(--fm)', fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
                {Math.round((uploadResult.patient.predictions?.vessels?.rca?.probability || 0) * 100)}%
              </div>
            </div>
          </div>

          {/* Dispatched Notification Card if Urgent */}
          {uploadResult.dispatched_alert && (
            <div
              style={{
                backgroundColor: 'rgba(37, 211, 102, 0.08)',
                border: '1px solid #25D366',
                borderRadius: 'var(--radius)',
                padding: '12px 14px',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Send size={15} color="#25D366" />
                  <span style={{ fontFamily: 'var(--fs)', fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                    Automated Urgent Notification Dispatched:
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--fm)', fontSize: '10px', color: 'var(--mut)' }}>
                  Delivery Status: {uploadResult.dispatched_alert.status}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--fm)', fontSize: '11px', backgroundColor: 'var(--panel)', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)' }}>
                {uploadResult.dispatched_alert.body}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <SecondaryButton onClick={() => setUploadResult(null)}>
              Upload Another Report
            </SecondaryButton>
            {!isLabTechOnly && (
              <PrimaryButton onClick={() => navigate(`/doctor-consultation?patient_id=${uploadResult.patient_id}`)}>
                Open in Doctor's Station <ArrowRight size={15} />
              </PrimaryButton>
            )}
          </div>
        </div>
      )}

      {/* Main Standard Report Input Form */}
      <form onSubmit={handleUploadReport} className="pn" style={{ backgroundColor: 'var(--panel)' }}>
        <div style={{ borderBottom: '1px solid var(--bd)', paddingBottom: '12px', marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'var(--fs)', fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
            Standard Laboratory Report Fields
          </h2>
          <p style={{ fontFamily: 'var(--fs)', fontSize: '12px', color: 'var(--mut)', margin: '2px 0 0 0' }}>
            {intakeMode === 'existing'
              ? `Updating most recent report findings for Patient: ${formData.patient_id} (${formData.full_name})`
              : 'Registering new first-time patient profile and recording initial report.'}
          </p>
        </div>

        {error && (
          <div style={{ padding: '10px', backgroundColor: 'rgba(200, 29, 58, 0.1)', border: '1px solid var(--high)', borderRadius: 'var(--radius)', color: 'var(--high)', fontSize: '12px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Section 1: Demographics */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontFamily: 'var(--fs)', fontSize: '12px', fontWeight: 600, color: 'var(--mod)', marginBottom: '8px' }}>
            1. Patient Demographics & Reporting Facility
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '3px' }}>Patient Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                required
                style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '3px' }}>Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                required
                style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '3px' }}>Age (Years)</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => handleInputChange('age', Number(e.target.value))}
                required
                style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '3px' }}>Biological Sex</label>
              <select
                value={formData.sex}
                onChange={(e) => handleInputChange('sex', e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Vitals & Blood Chemistry */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontFamily: 'var(--fs)', fontSize: '12px', fontWeight: 600, color: 'var(--mod)', marginBottom: '8px' }}>
            2. Primary Vitals & Blood Chemistry (Today's Measurements)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '3px' }}>Systolic BP (mmHg)</label>
              <input
                type="number"
                value={formData.BP}
                onChange={(e) => handleInputChange('BP', Number(e.target.value))}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '3px' }}>Diastolic BP (mmHg)</label>
              <input
                type="number"
                value={formData.Diastolic_BP}
                onChange={(e) => handleInputChange('Diastolic_BP', Number(e.target.value))}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '3px' }}>Pulse Rate (BPM)</label>
              <input
                type="number"
                value={formData.PR}
                onChange={(e) => handleInputChange('PR', Number(e.target.value))}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '3px' }}>Fasting Blood Sugar (mg/dL)</label>
              <input
                type="number"
                value={formData.FBS}
                onChange={(e) => handleInputChange('FBS', Number(e.target.value))}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '3px' }}>LDL Cholesterol (mg/dL)</label>
              <input
                type="number"
                value={formData.LDL}
                onChange={(e) => handleInputChange('LDL', Number(e.target.value))}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '3px' }}>Triglycerides (mg/dL)</label>
              <input
                type="number"
                value={formData.TG}
                onChange={(e) => handleInputChange('TG', Number(e.target.value))}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Cardiac & ECG */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontFamily: 'var(--fs)', fontSize: '12px', fontWeight: 600, color: 'var(--mod)', marginBottom: '8px' }}>
            3. Echocardiogram & ECG Manifestations
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '3px' }}>Ejection Fraction EF (%)</label>
              <input
                type="number"
                value={formData.EF_TTE}
                onChange={(e) => handleInputChange('EF_TTE', Number(e.target.value))}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '3px' }}>ST-Segment Elevation</label>
              <select
                value={formData.St_Elevation}
                onChange={(e) => handleInputChange('St_Elevation', e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
              >
                <option value="0">0: Absent / Normal</option>
                <option value="1">1: Present (Acute Ischemia)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '3px' }}>Regional Wall Motion (RWMA)</label>
              <select
                value={formData.Region_RWMA}
                onChange={(e) => handleInputChange('Region_RWMA', e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
              >
                <option value="0">0: Normal Kinematics</option>
                <option value="1">1: Anterior Hypokinesia (LAD)</option>
                <option value="2">2: Inferior Hypokinesia (RCA)</option>
                <option value="3">3: Lateral Hypokinesia (LCX)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '3px' }}>Typical Anginal Pain</label>
              <select
                value={formData.Typical_Chest_Pain}
                onChange={(e) => handleInputChange('Typical_Chest_Pain', e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
              >
                <option value="0">0: None / Atypical</option>
                <option value="1">1: Severe Substernal Angina</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--bd)', paddingTop: '16px' }}>
          <PrimaryButton
            type="submit"
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '240px', backgroundColor: 'var(--mod)' }}
          >
            <Zap size={16} />
            {loading ? 'Processing & Updating...' : intakeMode === 'existing' ? '⚡ Update Existing Patient Record' : '⚡ Register New Patient Profile'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
};

export default LabIntakePage;
