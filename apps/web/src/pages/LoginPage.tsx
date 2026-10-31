import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel } from '../components/ui';
import { useAuthStore, AppRole, DEMO_USERS, ROLE_HOME_PATHS } from '../store/useAuthStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signInDemoRole, error, clearError, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await signIn(email, password);
    if (success) {
      const user = useAuthStore.getState().user;
      if (user) {
        navigate(ROLE_HOME_PATHS[user.role]);
      }
    }
  };

  const handleRoleQuickSelect = (role: AppRole) => {
    clearError();
    signInDemoRole(role);
    navigate(ROLE_HOME_PATHS[role]);
  };

  return (
    <div className="min-h-screen bg-page flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full flex flex-col gap-5">
        {/* Header Branding */}
        <div className="text-center flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-3 h-3 rounded-full bg-acc animate-pulse" />
            <span className="type-caption uppercase tracking-wider text-mut">Secure Portal</span>
          </div>
          <h1 className="type-page-title text-2xl font-semibold">Swasthya Sense</h1>
          <p className="type-caption text-mut">
            Cardiac Follow-Up & Early-Warning Clinical Workflow
          </p>
        </div>

        {/* Prototype Notice */}
        <div className="bg-mod/10 border border-mod/30 rounded p-3 text-xs text-mod text-center font-mono">
          ⚠️ PROTOTYPE — SYNTHETIC DATA ONLY — NOT A MEDICAL DEVICE
        </div>

        {/* Login Form */}
        <Panel className="flex flex-col gap-4">
          <h2 className="type-section-heading">Sign In to Your Workspace</h2>

          {error && (
            <div className="p-2.5 rounded bg-high/10 border border-high/30 text-high text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="type-label block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. clinician@swasthya.test"
                className="w-full px-3 py-2.5 rounded border border-bd bg-page text-ink text-sm focus:outline-none focus:border-acc"
              />
            </div>

            <div>
              <label className="type-label block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded border border-bd bg-page text-ink text-sm focus:outline-none focus:border-acc"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-1 py-2.5 px-4 rounded bg-acc text-onacc font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </Panel>

        {/* Demo Quick-Select Cards for all 5 roles */}
        <div className="flex flex-col gap-2">
          <span className="type-caption text-mut text-center">
            Or test instantly using a pre-configured role persona:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(Object.keys(DEMO_USERS) as AppRole[]).map((role) => {
              const u = DEMO_USERS[role];
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleQuickSelect(role)}
                  className="p-3 text-left rounded border border-bd bg-panel hover:bg-hov transition-colors flex flex-col gap-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-acc capitalize">
                      {role.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-[10px] text-mut">{u.maskedId}</span>
                  </div>
                  <span className="text-sm font-medium text-ink truncate">{u.displayName}</span>
                  <span className="text-[11px] text-mut truncate">{u.email}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
