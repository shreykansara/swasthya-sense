import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Panel } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';

interface ExtractedCell {
  id: string;
  analyteId: string;
  analyteName: string;
  value: number;
  unit: string;
  refLow: number;
  refHigh: number;
  confidence: number;
  flagLowConf: boolean;
  flagOutOfRange: boolean;
  bbox: { x: number; y: number; w: number; h: number };
}

const SAMPLE_EXTRACTED_CELLS: ExtractedCell[] = [
  {
    id: 'e1',
    analyteId: 'systolic_bp',
    analyteName: 'Systolic Blood Pressure',
    value: 148.0,
    unit: 'mmHg',
    refLow: 90.0,
    refHigh: 120.0,
    confidence: 0.99,
    flagLowConf: false,
    flagOutOfRange: true,
    bbox: { x: 35, y: 195, w: 220, h: 22 },
  },
  {
    id: 'e2',
    analyteId: 'diastolic_bp',
    analyteName: 'Diastolic Blood Pressure',
    value: 94.0,
    unit: 'mmHg',
    refLow: 60.0,
    refHigh: 80.0,
    confidence: 0.98,
    flagLowConf: false,
    flagOutOfRange: true,
    bbox: { x: 35, y: 220, w: 220, h: 22 },
  },
  {
    id: 'e3',
    analyteId: 'fasting_glucose',
    analyteName: 'Fasting Blood Sugar',
    value: 118.0,
    unit: 'mg/dL',
    refLow: 70.0,
    refHigh: 100.0,
    confidence: 0.95,
    flagLowConf: false,
    flagOutOfRange: true,
    bbox: { x: 35, y: 245, w: 220, h: 22 },
  },
  {
    id: 'e4',
    analyteId: 'serum_creatinine',
    analyteName: 'Serum Creatinine',
    value: 1.1,
    unit: 'mg/dL',
    refLow: 0.7,
    refHigh: 1.3,
    confidence: 0.88,
    flagLowConf: false,
    flagOutOfRange: false,
    bbox: { x: 35, y: 270, w: 220, h: 22 },
  },
  {
    id: 'e5',
    analyteId: 'potassium',
    analyteName: 'Potassium (K+)',
    value: 4.3,
    unit: 'mEq/L',
    refLow: 3.5,
    refHigh: 5.1,
    confidence: 0.62,
    flagLowConf: true,
    flagOutOfRange: false,
    bbox: { x: 35, y: 295, w: 220, h: 22 },
  },
  {
    id: 'e6',
    analyteId: 'total_cholesterol',
    analyteName: 'Total Cholesterol',
    value: 225.0,
    unit: 'mg/dL',
    refLow: 125.0,
    refHigh: 200.0,
    confidence: 0.92,
    flagLowConf: false,
    flagOutOfRange: true,
    bbox: { x: 35, y: 320, w: 220, h: 22 },
  },
  {
    id: 'e7',
    analyteId: 'ldl_cholesterol',
    analyteName: 'LDL Cholesterol',
    value: 138.0,
    unit: 'mg/dL',
    refLow: 0.0,
    refHigh: 100.0,
    confidence: 0.94,
    flagLowConf: false,
    flagOutOfRange: true,
    bbox: { x: 35, y: 345, w: 220, h: 22 },
  },
];

