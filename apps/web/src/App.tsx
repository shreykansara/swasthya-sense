/**
 * Swasthya Sense: Early Warning & Follow-Up Platform for High-Risk Patients
 * Integrated with Perfusion3D Spatial Coronary Twin
 * Multimodal AI Hackathon 2026 - Problem 2
 */

import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WizardLayout } from './components/layout/WizardLayout';
import { LandingLayout } from './components/layout/LandingLayout';

// Core Swasthya Sense Clinical Workspaces
import { ClinicalWorklistPage } from './pages/ClinicalWorklistPage';
import { LabIntakePage } from './pages/LabIntakePage';
import { DoctorConsultationPage } from './pages/DoctorConsultationPage';
import { AuditGovernancePage } from './pages/AuditGovernancePage';

// Clinical Assessment Stepper (Perfusion3D)
import { WelcomePage } from './pages/WelcomePage';
import { DataEntryPage } from './pages/DataEntryPage';
import { ReportsPage } from './pages/ReportsPage';
import { ModelInfoPage } from './pages/ModelInfoPage';
import { DesignSystemPage } from './pages/DesignSystemPage';

// Lazy-loaded views
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const ResultsPage = React.lazy(() => import('./pages/ResultsPage'));

export const App: React.FC = () => {
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
            {/* 1. Frontline Triage & Follow-up Worklist (Default root view) */}
            <Route path="/" element={<ClinicalWorklistPage />} />
            <Route path="/dashboard" element={<ClinicalWorklistPage />} />

            {/* 2. Lab Technician Station (Upload Report & Create Profile) */}
            <Route path="/lab-intake" element={<LabIntakePage />} />

            {/* 3. Doctor's 3D Consultation Station (3D Twin & Manual Opinion) */}
            <Route path="/doctor-consultation" element={<DoctorConsultationPage />} />

            {/* 4. Audit Trail & Simulated Messaging Simulator */}
            <Route path="/audit" element={<AuditGovernancePage />} />

            {/* 5. Classic Clinical Assessment Stepper */}
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
