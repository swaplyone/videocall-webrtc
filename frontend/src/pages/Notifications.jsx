import React, { useState, useEffect } from 'react';
import { Bell, ShieldAlert, Award, UserCheck, Trash } from 'lucide-react';

export default function Notifications() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'security',
      title: 'Security Active',
      message: 'Email OTP verification is enforced for all new accounts to prevent abuse.',
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString()
    },
    {
      id: 2,
      type: 'welcome',
      title: 'Welcome to Swaply Beta',
      message: 'Thank you for testing the standalone Swaply video calling platform.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
    }
  ]);

  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '650px' }}>
      
      {/* Title console */}
      <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontSize: '1.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Bell size={24} style={{ color: 'var(--color-primary)' }} /> Notifications
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
          Review secure platform alerts, verification logs, and safety messages.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {notifications.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '2rem 0' }}>
            No new notifications in your inbox.
          </p>
        ) : (
          notifications.map(notif => (
            <div key={notif.id} style={{ display: 'flex', gap: '1rem', background: '#FFFDF9', border: '3px solid #111827', borderRadius: '8px', padding: '1.25rem', boxShadow: '4px 4px 0 #111827' }}>
              <div style={{
                background: notif.type === 'security' ? 'rgba(239, 68, 68, 0.15)' : '#FEF3C7',
                border: '2px solid #111827',
                borderRadius: '6px',
                padding: '0.5rem',
                display: 'inline-flex',
                alignSelf: 'flex-start',
                flexShrink: 0
              }}>
                {notif.type === 'security' ? (
                  <ShieldAlert size={20} style={{ color: 'var(--color-danger)' }} />
                ) : notif.type === 'welcome' ? (
                  <Award size={20} style={{ color: 'var(--color-primary)' }} />
                ) : (
                  <UserCheck size={20} style={{ color: 'var(--color-success)' }} />
                )}
              </div>

              <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 'extrabold', fontSize: '1rem', textTransform: 'uppercase' }}>
                  {notif.title}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>
                  {notif.message}
                </p>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {new Date(notif.timestamp).toLocaleString()}
                </span>
              </div>

              <button
                className="btn btn-secondary"
                style={{ alignSelf: 'flex-start', padding: '0.35rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                onClick={() => clearNotification(notif.id)}
              >
                <Trash size={14} />
              </button>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
