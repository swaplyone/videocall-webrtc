import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function NoticeModal({ isOpen, onAccept }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <ShieldAlert className="modal-icon" size={48} />
        <h2 className="modal-title">Important Privacy Notice</h2>
        <div className="modal-body">
          <p style={{ marginBottom: '1rem' }}>
            For your safety, Swaply <strong>does not provide</strong> screen sharing or recording features.
          </p>
          <p style={{ marginBottom: '1rem' }}>
            However, Swaply <strong>cannot completely prevent</strong> someone from recording a call using external software, browser extensions, or another physical device (like a phone camera).
          </p>
          <p style={{ fontWeight: '600', color: 'var(--color-warning)' }}>
            Avoid sharing sensitive personal information (such as bank details, passwords, or home addresses) during calls.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onAccept}>
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
}
