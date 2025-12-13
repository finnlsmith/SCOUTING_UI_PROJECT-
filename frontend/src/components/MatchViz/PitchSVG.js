import React from "react";

/**
 * Reusable SVG component for rendering a soccer pitch
 */
export default function PitchSVG({ 
  children, 
  viewBox = "0 0 120 80",
  highlightAttackingBox = null, // 'left' or 'right' to highlight a penalty box
  className = ""
}) {
  return (
    <svg viewBox={viewBox} className={className}>
      {/* Pitch outline */}
      <rect x="0" y="0" width="120" height="80" fill="#f9f9f9" stroke="#888" strokeWidth="0.5" />
      
      {/* Half line */}
      <line x1="60" y1="0" x2="60" y2="80" stroke="#888" strokeWidth="0.5" />
      
      {/* Penalty boxes (18-yard) */}
      <rect
        x="0"
        y="18"
        width="18"
        height="44"
        fill={highlightAttackingBox === 'left' ? "rgba(255, 200, 200, 0.3)" : "none"}
        stroke="#888"
        strokeWidth={highlightAttackingBox === 'left' ? "0.8" : "0.5"}
      />
      <rect
        x="102"
        y="18"
        width="18"
        height="44"
        fill={highlightAttackingBox === 'right' ? "rgba(255, 200, 200, 0.3)" : "none"}
        stroke="#888"
        strokeWidth={highlightAttackingBox === 'right' ? "0.8" : "0.5"}
      />
      
      {/* 6-yard boxes */}
      <rect x="0" y="30" width="6" height="20" fill="none" stroke="#888" strokeWidth="0.5" />
      <rect x="114" y="30" width="6" height="20" fill="none" stroke="#888" strokeWidth="0.5" />
      
      {/* Penalty spots */}
      <circle cx="12" cy="40" r="0.8" fill="#888" />
      <circle cx="108" cy="40" r="0.8" fill="#888" />
      
      {/* Goal indicators */}
      <rect x="0" y="36" width="0.5" height="8" fill="#333" stroke="#333" strokeWidth="0.3" />
      <rect x="119.5" y="36" width="0.5" height="8" fill="#333" stroke="#333" strokeWidth="0.3" />
      
      {children}
    </svg>
  );
}

