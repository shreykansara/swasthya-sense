import React from 'react';
import { Bar } from './Bar';

export interface ContributionFactor {
  id: string;
  label: string;
  value: string | number;
  direction: 'elevates' | 'lowers';
  magnitude: number; // 0.0 to 1.0 or absolute score contribution
}

export interface WaterfallChartProps {
  title?: string;
  factors: ContributionFactor[];
  className?: string;
}

export const WaterfallChart: React.FC<WaterfallChartProps> = ({
  title = "Rule Contribution Factors",
  factors,
  className = '',
}) => {
  const maxMag = Math.max(...factors.map((f) => f.magnitude), 0.001);

  return (
    <div className={`w-full ${className}`}>
      {title && (
        <h4 className="type-section-heading text-sm mb-3">
          {title}
        </h4>
      )}

      {factors.length === 0 ? (
        <p className="type-caption text-mut">
          No active contributing factors recorded.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {factors.map((factor) => {
            const isElevating = factor.direction === 'elevates';
            const barColor = isElevating ? 'var(--high)' : 'var(--acc)';
            const directionLabel = isElevating ? 'Elevates urgency' : 'Normal / Low urgency';
            const widthRatio = factor.magnitude / maxMag;

            return (
              <div
                key={factor.id}
                className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs"
              >
                <div className="truncate font-sans text-ink">
                  <span className="font-medium">{factor.label}</span>: {factor.value}
                </div>
                <div
                  className="text-right font-sans"
                  style={{ color: isElevating ? 'var(--high)' : 'var(--mut)' }}
                >
                  {directionLabel}
                </div>
                <div className="col-span-2">
                  <Bar
                    value={widthRatio}
                    variant="thin"
                    fillColor={barColor}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
