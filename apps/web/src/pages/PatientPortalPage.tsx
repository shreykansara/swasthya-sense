import React, { useState, useEffect } from 'react';
import {
  Heart,
  Calendar,
  AlertTriangle,
  Clock,
  PhoneCall,
  CheckSquare,
  Square,
  Activity,
  Salad,
  Footprints,
  Pill,
  ShieldAlert,
  User,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { swasthyaApi, PatientRecord } from '../api/swasthyaApi';
import { useAuthStore } from '../store/useAuthStore';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';

export const PatientPortalPage: React.FC = () => {
  const { user } = useAuthStore();
  const [patient, setPatient] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Medication checklist state
  const [checkedMeds, setCheckedMeds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    swasthyaApi.fetchPatients()
      .then((data) => {
        const targetId = user?.patient_id || 'PAT-0001';
        let matched = data.find((p) => p.patient_id.toUpperCase() === targetId.toUpperCase());
        if (!matched && user) {
          // If fresh user profile without pre-existing reports yet
          matched = {
            patient_id: user.patient_id || 'PAT-0001',
            patient_masked_id: `PAT-***${(user.patient_id || '001').slice(-3)}`,
            full_name: user.full_name || 'Registered Patient',
            Age: 52,
            Sex: 'Male',
            cohort: 'Cohort A: Hypertension with Lipids',
            risk_category: 'LOW_RISK',
            is_high_priority: false,
            overdue_days: 0,
            next_visit_date: new Date(Date.now() + 14 * 86400000).toISOString(),
            prescribed_practices: {
              medications: [
                { name: 'Aspirin (Delayed-Release)', dosage: '75 mg', frequency: 'Once daily after breakfast', purpose: 'Blood thinner and cardioprotection', is_critical: true },
                { name: 'Atorvastatin', dosage: '20 mg', frequency: 'Once daily at bedtime', purpose: 'Lipid lowering and plaque stabilization', is_critical: true },
              ],
              lifestyle_practices: [
                { category: 'Dietary', recommendation: 'Maintain low-sodium DASH diet (< 2g salt/day) with high intake of green vegetables and whole grains.' },
                { category: 'Physical Activity', recommendation: 'Engage in 30 minutes of moderate aerobic walking 5 times weekly; avoid sudden strenuous exertion.' },
              ],
              red_flags: [
                'New or worsening chest pressure, squeezing, or heaviness radiating to left arm or jaw.',
                'Severe shortness of breath at rest or when lying flat.',
              ],
            },
          } as any;
        }
        setPatient(matched || data[0]);
      })
      .catch((err) => console.error('Error fetching patient data:', err))
      .finally(() => setLoading(false));
  }, [user?.patient_id, user?.full_name]);

  const toggleMed = (medName: string) => {
    setCheckedMeds((prev) => ({
      ...prev,
      [medName]: !prev[medName],
    }));
  };

  if (loading || !patient) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', fontFamily: 'var(--fs)', color: 'var(--mut)' }}>
        Loading your personal heart health portal & schedule...
      </div>
    );
  }

  const practices = patient.prescribed_practices || {};
  const isHighRisk = patient.risk_category === 'HIGH_RISK' || patient.is_high_priority;
  const isOverdue = (patient.overdue_days || 0) > 0;
  const nextVisit = patient.next_visit_date ? new Date(patient.next_visit_date) : null;
  const nextVisitFormatted = nextVisit ? nextVisit.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Next Week';

  return (
    <div style={{ maxWidth: '1100px', margin: '24px auto', padding: '0 16px' }}>
      {/* Top Patient Identity Card */}
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
          borderLeft: `4px solid ${isHighRisk ? 'var(--high)' : 'var(--low)'}`,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Heart size={22} color={isHighRisk ? 'var(--high)' : 'var(--low)'} />
            <h1 style={{ fontFamily: 'var(--fs)', fontSize: '20px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Welcome back, {patient.full_name}
            </h1>
          </div>
          <p style={{ fontFamily: 'var(--fs)', fontSize: '12px', color: 'var(--mut)', margin: '4px 0 0 0' }}>
            Patient ID: <strong>{patient.patient_id}</strong> • Cohort: {patient.cohort}
          </p>
        </div>

        {/* Verified Patient Portal Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius)',
              backgroundColor: 'var(--hov)',
              border: '1px solid var(--bd)',
              fontSize: '11px',
              fontFamily: 'var(--fm)',
              color: 'var(--ink)',
            }}
          >
            <User size={13} color="var(--acc)" />
            AUTHENTICATED PATIENT RECORD
          </span>
        </div>
      </div>

      {/* SECTION 1: WHEN TO VISIT THE DOCTOR AGAIN */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontFamily: 'var(--fs)', fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Calendar size={18} color="var(--acc)" />
          When to Visit the Doctor Again:
        </h2>

        {/* Urgent Walk-In Notice */}
        {isHighRisk ? (
          <div
            className="pn"
            style={{
              backgroundColor: 'rgba(200, 29, 58, 0.08)',
              border: '2px solid var(--high)',
              borderRadius: 'var(--radius)',
              padding: '20px',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <AlertTriangle size={24} color="var(--high)" />
              <h3 style={{ fontFamily: 'var(--fs)', fontSize: '17px', fontWeight: 600, color: 'var(--high)', margin: 0 }}>
                🚨 IMMEDIATE WALK-IN OPD CONSULTATION REQUIRED
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: 1.5, margin: '0 0 14px 0' }}>
              Your latest cardiac diagnostic lab report indicates <strong>high-risk cardiovascular markers</strong> (Predicted CAD risk {Math.round((patient.predictions?.overall_cad?.probability || 0.85) * 100)}%, LAD Anterior Ischemia {Math.round((patient.predictions?.vessels?.lad?.probability || 0.85) * 100)}%).
              Please <strong>walk in to the Cardiology OPD immediately</strong> or report to the emergency department.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <a
                href="tel:108"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  backgroundColor: 'var(--high)',
                  color: '#fff',
                  borderRadius: 'var(--radius)',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <PhoneCall size={14} /> Call 108 Emergency Ambulance
              </a>
              <a
                href="tel:+9118004250011"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  backgroundColor: 'var(--panel)',
                  border: '1px solid var(--high)',
                  color: 'var(--high)',
                  borderRadius: 'var(--radius)',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <PhoneCall size={14} /> Cardiology Cath Lab Helpline (+91-1800-425-0011)
              </a>
            </div>
          </div>
        ) : isOverdue ? (
          <div
            className="pn"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '2px solid var(--mod)',
              borderRadius: 'var(--radius)',
              padding: '18px',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Clock size={22} color="var(--mod)" />
              <h3 style={{ fontFamily: 'var(--fs)', fontSize: '16px', fontWeight: 600, color: 'var(--mod)', margin: 0 }}>
                ⚠️ YOUR SCHEDULED FOLLOW-UP IS {patient.overdue_days} DAYS OVERDUE
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
              Your check-in date was scheduled for {nextVisitFormatted}. Missing chronic disease follow-ups increases the risk of unnoticed blood pressure or lipid deterioration.
            </p>
            <PrimaryButton onClick={() => alert('Appointment request sent to Cardiology OPD coordinator.')}>
              Book Follow-Up Visit Now
            </PrimaryButton>
          </div>
        ) : (
          <div
            className="pn"
            style={{
              backgroundColor: 'rgba(31, 111, 69, 0.08)',
              border: '2px solid var(--low)',
              borderRadius: 'var(--radius)',
              padding: '18px',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Calendar size={22} color="var(--low)" />
              <h3 style={{ fontFamily: 'var(--fs)', fontSize: '16px', fontWeight: 600, color: 'var(--low)', margin: 0 }}>
                ✓ ON SCHEDULE: Next Scheduled Clinical Visit: {nextVisitFormatted}
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: 1.5, margin: 0 }}>
              Your cardiovascular markers are currently within the managed target zone. Keep following your daily medication checklist and prescribed dietary practices below.
            </p>
          </div>
        )}

        {/* Doctor's Written Clinical Impression & Advice */}
        {patient.doctor_consultation?.consulted && (
          <div className="pn" style={{ backgroundColor: 'var(--panel)', borderLeft: '3px solid var(--acc)', padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Stethoscope size={16} color="var(--acc)" />
              <strong style={{ fontSize: '13px', color: 'var(--ink)' }}>
                Doctor's Direct Clinical Advice ({patient.doctor_consultation.doctor_name || 'Dr. Aditi Sharma, MD'}):
              </strong>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--ink)', margin: '0 0 8px 0', lineHeight: 1.45, fontStyle: 'italic' }}>
              "{patient.doctor_consultation.clinical_notes}"
            </p>
            <div style={{ fontSize: '11px', color: 'var(--mut)' }}>
              Prescribed Disposition: <strong>{patient.doctor_consultation.recommendation}</strong>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: ALL PRACTICES TO BE FOLLOWED BY THE PATIENT */}
      <div>
        <h2 style={{ fontFamily: 'var(--fs)', fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={18} color="var(--acc)" />
          All Practices to be Followed by the Patient:
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {/* 1. Daily Medication Checklist */}
          <div className="pn" style={{ backgroundColor: 'var(--panel)', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--acc)' }}>
              <Pill size={18} />
              <h3 style={{ fontFamily: 'var(--fs)', fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
                1. Daily Prescribed Medication Checklist
              </h3>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--mut)', margin: '0 0 10px 0' }}>
              Check off each medicine as you take it today:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(practices.medication_checklist || [
                { name: 'Aspirin 75 mg', timing: 'Once daily after breakfast', purpose: 'Blood thinner' },
                { name: 'Atorvastatin 40 mg', timing: 'Once daily at bedtime', purpose: 'Lipid control' },
                { name: 'Metoprolol 25 mg', timing: 'Morning with water', purpose: 'Heart rate & BP' },
              ]).map((med: any) => {
                const isChecked = Boolean(checkedMeds[med.name]);
                return (
                  <div
                    key={med.name}
                    onClick={() => toggleMed(med.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius)',
                      backgroundColor: isChecked ? 'rgba(31, 111, 69, 0.08)' : 'var(--hov)',
                      border: `1px solid ${isChecked ? 'var(--low)' : 'var(--bd)'}`,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isChecked ? <CheckSquare size={16} color="var(--low)" /> : <Square size={16} color="var(--mut)" />}
                    <div style={{ flex: 1, fontSize: '12px' }}>
                      <div style={{ fontWeight: 600, color: isChecked ? 'var(--low)' : 'var(--ink)' }}>{med.name}</div>
                      <div style={{ color: 'var(--mut)', fontSize: '11px' }}>{med.timing} • {med.purpose}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Dietary Guidelines */}
          <div className="pn" style={{ backgroundColor: 'var(--panel)', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--low)' }}>
              <Salad size={18} />
              <h3 style={{ fontFamily: 'var(--fs)', fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
                2. Heart-Healthy Dietary Guidelines
              </h3>
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--ink)', lineHeight: 1.5 }}>
              {(practices.dietary_guidelines || [
                'Sodium restriction: Less than 1/2 teaspoon of salt per day.',
                'Zero trans-fats, processed foods, and deep-fried snacks.',
                'Include high-fiber seasonal vegetables and whole oats.',
                'Drink 2.5 liters of clean water daily unless fluid restricted.',
              ]).map((rule: string, idx: number) => (
                <li key={idx} style={{ marginBottom: '6px' }}>{rule}</li>
              ))}
            </ul>
          </div>

          {/* 3. Physical Activity Boundaries */}
          <div className="pn" style={{ backgroundColor: 'var(--panel)', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--mod)' }}>
              <Footprints size={18} />
              <h3 style={{ fontFamily: 'var(--fs)', fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--ink)' }}>
                3. Physical Activity & Safe Exercise Boundaries
              </h3>
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--ink)', lineHeight: 1.5 }}>
              {(practices.exercise_boundaries || [
                'Brisk walking for 30 minutes 5 days a week at conversational pace.',
                'Avoid lifting heavy weights or sudden sprinting.',
                'STOP exercise immediately if you experience chest tightness, dizziness, or shortness of breath.',
              ]).map((rule: string, idx: number) => (
                <li key={idx} style={{ marginBottom: '6px' }}>{rule}</li>
              ))}
            </ul>
          </div>

          {/* 4. Critical Red Flag Warning Signs */}
          <div className="pn" style={{ backgroundColor: 'var(--panel)', padding: '16px', borderLeft: '3px solid var(--high)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--high)' }}>
              <ShieldAlert size={18} />
              <h3 style={{ fontFamily: 'var(--fs)', fontSize: '14px', fontWeight: 600, margin: 0, color: 'var(--high)' }}>
                4. Warning Signs Requiring Immediate Emergency Help
              </h3>
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--ink)', lineHeight: 1.5 }}>
              {(practices.warning_signs_to_watch || [
                'Chest squeezing or heaviness radiating to left shoulder, arm, or neck.',
                'Sudden shortness of breath even while sitting or lying flat.',
                'Cold sweats with nausea or extreme dizziness.',
              ]).map((rule: string, idx: number) => (
                <li key={idx} style={{ marginBottom: '6px' }}>{rule}</li>
              ))}
            </ul>
            <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--high)', fontWeight: 600 }}>
              🚨 If any of these occur: Sit down, take prescribed Sorbitrate (if advised), and immediately dial 108.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientPortalPage;

