/**
 * Swasthya Sense: Early Warning & Follow-Up Platform for High-Risk Patients
 * Multimodal AI Hackathon 2026 - Problem 2
 * Roles: Doctor, Patient, Lab Technician
 */

import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { WizardLayout } from './components/layout/WizardLayout';
import { LandingLayout } from './components/layout/LandingLayout';

// Core Swasthya Sense Workspaces
import { ClinicalWorklistPage } from './pages/ClinicalWorklistPage';
import { LabIntakePage } from './pages/LabIntakePage';
import { DoctorConsultationPage } from './pages/DoctorConsultationPage';
import { PatientPortalPage } from './pages/PatientPortalPage';
import { AuditGovernancePage } from './pages/AuditGovernancePage';
import { AuthPage } from './pages/AuthPage';

// Assessment Stepper
import { WelcomePage } from './pages/WelcomePage';
import { DataEntryPage } from './pages/DataEntryPage';
import { ReportsPage } from './pages/ReportsPage';
import { ModelInfoPage } from './pages/ModelInfoPage';
import { DesignSystemPage } from './pages/DesignSystemPage';

import { useAuthStore } from './store/useAuthStore';
import { UserRole } from './lib/supabase';

// Lazy-loaded views
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const ResultsPage = React.lazy(() => import('./pages/ResultsPage'));

/**
 * Route dispatcher routing root `/` view based on authenticated Persona:
 * - Unauthenticated -> /login
 * - Patient -> /patient-portal
 * - Lab Tech -> /lab-intake
 * - Doctor -> /dashboard
 */
const RootRoleDispatcher: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'var(--fs)', color: 'var(--mut)' }}>
        Authenticating session...
      </div>
    );
  }
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === 'patient') {
    return <Navigate to="/patient-portal" replace />;
  }
  if (user.role === 'lab_technician') {
    return <Navigate to="/lab-intake" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

/**
 * Protected Route Wrapper enforcing authentication and role-based permissions
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', fontFamily: 'var(--fs)', color: 'var(--mut)' }}>
        Verifying authorization credentials...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect unauthorized persona to their own landing workspace
    if (user.role === 'patient') return <Navigate to="/patient-portal" replace />;
    if (user.role === 'lab_technician') return <Navigate to="/lab-intake" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'var(--fs)', color: 'var(--mut)' }}>
            Loading Swasthya Sense...
          </div>
        }
      >
        <Routes>
          {/* Main Clinical System with Navigation Chrome */}
          <Route element={<WizardLayout />}>
            {/* 1. Contextual Home Page Dispatcher according to Persona */}
            <Route path="/" element={<RootRoleDispatcher />} />

            {/* 2. Doctor: Worklist Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['doctor']}>
                  <ClinicalWorklistPage />
                </ProtectedRoute>
              }
            />

            {/* 3. Patient: Next Visit Date & Prescribed Practices */}
            <Route
              path="/patient-portal"
              element={
                <ProtectedRoute allowedRoles={['patient', 'doctor']}>
                  <PatientPortalPage />
                </ProtectedRoute>
              }
            />

            {/* 4. Lab Tech: Ingest Reports & Upsert Records */}
            <Route
              path="/lab-intake"
              element={
                <ProtectedRoute allowedRoles={['lab_technician', 'doctor']}>
                  <LabIntakePage />
                </ProtectedRoute>
              }
            />

            {/* 5. Doctor: Consultation Station & 3D Heart Twin */}
            <Route
              path="/doctor-consultation"
              element={
                <ProtectedRoute allowedRoles={['doctor']}>
                  <DoctorConsultationPage />
                </ProtectedRoute>
              }
            />

            {/* 6. Supabase Login & Account Portal (Accessible by all) */}
            <Route path="/login" element={<AuthPage />} />

            {/* 7. Audit Trail & Governance Log */}
            <Route
              path="/audit"
              element={
                <ProtectedRoute allowedRoles={['doctor']}>
                  <AuditGovernancePage />
                </ProtectedRoute>
              }
            />

            {/* 8. Stepper Views */}
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/enter-data" element={<DataEntryPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/model-info" element={<ModelInfoPage />} />
            <Route path="/design-system" element={<DesignSystemPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>

          {/* Standalone Landing Page */}
          <Route element={<LandingLayout />}>
            <Route path="/landing" element={<LandingPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
