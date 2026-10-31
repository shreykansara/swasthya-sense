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
} from 'lucide-react';
import { swasthyaApi, StandardPreset, PatientRecord, DispatchedAlert } from '../api/swasthyaApi';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';

export const LabIntakePage: React.FC = () => {
  const navigate = useNavigate();
  const [presets, setPresets] = useState<StandardPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('critical_lad_ischemia');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState<Record<string, any>>({
    full_name: 'Ramesh Patel',
    age: 62,
    sex: 'Male',
    phone: '+91-98201-44123',
    cohort: 'Cohort B: Post-Event Discharge',
    lab_name: 'Apex Central Diagnostic Center',
    technician_name: 'Rajesh Kumar (Sr. Lab Tech)',
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
  const [createdResult, setCreatedResult] = useState<{
    patient_id: string;
    patient: PatientRecord;
    dispatched_alert?: DispatchedAlert;
  } | null>(null);

  useEffect(() => {
    swasthyaApi.fetchPresets().then((data) => {
      setPresets(data);
      const initial = data.find((p) => p.preset_id === 'critical_lad_ischemia');
      if (initial) {
        setFormData((prev) => ({ ...prev, ...initial.report }));
      }
    }).catch((err) => {
      console.warn('Could not load presets from server, using local fallback:', err);
    });
  }, []);

  const handleSelectPreset = (preset: StandardPreset) => {
    setSelectedPresetId(preset.preset_id);
    setFormData((prev) => ({
      ...prev,
      ...preset.report,
    }));
    setCreatedResult(null);
    setError(null);
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
    try {
      const res = await swasthyaApi.uploadReport(formData, 'Rajesh Kumar (Sr. Lab Tech)');
      setCreatedResult({
        patient_id: res.patient_id,
        patient: res.patient,
        dispatched_alert: res.dispatched_alert,
      });
    } catch (err: any) {
      setError(err.message || 'Error uploading report and creating patient profile.');
    } finally {
      setLoading(false);
    }
  };

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
          borderLeft: '4px solid var(--acc)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} color="var(--acc)" />
            <h1 style={{ fontFamily: 'var(--fs)', fontSize: '18px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Diagnostic Lab Intake & Instant Profile Creation Desk
            </h1>
          </div>
          <p style={{ fontFamily: 'var(--fs)', fontSize: '12px', color: 'var(--mut)', margin: '4px 0 0 0' }}>
            Authorized Medical Operator: <strong>Rajesh Kumar</strong> (Sr. Lab Tech, Apex Diagnostics) • Standard CAD Biomarker Ingestion
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span
            style={{
              fontFamily: 'var(--fm)',
              fontSize: '11px',
              padding: '3px 8px',
              backgroundColor: 'var(--hov)',
              border: '1px solid var(--bd)',
              borderRadius: 'var(--radius)',
              color: 'var(--ink)',
            }}
          >
            DECISION SUPPORT ONLY • PROTOTYPE
          </span>
        </div>
      </div>

      {/* 1-Click Demo Presets Bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontFamily: 'var(--fs)', fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
            Quick-Load Standard Cardiac Lab Report Presets (1-Click Evaluation):
          </span>
          <span style={{ fontFamily: 'var(--fm)', fontSize: '11px', color: 'var(--mut)' }}>
            Select a sample report to prefill standard parameters
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
                  borderColor: isSelected ? 'var(--acc)' : 'var(--bd)',
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

      {/* Creation Success & Simulated WhatsApp Alert Notification */}
      {createdResult && (
        <div
          className="pn"
          style={{
            marginBottom: '24px',
            backgroundColor: 'var(--panel)',
            border: '2px solid var(--acc)',
            borderRadius: 'var(--radius)',
            padding: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={22} color="var(--low)" />
              <h2 style={{ fontFamily: 'var(--fs)', fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                Patient Profile Successfully Created & Triaged: {createdResult.patient.full_name} ({createdResult.patient_id})
              </h2>
            </div>
            <span
              style={{
                fontFamily: 'var(--fm)',
                fontSize: '11px',
                padding: '3px 8px',
                backgroundColor: createdResult.patient.is_high_priority ? 'rgba(200, 29, 58, 0.15)' : 'var(--hov)',
                color: createdResult.patient.is_high_priority ? 'var(--high)' : 'var(--low)',
                fontWeight: 600,
                borderRadius: 'var(--radius)',
                border: '1px solid var(--bd)',
              }}
            >
              {createdResult.patient.status.replace(/_/g, ' ')}
            </span>
          </div>

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
                {Math.round((createdResult.patient.predictions?.overall_cad?.probability || 0) * 100)}%
              </div>
            </div>
            <div className="pn" style={{ padding: '8px 12px' }}>
              <div style={{ fontFamily: 'var(--fs)', fontSize: '11px', color: 'var(--mut)' }}>LAD (Anterior)</div>
              <div style={{ fontFamily: 'var(--fm)', fontSize: '18px', fontWeight: 600, color: 'var(--high)' }}>
                {Math.round((createdResult.patient.predictions?.vessels?.lad?.probability || 0) * 100)}%
              </div>
            </div>
            <div className="pn" style={{ padding: '8px 12px' }}>
              <div style={{ fontFamily: 'var(--fs)', fontSize: '11px', color: 'var(--mut)' }}>LCX (Circumflex)</div>
              <div style={{ fontFamily: 'var(--fm)', fontSize: '18px', fontWeight: 600, color: 'var(--mod)' }}>
                {Math.round((createdResult.patient.predictions?.vessels?.lcx?.probability || 0) * 100)}%
              </div>
            </div>
            <div className="pn" style={{ padding: '8px 12px' }}>
              <div style={{ fontFamily: 'var(--fs)', fontSize: '11px', color: 'var(--mut)' }}>RCA (Inferior)</div>
              <div style={{ fontFamily: 'var(--fm)', fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
                {Math.round((createdResult.patient.predictions?.vessels?.rca?.probability || 0) * 100)}%
              </div>
            </div>
          </div>

          {/* Simulated WhatsApp / SMS Alert Box */}
          {createdResult.dispatched_alert ? (
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
                    Automated Simulated Notification Dispatched to Patient:
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--fm)', fontSize: '10px', color: 'var(--mut)' }}>
                  Channel: {createdResult.dispatched_alert.channel} • Status: {createdResult.dispatched_alert.status}
                </span>
              </div>

              <div
                style={{
                  fontFamily: 'var(--fm)',
                  fontSize: '11px',
                  backgroundColor: 'var(--panel)',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--bd)',
                  color: 'var(--ink)',
                  lineHeight: 1.4,
                }}
              >
                {createdResult.dispatched_alert.body}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ fontFamily: 'var(--fs)', fontSize: '10px', color: 'var(--mut)' }}>
                  Recipient: {createdResult.dispatched_alert.phone} ({createdResult.patient.full_name})
                </span>
                <span style={{ fontFamily: 'var(--fs)', fontSize: '10px', color: 'var(--low)', fontWeight: 600 }}>
                  ✓ Delivery Confirmed via Simulator Gateway
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: 'var(--hov)',
                border: '1px solid var(--bd)',
                borderRadius: 'var(--radius)',
                padding: '10px 12px',
                marginBottom: '16px',
                fontSize: '12px',
                color: 'var(--mut)',
              }}
            >
              Routine patient profile created. Patient placed in routine community follow-up schedule (no acute walk-in alert required).
            </div>
          )}

          {/* Action to Doctor's 3D Consultation Station */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <SecondaryButton onClick={() => setCreatedResult(null)}>
              Upload Another Report
            </SecondaryButton>
            <PrimaryButton
              onClick={() => navigate(`/doctor-consultation?patient_id=${createdResult.patient_id}`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Stethoscope size={16} />
              Open in Doctor's 3D Consultation Station
              <ArrowRight size={16} />
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Main Standard Report Input Form */}
      <form onSubmit={handleUploadReport} className="pn" style={{ backgroundColor: 'var(--panel)' }}>
        <div style={{ borderBottom: '1px solid var(--bd)', paddingBottom: '12px', marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'var(--fs)', fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
            Standard Cardiac Biomarker Laboratory Report Fields
          </h2>
          <p style={{ fontFamily: 'var(--fs)', fontSize: '12px', color: 'var(--mut)', margin: '2px 0 0 0' }}>
            Fill or edit values below, then click "Upload Report & Create Patient Profile" to execute the inference pipeline.
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(200, 29, 58, 0.1)',
              border: '1px solid var(--high)',
              borderRadius: 'var(--radius)',
              color: 'var(--high)',
              fontSize: '12px',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        {/* Section 1: Demographics & Facility */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontFamily: 'var(--fs)', fontSize: '12px', fontWeight: 600, color: 'var(--acc)', marginBottom: '8px' }}>
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

        {/* Section 2: Vitals & Metabolic Biomarkers */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontFamily: 'var(--fs)', fontSize: '12px', fontWeight: 600, color: 'var(--acc)', marginBottom: '8px' }}>
            2. Primary Vitals & Blood Chemistry
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

        {/* Section 3: Cardiac Echo & Electrocardiogram Findings */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontFamily: 'var(--fs)', fontSize: '12px', fontWeight: 600, color: 'var(--acc)', marginBottom: '8px' }}>
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
                <option value="0">0: Normal / Absent</option>
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
                <option value="4">4: Global Hypokinesia</option>
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
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '220px' }}
          >
            <Zap size={16} />
            {loading ? 'Evaluating Model & Creating Profile...' : '⚡ Upload Report & Create Patient Profile'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
};

export default LabIntakePage;
