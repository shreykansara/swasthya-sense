import React, { useState } from 'react';
import { WaterfallChart, ContributionFactor } from './ui/WaterfallChart';
import { Panel } from './ui/Panel';

export interface RuleContributionData {
  analyte: string;
  current_value: number;
  baseline_value?: number | null;
  threshold: number;
  unit: string;
  delta?: number | null;
  divergence_score: number;
  summary: string;
}

export interface CaseFlagData {
  id: string;
  patient_id: string;
  upload_id?: string | null;
  urgency: 'urgent' | 'soon' | 'routine';
  rule_id: string;
  rule_version: string;
  reason_code: string;
  contributions: RuleContributionData[];
  patient_explanation: string;
  clinician_summary: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'overridden';
  clinician_override?: {
    clinician_id: string;
    new_urgency: string;
    reason: string;
    overridden_at: string;
  } | null;
}

export interface WhyFlaggedCardProps {
  flag: CaseFlagData;
  isClinician?: boolean;
  onOverride?: (flagId: string, newUrgency: 'urgent' | 'soon' | 'routine', reason: string) => void;
}

export const WhyFlaggedCard: React.FC<WhyFlaggedCardProps> = ({
  flag,
  isClinician = false,
  onOverride,
}) => {
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideUrgency, setOverrideUrgency] = useState<'urgent' | 'soon' | 'routine'>('soon');
  const [overrideReason, setOverrideReason] = useState('');

  // Map rule contributions to WaterfallChart factors
  const factors: ContributionFactor[] = flag.contributions.map((c, idx) => ({
    id: `${flag.id}-${c.analyte}-${idx}`,
    label: c.analyte,
    value: `${c.current_value} ${c.unit} (Limit: ${c.threshold} ${c.unit})`,
    direction: c.divergence_score > 0 ? 'elevates' : 'lowers',
    magnitude: Math.abs(c.divergence_score),
  }));

  const handleSaveOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      alert('A valid reason is required for clinician override.');
      return;
    }
    if (onOverride) {
      onOverride(flag.id, overrideUrgency, overrideReason);
      setShowOverrideForm(false);
      setOverrideReason('');
    }
  };

  const urgencyBadgeColor =
    flag.urgency === 'urgent'
      ? 'bg-rose-950 text-rose-300 border-rose-800'
      : flag.urgency === 'soon'
      ? 'bg-amber-950 text-amber-300 border-amber-800'
      : 'bg-emerald-950 text-emerald-300 border-emerald-800';

  return (
    <Panel className="flex flex-col gap-3 border-slate-800">
      {/* Prototype Banner */}
      <div className="bg-amber-950/40 border border-amber-800/60 rounded px-2.5 py-1 text-[11px] text-amber-200 flex items-center justify-between">
        <span>PROTOTYPE — Synthetic Data — Not a Medical Device</span>
        <span className="font-mono text-[10px] text-amber-400">{flag.rule_id} {flag.rule_version}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div>
          <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider">
            Clinical Urgency Flag
          </span>
          <h4 className="text-sm font-semibold text-white">{flag.reason_code}</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${urgencyBadgeColor} uppercase tracking-wider`}>
            {flag.urgency}
          </span>
          {flag.status === 'overridden' && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
              Overridden
            </span>
          )}
        </div>
      </div>

      {/* Why Flagged Waterfall Chart */}
      <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/80">
        <WaterfallChart
          title="Why Flagged (Rule Contribution Waterfall)"
          factors={factors}
        />
      </div>

      {/* Narrative Explanations */}
      <div className="space-y-2 text-xs">
        <div className="bg-slate-900/80 rounded p-2.5 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
            Patient Explanation (Class 6 Reading Level, No Diagnosis):
          </span>
          <p className="text-slate-300">{flag.patient_explanation}</p>
        </div>

        <div className="bg-slate-900/80 rounded p-2.5 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 block mb-0.5">
            Clinician Action Summary:
          </span>
          <p className="text-cyan-300 font-mono text-[11px]">{flag.clinician_summary}</p>
        </div>
      </div>

      {/* Existing Override Audit Notice */}
      {flag.clinician_override && (
        <div className="bg-purple-950/30 border border-purple-900/50 rounded p-2.5 text-xs text-purple-200">
          <span className="font-semibold block text-[11px]">Clinician Override Recorded:</span>
          <p className="mt-0.5 text-[11px]">Reason: &quot;{flag.clinician_override.reason}&quot;</p>
          <span className="text-[10px] text-purple-400 block mt-1 font-mono">
            New urgency: {flag.clinician_override.new_urgency} • At: {flag.clinician_override.overridden_at}
          </span>
        </div>
      )}

      {/* Clinician Override Controls */}
      {isClinician && !flag.clinician_override && (
        <div className="border-t border-slate-800 pt-2">
          {!showOverrideForm ? (
            <button
              onClick={() => setShowOverrideForm(true)}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              <span>⚙️</span>
              <span>Record Clinician Override</span>
            </button>
          ) : (
            <form onSubmit={handleSaveOverride} className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2.5">
              <div className="text-xs font-semibold text-white">Record Urgency Tier Override</div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">New Urgency Tier</label>
                <select
                  value={overrideUrgency}
                  onChange={(e) => setOverrideUrgency(e.target.value as 'urgent' | 'soon' | 'routine')}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded px-2.5 py-1.5 focus:border-cyan-500"
                >
                  <option value="urgent">Urgent</option>
                  <option value="soon">Soon</option>
                  <option value="routine">Routine</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Mandatory Override Reason</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Clinical justification for urgency modification..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded px-2.5 py-1.5 focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs font-medium"
                >
                  Save Override
                </button>
                <button
                  type="button"
                  onClick={() => setShowOverrideForm(false)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </Panel>
  );
};
