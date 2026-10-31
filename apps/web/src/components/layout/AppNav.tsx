import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Sun,
  Moon,
  Users,
  FileText,
  Stethoscope,
  ShieldCheck,
  Heart,
  LogOut,
  KeyRound,
  User as UserIcon,
} from 'lucide-react';
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
  const { user, isAuthenticated, logout } = useAuthStore();

  const userRole: UserRole | null = user?.role || null;

  // Strict 3-Persona Role-Based Navigation Links
  const getNavLinks = () => {
    if (!isAuthenticated || !userRole) {
      return [];
    }
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

  const getHomeRoute = () => {
    if (!isAuthenticated || !userRole) return '/login';
    if (userRole === 'patient') return '/patient-portal';
    if (userRole === 'lab_technician') return '/lab-intake';
    return '/dashboard';
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
          to={getHomeRoute()}
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

        {/* Center Navigation Links - STRICTLY RESTRICTED PER AUTHENTICATED PERSONA */}
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

        {/* Right Zone: Authenticated Identity Badge, Logout / Login, & Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isAuthenticated && user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Authenticated Identity Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  backgroundColor: 'var(--hov)',
                  border: '1px solid var(--bd)',
                  borderRadius: 'var(--radius)',
                  fontSize: '11px',
                  fontFamily: 'var(--fs)',
                }}
              >
                {user.role === 'doctor' && <Stethoscope size={13} color="var(--acc)" />}
                {user.role === 'patient' && <Heart size={13} color="var(--low)" />}
                {user.role === 'lab_technician' && <FileText size={13} color="var(--mod)" />}
                <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{user.full_name}</span>
                <span style={{ color: 'var(--mut)', fontSize: '10px' }}>
                  ({user.role === 'doctor' ? 'Clinician' : user.role === 'patient' ? (user.patient_id || 'Patient') : 'Lab Tech'})
                </span>
              </div>

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
                title="Sign Out of Swasthya Sense"
                style={{
                  height: '32px',
                  padding: '0 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--bd)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--mut)',
                  fontSize: '11px',
                  fontFamily: 'var(--fs)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              title="Sign In to Swasthya Sense"
              style={{
                height: '32px',
                padding: '0 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'var(--acc)',
                color: '#ffffff',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: 'var(--fs)',
              }}
            >
              <KeyRound size={13} />
              <span>Sign In</span>
            </Link>
          )}

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
