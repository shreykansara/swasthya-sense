import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  className = '',
  style,
  ...props
}) => {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{
        width,
        height,
        backgroundColor: 'var(--bd)',
        ...style,
      }}
      {...props}
    />
  );
};
