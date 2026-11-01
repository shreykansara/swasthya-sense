import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Upload,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Send,
  Activity,
  HeartPulse,
  FlaskConical,
  ClipboardList,
  RefreshCw,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Check,
  X,
} from 'lucide-react';
import { swasthyaApi, StandardPreset, PatientRecord, DispatchedAlert } from '../api/swasthyaApi';
import { extractReport } from '../api/extract';
import { type ReportType, type ExtractionResult, ExtractionError } from '../types/extraction';
import { useAuthStore } from '../store/useAuthStore';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';

// Initial baseline values for all 55 clinical parameters
const DEFAULT_FORM_DATA: Record<string, any> = {
  // Hospital Tracking & Patient Demographics
  patient_id: 'PAT-0001',
  full_name: 'Ramesh Patel',
  phone: '+91-98201-44123',
  cohort: 'Cohort B: Post-Event Discharge (Post-MI)',
  lab_name: 'Apex Central Diagnostic Center',
  technician_name: 'Rajesh Kumar (Sr. Lab Tech)',

  // 1. Demographics & Anthropometrics (5 features)
  Age: 62.0,
  Sex: 'Male',
  Weight: 82.0,
  Length: 170.0,
  BMI: 28.37,

  // 2. Medical History & Risk Factors (12 features)
  DM: '1',
  HTN: '1',
  'Current Smoker': '1',
  'EX-Smoker': '0',
  FH: '1',
  Obesity: 'Y',
  CRF: 'N',
  CVA: 'N',
  'Airway disease': 'N',
  'Thyroid Disease': 'N',
  CHF: 'N',
  DLP: 'Y',

  // 3. Physical Examination & Vitals (7 features)
  BP: 168.0,
  PR: 92.0,
  Edema: '1',
  'Weak Peripheral Pulse': 'N',
  'Lung rales': 'N',
  'Systolic Murmur': 'N',
  'Diastolic Murmur': 'N',

  // 4. Cardiac Symptoms & Functional Status (7 features)
  'Typical Chest Pain': '1',
  Dyspnea: 'Y',
  'Function Class': '3',
  Atypical: 'N',
  Nonanginal: 'N',
  'Exertional CP': 'Y',
  'LowTH Ang': 'Y',

  // 5. Resting Electrocardiogram (ECG) (7 features)
  'Q Wave': '1',
  'St Elevation': '1',
  'St Depression': '0',
  Tinversion: '1',
  LVH: 'Y',
  'Poor R Progression': 'Y',
  BBB: 'N',

  // 6. Blood Chemistry & Hematology (14 features)
  FBS: 184.0,
  CR: 1.3,
  TG: 245.0,
  LDL: 165.0,
  HDL: 31.0,
  BUN: 24.0,
  ESR: 32.0,
  HB: 13.5,
  K: 4.5,
  Na: 139.0,
  WBC: 8900.0,
  Lymph: 24.0,
  Neut: 68.0,
  PLT: 260.0,

  // 7. Echocardiographic Findings (3 features)
  'EF-TTE': 42.0,
  'Region RWMA': '1',
  VHD: 'mild',
};

// 4 Report Upload Slots Metadata
interface ReportSlotMeta {
  type: ReportType;
  title: string;
  subtitle: string;
  fieldCount: number;
  icon: any;
  color: string;
  keys: string[];
}

const REPORT_SLOTS: ReportSlotMeta[] = [
  {
    type: 'ecg',
    title: '1. ECG Report (PDF)',
    subtitle: 'Extracts 7 ECG wave & conduction parameters',
    fieldCount: 7,
    icon: Activity,
    color: '#c81d3a',
    keys: ['Q Wave', 'St Elevation', 'St Depression', 'Tinversion', 'LVH', 'Poor R Progression', 'BBB'],
  },
  {
    type: 'echo',
    title: '2. 2D Echo Report (PDF)',
    subtitle: 'Extracts 3 wall motion & valve parameters',
    fieldCount: 3,
    icon: HeartPulse,
    color: '#1d3f8a',
    keys: ['EF-TTE', 'Region RWMA', 'VHD'],
  },
  {
    type: 'lab',
    title: '3. Blood Lab Report (PDF)',
    subtitle: 'Extracts 14 lipid, sugar & hematology markers',
    fieldCount: 14,
    icon: FlaskConical,
    color: '#b87700',
    keys: ['FBS', 'CR', 'TG', 'LDL', 'HDL', 'BUN', 'ESR', 'HB', 'K', 'Na', 'WBC', 'Lymph', 'Neut', 'PLT'],
  },
  {
    type: 'ehr',
    title: '4. Outpatient EHR Note (PDF)',
    subtitle: 'Extracts 31 demographic & clinical exam fields',
    fieldCount: 31,
    icon: ClipboardList,
    color: '#1f6f45',
    keys: [
      'Age', 'Sex', 'Weight', 'Length', 'BMI', 'DM', 'HTN', 'Current Smoker', 'EX-Smoker', 'FH',
      'Obesity', 'CRF', 'CVA', 'Airway disease', 'Thyroid Disease', 'CHF', 'DLP', 'BP', 'PR',
      'Edema', 'Weak Peripheral Pulse', 'Lung rales', 'Systolic Murmur', 'Diastolic Murmur',
      'Typical Chest Pain', 'Dyspnea', 'Function Class', 'Atypical', 'Nonanginal', 'Exertional CP', 'LowTH Ang'
    ],
  },
];

