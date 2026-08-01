import React from 'react';
import { ShieldAlert, Info, AlertTriangle, EyeOff, Shield, LifeBuoy } from 'lucide-react';

export function LocalPrivacyWarning({ isOpen, onContinue, source }) {
  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={neobrutalistModalStyle}>
        <div style={modalHeaderStyle('var(--color-danger)')}>
          <ShieldAlert size={20} />
          <span>⚠ PRIVACY WARNING</span>
        </div>
        <div style={modalBodyStyle}>
          <p style={warningTitleStyle}>Screenshot/capture activity was detected.</p>
          <p style={warningSubtextStyle}>
            Source: <strong>{source || 'Keyboard Event'}</strong>
          </p>
          <p style={warningDescStyle}>
            Do not capture, record, or distribute private call content without consent.
            Repeated attempts will trigger privacy blurring and account review.
          </p>
        </div>
        <div style={modalFooterStyle}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.8rem' }}
            onClick={onContinue}
          >
            I Acknowledge & Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export function RemotePrivacyAlert({ isOpen, onReport, onDismiss, source }) {
  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={neobrutalistModalStyle}>
        <div style={modalHeaderStyle('var(--color-accent)')}>
          <AlertTriangle size={20} />
          <span>⚠ PRIVACY ALERT</span>
        </div>
        <div style={modalBodyStyle}>
          <p style={warningTitleStyle}>Possible screen-capture attempt detected.</p>
          <p style={warningDescStyle}>
            The other participant's browser reported a capture signal ({source || 'focus/tab switch'}).
            For your safety, we recommend ending the call or reporting suspicious activity.
          </p>
        </div>
        <div style={{ ...modalFooterStyle, display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-danger"
            style={{ flex: 1, padding: '0.8rem' }}
            onClick={onReport}
          >
            Report User
          </button>
          <button
            type="button"
            className="btn"
            style={{ flex: 1, padding: '0.8rem', background: '#E5E7EB', color: '#1F2937' }}
            onClick={onDismiss}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export function BlackmailSafetyModal({ isOpen, onReport, onBlock, onEndCall, onDismiss }) {
  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={{ ...neobrutalistModalStyle, maxWidth: '440px' }}>
        <div style={modalHeaderStyle('var(--color-danger)')}>
          <Shield size={20} />
          <span>SAFETY RESPONSE WORKFLOW</span>
        </div>
        <div style={modalBodyStyle}>
          <p style={{ ...warningTitleStyle, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            Emergency Safety Tools
          </p>
          <p style={warningDescStyle}>
            If you are being harassed, blackmailed, or threatened, use these options immediately:
          </p>
          <div style={actionListStyle}>
            <div style={actionItemStyle} onClick={onBlock}>
              <EyeOff size={18} style={{ color: 'var(--color-danger)' }} />
              <div>
                <strong>Block User</strong>
                <span>Deletes friendship, blocks future calls/chat.</span>
              </div>
            </div>
            <div style={actionItemStyle} onClick={onReport}>
              <LifeBuoy size={18} style={{ color: 'var(--color-accent)' }} />
              <div>
                <strong>Report Incident</strong>
                <span>Creates a high-severity abuse report for admin review.</span>
              </div>
            </div>
            <div style={actionItemStyle} onClick={onEndCall}>
              <AlertTriangle size={18} style={{ color: '#4B5563' }} />
              <div>
                <strong>End Call Session</strong>
                <span>Terminate the active WebRTC call immediately.</span>
              </div>
            </div>
          </div>
        </div>
        <div style={modalFooterStyle}>
          <button
            type="button"
            className="btn"
            style={{ width: '100%', padding: '0.8rem', background: '#E5E7EB', color: '#1F2937' }}
            onClick={onDismiss}
          >
            Cancel & Return
          </button>
        </div>
      </div>
    </div>
  );
}

// Styling Tokens (Neobrutalist Theme)
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '1.5rem'
};

const neobrutalistModalStyle = {
  background: '#FFFDF8',
  border: '4px solid #111827',
  borderRadius: '12px',
  boxShadow: '8px 8px 0px #111827',
  maxWidth: '400px',
  width: '100%',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column'
};

const modalHeaderStyle = (bgColor) => ({
  background: bgColor,
  color: bgColor === 'var(--color-primary)' ? '#000' : '#FFF',
  padding: '1rem',
  borderBottom: '4px solid #111827',
  fontFamily: 'var(--font-display)',
  fontWeight: '800',
  textTransform: 'uppercase',
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  fontSize: '0.95rem'
});

const modalBodyStyle = {
  padding: '1.5rem',
  textAlign: 'left'
};

const warningTitleStyle = {
  fontSize: '1rem',
  fontWeight: '800',
  color: '#111827',
  margin: '0 0 0.4rem 0',
  lineHeight: '1.3'
};

const warningSubtextStyle = {
  fontSize: '0.8rem',
  fontFamily: 'var(--font-mono)',
  color: '#4B5563',
  margin: '0 0 1rem 0'
};

const warningDescStyle = {
  fontSize: '0.85rem',
  color: '#374151',
  margin: 0,
  lineHeight: '1.5'
};

const modalFooterStyle = {
  padding: '1rem 1.5rem 1.5rem 1.5rem',
  borderTop: '2px dashed var(--border-color)',
  background: '#FAF6EF'
};

const actionListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.8rem',
  marginTop: '1.2rem'
};

const actionItemStyle = {
  display: 'flex',
  gap: '0.8rem',
  alignItems: 'center',
  padding: '0.75rem 1rem',
  border: '2px solid #111827',
  borderRadius: '8px',
  background: '#FFF',
  cursor: 'pointer',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  boxShadow: '3px 3px 0px #111827'
};
// Hover scaling is handled inside parent components using dynamic classes.
export default { LocalPrivacyWarning, RemotePrivacyAlert, BlackmailSafetyModal };
