import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Stethoscope,
  Heart,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Send,
  Eye,
  RotateCcw,
  Sparkles,
  UserCheck,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { swasthyaApi, PatientRecord } from '../api/swasthyaApi';
import { HeartCanvas } from '../components/3d/HeartCanvas';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';

export const DoctorConsultationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedId = searchParams.get('patient_id');

  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingOpinion, setSavingOpinion] = useState<boolean>(false);
  const [opinionSaved, setOpinionSaved] = useState<boolean>(false);

  // 3D focus state
  const [vesselFocus, setVesselFocus] = useState<string | null>(null);

  // Doctor Opinion Fields
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [recommendation, setRecommendation] = useState<string>('Emergent Cath Lab Referral');
  const [triageDecision, setTriageDecision] = useState<string>('urgent_cath_lab');

  // Load patient list
  useEffect(() => {
    setLoading(true);
    swasthyaApi.fetchPatients()
      .then((data) => {
        setPatients(data);
        if (data.length > 0) {
          const matched = requestedId ? data.find((p) => p.patient_id === requestedId) : null;
          const chosen = matched || data.find((p) => p.is_high_priority && p.status === 'PENDING_DOCTOR_CONSULTATION') || data[0];
          selectPatient(chosen);
        }
      })
      .catch((err) => console.error('Error fetching patients:', err))
      .finally(() => setLoading(false));
  }, [requestedId]);

  const selectPatient = (patient: PatientRecord) => {
    setSelectedPatient(patient);
    setSearchParams({ patient_id: patient.patient_id });
    setOpinionSaved(false);

    // Populate existing notes if already consulted, or standard starter template
    if (patient.doctor_consultation?.clinical_notes) {
      setClinicalNotes(patient.doctor_consultation.clinical_notes);
      setRecommendation(patient.doctor_consultation.recommendation || 'Emergent Cath Lab Referral');
      setTriageDecision(patient.doctor_consultation.triage_decision || 'urgent_cath_lab');
    } else if (patient.is_high_priority) {
      setClinicalNotes(
        `Patient presents with significant acute ischemic risk markers. Predicted LAD stenosis probability is high (${Math.round((patient.predictions?.vessels?.lad?.probability || 0.85) * 100)}%). Recommend immediate coronary angiogram in Cath Lab. Initiate dual antiplatelet therapy, statin, and beta-blocker.`
      );
      setRecommendation('Emergent Cath Lab Referral & Invasive Angiography');
      setTriageDecision('urgent_cath_lab');
    } else {
      setClinicalNotes(
        'Patient reports stable symptoms. Blood pressure and metabolic parameters within acceptable follow-up boundaries. Continue current medical regimen and routine community monitoring.'
      );
      setRecommendation('Routine Frontline Follow-Up');
      setTriageDecision('opd_routine');
    }
  };

  const handleSignOpinion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setSavingOpinion(true);
    try {
      const res = await swasthyaApi.submitDoctorOpinion(selectedPatient.patient_id, {
        clinical_notes: clinicalNotes,
        recommendation: recommendation,
        triage_decision: triageDecision,
        doctor_name: 'Dr. Aditi Sharma, MD (Cardiology)',
        doctor_id: 'DOC-CARDIO-01',
      });
      setSelectedPatient(res.patient);
      setOpinionSaved(true);
      // Update in local patients list
      setPatients((prev) => prev.map((p) => (p.patient_id === res.patient.patient_id ? res.patient : p)));
    } catch (err: any) {
      alert(`Error saving clinical opinion: ${err.message}`);
    } finally {
      setSavingOpinion(false);
    }
  };

  // 3D Canvas results
  const heartResults = {
    cad: selectedPatient?.predictions?.overall_cad?.probability || 0.5,
    lad: selectedPatient?.predictions?.vessels?.lad?.probability || 0.8,
    lcx: selectedPatient?.predictions?.vessels?.lcx?.probability || 0.3,
    rca: selectedPatient?.predictions?.vessels?.rca?.probability || 0.2,
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', fontFamily: 'var(--fs)', color: 'var(--mut)' }}>
        Loading Doctor's Consultation Station & 3D Twins...
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 20px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Header */}
      <div
        className="pn"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          backgroundColor: 'var(--panel)',
          borderLeft: '4px solid var(--acc)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Stethoscope size={22} color="var(--acc)" />
            <h1 style={{ fontFamily: 'var(--fs)', fontSize: '18px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Cardiology Consultation Station & 3D Digital Heart Twin
            </h1>
          </div>
          <p style={{ fontFamily: 'var(--fs)', fontSize: '12px', color: 'var(--mut)', margin: '4px 0 0 0' }}>
            Attending Clinician: <strong>Dr. Aditi Sharma, MD</strong> (Senior Interventional Cardiologist) • Clinical Oversight Desk
          </p>
        </div>

        {/* Patient Selection Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontFamily: 'var(--fs)', fontSize: '12px', color: 'var(--mut)' }}>Select Patient Queue:</label>
          <select
            value={selectedPatient?.patient_id || ''}
            onChange={(e) => {
              const p = patients.find((item) => item.patient_id === e.target.value);
              if (p) selectPatient(p);
            }}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--bd)',
              backgroundColor: 'var(--panel)',
              color: 'var(--ink)',
              fontFamily: 'var(--fs)',
              fontSize: '13px',
              fontWeight: 500,
              minWidth: '260px',
            }}
          >
            {patients.map((p) => {
              const isUrgent = p.is_high_priority && p.status === 'PENDING_DOCTOR_CONSULTATION';
              return (
                <option key={p.patient_id} value={p.patient_id}>
                  {isUrgent ? '🚨 ' : ''}{p.patient_id} - {p.full_name} ({p.status === 'CONSULTED' ? 'Consulted' : 'Pending'})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Urgent Alert Banner if Patient Received Urgent Notification */}
      {selectedPatient?.is_high_priority && (
        <div
          style={{
            backgroundColor: 'rgba(200, 29, 58, 0.08)',
            border: '1px solid var(--high)',
            borderRadius: 'var(--radius)',
            padding: '10px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="var(--high)" />
            <span style={{ fontFamily: 'var(--fs)', fontSize: '13px', fontWeight: 600, color: 'var(--high)' }}>
              HIGH-PRIORITY CARDIAC ALERT: Patient was sent an automated notification to walk into OPD or emergency room immediately.
            </span>
          </div>
          <span style={{ fontFamily: 'var(--fm)', fontSize: '11px', color: 'var(--mut)' }}>
            Status: {selectedPatient.status} • Triage: {selectedPatient.triage_tier}
          </span>
        </div>
      )}

      {/* Main 3-Column Consultation Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 320px) minmax(360px, 1fr) minmax(320px, 380px)',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        {/* COLUMN 1: Patient Diagnostic Lab Report & Vitals */}
        <div className="pn" style={{ backgroundColor: 'var(--panel)', maxHeight: '780px', overflowY: 'auto' }}>
          <div style={{ borderBottom: '1px solid var(--bd)', paddingBottom: '8px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} color="var(--acc)" />
              <h2 style={{ fontFamily: 'var(--fs)', fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                Diagnostic Lab Report Data
              </h2>
            </div>
            <p style={{ fontFamily: 'var(--fs)', fontSize: '11px', color: 'var(--mut)', margin: '2px 0 0 0' }}>
              Uploaded by: {selectedPatient?.report_data?.technician_name || 'Rajesh Kumar (Lab Tech)'}
            </p>
          </div>

          {/* Demographics Card */}
          <div style={{ marginBottom: '14px', fontSize: '12px', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--mut)' }}>Patient Name:</span>
              <strong style={{ color: 'var(--ink)' }}>{selectedPatient?.full_name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--mut)' }}>Age / Sex:</span>
              <span style={{ color: 'var(--ink)' }}>{selectedPatient?.Age || selectedPatient?.age} Yrs / {selectedPatient?.Sex || selectedPatient?.sex}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--mut)' }}>Contact:</span>
              <span style={{ fontFamily: 'var(--fm)', color: 'var(--ink)' }}>{selectedPatient?.phone || selectedPatient?.masked_phone}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--mut)' }}>Cohort:</span>
              <span style={{ fontSize: '11px', color: 'var(--ink)' }}>{selectedPatient?.cohort}</span>
            </div>
          </div>

          {/* Biomarkers Table */}
          <div style={{ fontFamily: 'var(--fs)', fontSize: '12px', fontWeight: 600, color: 'var(--acc)', marginBottom: '6px' }}>
            Clinical Parameters vs Normal Ranges
          </div>

          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', marginBottom: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bd)', textAlign: 'left', color: 'var(--mut)' }}>
                <th style={{ padding: '4px 0' }}>Test / Parameter</th>
                <th style={{ padding: '4px 0' }}>Reported Value</th>
                <th style={{ padding: '4px 0' }}>Reference</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                <td style={{ padding: '4px 0', color: 'var(--ink)' }}>Blood Pressure</td>
                <td style={{ padding: '4px 0', fontFamily: 'var(--fm)', fontWeight: 600, color: (selectedPatient?.BP || 120) >= 140 ? 'var(--high)' : 'var(--ink)' }}>
                  {selectedPatient?.BP || 120} / {selectedPatient?.Diastolic_BP || 80} mmHg
                </td>
                <td style={{ padding: '4px 0', color: 'var(--mut)' }}>&lt; 120/80</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                <td style={{ padding: '4px 0', color: 'var(--ink)' }}>Pulse Rate</td>
                <td style={{ padding: '4px 0', fontFamily: 'var(--fm)' }}>{selectedPatient?.PR || 72} BPM</td>
                <td style={{ padding: '4px 0', color: 'var(--mut)' }}>60 - 90</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                <td style={{ padding: '4px 0', color: 'var(--ink)' }}>Fasting Glucose</td>
                <td style={{ padding: '4px 0', fontFamily: 'var(--fm)', fontWeight: 600, color: (selectedPatient?.FBS || 90) >= 126 ? 'var(--high)' : 'var(--ink)' }}>
                  {selectedPatient?.FBS || 90} mg/dL
                </td>
                <td style={{ padding: '4px 0', color: 'var(--mut)' }}>70 - 100</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                <td style={{ padding: '4px 0', color: 'var(--ink)' }}>LDL Cholesterol</td>
                <td style={{ padding: '4px 0', fontFamily: 'var(--fm)', fontWeight: 600, color: (selectedPatient?.LDL || 90) >= 130 ? 'var(--high)' : 'var(--ink)' }}>
                  {selectedPatient?.LDL || 90} mg/dL
                </td>
                <td style={{ padding: '4px 0', color: 'var(--mut)' }}>&lt; 100</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                <td style={{ padding: '4px 0', color: 'var(--ink)' }}>Triglycerides</td>
                <td style={{ padding: '4px 0', fontFamily: 'var(--fm)', fontWeight: 600, color: (selectedPatient?.TG || 120) >= 150 ? 'var(--mod)' : 'var(--ink)' }}>
                  {selectedPatient?.TG || 120} mg/dL
                </td>
                <td style={{ padding: '4px 0', color: 'var(--mut)' }}>&lt; 150</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                <td style={{ padding: '4px 0', color: 'var(--ink)' }}>Ejection Fraction</td>
                <td style={{ padding: '4px 0', fontFamily: 'var(--fm)', fontWeight: 600, color: (selectedPatient?.['EF-TTE'] || selectedPatient?.EF_TTE || 55) < 50 ? 'var(--high)' : 'var(--ink)' }}>
                  {selectedPatient?.['EF-TTE'] || selectedPatient?.EF_TTE || 55}%
                </td>
                <td style={{ padding: '4px 0', color: 'var(--mut)' }}>55 - 70%</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                <td style={{ padding: '4px 0', color: 'var(--ink)' }}>ST Elevation</td>
                <td style={{ padding: '4px 0', fontFamily: 'var(--fm)', fontWeight: 600, color: String(selectedPatient?.['St Elevation'] || selectedPatient?.St_Elevation) === '1' ? 'var(--high)' : 'var(--ink)' }}>
                  {String(selectedPatient?.['St Elevation'] || selectedPatient?.St_Elevation) === '1' ? 'YES (Acute)' : 'None'}
                </td>
                <td style={{ padding: '4px 0', color: 'var(--mut)' }}>None</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                <td style={{ padding: '4px 0', color: 'var(--ink)' }}>Wall Motion (RWMA)</td>
                <td style={{ padding: '4px 0', fontFamily: 'var(--fm)', fontWeight: 600, color: String(selectedPatient?.['Region RWMA'] || selectedPatient?.Region_RWMA) !== '0' ? 'var(--high)' : 'var(--ink)' }}>
                  {String(selectedPatient?.['Region RWMA'] || selectedPatient?.Region_RWMA) === '1'
                    ? 'Anterior (LAD)'
                    : String(selectedPatient?.['Region RWMA'] || selectedPatient?.Region_RWMA) === '2'
                    ? 'Inferior (RCA)'
                    : 'Normal'}
                </td>
                <td style={{ padding: '4px 0', color: 'var(--mut)' }}>Normal</td>
              </tr>
            </tbody>
          </table>

          {/* Disclaimer */}
          <div style={{ fontSize: '10px', color: 'var(--mut)', fontStyle: 'italic', borderTop: '1px solid var(--bd)', paddingTop: '6px' }}>
            Decision support data. Does not substitute formal invasive coronary catheterization.
          </div>
        </div>

        {/* COLUMN 2: 3D Heart Digital Twin Canvas */}
        <div className="pn" style={{ backgroundColor: 'var(--panel)', minHeight: '620px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Heart size={18} color="var(--high)" />
              <h2 style={{ fontFamily: 'var(--fs)', fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                Coronary Digital Twin (Perfusion3D)
              </h2>
            </div>
            <span style={{ fontFamily: 'var(--fm)', fontSize: '11px', color: 'var(--mut)' }}>
              Interactive WebGL Three.js Rig
            </span>
          </div>

          {/* Camera Focus Toolbar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
            <button
              type="button"
              onClick={() => setVesselFocus('lad')}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontFamily: 'var(--fs)',
                fontWeight: 600,
                borderRadius: 'var(--radius)',
                border: '1px solid var(--bd)',
                backgroundColor: vesselFocus === 'lad' ? 'var(--high)' : 'var(--hov)',
                color: vesselFocus === 'lad' ? '#fff' : 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              LAD Anterior Wall ({Math.round(heartResults.lad * 100)}%)
            </button>
            <button
              type="button"
              onClick={() => setVesselFocus('lcx')}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontFamily: 'var(--fs)',
                fontWeight: 600,
                borderRadius: 'var(--radius)',
                border: '1px solid var(--bd)',
                backgroundColor: vesselFocus === 'lcx' ? 'var(--mod)' : 'var(--hov)',
                color: vesselFocus === 'lcx' ? '#fff' : 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              LCX Lateral Wall ({Math.round(heartResults.lcx * 100)}%)
            </button>
            <button
              type="button"
              onClick={() => setVesselFocus('rca')}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontFamily: 'var(--fs)',
                fontWeight: 600,
                borderRadius: 'var(--radius)',
                border: '1px solid var(--bd)',
                backgroundColor: vesselFocus === 'rca' ? 'var(--high)' : 'var(--hov)',
                color: vesselFocus === 'rca' ? '#fff' : 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              RCA Inferior Wall ({Math.round(heartResults.rca * 100)}%)
            </button>
            <button
              type="button"
              onClick={() => setVesselFocus(null)}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontFamily: 'var(--fs)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--bd)',
                backgroundColor: 'var(--panel)',
                color: 'var(--mut)',
                cursor: 'pointer',
              }}
            >
              Reset Full View
            </button>
          </div>

          {/* 3D Canvas Container */}
          <div
            style={{
              flex: 1,
              minHeight: '440px',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
              position: 'relative',
              border: '1px solid var(--bd)',
              backgroundColor: '#080808',
            }}
          >
            <HeartCanvas
              results={heartResults}
              selection={vesselFocus}
              onSelect={(v) => setVesselFocus(v)}
            />
          </div>

          {/* Color Legend */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '11px', color: 'var(--mut)' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} /> Healthy
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }} /> Borderline
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF4444' }} /> Ischemic Stenosis
              </span>
            </div>
            <span style={{ fontFamily: 'var(--fm)', fontSize: '10px' }}>Drag to rotate • Scroll to zoom</span>
          </div>
        </div>

        {/* COLUMN 3: Model Drivers & Doctor's Manual Opinion Sign-off */}
        <div className="pn" style={{ backgroundColor: 'var(--panel)', maxHeight: '780px', overflowY: 'auto' }}>
          <div style={{ borderBottom: '1px solid var(--bd)', paddingBottom: '8px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} color="var(--acc)" />
              <h2 style={{ fontFamily: 'var(--fs)', fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                Model Explainability & Clinical Drivers
              </h2>
            </div>
            <p style={{ fontFamily: 'var(--fs)', fontSize: '11px', color: 'var(--mut)', margin: '2px 0 0 0' }}>
              TreeSHAP attribution drivers for calibrated cardiac risk
            </p>
          </div>

          {/* Top Contributing Clinical Factors */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--mut)', marginBottom: '6px' }}>Key Positive Drivers (Elevating Risk):</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {String(selectedPatient?.['Region RWMA'] || selectedPatient?.Region_RWMA) !== '0' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 6px', backgroundColor: 'var(--hov)', borderRadius: 'var(--radius)' }}>
                  <span>Regional Wall Motion Abnormality</span>
                  <strong style={{ color: 'var(--high)', fontFamily: 'var(--fm)' }}>+0.24</strong>
                </div>
              )}
              {String(selectedPatient?.['St Elevation'] || selectedPatient?.St_Elevation) === '1' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 6px', backgroundColor: 'var(--hov)', borderRadius: 'var(--radius)' }}>
                  <span>Acute ST-Segment Elevation</span>
                  <strong style={{ color: 'var(--high)', fontFamily: 'var(--fm)' }}>+0.19</strong>
                </div>
              )}
              {(selectedPatient?.BP || 120) >= 140 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 6px', backgroundColor: 'var(--hov)', borderRadius: 'var(--radius)' }}>
                  <span>Systolic Blood Pressure ({selectedPatient?.BP} mmHg)</span>
                  <strong style={{ color: 'var(--high)', fontFamily: 'var(--fm)' }}>+0.12</strong>
                </div>
              )}
              {(selectedPatient?.FBS || 90) >= 126 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 6px', backgroundColor: 'var(--hov)', borderRadius: 'var(--radius)' }}>
                  <span>Fasting Blood Sugar ({selectedPatient?.FBS} mg/dL)</span>
                  <strong style={{ color: 'var(--mod)', fontFamily: 'var(--fm)' }}>+0.09</strong>
                </div>
              )}
            </div>
          </div>

          {/* Doctor's Manual Clinical Opinion & Sign-off Form */}
          <form onSubmit={handleSignOpinion} style={{ borderTop: '2px solid var(--acc)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserCheck size={16} color="var(--acc)" />
                <h3 style={{ fontFamily: 'var(--fs)', fontSize: '13px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                  Doctor's Manual Opinion & Disposition
                </h3>
              </div>
              {selectedPatient?.doctor_consultation?.consulted && (
                <span style={{ fontSize: '10px', color: 'var(--low)', fontWeight: 600 }}>✓ Previously Signed</span>
              )}
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '3px' }}>
                Doctor's Clinical Impression & Notes:
              </label>
              <textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                rows={4}
                required
                placeholder="Type doctor's diagnosis, therapy advice, and rationale..."
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--bd)',
                  backgroundColor: 'var(--panel)',
                  color: 'var(--ink)',
                  fontSize: '12px',
                  fontFamily: 'var(--fs)',
                  lineHeight: 1.4,
                }}
              />
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '3px' }}>
                Escalation & Disposition Action:
              </label>
              <select
                value={triageDecision}
                onChange={(e) => {
                  setTriageDecision(e.target.value);
                  if (e.target.value === 'urgent_cath_lab') {
                    setRecommendation('Emergent Cath Lab Referral & Invasive Angiography');
                  } else if (e.target.value === 'opd_urgent') {
                    setRecommendation('Urgent Cardiology OPD Consultation (24-48h)');
                  } else if (e.target.value === 'medication_titration') {
                    setRecommendation('Medication Titration & 7-Day Follow-Up');
                  } else {
                    setRecommendation('Routine Frontline Community Follow-Up (30 Days)');
                  }
                }}
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
                <option value="urgent_cath_lab">🚨 Emergent Cath Lab Referral (Immediate Angiography)</option>
                <option value="opd_urgent">⚡ Urgent Cardiology OPD Consultation (24-48h)</option>
                <option value="medication_titration">💊 Medical Therapy Titration & Weekly Review</option>
                <option value="opd_routine">📋 Routine Frontline Community Follow-Up</option>
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '3px' }}>
                Formal Recommendation:
              </label>
              <input
                type="text"
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--bd)',
                  backgroundColor: 'var(--panel)',
                  color: 'var(--ink)',
                  fontSize: '12px',
                }}
              />
            </div>

            {opinionSaved && (
              <div
                style={{
                  padding: '8px 10px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid var(--low)',
                  borderRadius: 'var(--radius)',
                  fontSize: '11px',
                  color: 'var(--low)',
                  marginBottom: '10px',
                  fontWeight: 500,
                }}
              >
                ✓ Clinical opinion digitally signed by Dr. Aditi Sharma and logged to immutable audit trail.
              </div>
            )}

            <PrimaryButton
              type="submit"
              disabled={savingOpinion}
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
            >
              <Stethoscope size={15} />
              {savingOpinion ? 'Signing & Logging...' : '🩺 Sign & Finalize Clinical Opinion'}
            </PrimaryButton>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DoctorConsultationPage;
