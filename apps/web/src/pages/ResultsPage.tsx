import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWizardStore } from '../store/useWizardStore';
import { usePatientStore } from '../store/usePatientStore';
import { HeartCanvas } from '../components/3d/HeartCanvas';
import { ColorScaleLegend } from '../components/results/ColorScaleLegend';
import { VesselCard } from '../components/results/VesselCard';
import { FactorsList } from '../components/results/FactorsList';
import { RiskLabel } from '../components/ui/RiskLabel';
import { PrimaryButton } from '../components/ui/PrimaryButton';
import { Panel } from '../components/ui/Panel';

export const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    prediction,
    shapResult,
    inputs,
    markStepCompleted,
  } = useWizardStore();

  const [isLeaving, setIsLeaving] = useState(false);
  const leaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current !== null) {
        window.clearTimeout(leaveTimerRef.current);
      }
    };
  }, []);

  // Two-way synchronization with 3D model
  const activeVesselFocus = usePatientStore((s) => s.activeVesselFocus);
  const activeRole = usePatientStore((s) => s.activeRole);
  const setActiveRole = usePatientStore((s) => s.setActiveRole);
  const setVesselFocus = (focus: string) => {
    useWizardStore.getState().setVesselFocus(focus);
  };

  // If no prediction exists, provide a simple redirect
  if (!prediction) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-[480px] mx-auto">
        <Panel className="flex flex-col items-center gap-4 p-6">
          <h2
            style={{
              fontFamily: 'var(--fs)',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--ink)',
              margin: 0,
            }}
          >
            No results yet
          </h2>
          <p
            style={{
              fontFamily: 'var(--fs)',
              fontSize: '13px',
              color: 'var(--mut)',
              margin: 0,
            }}
          >
            Please enter patient clinical measurements to generate the risk assessment.
          </p>
          <PrimaryButton onClick={() => navigate('/enter-data')}>
            Enter clinical data
          </PrimaryButton>
        </Panel>
      </div>
    );
  }

  const cadProb = prediction.overall_cad?.probability ?? 0;
  const cadProbFormatted = `${Math.round(cadProb * 100)}%`;

  // Synchronize 3D selection
  const handleSelectVessel = (vesselId: 'vessel_LAD' | 'vessel_LCX' | 'vessel_RCA') => {
    if (activeVesselFocus === vesselId) {
      setVesselFocus('default');
    } else {
      setVesselFocus(vesselId);
    }
  };

  // Features list based on active vessel
  const currentFeatures = useMemo(() => {
    if (!shapResult) return [];
    if (activeVesselFocus === 'vessel_LAD') return shapResult.lad?.top_features || [];
    if (activeVesselFocus === 'vessel_LCX') return shapResult.lcx?.top_features || [];
    if (activeVesselFocus === 'vessel_RCA') return shapResult.rca?.top_features || [];
    return shapResult.cad?.top_features || [];
  }, [shapResult, activeVesselFocus]);

  const handleCreateReports = () => {
    if (isLeaving) return;
    setIsLeaving(true);
    markStepCompleted(3);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      navigate('/reports', { state: { paperFeed: true } });
      return;
    }

    leaveTimerRef.current = window.setTimeout(() => {
      navigate('/reports', { state: { paperFeed: true } });
    }, 300);
  };

  return (
    <div className={`w-full flex-1 pb-12 ${isLeaving ? 'leaving' : ''}`}>
      {/* Two columns: grid-template-columns minmax(0,5fr) minmax(0,6fr), gap 14px, stacked under 768px */}
      <div
        className="grid grid-cols-1 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-[14px] items-start"
        style={{
          display: 'grid',
          gap: '14px',
        }}
      >
        {/* LEFT, one Panel (class wipe results-panel-0, --i 0) with EXISTING 3D canvas mounted unchanged */}
        {activeRole === 'clinician' ? (
          <Panel
            className="wipe results-panel-0 flex flex-col w-full"
            style={{
              '--i': 0,
              padding: '12px 14px',
            } as React.CSSProperties}
          >
            <div
              style={{
                width: '100%',
                height: '480px',
                backgroundColor: 'var(--panel)',
                borderRadius: '3px',
                overflow: 'hidden',
                position: 'relative',
                isolation: 'isolate',
                zIndex: 1,
              }}
            >
              <HeartCanvas />
            </div>

            {/* 3-column legend: 3px bar in risk color above 11px --mut label */}
            <ColorScaleLegend />
          </Panel>
        ) : (
          <Panel
            className="wipe results-panel-0 flex flex-col w-full items-center justify-center text-center p-8"
            style={{
              '--i': 0,
              padding: '24px',
              minHeight: '480px',
            } as React.CSSProperties}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--hov)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                marginBottom: '16px',
              }}
            >
              🩺
            </div>
            <h3
              style={{
                fontFamily: 'var(--fs)',
                fontSize: '17px',
                fontWeight: 600,
                color: 'var(--ink)',
                margin: '0 0 8px 0',
              }}
            >
              Clinician Decision Support Gate
            </h3>
            <p
              style={{
                fontFamily: 'var(--fs)',
                fontSize: '13px',
                color: 'var(--mut)',
                maxWidth: '380px',
                margin: '0 0 16px 0',
                lineHeight: 1.5,
              }}
            >
              The interactive 3D coronary twin and localized TreeSHAP hemodynamic attributions are restricted to authorized medical officers.
            </p>
            <div
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: 'var(--hov)',
                color: 'var(--mut)',
                marginBottom: '16px',
              }}
            >
              Active role: <strong style={{ color: 'var(--ink)', textTransform: 'capitalize' }}>{activeRole}</strong>
            </div>
            <button
              onClick={() => setActiveRole('clinician')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--bds)',
                backgroundColor: 'var(--panel)',
                color: 'var(--acc)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Switch to Clinician Mode
            </button>
          </Panel>
        )}

        {/* RIGHT column (flex column, gap 10px, min-width 0) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minWidth: 0,
            width: '100%',
          }}
        >
          {/* 1) Panel (wipe results-panel-1, --i 1): label "Coronary artery disease", CAD prob 40px/500 + RiskLabel, caption */}
          <Panel
            className="wipe results-panel-1 flex flex-col"
            style={{
              '--i': 1,
              padding: '12px 14px',
            } as React.CSSProperties}
          >
            <div className="flex items-center justify-between">
              <span
                style={{
                  fontFamily: 'var(--fs)',
                  fontSize: '12px',
                  color: 'var(--mut)',
                }}
              >
                Overall Perfusion Adequacy Index
              </span>
              <span
                style={{
                  fontFamily: 'var(--fs)',
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  backgroundColor: 'var(--hov)',
                  color: 'var(--mut)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Prototype Decision Support
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                margin: '4px 0 2px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--fm)',
                  fontSize: '40px',
                  lineHeight: '1.05',
                  fontWeight: 500,
                  color: 'var(--ink)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {cadProbFormatted}
              </span>
              <RiskLabel
                probability={cadProb}
                afterNumber
              />
            </div>

            <span
              style={{
                fontFamily: 'var(--fs)',
                fontSize: '11px',
                color: 'var(--mut)',
              }}
            >
              Predicted probability
            </span>
          </Panel>

          {/* 2) Panel (wipe results-panel-2, --i 2, padding 4px 2px) containing three vessel rows (LAD, LCX, RCA) */}
          <Panel
            className="wipe results-panel-2 flex flex-col"
            style={{
              '--i': 2,
              padding: '4px 2px',
            } as React.CSSProperties}
          >
            <VesselCard
              vesselKey="lad"
              vesselCode="LAD"
              fullName="Left anterior descending"
              prediction={prediction.vessels?.lad}
              isSelected={activeVesselFocus === 'vessel_LAD'}
              onSelect={() => handleSelectVessel('vessel_LAD')}
              animationIndex={2}
            />
            <VesselCard
              vesselKey="lcx"
              vesselCode="LCX"
              fullName="Left circumflex"
              prediction={prediction.vessels?.lcx}
              isSelected={activeVesselFocus === 'vessel_LCX'}
              onSelect={() => handleSelectVessel('vessel_LCX')}
              animationIndex={3}
            />
            <VesselCard
              vesselKey="rca"
              vesselCode="RCA"
              fullName="Right coronary"
              prediction={prediction.vessels?.rca}
              isSelected={activeVesselFocus === 'vessel_RCA'}
              onSelect={() => handleSelectVessel('vessel_RCA')}
              animationIndex={4}
            />
          </Panel>

          {/* 3) Panel (wipe results-panel-3, --i 3): Factors influencing this result */}
          <Panel
            className="wipe results-panel-3"
            style={{
              '--i': 3,
              padding: '12px 14px',
            } as React.CSSProperties}
          >
            <FactorsList features={currentFeatures} inputs={inputs} />
          </Panel>

          {/* 4) Primary Button "Create reports" (wipe, --i 4) aligned left */}
          <div
            className="wipe"
            style={{
              '--i': 4,
              display: 'flex',
              justifyContent: 'flex-start',
            } as React.CSSProperties}
          >
            <PrimaryButton
              id="create-reports-button"
              size="lg"
              disabled={isLeaving}
              onClick={handleCreateReports}
            >
              Create reports
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
