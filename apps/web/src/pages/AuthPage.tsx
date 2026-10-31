import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Heart,
  FileText,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Info,
  User,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { UserRole, DEMO_PROFILES } from '../lib/supabase';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { SecondaryButton } from '../components/ui/SecondaryButton';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    loginAsDemo,
    loginWithPassword,
    signUp,
    logout,
    error,
    isLoading,
    isSupabaseConnected,
  } = useAuthStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [patientId, setPatientId] = useState('');

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
      // Public self-registration is strictly for Patient role only
      const generatedPid = patientId.trim() || `PAT-${Math.floor(1000 + Math.random() * 9000)}`;
      const ok = await signUp(email, password, 'patient', fullName.trim(), generatedPid);
      if (ok) {
        navigate('/patient-portal');
      }
    }
  };

  return (
    <div style={{ maxWidth: '880px', margin: '36px auto', padding: '0 16px' }}>
      {/* Title & Connection Status */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: 'var(--radius)',
              fontSize: '11px',
              fontFamily: 'var(--fm)',
              fontWeight: 600,
              backgroundColor: isSupabaseConnected ? 'rgba(37, 211, 102, 0.12)' : 'var(--hov)',
              border: `1px solid ${isSupabaseConnected ? 'var(--low)' : 'var(--bd)'}`,
              color: isSupabaseConnected ? 'var(--low)' : 'var(--mut)',
            }}
          >
            {isSupabaseConnected ? '● SUPABASE AUTH CLOUD' : '● SWASTHYA AUTH ENGINE (ACTIVE)'}
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--fs)', fontSize: '24px', fontWeight: 600, color: 'var(--ink)', margin: '0 0 6px 0' }}>
          Swasthya Sense Access Portal
        </h1>
        <p style={{ fontFamily: 'var(--fs)', fontSize: '13px', color: 'var(--mut)', margin: 0 }}>
          Cardiovascular Early Warning & Follow-Up Clinical Management Platform
        </p>
      </div>

      {/* If already signed in, show status & active user banner */}
      {isAuthenticated && user && (
        <div
          className="pn"
          style={{
            marginBottom: '28px',
            backgroundColor: 'var(--panel)',
            border: '1px solid var(--bd)',
            padding: '14px 18px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--hov)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                color: 'var(--ink)',
              }}
            >
              {user.role === 'doctor' ? <Stethoscope size={18} color="var(--acc)" /> : user.role === 'patient' ? <Heart size={18} color="var(--low)" /> : <FileText size={18} color="var(--mod)" />}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--fs)', fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                Currently Signed In: {user.full_name}
              </div>
              <div style={{ fontFamily: 'var(--fs)', fontSize: '11px', color: 'var(--mut)' }}>
                Role: <strong>{user.role === 'doctor' ? 'Qualified Clinician (Doctor)' : user.role === 'patient' ? `Patient (${user.patient_id || 'PAT-0001'})` : 'Laboratory Technician'}</strong> • {user.email}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <PrimaryButton
              type="button"
              onClick={() => {
                if (user.role === 'doctor') navigate('/dashboard');
                else if (user.role === 'patient') navigate('/patient-portal');
                else navigate('/lab-intake');
              }}
            >
              Go to Workspace <ArrowRight size={14} />
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => logout()}>
              <LogOut size={14} /> Sign Out
            </SecondaryButton>
          </div>
        </div>
      )}

      {/* Main Grid: Left side Form (Sign In / Register as Patient), Right side 1-Click Evaluation Accounts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Form Container */}
        <div className="pn" style={{ backgroundColor: 'var(--panel)', padding: '24px', borderRadius: 'var(--radius)' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--bd)', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => {
                setMode('signin');
              }}
              style={{
                flex: 1,
                padding: '10px 8px',
                fontSize: '13px',
                fontWeight: mode === 'signin' ? 600 : 500,
                borderBottom: mode === 'signin' ? '2px solid var(--acc)' : '2px solid transparent',
                color: mode === 'signin' ? 'var(--acc)' : 'var(--mut)',
                background: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Sign In with Credentials
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
              }}
              style={{
                flex: 1,
                padding: '10px 8px',
                fontSize: '13px',
                fontWeight: mode === 'signup' ? 600 : 500,
                borderBottom: mode === 'signup' ? '2px solid var(--acc)' : '2px solid transparent',
                color: mode === 'signup' ? 'var(--acc)' : 'var(--mut)',
                background: 'none',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Register as Patient
            </button>
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

          {/* Mode 1: Sign In for ALL personas */}
          {mode === 'signin' && (
            <form onSubmit={handleSubmit}>
              <p style={{ fontSize: '12px', color: 'var(--mut)', margin: '0 0 16px 0' }}>
                Sign in with hospital or patient credentials. All verified roles (Doctor, Lab Tech, Patient) are authenticated here.
              </p>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                  Email Address:
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    required
                    placeholder="e.g. doctor@swasthya.internal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--bd)',
                      backgroundColor: 'var(--panel)',
                      color: 'var(--ink)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                  Password:
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--bd)',
                    backgroundColor: 'var(--panel)',
                    color: 'var(--ink)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <PrimaryButton type="submit" disabled={isLoading} style={{ width: '100%' }}>
                {isLoading ? 'Authenticating...' : 'Sign In to Account'}
              </PrimaryButton>
            </form>
          )}

          {/* Mode 2: Sign Up - STRICTLY Patient Role Only */}
          {mode === 'signup' && (
            <form onSubmit={handleSubmit}>
              {/* Institutional Notice */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(29, 63, 138, 0.08)',
                  border: '1px solid var(--bd)',
                  borderRadius: 'var(--radius)',
                  marginBottom: '16px',
                }}
              >
                <Info size={16} color="var(--acc)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '11px', color: 'var(--ink)', lineHeight: 1.4 }}>
                  <strong>Patient Self-Registration Only:</strong> Doctor and Laboratory Staff accounts are confidential and provisioned exclusively through hospital IT administration.
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                  Full Legal Name:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--bd)',
                    backgroundColor: 'var(--panel)',
                    color: 'var(--ink)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                  Hospital Patient ID (Optional if already assigned):
                </label>
                <input
                  type="text"
                  placeholder="e.g. PAT-0001 (Leave blank to auto-generate)"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--bd)',
                    backgroundColor: 'var(--panel)',
                    color: 'var(--ink)',
                    fontSize: '13px',
                    fontFamily: 'var(--fm)',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                  Email Address:
                </label>
                <input
                  type="email"
                  required
                  placeholder="patient@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--bd)',
                    backgroundColor: 'var(--panel)',
                    color: 'var(--ink)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                  Create Password (minimum 6 characters):
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--bd)',
                    backgroundColor: 'var(--panel)',
                    color: 'var(--ink)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <PrimaryButton type="submit" disabled={isLoading} style={{ width: '100%', backgroundColor: 'var(--low)' }}>
                {isLoading ? 'Creating Patient Account...' : 'Register as Patient'}
              </PrimaryButton>
            </form>
          )}
        </div>

        {/* Right Column: Demonstration Quick-Logins (One for each persona) */}
        <div
          className="pn"
          style={{
            backgroundColor: 'var(--panel)',
            padding: '24px',
            borderRadius: 'var(--radius)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldCheck size={18} color="var(--acc)" />
              <h2 style={{ fontFamily: 'var(--fs)', fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                Demonstration Evaluation Access
              </h2>
            </div>
            <p style={{ fontFamily: 'var(--fs)', fontSize: '12px', color: 'var(--mut)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
              For hackathon evaluation and reviewer demonstration, 1-click access is provided for each authorized medical persona:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Doctor Demo Button */}
              <button
                type="button"
                onClick={() => handleDemoSelect('doctor')}
                className="pn"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  backgroundColor: 'var(--hov)',
                  border: '1px solid var(--acc)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius)',
                      backgroundColor: 'rgba(29, 63, 138, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Stethoscope size={16} color="var(--acc)" />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--fs)', fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                      1. Doctor Station
                    </div>
                    <div style={{ fontFamily: 'var(--fs)', fontSize: '11px', color: 'var(--mut)' }}>
                      Dr. Aditi Sharma, MD • Cardiologist
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--fm)',
                    fontSize: '11px',
                    color: 'var(--acc)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  Enter <ArrowRight size={13} />
                </span>
              </button>

              {/* Patient Demo Button */}
              <button
                type="button"
                onClick={() => handleDemoSelect('patient')}
                className="pn"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  backgroundColor: 'var(--hov)',
                  border: '1px solid var(--low)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius)',
                      backgroundColor: 'rgba(31, 111, 69, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Heart size={16} color="var(--low)" />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--fs)', fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                      2. Patient Portal
                    </div>
                    <div style={{ fontFamily: 'var(--fs)', fontSize: '11px', color: 'var(--mut)' }}>
                      Ramesh Patel • Patient (PAT-0001)
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--fm)',
                    fontSize: '11px',
                    color: 'var(--low)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  Enter <ArrowRight size={13} />
                </span>
              </button>

              {/* Lab Technician Demo Button */}
              <button
                type="button"
                onClick={() => handleDemoSelect('lab_technician')}
                className="pn"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  backgroundColor: 'var(--hov)',
                  border: '1px solid var(--mod)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius)',
                      backgroundColor: 'rgba(184, 119, 0, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileText size={16} color="var(--mod)" />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--fs)', fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                      3. Lab Technician Desk
                    </div>
                    <div style={{ fontFamily: 'var(--fs)', fontSize: '11px', color: 'var(--mut)' }}>
                      Rajesh Kumar • Senior Lab Technician
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--fm)',
                    fontSize: '11px',
                    color: 'var(--mod)',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  Enter <ArrowRight size={13} />
                </span>
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: '20px',
              padding: '10px 12px',
              backgroundColor: 'var(--hov)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--bd)',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--mut)', lineHeight: 1.4 }}>
              <strong>Zero Leakage & RBAC Enforcement:</strong> Each persona is sandboxed to their authorized clinical scope. Technicians cannot access patient clinical twins; patients only view their own schedule and care practices.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
