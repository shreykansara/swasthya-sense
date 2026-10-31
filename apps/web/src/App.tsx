/**
 * Swasthya Sense: Early Warning & Follow-Up Platform for High-Risk Patients
 * Multimodal AI Hackathon 2026 - Problem 2
 * Roles: Doctor, Patient, Lab Technician
 */

import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

// Lazy-loaded views
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const ResultsPage = React.lazy(() => import('./pages/ResultsPage'));

/**
 * Route guard dispatching root view based on active Persona:
 * - Patient -> PatientPortalPage
 * - Lab Tech -> LabIntakePage
 * - Doctor -> ClinicalWorklistPage
 */
const RootRoleDispatcher: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  if (user?.role === 'patient') {
    return <PatientPortalPage />;
  }
  if (user?.role === 'lab_technician') {
    return <LabIntakePage />;
  }
  return <ClinicalWorklistPage />;
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
            <Route path="/dashboard" element={<ClinicalWorklistPage />} />

            {/* 2. Persona 2: The Patient Portal (Next Visit Date & Prescribed Practices) */}
            <Route path="/patient-portal" element={<PatientPortalPage />} />

            {/* 3. Persona 3: The Lab Technician Desk (Only and only upload reports & upsert profiles) */}
            <Route path="/lab-intake" element={<LabIntakePage />} />

            {/* 4. Persona 1: The Doctor's Consultation Station & 3D Heart Twin */}
            <Route path="/doctor-consultation" element={<DoctorConsultationPage />} />

            {/* 5. Supabase Login & Account Portal */}
            <Route path="/login" element={<AuthPage />} />

            {/* 6. Audit Trail & Governance Log */}
            <Route path="/audit" element={<AuditGovernancePage />} />

            {/* 7. Classic Stepper Views */}
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
