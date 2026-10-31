import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, AppRole, ROLE_HOME_PATHS } from '../../store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to the user's appropriate role home route
    const userHome = ROLE_HOME_PATHS[user.role] || '/login';
    return <Navigate to={userHome} replace />;
  }

  return <>{children}</>;
};
