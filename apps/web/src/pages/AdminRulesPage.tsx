import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Panel } from '../components/ui';

export interface RuleDefinition {
  rule_id: string;
  version: string;
  title: string;
  description: string;
  cohort: string;
  urgency: 'urgent' | 'soon' | 'routine';
  reason_code: string;
  conditions: Array<{
    analyte: string;
    operator: string;
    threshold: number;
    unit: string;
    lookback_days?: number | null;
  }>;
  patient_explanation: string;
  clinician_summary: string;
  signed_off_by?: string | null;
  signed_off_at?: string | null;
}

const SAMPLE_RULES: RuleDefinition[] = [
  {
    rule_id: 'RULE-TROP-001',
    version: '1.0',
    title: 'Markedly Elevated Cardiac Biomarker',
    description: 'Flags Troponin I values exceeding laboratory standard threshold of 0.04 ng/mL.',
    cohort: 'any',
    urgency: 'urgent',
    reason_code: 'ELEVATED_CARDIAC_MARKER',
    conditions: [{ analyte: 'troponin_i', operator: '>', threshold: 0.04, unit: 'ng/mL' }],
    patient_explanation: 'Your Troponin result was higher than the laboratory standard limit. A clinician needs to review your values urgently.',
    clinician_summary: 'Troponin I > 0.04 ng/mL requires immediate clinical assessment.',
    signed_off_by: 'admin@swasthya.test',
    signed_off_at: '2026-10-31T00:00:00Z',
  },
  {
    rule_id: 'RULE-K-HYPER-001',
    version: '1.0',
    title: 'Severe Serum Potassium Elevation',
    description: 'Flags serum potassium levels at or above 5.5 mEq/L.',
    cohort: 'any',
    urgency: 'urgent',
    reason_code: 'HIGH_SERUM_POTASSIUM',
    conditions: [{ analyte: 'potassium', operator: '>=', threshold: 5.5, unit: 'mEq/L' }],
    patient_explanation: 'Your potassium level is higher than the laboratory safe range. Prompt clinical review is recommended.',
    clinician_summary: 'Potassium >= 5.5 mEq/L indicates acute hyperkalemia tier urgency.',
    signed_off_by: 'admin@swasthya.test',
    signed_off_at: '2026-10-31T00:00:00Z',
  },
  {
    rule_id: 'RULE-SBP-CRIT-001',
    version: '1.0',
    title: 'Critical Systolic Blood Pressure Elevation',
    description: 'Flags systolic blood pressure readings at or above 180 mmHg.',
    cohort: 'any',
    urgency: 'urgent',
    reason_code: 'CRITICAL_SYSTOLIC_BP',
    conditions: [{ analyte: 'systolic_bp', operator: '>=', threshold: 180.0, unit: 'mmHg' }],
    patient_explanation: 'Your systolic blood pressure reading is substantially above 180 mmHg. Urgent medical evaluation is advised.',
    clinician_summary: 'Systolic BP >= 180 mmHg meets urgent escalation threshold.',
    signed_off_by: 'admin@swasthya.test',
    signed_off_at: '2026-10-31T00:00:00Z',
  },
  {
    rule_id: 'RULE-WT-JUMP-001',
    version: '1.0',
    title: 'Rapid Weight Increase',
    description: 'Flags body weight increase of 2.0 kg or more within a short observation window.',
    cohort: 'cohort_c',
    urgency: 'urgent',
    reason_code: 'RAPID_WEIGHT_INCREASE',
    conditions: [{ analyte: 'body_weight', operator: 'delta_gte', threshold: 2.0, unit: 'kg', lookback_days: 3 }],
    patient_explanation: 'Your recorded weight increased by 2 kg or more in a few days. Your care team needs to check your fluid balance urgently.',
    clinician_summary: 'Weight gain >= 2.0 kg in <= 3 days requires rapid clinical check-in.',
    signed_off_by: null,
    signed_off_at: null,
  },
];