export const LabIntakePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [presets, setPresets] = useState<StandardPreset[]>([]);
  const [existingPatients, setExistingPatients] = useState<PatientRecord[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('critical_lad_ischemia');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields - All 55 clinical parameters + Patient Demographics
  const [formData, setFormData] = useState<Record<string, any>>({ ...DEFAULT_FORM_DATA });

  // Track which parameters were populated via direct PDF extraction
  const [extractedKeys, setExtractedKeys] = useState<Set<string>>(new Set());

  // Report Slots Upload & Extraction States
  const [slotStates, setSlotStates] = useState<
    Record<
      ReportType,
      {
        status: 'idle' | 'uploading' | 'done' | 'error';
        fileName?: string;
        extractedCount?: number;
        error?: string;
        progress?: number;
      }
    >
  >({
    ecg: { status: 'idle' },
    echo: { status: 'idle' },
    lab: { status: 'idle' },
    ehr: { status: 'idle' },
  });

  // Collapsible section states for all 7 clinical groupings
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    demographics: true,
    history: true,
    examination: true,
    symptoms: true,
    ecg: true,
    laboratory: true,
    echocardiography: true,
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

    // 2. Load existing patients for duplicate check & upsert lookup
    swasthyaApi.fetchPatients().then((data) => {
      setExistingPatients(data);
    }).catch(console.warn);
  }, []);

  // Set of existing patient IDs for real-time upsert status feedback
  const existingPatientIds = useMemo(() => {
    return new Set(existingPatients.map((p) => (p.patient_id || '').trim().toUpperCase()));
  }, [existingPatients]);

  const currentEnteredPid = (formData.patient_id || '').trim().toUpperCase();
  const isExistingPatient = Boolean(currentEnteredPid && existingPatientIds.has(currentEnteredPid));

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSelectPreset = (preset: StandardPreset) => {
    setSelectedPresetId(preset.preset_id);
    const reportData = preset.report || {};
    setFormData((prev) => ({
      ...prev,
      ...reportData,
      patient_id: reportData.patient_id || prev.patient_id,
    }));
    setUploadResult(null);
    setError(null);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate BMI when Weight or Length changes
      if (field === 'Weight' || field === 'Length') {
        const lengthCm = field === 'Length' ? Number(value) : Number(prev.Length || 168);
        const weightKg = field === 'Weight' ? Number(value) : Number(prev.Weight || 70);
        if (lengthCm > 50 && weightKg > 20) {
          const heightM = lengthCm / 100;
          updated.BMI = Math.round((weightKg / (heightM * heightM)) * 100) / 100;
        }
      }

      // If typing an existing patient_id, pre-fill demographic defaults if blank
      if (field === 'patient_id') {
        const matched = existingPatients.find(
          (p) => (p.patient_id || '').trim().toUpperCase() === String(value).trim().toUpperCase()
        );
        if (matched) {
          updated.full_name = matched.full_name || prev.full_name;
          updated.phone = matched.phone || matched.masked_phone || prev.phone;
          updated.cohort = matched.cohort || prev.cohort;
          if (matched.Age || matched.age) updated.Age = matched.Age || matched.age;
          if (matched.Sex || matched.sex) updated.Sex = matched.Sex || matched.sex;
        }
      }
      return updated;
    });
  };

  // Direct PDF Report Upload & Extraction Handler
  const handleFileUpload = async (type: ReportType, file: File) => {
    setSlotStates((prev) => ({
      ...prev,
      [type]: { status: 'uploading', progress: 10, fileName: file.name },
    }));

    try {
      const result: ExtractionResult = await extractReport(type, file, {
        onProgress: (pct) => {
          setSlotStates((prev) => ({
            ...prev,
            [type]: { ...prev[type], progress: pct },
          }));
        },
      });

      // Extract and merge values into formData
      const newExtractedKeys = new Set(extractedKeys);
      let count = 0;

      const updates: Record<string, any> = {};
      Object.entries(result.fields).forEach(([key, fieldData]) => {
        if (fieldData && fieldData.value !== undefined && fieldData.value !== null) {
          updates[key] = fieldData.value;
          newExtractedKeys.add(key);
          count++;
        }
      });

      setExtractedKeys(newExtractedKeys);
      setFormData((prev) => ({ ...prev, ...updates }));

      setSlotStates((prev) => ({
        ...prev,
        [type]: {
          status: 'done',
          fileName: file.name,
          extractedCount: count,
          progress: 100,
        },
      }));
    } catch (err: any) {
      setSlotStates((prev) => ({
        ...prev,
        [type]: {
          status: 'error',
          fileName: file.name,
          error: err.message || 'Failed to extract clinical parameters from PDF report.',
        },
      }));
    }
  };

  const handleUploadReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanPid = (formData.patient_id || '').trim();
    if (!cleanPid) {
      setError('Hospital Patient ID is required to process diagnostic report.');
      setLoading(false);
      return;
    }

    const payload = {
      ...formData,
      patient_id: cleanPid,
    };

    try {
      const res = await swasthyaApi.uploadReport(payload, user?.full_name || 'Rajesh Kumar (Sr. Lab Tech)');
      setUploadResult({
        patient_id: res.patient_id,
        patient: res.patient,
        is_update: res.is_update,
        dispatched_alert: res.dispatched_alert,
      });

      // Refresh registry so updated values reflect immediately
      swasthyaApi.fetchPatients().then(setExistingPatients).catch(console.warn);
    } catch (err: any) {
      setError(err.message || 'Error uploading report and updating patient record.');
    } finally {
      setLoading(false);
    }
  };

  const isLabTechOnly = user?.role === 'lab_technician';

  return (
    <div className="landing-container" style={{ padding: '24px 16px', maxWidth: '1180px', margin: '0 auto' }}>
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
              Diagnostic Laboratory Intake & Specimen Portal (All 55 Clinical Parameters)
            </h1>
          </div>
          <p style={{ fontFamily: 'var(--fs)', fontSize: '12px', color: 'var(--mut)', margin: '4px 0 0 0' }}>
            Logged in as: <strong>{user?.full_name || 'Rajesh Kumar'}</strong> (Senior Lab Technician) • Terminal Desk 04
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
            STRICT REPORT INGESTION DESK • 55-FEATURE MATRIX
          </span>
        </div>
      </div>

      {/* SECTION A: DIRECT UPLOAD FOR 4 KINDS OF REPORTS */}
      <div
        className="pn"
        style={{
          marginBottom: '24px',
          backgroundColor: 'var(--panel)',
          border: '1px solid var(--bd)',
          padding: '18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--fs)', fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Upload size={16} color="var(--acc)" />
              Direct Clinical PDF Report Ingestion (4 Diagnostic Report Types)
            </h2>
            <p style={{ fontFamily: 'var(--fs)', fontSize: '12px', color: 'var(--mut)', margin: '2px 0 0 0' }}>
              Upload authentic diagnostic PDF reports. The deterministic parsing engine extracts parameters automatically and pre-populates the corresponding fields below.
            </p>
          </div>
          {extractedKeys.size > 0 && (
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
              ✓ {extractedKeys.size} Parameters Extracted from Uploaded Reports
            </span>
          )}
        </div>

        {/* 4 Report Slots Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
          {REPORT_SLOTS.map((slot) => {
            const Icon = slot.icon;
            const state = slotStates[slot.type];
            const fileInputRef = useRef<HTMLInputElement>(null);

            return (
              <div
                key={slot.type}
                className="pn"
                style={{
                  backgroundColor: 'var(--hov)',
                  border: state.status === 'done' ? '2px solid var(--low)' : '1px solid var(--bd)',
                  borderRadius: 'var(--radius)',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon size={18} color={slot.color} />
                      <span style={{ fontFamily: 'var(--fs)', fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                        {slot.title}
                      </span>
                    </div>
                    {state.status === 'done' && (
                      <CheckCircle2 size={16} color="var(--low)" />
                    )}
                  </div>
                  <p style={{ fontFamily: 'var(--fs)', fontSize: '11px', color: 'var(--mut)', margin: '0 0 8px 0', lineHeight: 1.3 }}>
                    {slot.subtitle}
                  </p>

                  {/* Status Banner */}
                  {state.status === 'uploading' && (
                    <div style={{ fontSize: '11px', color: 'var(--acc)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <RefreshCw size={12} className="spin" />
                      Parsing text layer ({state.progress}%)...
                    </div>
                  )}

                  {state.status === 'done' && (
                    <div style={{ fontSize: '11px', color: 'var(--low)', fontWeight: 500, backgroundColor: 'rgba(31, 111, 69, 0.08)', padding: '4px 6px', borderRadius: '4px' }}>
                      ✓ {state.extractedCount} fields extracted ({state.fileName})
                    </div>
                  )}

                  {state.status === 'error' && (
                    <div style={{ fontSize: '11px', color: 'var(--high)', backgroundColor: 'rgba(200, 29, 58, 0.08)', padding: '4px 6px', borderRadius: '4px' }}>
                      {state.error}
                    </div>
                  )}
                </div>

                {/* Upload Action Button */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,application/pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(slot.type, file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--bd)',
                      backgroundColor: 'var(--panel)',
                      color: 'var(--ink)',
                      fontSize: '11px',
                      fontFamily: 'var(--fs)',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Upload size={12} />
                    {state.status === 'done' ? 'Replace PDF' : 'Upload Report PDF'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION B: 1-CLICK DEMO PRESETS */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontFamily: 'var(--fs)', fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
            Quick-Load Standard Lab Report Presets (Pre-fills All 55 Parameters):
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
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
                  <span style={{ fontFamily: 'var(--fs)', fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
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
                  ? `✓ Existing Record Overridden & Updated: ${uploadResult.patient.full_name} (${uploadResult.patient_id})`
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
              {uploadResult.is_update ? 'MOST RECENT VALUES RECORDED' : 'NEW PATIENT PROFILE PROVISIONED'}
            </span>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--mut)', margin: '0 0 14px 0' }}>
            {uploadResult.is_update
              ? 'Patient clinical parameters, biomarkers, and calibrated risk scores have been strictly updated with the latest 55-feature report findings. Historical consultation notes preserved.'
              : 'New patient registered in the central repository. Complete baseline cardiac biomarkers and 4-head risk predictions recorded.'}
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
                    Automated Urgent Notification Dispatched to Patient:
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

      {/* MAIN FORM: ALL 55 PARAMETERS */}
      <form onSubmit={handleUploadReport} className="pn" style={{ backgroundColor: 'var(--panel)' }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid var(--bd)', paddingBottom: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'var(--fs)', fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Complete Clinical Parameter Form (55 Input Features)
            </h2>
            <span style={{ fontFamily: 'var(--fm)', fontSize: '11px', color: 'var(--mut)' }}>
              55 OF 55 PARAMETERS ACTIVE
            </span>
          </div>
          <p style={{ fontFamily: 'var(--fs)', fontSize: '12px', color: 'var(--mut)', margin: '2px 0 0 0' }}>
            Verify or edit the 55 clinical parameters. Existing Patient IDs update the patient's record; new IDs automatically provision a new profile.
          </p>
        </div>

        {error && (
          <div style={{ padding: '10px', backgroundColor: 'rgba(200, 29, 58, 0.1)', border: '1px solid var(--high)', borderRadius: 'var(--radius)', color: 'var(--high)', fontSize: '12px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* SECTION 0: PATIENT IDENTIFIER & REPORT HEADER */}
        <div style={{ marginBottom: '20px', padding: '14px', backgroundColor: 'var(--hov)', borderRadius: 'var(--radius)', border: '1px solid var(--bd)' }}>
          <div style={{ fontFamily: 'var(--fs)', fontSize: '13px', fontWeight: 600, color: 'var(--mod)', marginBottom: '10px' }}>
            Hospital Patient Identification & Specimen Metadata
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink)', marginBottom: '3px' }}>
                Hospital Patient ID (MRN) *
              </label>
              <input
                type="text"
                value={formData.patient_id || ''}
                onChange={(e) => handleInputChange('patient_id', e.target.value)}
                placeholder="e.g. PAT-0001"
                required
                style={{
                  width: '100%',
                  padding: '7px 8px',
                  borderRadius: 'var(--radius)',
                  border: isExistingPatient ? '2px solid var(--mod)' : '1px solid var(--bd)',
                  backgroundColor: 'var(--panel)',
                  color: 'var(--ink)',
                  fontSize: '13px',
                  fontFamily: 'var(--fm)',
                  fontWeight: 600,
                }}
              />
              <div style={{ marginTop: '4px', fontSize: '10px', minHeight: '16px' }}>
                {isExistingPatient ? (
                  <span style={{ color: 'var(--mod)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <RefreshCw size={11} /> Existing Patient ID in DB — Latest report will override previous record
                  </span>
                ) : formData.patient_id?.trim() ? (
                  <span style={{ color: 'var(--low)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <UserPlus size={11} /> New Patient ID — System will create a fresh patient profile
                  </span>
                ) : null}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '3px' }}>Patient Full Name *</label>
              <input
                type="text"
                value={formData.full_name || ''}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                required
                style={{ width: '100%', padding: '7px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '3px' }}>Contact Phone (Urgent Alerts) *</label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                required
                style={{ width: '100%', padding: '7px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '3px' }}>Assigned Follow-Up Cohort</label>
              <select
                value={formData.cohort || 'Cohort B: Post-Event Discharge (Post-MI)'}
                onChange={(e) => handleInputChange('cohort', e.target.value)}
                style={{ width: '100%', padding: '7px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
              >
                <option value="Cohort B: Post-Event Discharge (Post-MI)">Cohort B: Post-Event Discharge (Post-MI)</option>
                <option value="Cohort A: Hypertension with Lipids">Cohort A: Hypertension with Lipids</option>
                <option value="Cohort C: Diabetic Cardiac Risk">Cohort C: Diabetic Cardiac Risk</option>
              </select>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 1: DEMOGRAPHICS & ANTHROPOMETRICS (5 features)
           ========================================================================= */}
        <div style={{ marginBottom: '16px', border: '1px solid var(--bd)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => toggleSection('demographics')}
            style={{
              width: '100%',
              padding: '10px 14px',
              backgroundColor: 'var(--hov)',
              border: 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              color: 'var(--ink)',
            }}
          >
            <span style={{ fontFamily: 'var(--fs)', fontSize: '13px', fontWeight: 600 }}>
              1. Demographics & Anthropometrics (5 Parameters)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--mut)', fontFamily: 'var(--fm)' }}>Age, Sex, Weight, Height, BMI</span>
              {openSections.demographics ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {openSections.demographics && (
            <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>Age (Years)</span>
                  <span style={{ color: 'var(--mut)' }}>18–110 yrs</span>
                </label>
                <input
                  type="number"
                  value={formData.Age || ''}
                  onChange={(e) => handleInputChange('Age', Number(e.target.value))}
                  min={18}
                  max={110}
                  required
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Biological Sex</label>
                <select
                  value={formData.Sex || 'Male'}
                  onChange={(e) => handleInputChange('Sex', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>Weight (kg)</span>
                  <span style={{ color: 'var(--mut)' }}>30–250 kg</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.Weight || ''}
                  onChange={(e) => handleInputChange('Weight', Number(e.target.value))}
                  min={30}
                  max={250}
                  required
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>Height / Length (cm)</span>
                  <span style={{ color: 'var(--mut)' }}>100–240 cm</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.Length || ''}
                  onChange={(e) => handleInputChange('Length', Number(e.target.value))}
                  min={100}
                  max={240}
                  required
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>Body Mass Index (BMI)</span>
                  <span style={{ color: 'var(--mod)' }}>Auto-calculated</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.BMI || ''}
                  onChange={(e) => handleInputChange('BMI', Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--hov)', color: 'var(--ink)', fontSize: '13px', fontWeight: 600 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 2: MEDICAL HISTORY & RISK FACTORS (12 features)
           ========================================================================= */}
        <div style={{ marginBottom: '16px', border: '1px solid var(--bd)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => toggleSection('history')}
            style={{
              width: '100%',
              padding: '10px 14px',
              backgroundColor: 'var(--hov)',
              border: 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              color: 'var(--ink)',
            }}
          >
            <span style={{ fontFamily: 'var(--fs)', fontSize: '13px', fontWeight: 600 }}>
              2. Medical History & Chronic Risk Factors (12 Parameters)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--mut)', fontFamily: 'var(--fm)' }}>DM, HTN, Smoker, FH, DLP, CHF...</span>
              {openSections.history ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {openSections.history && (
            <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Diabetes Mellitus (DM)</label>
                <select
                  value={formData.DM || '0'}
                  onChange={(e) => handleInputChange('DM', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="0">0: No Diabetes</option>
                  <option value="1">1: Yes (Diabetic)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Hypertension (HTN)</label>
                <select
                  value={formData.HTN || '1'}
                  onChange={(e) => handleInputChange('HTN', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="0">0: Normotensive</option>
                  <option value="1">1: Hypertensive</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Current Smoker</label>
                <select
                  value={formData['Current Smoker'] || formData.Current_Smoker || '0'}
                  onChange={(e) => {
                    handleInputChange('Current Smoker', e.target.value);
                    handleInputChange('Current_Smoker', e.target.value);
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="0">0: Non-smoker</option>
                  <option value="1">1: Active Smoker</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Ex-Smoker</label>
                <select
                  value={formData['EX-Smoker'] || formData.EX_Smoker || '0'}
                  onChange={(e) => {
                    handleInputChange('EX-Smoker', e.target.value);
                    handleInputChange('EX_Smoker', e.target.value);
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="0">0: No</option>
                  <option value="1">1: Yes (Ex-smoker)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Family History (FH of CAD)</label>
                <select
                  value={formData.FH || '0'}
                  onChange={(e) => handleInputChange('FH', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="0">0: No Family History</option>
                  <option value="1">1: Positive CAD Family History</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Clinical Obesity</label>
                <select
                  value={formData.Obesity || 'N'}
                  onChange={(e) => handleInputChange('Obesity', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="N">N: Non-obese</option>
                  <option value="Y">Y: Clinically Obese</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Chronic Renal Failure (CRF)</label>
                <select
                  value={formData.CRF || 'N'}
                  onChange={(e) => handleInputChange('CRF', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="N">N: Absent</option>
                  <option value="Y">Y: Renal Impairment (CRF)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Cerebrovascular Accident (CVA)</label>
                <select
                  value={formData.CVA || 'N'}
                  onChange={(e) => handleInputChange('CVA', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="N">N: No Prior Stroke</option>
                  <option value="Y">Y: Prior Stroke / TIA</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Airway / Pulmonary Disease</label>
                <select
                  value={formData['Airway disease'] || formData.Airway_disease || 'N'}
                  onChange={(e) => {
                    handleInputChange('Airway disease', e.target.value);
                    handleInputChange('Airway_disease', e.target.value);
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="N">N: Normal Airways</option>
                  <option value="Y">Y: COPD / Asthma</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Thyroid Dysfunction</label>
                <select
                  value={formData['Thyroid Disease'] || formData.Thyroid_Disease || 'N'}
                  onChange={(e) => {
                    handleInputChange('Thyroid Disease', e.target.value);
                    handleInputChange('Thyroid_Disease', e.target.value);
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="N">N: Euthyroid</option>
                  <option value="Y">Y: Thyroid Disease</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Congestive Heart Failure (CHF)</label>
                <select
                  value={formData.CHF || 'N'}
                  onChange={(e) => handleInputChange('CHF', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="N">N: Compensated / None</option>
                  <option value="Y">Y: Decompensated CHF</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Dyslipidemia (DLP)</label>
                <select
                  value={formData.DLP || 'N'}
                  onChange={(e) => handleInputChange('DLP', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="N">N: Normal Lipids</option>
                  <option value="Y">Y: Hyperlipidemia / DLP</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 3: PHYSICAL EXAMINATION & VITALS (7 features)
           ========================================================================= */}
        <div style={{ marginBottom: '16px', border: '1px solid var(--bd)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => toggleSection('examination')}
            style={{
              width: '100%',
              padding: '10px 14px',
              backgroundColor: 'var(--hov)',
              border: 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              color: 'var(--ink)',
            }}
          >
            <span style={{ fontFamily: 'var(--fs)', fontSize: '13px', fontWeight: 600 }}>
              3. Physical Examination & Vitals (7 Parameters)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--mut)', fontFamily: 'var(--fm)' }}>BP, PR, Edema, Pulses, Murmurs...</span>
              {openSections.examination ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {openSections.examination && (
            <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>Systolic BP (mmHg)</span>
                  <span style={{ color: 'var(--mut)' }}>90–120 mmHg</span>
                </label>
                <input
                  type="number"
                  value={formData.BP || ''}
                  onChange={(e) => handleInputChange('BP', Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>Resting Pulse Rate (PR)</span>
                  <span style={{ color: 'var(--mut)' }}>60–100 bpm</span>
                </label>
                <input
                  type="number"
                  value={formData.PR || ''}
                  onChange={(e) => handleInputChange('PR', Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Peripheral Edema</label>
                <select
                  value={formData.Edema || '0'}
                  onChange={(e) => handleInputChange('Edema', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="0">0: Absent</option>
                  <option value="1">1: Present (Pedal Edema)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Weak Peripheral Pulse</label>
                <select
                  value={formData['Weak Peripheral Pulse'] || formData.Weak_Peripheral_Pulse || 'N'}
                  onChange={(e) => {
                    handleInputChange('Weak Peripheral Pulse', e.target.value);
                    handleInputChange('Weak_Peripheral_Pulse', e.target.value);
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="N">N: Normal Palpation</option>
                  <option value="Y">Y: Diminished Pulses</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Lung Rales / Crackles</label>
                <select
                  value={formData['Lung rales'] || formData.Lung_rales || 'N'}
                  onChange={(e) => {
                    handleInputChange('Lung rales', e.target.value);
                    handleInputChange('Lung_rales', e.target.value);
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="N">N: Clear Auscultation</option>
                  <option value="Y">Y: Basilar Crackles Present</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Systolic Murmur</label>
                <select
                  value={formData['Systolic Murmur'] || formData.Systolic_Murmur || 'N'}
                  onChange={(e) => {
                    handleInputChange('Systolic Murmur', e.target.value);
                    handleInputChange('Systolic_Murmur', e.target.value);
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="N">N: Absent</option>
                  <option value="Y">Y: Present</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Diastolic Murmur</label>
                <select
                  value={formData['Diastolic Murmur'] || formData.Diastolic_Murmur || 'N'}
                  onChange={(e) => {
                    handleInputChange('Diastolic Murmur', e.target.value);
                    handleInputChange('Diastolic_Murmur', e.target.value);
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="N">N: Absent</option>
                  <option value="Y">Y: Present</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 4: CARDIAC SYMPTOMS & FUNCTIONAL STATUS (7 features)
           ========================================================================= */}
        <div style={{ marginBottom: '16px', border: '1px solid var(--bd)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => toggleSection('symptoms')}
            style={{
              width: '100%',
              padding: '10px 14px',
              backgroundColor: 'var(--hov)',
              border: 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              color: 'var(--ink)',
            }}
          >
            <span style={{ fontFamily: 'var(--fs)', fontSize: '13px', fontWeight: 600 }}>
              4. Anginal Symptoms & Functional Capacity (7 Parameters)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--mut)', fontFamily: 'var(--fm)' }}>Chest Pain, Dyspnea, NYHA Class...</span>
              {openSections.symptoms ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {openSections.symptoms && (
            <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Typical Anginal Chest Pain</label>
                <select
                  value={formData['Typical Chest Pain'] || formData.Typical_Chest_Pain || '0'}
                  onChange={(e) => {
                    handleInputChange('Typical Chest Pain', e.target.value);
                    handleInputChange('Typical_Chest_Pain', e.target.value);
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="0">0: Absent / Atypical</option>
                  <option value="1">1: Classic Substernal Angina</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Exertional Dyspnea</label>
                <select
                  value={formData.Dyspnea || 'N'}
                  onChange={(e) => handleInputChange('Dyspnea', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="N">N: None</option>
                  <option value="Y">Y: Shortness of Breath on Exertion</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>NYHA Functional Class</label>
                <select
                  value={formData['Function Class'] || formData.Function_Class || '0'}
                  onChange={(e) => {
                    handleInputChange('Function Class', e.target.value);
                    handleInputChange('Function_Class', e.target.value);
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="0">0: Class 0 (No Limitation)</option>
                  <option value="1">1: Class I (Mild on Strenuous Activity)</option>
                  <option value="2">2: Class II (Comfortable at Rest)</option>
                  <option value="3">3: Class III (Marked Limitation)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Atypical Angina</label>
                <select
                  value={formData.Atypical || 'N'}
                  onChange={(e) => handleInputChange('Atypical', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="N">N: No</option>
                  <option value="Y">Y: Atypical Anginal Episodes</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Non-Anginal Chest Pain</label>
                <select
                  value={formData.Nonanginal || 'N'}
                  onChange={(e) => handleInputChange('Nonanginal', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="N">N: No</option>
                  <option value="Y">Y: Sharp/Musculoskeletal Pain</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Exertional Chest Pain</label>
                <select
                  value={formData['Exertional CP'] || formData.Exertional_CP || 'N'}
                  onChange={(e) => {
                    handleInputChange('Exertional CP', e.target.value);
                    handleInputChange('Exertional_CP', e.target.value);
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="N">N: Absent</option>
                  <option value="Y">Y: Provoked by Exercise/Exertion</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Low-Threshold Angina</label>
                <select
                  value={formData['LowTH Ang'] || formData.LowTH_Ang || 'N'}
                  onChange={(e) => {
                    handleInputChange('LowTH Ang', e.target.value);
                    handleInputChange('LowTH_Ang', e.target.value);
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="N">N: High Threshold</option>
                  <option value="Y">Y: Low Threshold (Light Walking)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 5: RESTING ELECTROCARDIOGRAM (ECG) (7 features)
           ========================================================================= */}
        <div style={{ marginBottom: '16px', border: '1px solid var(--bd)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => toggleSection('ecg')}
            style={{
              width: '100%',
              padding: '10px 14px',
              backgroundColor: 'var(--hov)',
              border: 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              color: 'var(--ink)',
            }}
          >
            <span style={{ fontFamily: 'var(--fs)', fontSize: '13px', fontWeight: 600 }}>
              5. Resting Electrocardiogram (ECG) (7 Parameters)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--mut)', fontFamily: 'var(--fm)' }}>ST-Segment, T-Waves, Q-Waves, BBB, LVH</span>
              {openSections.ecg ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {openSections.ecg && (
            <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>ST-Segment Elevation</label>
                <select
                  value={formData['St Elevation'] || formData.St_Elevation || '0'}
                  onChange={(e) => {
                    handleInputChange('St Elevation', e.target.value);
                    handleInputChange('St_Elevation', e.target.value);
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="0">0: Absent / Normal Isoelectric</option>
                  <option value="1">1: Present (Acute Transmural Ischemia)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>ST-Segment Depression</label>
                <select
                  value={formData['St Depression'] || formData.St_Depression || '0'}
                  onChange={(e) => {
                    handleInputChange('St Depression', e.target.value);
                    handleInputChange('St_Depression', e.target.value);
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="0">0: Absent</option>
                  <option value="1">1: Present (Subendocardial Ischemia)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>T-Wave Inversion (Tinversion)</label>
                <select
                  value={formData.Tinversion || '0'}
                  onChange={(e) => handleInputChange('Tinversion', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="0">0: Normal Upright</option>
                  <option value="1">1: Symmetrical T-Wave Inversion</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Pathologic Q-Wave</label>
                <select
                  value={formData['Q Wave'] || formData.Q_Wave || '0'}
                  onChange={(e) => {
                    handleInputChange('Q Wave', e.target.value);
                    handleInputChange('Q_Wave', e.target.value);
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="0">0: Absent</option>
                  <option value="1">1: Pathologic Q Present (Prior Necrosis)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Left Ventricular Hypertrophy (LVH)</label>
                <select
                  value={formData.LVH || 'N'}
                  onChange={(e) => handleInputChange('LVH', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="N">N: Normal Voltage</option>
                  <option value="Y">Y: Sokolow-Lyon LVH Positive</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Poor R-Wave Progression</label>
                <select
                  value={formData['Poor R Progression'] || formData.Poor_R_Progression || 'N'}
                  onChange={(e) => {
                    handleInputChange('Poor R Progression', e.target.value);
                    handleInputChange('Poor_R_Progression', e.target.value);
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="N">N: Normal Transition (V3/V4)</option>
                  <option value="Y">Y: Delayed Transition (PRWP)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Bundle Branch Block (BBB)</label>
                <select
                  value={formData.BBB || 'N'}
                  onChange={(e) => handleInputChange('BBB', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="N">N: Narrow QRS / None</option>
                  <option value="LBBB">LBBB: Left Bundle Branch Block</option>
                  <option value="RBBB">RBBB: Right Bundle Branch Block</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 6: BLOOD CHEMISTRY & HEMATOLOGY (14 features)
           ========================================================================= */}
        <div style={{ marginBottom: '16px', border: '1px solid var(--bd)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => toggleSection('laboratory')}
            style={{
              width: '100%',
              padding: '10px 14px',
              backgroundColor: 'var(--hov)',
              border: 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              color: 'var(--ink)',
            }}
          >
            <span style={{ fontFamily: 'var(--fs)', fontSize: '13px', fontWeight: 600 }}>
              6. Blood Chemistry, Lipids & Hematology (14 Parameters)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--mut)', fontFamily: 'var(--fm)' }}>FBS, Lipids, Creatinine, Electrolytes, CBC</span>
              {openSections.laboratory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {openSections.laboratory && (
            <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>Fasting Blood Sugar</span>
                  <span style={{ color: 'var(--mut)' }}>70–100 mg/dL</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.FBS || ''}
                  onChange={(e) => handleInputChange('FBS', Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>Serum Creatinine (CR)</span>
                  <span style={{ color: 'var(--mut)' }}>0.6–1.2 mg/dL</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.CR || ''}
                  onChange={(e) => handleInputChange('CR', Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>Triglycerides (TG)</span>
                  <span style={{ color: 'var(--mut)' }}>&lt;150 mg/dL</span>
                </label>
                <input
                  type="number"
                  value={formData.TG || ''}
                  onChange={(e) => handleInputChange('TG', Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>LDL Cholesterol</span>
                  <span style={{ color: 'var(--mut)' }}>&lt;100 mg/dL</span>
                </label>
                <input
                  type="number"
                  value={formData.LDL || ''}
                  onChange={(e) => handleInputChange('LDL', Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>HDL Cholesterol</span>
                  <span style={{ color: 'var(--mut)' }}>&gt;40 mg/dL</span>
                </label>
                <input
                  type="number"
                  value={formData.HDL || ''}
                  onChange={(e) => handleInputChange('HDL', Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>Blood Urea Nitrogen (BUN)</span>
                  <span style={{ color: 'var(--mut)' }}>7–20 mg/dL</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.BUN || ''}
                  onChange={(e) => handleInputChange('BUN', Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>ESR (Sed Rate)</span>
                  <span style={{ color: 'var(--mut)' }}>0–20 mm/hr</span>
                </label>
                <input
                  type="number"
                  value={formData.ESR || ''}
                  onChange={(e) => handleInputChange('ESR', Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>Hemoglobin (HB)</span>
                  <span style={{ color: 'var(--mut)' }}>12.0–17.5 g/dL</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.HB || ''}
                  onChange={(e) => handleInputChange('HB', Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>Potassium (K)</span>
                  <span style={{ color: 'var(--mut)' }}>3.5–5.0 mEq/L</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.K || 4.2}
                  onChange={(e) => handleInputChange('K', Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>Sodium (Na)</span>
                  <span style={{ color: 'var(--mut)' }}>135–145 mEq/L</span>
                </label>
                <input
                  type="number"
                  value={formData.Na || 141}
                  onChange={(e) => handleInputChange('Na', Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>White Blood Cells (WBC)</span>
                  <span style={{ color: 'var(--mut)' }}>4k–11k /mcL</span>
                </label>
                <input
                  type="number"
                  value={formData.WBC || 7100}
                  onChange={(e) => handleInputChange('WBC', Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>Lymphocytes %</span>
                  <span style={{ color: 'var(--mut)' }}>20–40%</span>
                </label>
                <input
                  type="number"
                  value={formData.Lymph || 28}
                  onChange={(e) => handleInputChange('Lymph', Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>Neutrophils %</span>
                  <span style={{ color: 'var(--mut)' }}>50–70%</span>
                </label>
                <input
                  type="number"
                  value={formData.Neut || 62}
                  onChange={(e) => handleInputChange('Neut', Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>Platelets (PLT)</span>
                  <span style={{ color: 'var(--mut)' }}>150k–450k</span>
                </label>
                <input
                  type="number"
                  value={formData.PLT || 230}
                  onChange={(e) => handleInputChange('PLT', Number(e.target.value))}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 7: ECHOCARDIOGRAPHIC FINDINGS (3 features)
           ========================================================================= */}
        <div style={{ marginBottom: '24px', border: '1px solid var(--bd)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => toggleSection('echocardiography')}
            style={{
              width: '100%',
              padding: '10px 14px',
              backgroundColor: 'var(--hov)',
              border: 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              color: 'var(--ink)',
            }}
          >
            <span style={{ fontFamily: 'var(--fs)', fontSize: '13px', fontWeight: 600 }}>
              7. Transthoracic Echocardiogram (3 Parameters)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--mut)', fontFamily: 'var(--fm)' }}>Ejection Fraction, Regional RWMA, Valvular Disease</span>
              {openSections.echocardiography ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {openSections.echocardiography && (
            <div style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>
                  <span>Ejection Fraction EF-TTE (%)</span>
                  <span style={{ color: 'var(--mut)' }}>Normal &gt; 50%</span>
                </label>
                <input
                  type="number"
                  value={formData['EF-TTE'] || formData.EF_TTE || ''}
                  onChange={(e) => {
                    handleInputChange('EF-TTE', Number(e.target.value));
                    handleInputChange('EF_TTE', Number(e.target.value));
                  }}
                  min={10}
                  max={85}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px', fontFamily: 'var(--fm)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Regional Wall Motion (RWMA)</label>
                <select
                  value={formData['Region RWMA'] || formData.Region_RWMA || '0'}
                  onChange={(e) => {
                    handleInputChange('Region RWMA', e.target.value);
                    handleInputChange('Region_RWMA', e.target.value);
                  }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="0">0: Normal Kinematics (No RWMA)</option>
                  <option value="1">1: Anterior Wall Hypokinesia (LAD territory)</option>
                  <option value="2">2: Inferior Wall Hypokinesia (RCA territory)</option>
                  <option value="3">3: Lateral Wall Hypokinesia (LCX territory)</option>
                  <option value="4">4: Multiple / Global Hypokinesia</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--ink)', marginBottom: '3px' }}>Valvular Heart Disease (VHD)</label>
                <select
                  value={formData.VHD || 'N'}
                  onChange={(e) => handleInputChange('VHD', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="N">N: None / Physiologic</option>
                  <option value="mild">mild: Mild Valvular Regurgitation</option>
                  <option value="Moderate">Moderate: Moderate Stenosis/Regurgitation</option>
                  <option value="Severe">Severe: Severe Structural Valve Disease</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--bd)', paddingTop: '16px' }}>
          <PrimaryButton
            type="submit"
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', minWidth: '280px', backgroundColor: 'var(--mod)' }}
          >
            <Zap size={16} />
            {loading ? 'Processing & Ingesting Report...' : '⚡ Ingest All 55 Parameters & Calculate Digital Twin'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
};

export default LabIntakePage;
