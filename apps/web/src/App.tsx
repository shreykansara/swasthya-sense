import React from 'react';
import { Panel, WaterfallChart } from './components/ui';
import { useAppStore } from './store/useAppStore';

export const App: React.FC = () => {
  const { theme, toggleTheme } = useAppStore();

  const demoFactors = [
    { id: '1', label: 'Systolic Blood Pressure', value: '165 mmHg', direction: 'elevates' as const, magnitude: 0.8 },
    { id: '2', label: 'Serum Creatinine', value: '1.4 mg/dL', direction: 'elevates' as const, magnitude: 0.6 },
    { id: '3', label: 'Potassium', value: '4.2 mEq/L', direction: 'lowers' as const, magnitude: 0.1 },
  ];

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col">
      {/* Prototype Disclaimer Banner */}
      <div className="w-full bg-mod/20 border-b border-mod/30 text-mod px-4 py-2 text-xs font-mono text-center flex items-center justify-center gap-2">
        <span>⚠️</span>
        <span className="font-semibold">PROTOTYPE — SYNTHETIC DATA ONLY — NOT A MEDICAL DEVICE</span>
      </div>

      {/* Header */}
      <header className="border-b border-bd bg-panel px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-acc animate-pulse" />
          <h1 className="font-semibold font-sans text-base tracking-tight">Swasthya Sense</h1>
          <span className="type-caption px-2 py-0.5 rounded bg-bd/50 text-mut">v0.1.0</span>
        </div>

        <button
          onClick={toggleTheme}
          className="type-caption px-3 py-1.5 rounded border border-bd hover:bg-hov transition-colors"
          aria-label="Toggle visual theme"
        >
          {theme === 'dark' ? '☀ Light' : '🌙 Dark'}
        </button>
      </header>

      {/* Main Content (Themed Blank Container / Scaffolding) */}
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 flex flex-col gap-4">
        <Panel className="flex flex-col gap-2">
          <h2 className="type-section-heading">System Initialized</h2>
          <p className="type-body text-mut">
            Frontend scaffolding and design tokens loaded. Ready for Supabase authentication and role-based workflows.
          </p>
        </Panel>

        <Panel>
          <WaterfallChart
            title="Rule Contribution Waterfall Preview"
            factors={demoFactors}
          />
        </Panel>
      </main>

      <footer className="border-t border-bd py-3 px-4 text-center type-caption text-mut">
        Swasthya Sense Prototype &bull; Mobile-First Clinical Follow-up Engine
      </footer>
    </div>
  );
};

export default App;
