import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, title }) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { theme, toggleTheme } = useAppStore();

  const handleSignOut = () => {
    signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col">
      {/* Prototype Disclaimer Banner */}
      <div className="w-full bg-mod/20 border-b border-mod/30 text-mod px-4 py-1.5 text-xs font-mono text-center flex items-center justify-center gap-2">
        <span>⚠️</span>
        <span className="font-semibold">PROTOTYPE — SYNTHETIC DATA ONLY — NOT A MEDICAL DEVICE</span>
      </div>

      {/* Main Header */}
      <header className="border-b border-bd bg-panel px-4 py-2.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-acc animate-pulse" />
          <span className="font-semibold text-sm tracking-tight hidden sm:inline">Swasthya Sense</span>
          <span className="text-bd hidden sm:inline">/</span>
          <h2 className="text-sm font-medium text-ink">{title}</h2>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-acc/10 text-acc border border-acc/20 uppercase tracking-wide">
                {user.role.replace('_', ' ')}
              </span>
              <span className="font-mono text-xs text-mut hidden md:inline">
                {user.maskedId}
              </span>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded border border-bd hover:bg-hov text-xs transition-colors"
            title="Toggle Light/Dark Theme"
          >
            {theme === 'dark' ? '☀' : '🌙'}
          </button>

          <button
            onClick={handleSignOut}
            className="px-2.5 py-1 rounded border border-bd hover:bg-high/10 hover:border-high/30 hover:text-high text-xs transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Page Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 flex flex-col gap-4">
        {children}
      </main>

      <footer className="border-t border-bd py-3 px-4 text-center type-caption text-mut">
        Swasthya Sense Prototype &bull; Role-Based Gated System &bull; Synthetic Data Only
      </footer>
    </div>
  );
};
