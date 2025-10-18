import React from "react";

// Error banner component
export default function ErrorBanner({ error, onClose }) {
    if (!error) return null;
    return (
      <div style={{
        backgroundColor: '#ffe7e7',
        color: '#b40000',
        border: '1px solid #ffbdbd',
        borderRadius: '6px',
        padding: '12px 30px 12px 16px',
        margin: '16px auto',
        maxWidth: 500,
        position: 'relative',
        textAlign: 'left',
        fontWeight: 500
      }}>
        <span>{error}</span>
        <button
          aria-label="Dismiss error"
          style={{
            position: 'absolute',
            right: 10,
            top: 10,
            background: 'none',
            border: 'none',
            color: '#b40000',
            fontWeight: 'bold',
            fontSize: 20,
            cursor: 'pointer',
          }}
          onClick={onClose}
        >
          ×
        </button>
      </div>
    );
  }