export const AdminRulesPage: React.FC = () => {
  const [rules, setRules] = useState<RuleDefinition[]>(SAMPLE_RULES);
  const [selectedRule, setSelectedRule] = useState<RuleDefinition | null>(null);

  const handleSignOff = (ruleId: string) => {
    setRules((prev) =>
      prev.map((r) =>
        r.rule_id === ruleId
          ? {
              ...r,
              signed_off_by: 'admin@swasthya.test',
              signed_off_at: new Date().toISOString(),
            }
          : r
      )
    );
  };

  return (
    <AppLayout title="Clinical Rules & Governance">
      <Panel className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="type-section-heading">Versioned Rule Catalog & Governance</h3>
          <span className="font-mono text-xs text-mut">{rules.length} Rules Defined</span>
        </div>
        <p className="type-body text-mut">
          Clinical rules categorize report values into transparent urgency tiers (Urgent, Soon, Routine).
          Strict governance: rules cannot execute in production without a verified sign-off signature.
        </p>
      </Panel>

      {/* Rules Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-700">
              <tr>
                <th className="p-3">Rule ID & Version</th>
                <th className="p-3">Title & Reason Code</th>
                <th className="p-3">Cohort</th>
                <th className="p-3">Urgency Tier</th>
                <th className="p-3">Sign-Off Governance</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {rules.map((rule) => {
                const isSigned = Boolean(rule.signed_off_by);
                const urgencyColor =
                  rule.urgency === 'urgent'
                    ? 'text-rose-400 border-rose-800 bg-rose-950/60'
                    : rule.urgency === 'soon'
                    ? 'text-amber-400 border-amber-800 bg-amber-950/60'
                    : 'text-emerald-400 border-emerald-800 bg-emerald-950/60';

                return (
                  <tr key={rule.rule_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono font-semibold text-white whitespace-nowrap">
                      {rule.rule_id}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">v{rule.version}</span>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-200">{rule.title}</div>
                      <div className="text-[10px] font-mono text-slate-400">{rule.reason_code}</div>
                    </td>
                    <td className="p-3 font-mono text-slate-400">{rule.cohort}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wider ${urgencyColor}`}>
                        {rule.urgency}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {isSigned ? (
                        <div className="flex items-center gap-1 text-emerald-400 text-[11px]">
                          <span>✓ Signed Off</span>
                          <span className="text-slate-500 font-mono text-[10px]">({rule.signed_off_by})</span>
                        </div>
                      ) : (
                        <span className="text-amber-400 text-[11px] font-medium">⚠️ Pending Sign-Off</span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => setSelectedRule(rule)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
                      >
                        Inspect
                      </button>
                      {!isSigned && (
                        <button
                          onClick={() => handleSignOff(rule.rule_id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium"
                        >
                          Sign Off
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail / Inspection Modal */}
      {selectedRule && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="font-mono text-xs text-cyan-400 font-bold">{selectedRule.rule_id} v{selectedRule.version}</span>
                <h4 className="text-sm font-semibold text-white">{selectedRule.title}</h4>
              </div>
              <button
                onClick={() => setSelectedRule(null)}
                className="text-slate-400 hover:text-white text-base"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Description:</span>
                <p className="text-slate-300">{selectedRule.description}</p>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold mb-1">Trigger Condition:</span>
                <div className="bg-slate-950 p-2 rounded font-mono text-[11px] text-cyan-300">
                  {selectedRule.conditions.map((c, i) => (
                    <div key={i}>
                      {c.analyte} {c.operator} {c.threshold} {c.unit}
                      {c.lookback_days && ` (lookback: ${c.lookback_days} days)`}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Patient Explanation (Class 6, No Diagnosis):</span>
                <p className="text-slate-300 bg-slate-950/60 p-2 rounded">{selectedRule.patient_explanation}</p>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold mb-0.5">Clinician Summary:</span>
                <p className="text-cyan-200 bg-slate-950/60 p-2 rounded font-mono text-[11px]">{selectedRule.clinician_summary}</p>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3 flex justify-end">
              <button
                onClick={() => setSelectedRule(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};
