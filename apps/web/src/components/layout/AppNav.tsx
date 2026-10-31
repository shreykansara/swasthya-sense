import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Sun, Moon, Users, FileText, Stethoscope, ShieldCheck, Heart, LogOut, KeyRound } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useAuthStore } from '../../store/useAuthStore';
import { UserRole } from '../../lib/supabase';
import { Trace } from '../ui/Trace';

export interface AppNavProps {
  forceStep?: number;
  forceState?: 'completed' | 'current' | 'upcoming' | 'hover' | 'focus';
}

export const AppNav: React.FC<AppNavProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const { user, loginAsDemo, logout } = useAuthStore();

  const userRole: UserRole = user?.role || 'doctor';

  // Strict 3-Persona Role-Based Navigation Links
  const getNavLinks = () => {
    if (userRole === 'lab_technician') {
      // Lab Tech can ONLY and ONLY upload reports
      return [
        { label: 'Lab Intake Desk', path: '/lab-intake', icon: FileText },
      ];
    } else if (userRole === 'patient') {
      // Patient views when to visit doctor again and practices
      return [
        { label: 'My Health & Next Visit', path: '/patient-portal', icon: Heart },
      ];
    } else {
      // Doctor views dashboard, reports, 3D heart, opinion
      return [
        { label: 'Worklist Dashboard', path: '/dashboard', icon: Users },
        { label: "Doctor's 3D Station", path: '/doctor-consultation', icon: Stethoscope },
        { label: 'Audit Trail', path: '/audit', icon: ShieldCheck },
      ];
    }
  };

  const navLinks = getNavLinks();

  const handleRoleSwitch = (newRole: UserRole) => {
    loginAsDemo(newRole);
    if (newRole === 'doctor') {
      navigate('/dashboard');
    } else if (newRole === 'lab_technician') {
      navigate('/lab-intake');
    } else {
      navigate('/patient-portal');
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
          to={userRole === 'patient' ? '/patient-portal' : userRole === 'lab_technician' ? '/lab-intake' : '/dashboard'}
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
              EARLY WARNING SYSTEM
            </span>
          </div>
        </Link>

        {/* Center Navigation Links - STRICTLY RESTRICTED PER PERSONA */}
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
                  padding: '6px 12px',
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

        {/* Right Zone: 3-Persona Switcher, Profile Badge & Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Persona Switcher Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--mut)', fontFamily: 'var(--fs)' }}>Persona:</span>
            <select
              value={userRole}
              onChange={(e) => handleRoleSwitch(e.target.value as UserRole)}
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
              <option value="doctor">🩺 Doctor (Aditi Sharma)</option>
              <option value="patient">👤 Patient (Ramesh Patel)</option>
              <option value="lab_technician">🧪 Lab Tech (Rajesh Kumar)</option>
            </select>
          </div>

          {/* Login / Auth Portal link */}
          <Link
            to="/login"
            title="Open Supabase Login & Account Portal"
            style={{
              height: '32px',
              padding: '0 8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'var(--hov)',
              border: '1px solid var(--bd)',
              borderRadius: 'var(--radius)',
              color: 'var(--ink)',
              textDecoration: 'none',
              fontSize: '11px',
              fontFamily: 'var(--fs)',
            }}
          >
            <KeyRound size={13} />
            <span>Auth</span>
          </Link>

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