export const ReportIntakePage: React.FC = () => {
  const { user } = useAuthStore();
  const [selectedCellId, setSelectedCellId] = useState<string>('e1');
  const [values, setValues] = useState<Record<string, number>>({
    systolic_bp: 148.0,
    diastolic_bp: 94.0,
    fasting_glucose: 118.0,
    serum_creatinine: 1.1,
    potassium: 4.3,
    total_cholesterol: 225.0,
    ldl_cholesterol: 138.0,
  });
  const [confirmed, setConfirmed] = useState<boolean>(false);

  const selectedCell = SAMPLE_EXTRACTED_CELLS.find((c) => c.id === selectedCellId);

  const handleValueChange = (analyteId: string, newVal: number) => {
    setValues((prev) => ({ ...prev, [analyteId]: newVal }));
  };

  const handleConfirm = () => {
    setConfirmed(true);
  };

  return (
    <AppLayout title="Report Intake & Human Confirmation">
      <Panel className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="type-section-heading">Laboratory Report Verification</h3>
          <span className="font-mono text-xs text-mut">{user?.maskedId}</span>
        </div>
        <p className="type-body text-mut text-xs">
          Each extracted number links directly to its source bounding box in the report.
          Review and confirm values below. Nothing enters clinical evaluation without human confirmation.
        </p>
      </Panel>

      {/* Confirmation Success Banner */}
      {confirmed && (
        <div className="p-3 rounded bg-low/15 border border-low/30 text-low text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span className="font-semibold">All 7 values confirmed by human reviewer. Audit record created.</span>
          </div>
          <span className="font-mono text-[11px]">Status: READY FOR CLINICIAN</span>
        </div>
      )}

      {/* Two-Pane Mobile-First Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Pane: Report Document Preview with Source Bounding Box */}
        <div className="lg:col-span-6 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="type-label font-medium">Original Document Preview</span>
            <span className="text-[11px] font-mono text-mut">template_A_clean.pdf</span>
          </div>

          <div className="relative rounded border border-bd bg-page overflow-hidden aspect-[8.5/11] max-h-[520px] flex flex-col p-4 shadow-sm select-none">
            {/* Visual Document Mockup */}
            <div className="text-center border-b border-bd/60 pb-2 mb-3">
              <span className="text-[9px] font-mono text-mod font-semibold block">PROTOTYPE — SYNTHETIC DATA ONLY</span>
              <h4 className="text-xs font-bold text-ink mt-1">METRO DIAGNOSTIC LABS</h4>
              <span className="text-[10px] text-mut">Comprehensive Metabolic Profile</span>
            </div>

            <div className="grid grid-cols-2 text-[10px] text-mut border-b border-bd/40 pb-2 mb-3 font-mono">
              <div>Patient: Aarav Sharma</div>
              <div className="text-right">ID: MDL-2026-9812</div>
              <div>Age: 48 Y / M</div>
              <div className="text-right">Date: 28-Oct-2026</div>
            </div>

            {/* Document Table Mock */}
            <div className="flex flex-col text-[11px] font-mono relative">
              <div className="grid grid-cols-[1.6fr_1fr_1.2fr] text-mut border-b border-bd/60 pb-1 text-[10px] font-bold">
                <span>Investigation</span>
                <span className="text-center">Observed</span>
                <span className="text-right">Interval</span>
              </div>

              {SAMPLE_EXTRACTED_CELLS.map((cell) => {
                const isSelected = selectedCellId === cell.id;
                return (
                  <div
                    key={cell.id}
                    onClick={() => setSelectedCellId(cell.id)}
                    className={`grid grid-cols-[1.6fr_1fr_1.2fr] py-1.5 px-1 items-center cursor-pointer rounded transition-all ${
                      isSelected
                        ? 'bg-acc/15 ring-2 ring-acc text-acc font-bold'
                        : 'hover:bg-hov text-ink'
                    }`}
                  >
                    <span className="truncate">{cell.analyteName}</span>
                    <span className="text-center font-bold">
                      {values[cell.analyteId]} {cell.unit}
                    </span>
                    <span className="text-right text-mut text-[10px]">
                      {cell.refLow} - {cell.refHigh}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Active Bounding Box Highlight overlay hint */}
            {selectedCell && (
              <div className="mt-auto pt-2 border-t border-bd text-center">
                <span className="text-[10px] font-mono text-acc">
                  🔗 Linked Source: Page 1 ({selectedCell.analyteName})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Editable Values & Human Confirmation */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="type-label font-medium">Extracted Values Checklist</span>
            <span className="text-[11px] font-mono text-mut">7 Analytes Detected</span>
          </div>

          <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
            {SAMPLE_EXTRACTED_CELLS.map((cell) => {
              const isSelected = selectedCellId === cell.id;
              const curVal = values[cell.analyteId];

              return (
                <Panel
                  key={cell.id}
                  onClick={() => setSelectedCellId(cell.id)}
                  className={`cursor-pointer transition-all border p-3 flex flex-col gap-1.5 ${
                    isSelected ? 'border-acc bg-panel ring-1 ring-acc' : 'border-bd/80 hover:border-bd'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-ink">{cell.analyteName}</span>
                    <div className="flex items-center gap-1.5">
                      {cell.flagLowConf && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-mod/20 text-mod font-mono">
                          Low Conf ({(cell.confidence * 100).toFixed(0)}%)
                        </span>
                      )}
                      {cell.flagOutOfRange && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-high/20 text-high font-mono">
                          Out of Range
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={curVal}
                        disabled={confirmed}
                        onChange={(e) => handleValueChange(cell.analyteId, parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 rounded border border-bd bg-page font-mono text-sm font-semibold text-ink focus:outline-none focus:border-acc"
                      />
                      <span className="text-xs font-mono text-mut">{cell.unit}</span>
                    </div>

                    <span className="text-[11px] font-mono text-mut">
                      Lab Ref: {cell.refLow} - {cell.refHigh}
                    </span>
                  </div>
                </Panel>
              );
            })}
          </div>

          {/* Confirmation Action Button */}
          <button
            type="button"
            disabled={confirmed}
            onClick={handleConfirm}
            className={`w-full py-3 px-4 rounded font-semibold text-sm transition-all ${
              confirmed
                ? 'bg-low/20 text-low border border-low/30 cursor-default'
                : 'bg-acc text-onacc hover:opacity-90'
            }`}
          >
            {confirmed ? '✓ Values Verified & Locked' : 'Confirm & Lock Extracted Values'}
          </button>
        </div>
      </div>
    </AppLayout>
  );
};
