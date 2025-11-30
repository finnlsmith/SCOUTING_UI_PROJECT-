import React from 'react';
import './LoadingSkeleton.css';

export function PlotSkeleton() {
  return (
    <div className="skeleton skeleton-plot">
      <div className="skeleton-content">
        Loading visualization...
      </div>
    </div>
  );
}

export function TextSkeleton({ width = '100%', height = '1em' }) {
  return (
    <div 
      className="skeleton skeleton-text"
      style={{ width, height }}
    />
  );
}

export function ButtonSkeleton() {
  return <div className="skeleton skeleton-button" />;
}

export function CardSkeleton() {
  return (
    <div className="skeleton skeleton-card">
      <TextSkeleton width="60%" />
      <TextSkeleton width="80%" />
      <TextSkeleton width="40%" />
    </div>
  );
}

export default function LoadingSkeleton({ type = 'text', ...props }) {
  switch (type) {
    case 'plot':
      return <PlotSkeleton />;
    case 'button':
      return <ButtonSkeleton />;
    case 'card':
      return <CardSkeleton />;
    default:
      return <TextSkeleton {...props} />;
  }
}

