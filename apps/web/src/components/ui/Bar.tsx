import React from 'react';

export interface BarProps {
  value: number; // 0.0 to 1.0 (or normalized ratio)
  variant?: 'standard' | 'thin';
  fillColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Bar: React.FC<BarProps> = ({
  value,
  variant = 'standard',
  fillColor = 'var(--acc)',
  className = '',
  style,
}) => {
  const normalizedValue = Math.min(1, Math.max(0, value));
  const percent = `${normalizedValue * 100}%`;
  const isThin = variant === 'thin';

  return (
    <div
      className={`w-full overflow-hidden ${className}`}
      style={{
        height: isThin ? '4px' : '8px',
        backgroundColor: 'var(--bd)',
        borderRadius: '2px',
        position: 'relative',
        ...style,
      }}
    >
      <div
        style={{
          height: '100%',
          width: percent,
          backgroundColor: fillColor,
          transition: 'width 300ms var(--ease-wipe)',
        }}
      />
    </div>
  );
};
