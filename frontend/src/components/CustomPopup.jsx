import React from 'react';
import { ShieldAlert, ShieldX, Info, CheckCircle2 } from 'lucide-react';

/**
 * CustomPopup Component
 * Renders a premium, animated glassmorphic modal overlay for notices, warnings, and alerts.
 * 
 * @param {object} props
 * @param {boolean} props.isOpen True if the popup should display
 * @param {string} props.title The title header text of the popup
 * @param {string} props.message The body message text
 * @param {'info'|'warning'|'error'|'success'} props.type The notification type classification
 * @param {string} [props.confirmText] Custom button text (defaults to 'Dismiss')
 * @param {function} props.onClose Callback handler triggered when the dismiss button is clicked
 */
export default function CustomPopup({
  isOpen,
  title,
  message,
  type = 'info',
  confirmText = 'Dismiss',
  onClose
}) {
  if (!isOpen) return null;

  let Icon = Info;
  let accentColor = '#60a5fa'; // info blue
  let iconBackground = 'rgba(96, 165, 250, 0.1)';

  if (type === 'warning') {
    Icon = ShieldAlert;
    accentColor = '#fbbf24'; // warning amber
    iconBackground = 'rgba(251, 191, 36, 0.1)';
  } else if (type === 'error') {
    Icon = ShieldX;
    accentColor = '#f87171'; // error red
    iconBackground = 'rgba(248, 113, 113, 0.1)';
  } else if (type === 'success') {
    Icon = CheckCircle2;
    accentColor = '#34d399'; // success green
    iconBackground = 'rgba(52, 211, 153, 0.1)';
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(9, 9, 11, 0.85)',
      backdropFilter: 'blur(16px)',
      zIndex: 3000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      boxSizing: 'border-box'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '400px',
        width: '100%',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(20px)',
        border: `1.5px solid ${accentColor}2b`,
        borderRadius: '24px',
        padding: '2rem',
        textAlign: 'center',
        boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 40px ${accentColor}12`,
        animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>
        {/* Type Icon */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: iconBackground,
          color: accentColor,
          marginBottom: '1.5rem',
          border: `1px solid ${accentColor}22`
        }}>
          <Icon size={32} />
        </div>

        {/* Text Details */}
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: 800,
          margin: '0 0 0.75rem 0',
          fontFamily: 'var(--font-display)',
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          {title}
        </h3>
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-sans)',
          lineHeight: '1.5',
          margin: '0 0 2rem 0'
        }}>
          {message}
        </p>

        {/* Dismiss Trigger */}
        <button
          className="btn btn-primary"
          onClick={onClose}
          style={{
            width: '100%',
            background: `linear-gradient(135deg, ${accentColor}e6, ${accentColor})`,
            boxShadow: `0 4px 14px 0 ${accentColor}25`,
            border: 'none',
            padding: '0.75rem 0',
            borderRadius: '12px',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            cursor: 'pointer',
            color: '#fff',
            transition: 'transform 0.15s ease'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          {confirmText}
        </button>
      </div>
    </div>
  );
}
