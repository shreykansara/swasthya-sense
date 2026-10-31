import React from 'react';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(({
  children,
  className = '',
  style,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`pn ${className}`}
      style={{
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--bd)',
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
});

Panel.displayName = 'Panel';
