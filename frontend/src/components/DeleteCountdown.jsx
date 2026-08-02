import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function DeleteCountdown({ remainingSeconds: initialSeconds, scheduledTime }) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (initialSeconds !== undefined && initialSeconds !== null) return initialSeconds;
    if (scheduledTime) {
      return Math.max(0, Math.round((new Date(scheduledTime).getTime() - Date.now()) / 1000));
    }
    return 0;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const pad = (num) => String(num).padStart(2, '0');

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem',
      background: '#FEE2E2',
      border: '2px solid #EF4444',
      borderRadius: '6px',
      padding: '0.4rem 0.75rem',
      fontFamily: 'var(--font-mono, monospace)',
      fontWeight: 800,
      color: '#B91C1C',
      fontSize: '0.9rem',
      boxShadow: '2px 2px 0 #111827'
    }}>
      <Clock size={16} className="animate-pulse" style={{ color: '#EF4444' }} />
      <span>{pad(hours)}:{pad(minutes)}:{pad(seconds)}</span>
      <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>(RECOVERY WINDOW)</span>
    </div>
  );
}
