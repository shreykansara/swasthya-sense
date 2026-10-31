import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, ROLE_HOME_PATHS } from './store/useAuthStore';
import { LoginPage } from './pages/LoginPage';
import { PatientHomePage } from './pages/PatientHomePage';
import { ConsentManagementPage } from './pages/ConsentManagementPage';
import { HealthWorkerHomePage } from './pages/HealthWorkerHomePage';
import { ClinicianHomePage } from './pages/ClinicianHomePage';
import { SupervisorHomePage } from './pages/SupervisorHomePage';
import { AdminHomePage } from './pages/AdminHomePage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const RootRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  if (isAuthenticated && user) {
    return <Navigate to={ROLE_HOME_PATHS[user.role]} replace />;
  }
  return <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Role-gated protected routes */}
        <Route
          path="/patient"
          element={
            <ProtectedRoute allowedRoles={['patient']}>
              <PatientHomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patient/consent"
          element={
            <ProtectedRoute allowedRoles={['patient']}>
              <ConsentManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/worker"
          element={
            <ProtectedRoute allowedRoles={['health_worker']}>
              <HealthWorkerHomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clinician"
          element={
            <ProtectedRoute allowedRoles={['clinician']}>
              <ClinicianHomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/supervisor"
          element={
            <ProtectedRoute allowedRoles={['supervisor']}>
              <SupervisorHomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminHomePage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
