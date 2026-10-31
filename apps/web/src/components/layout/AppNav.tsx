import React, { useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Sun, Moon, Users, FileText, Stethoscope, ShieldCheck, Heart } from 'lucide-react';
import { useWizardStore } from '../../store/useWizardStore';
import { usePatientStore } from '../../store/usePatientStore';
import type { AppRole } from '../../types/clinical';
import { useTheme } from '../../hooks/useTheme';
import { Trace } from '../ui/Trace';

export interface AppNavProps {
  forceStep?: number;
  forceState?: 'completed' | 'current' | 'upcoming' | 'hover' | 'focus';
}

export const AppNav: React.FC<AppNavProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const activeRole = usePatientStore((s) => s.activeRole);
  const setActiveRole = usePatientStore((s) => s.setActiveRole);

  const navLinks = [
    { label: 'Worklist & Triage', path: '/', icon: Users },
    { label: 'Lab Intake', path: '/lab-intake', icon: FileText },
    { label: "Doctor's 3D Station", path: '/doctor-consultation', icon: Stethoscope },
    { label: 'Audit & Governance', path: '/audit', icon: ShieldCheck },
    { label: 'Assessment Stepper', path: '/welcome', icon: Heart },
  ];

  const handleRoleChange = (role: AppRole) => {
    setActiveRole(role);
    // Contextual redirection based on chosen role if at root
    if (role === 'worker' && location.pathname === '/') {
      navigate('/lab-intake');
    } else if (role === 'clinician' && location.pathname === '/') {
      navigate('/doctor-consultation');
    }
  };

  return (
    <header className="app-chrome app-header" style={{ borderBottom: '1px solid var(--bd)', backgroundColor: 'var(--panel)' }}>
      <a href="#main-content" className="skip-link app-chrome no-print">
        Skip to content
      </a>

      <div
        className="app-header-inner"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 16px',
          height: '56px',
          maxWidth: '1440px',
          margin: '0 auto',
        }}
      >
        {/* Brand Left Zone */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: 'inherit',
          }}
          aria-label="Swasthya Sense Home"
        >
          <Trace width={30} height={14} className="trace-initial" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontFamily: 'var(--fs)',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--ink)',
                lineHeight: 1.1,
              }}
            >
              Swasthya Sense
            </span>
            <span
              style={{
                fontFamily: 'var(--fm)',
                fontSize: '9px',
                color: 'var(--mut)',
                letterSpacing: '0.4px',
              }}
            >
              PERFUSION3D TWIN
            </span>
          </div>
        </Link>

        {/* Center Navigation Links */}
        <nav aria-label="Clinical Workspaces" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {navLinks.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius)',
                  fontSize: '12px',
                  fontFamily: 'var(--fs)',
                  fontWeight: isActive ? 600 : 400,
                  textDecoration: 'none',
                  backgroundColor: isActive ? 'var(--hov)' : 'transparent',
                  color: isActive ? 'var(--acc)' : 'var(--ink)',
                  border: `1px solid ${isActive ? 'var(--acc)' : 'transparent'}`,
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Zone: User Persona Switcher & Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--mut)', fontFamily: 'var(--fs)' }}>Sign-in Role:</span>
            <select
              value={activeRole}
              onChange={(e) => handleRoleChange(e.target.value as AppRole)}
              aria-label="Active Medical Persona"
              style={{
                height: '32px',
                padding: '0 8px',
                backgroundColor: 'var(--panel)',
                border: '1px solid var(--bds)',
                borderRadius: 'var(--radius)',
                color: 'var(--ink)',
                fontFamily: 'var(--fs)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <option value="worker">🧪 Rajesh Kumar (Lab Tech)</option>
              <option value="clinician">🩺 Dr. Aditi Sharma (Cardiologist)</option>
              <option value="supervisor">📋 Sunita Devi (ASHA Worker)</option>
              <option value="admin">🛡️ Vikram Malhotra (Audit)</option>
            </select>
          </div>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="app-theme-toggle-btn"
            aria-label={`Switch to ${resolvedTheme === 'dark' ? 'Paper' : 'Monitor'} theme`}
            title={`Switch to ${resolvedTheme === 'dark' ? 'Paper' : 'Monitor'} theme`}
            style={{
              width: '32px',
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--panel)',
              border: '1px solid var(--bds)',
              borderRadius: 'var(--radius)',
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            {resolvedTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default AppNav;
