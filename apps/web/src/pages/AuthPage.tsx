import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Heart,
  FileText,
  User,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  Database,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { UserRole } from '../lib/supabase';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loginAsDemo, loginWithPassword, signUp, logout, error, isLoading, isSupabaseConnected } = useAuthStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('doctor');
  const [patientId, setPatientId] = useState('PAT-0001');

  const handleDemoSelect = (role: UserRole) => {
    loginAsDemo(role);
    if (role === 'doctor') {
      navigate('/dashboard');
    } else if (role === 'lab_technician') {
      navigate('/lab-intake');
    } else {
      navigate('/patient-portal');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signin') {
      const ok = await loginWithPassword(email, password);
      if (ok) {
        const currentUser = useAuthStore.getState().user;
        if (currentUser?.role === 'lab_technician') navigate('/lab-intake');
        else if (currentUser?.role === 'patient') navigate('/patient-portal');
        else navigate('/dashboard');
      }
    } else {
      const ok = await signUp(email, password, selectedRole, fullName, selectedRole === 'patient' ? patientId : undefined);
      if (ok) {
        if (selectedRole === 'lab_technician') navigate('/lab-intake');
        else if (selectedRole === 'patient') navigate('/patient-portal');
        else navigate('/dashboard');
      }
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '40px auto', padding: '0 16px' }}>
      {/* Title & System Badge */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius)',
              fontSize: '11px',
              fontFamily: 'var(--fm)',
              fontWeight: 600,
              backgroundColor: isSupabaseConnected ? 'rgba(37, 211, 102, 0.12)' : 'var(--hov)',
              border: `1px solid ${isSupabaseConnected ? 'var(--low)' : 'var(--bd)'}`,
              color: isSupabaseConnected ? 'var(--low)' : 'var(--mut)',
            }}
          >
            {isSupabaseConnected ? '● SUPABASE AUTH ACTIVE' : '● SWASTHYA AUTH ENGINE ACTIVE'}
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--fs)', fontSize: '26px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px 0' }}>
          Swasthya Sense Authentication & Access Portal
        </h1>
        <p style={{ fontFamily: 'var(--fs)', fontSize: '13px', color: 'var(--mut)', margin: 0 }}>
          Role-Based Access Control for Doctors, Patients, and Laboratory Technicians
        </p>
      </div>

      {/* 3 Prominent User Persona Cards */}
      <div style={{ marginBottom: '36px' }}>
        <h2 style={{ fontFamily: 'var(--fs)', fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '12px', textAlign: 'center' }}>
          Select Medical Persona for Instant 1-Click Access:
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Persona 1: Doctor */}
          <div
            className="pn"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor: 'var(--panel)',
              border: '2px solid var(--acc)',
              padding: '18px',
              borderRadius: 'var(--radius)',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius)',
                    fontSize: '10px',
                    fontWeight: 600,
                    backgroundColor: 'rgba(29, 63, 138, 0.12)',
                    color: 'var(--acc)',
                  }}
                >
                  CLINICIAN ROLE
                </span>
                <Stethoscope size={22} color="var(--acc)" />
              </div>
              <h3 style={{ fontFamily: 'var(--fs)', fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px 0' }}>
                The Doctor
              </h3>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--acc)', marginBottom: '8px' }}>
                Dr. Aditi Sharma, MD (Cardiology)
              </div>
              <p style={{ fontSize: '12px', color: 'var(--mut)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                Review prioritized clinical worklist, inspect individual diagnostic reports, explore 3D heart digital twin, and record manual opinion & disposition.
              </p>
            </div>

            <PrimaryButton
              type="button"
              onClick={() => handleDemoSelect('doctor')}
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
            >
              Sign In as Doctor <ArrowRight size={15} />
            </PrimaryButton>
          </div>

          {/* Persona 2: Patient */}
          <div
            className="pn"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor: 'var(--panel)',
              border: '2px solid var(--low)',
              padding: '18px',
              borderRadius: 'var(--radius)',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius)',
                    fontSize: '10px',
                    fontWeight: 600,
                    backgroundColor: 'rgba(31, 111, 69, 0.12)',
                    color: 'var(--low)',
                  }}
                >
                  PATIENT PORTAL
                </span>
                <Heart size={22} color="var(--low)" />
              </div>
              <h3 style={{ fontFamily: 'var(--fs)', fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px 0' }}>
                The Patient
              </h3>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--low)', marginBottom: '8px' }}>
                Ramesh Patel (ID: PAT-0001)
              </div>
              <p style={{ fontSize: '12px', color: 'var(--mut)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                Know exactly when to visit the doctor again, receive urgent walk-in OPD advisories, and follow all prescribed lifestyle & medication practices.
              </p>
            </div>

            <PrimaryButton
              type="button"
              onClick={() => handleDemoSelect('patient')}
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', backgroundColor: 'var(--low)' }}
            >
              Sign In as Patient <ArrowRight size={15} />
            </PrimaryButton>
          </div>

          {/* Persona 3: Lab Technician */}
          <div
            className="pn"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor: 'var(--panel)',
              border: '2px solid var(--mod)',
              padding: '18px',
              borderRadius: 'var(--radius)',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius)',
                    fontSize: '10px',
                    fontWeight: 600,
                    backgroundColor: 'rgba(184, 119, 0, 0.12)',
                    color: 'var(--mod)',
                  }}
                >
                  LAB TECHNICIAN DESK
                </span>
                <FileText size={22} color="var(--mod)" />
              </div>
              <h3 style={{ fontFamily: 'var(--fs)', fontSize: '16px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 4px 0' }}>
                The Lab Technician
              </h3>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--mod)', marginBottom: '8px' }}>
                Rajesh Kumar (Apex Central Diagnostics)
              </div>
              <p style={{ fontSize: '12px', color: 'var(--mut)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                <strong>Only & only upload reports.</strong> Automatically creates profiles for new patients, and updates existing patient records with the most recent report.
              </p>
            </div>

            <PrimaryButton
              type="button"
              onClick={() => handleDemoSelect('lab_technician')}
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', backgroundColor: 'var(--mod)' }}
            >
              Sign In as Lab Tech <ArrowRight size={15} />
            </PrimaryButton>
          </div>
        </div>
      </div>

      {/* Standard Email / Password Form (Supabase Auth Integration) */}
      <div className="pn" style={{ maxWidth: '480px', margin: '0 auto', backgroundColor: 'var(--panel)', padding: '24px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--bd)', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => setMode('signin')}
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '13px',
              fontWeight: mode === 'signin' ? 600 : 400,
              borderBottom: mode === 'signin' ? '2px solid var(--acc)' : 'none',
              color: mode === 'signin' ? 'var(--acc)' : 'var(--mut)',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            Sign In with Email
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '13px',
              fontWeight: mode === 'signup' ? 600 : 400,
              borderBottom: mode === 'signup' ? '2px solid var(--acc)' : 'none',
              color: mode === 'signup' ? 'var(--acc)' : 'var(--mut)',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
            }}
          >
            Create New Account
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: 'rgba(200, 29, 58, 0.1)',
              border: '1px solid var(--high)',
              borderRadius: 'var(--radius)',
              color: 'var(--high)',
              fontSize: '12px',
              marginBottom: '14px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '4px' }}>Full Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jane Doe / Ramesh Patel"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '4px' }}>Assigned System Persona:</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                >
                  <option value="doctor">🩺 Doctor (Review Dashboard & 3D Heart)</option>
                  <option value="patient">👤 Patient (View Next Visit & Practices)</option>
                  <option value="lab_technician">🧪 Lab Technician (Only Upload Reports)</option>
                </select>
              </div>

              {selectedRole === 'patient' && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '4px' }}>Existing Patient ID (optional):</label>
                  <input
                    type="text"
                    placeholder="PAT-0001"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
                  />
                </div>
              )}
            </>
          )}

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '4px' }}>Email Address:</label>
            <input
              type="email"
              required
              placeholder="name@swasthya.internal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--mut)', marginBottom: '4px' }}>Password:</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--bd)', backgroundColor: 'var(--panel)', color: 'var(--ink)', fontSize: '13px' }}
            />
          </div>

          <PrimaryButton type="submit" disabled={isLoading} style={{ width: '100%' }}>
            {isLoading ? 'Processing...' : mode === 'signin' ? 'Sign In to Swasthya Sense' : 'Create Supabase Profile'}
          </PrimaryButton>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
