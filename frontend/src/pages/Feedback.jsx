import React, { useState } from 'react';
import { MessageSquare, Star, Send, Check, AlertCircle } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function Feedback() {
  const [type, setType] = useState('BUG_REPORT');
  const [rating, setRating] = useState(5);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const data = await apiClient.request('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          type,
          rating,
          description,
          logPayload: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (data && data.success) {
        setSuccessMsg('Thank you! Your feedback has been logged and sent to our team.');
        setDescription('');
      } else {
        setErrorMsg(data.error || 'Failed to submit feedback.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Server error submitting feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '750px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title */}
      <div style={{ borderBottom: '3px solid #111827', paddingBottom: '0.75rem' }}>
        <h2 style={{ margin: 0, fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={24} style={{ color: 'var(--color-primary)' }} /> Feedback & Bug Report Center
        </h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Help us refine SwaplyOne! Report issues, suggest features, or rate your call quality.
        </span>
      </div>

      {successMsg && (
        <div style={{ background: '#ECFDF5', border: '2px solid #111827', padding: '0.75rem 1rem', borderRadius: '6px', color: '#047857', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Check size={18} /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: '#FEE2E2', border: '2px solid #111827', padding: '0.75rem 1rem', borderRadius: '6px', color: '#B91C1C', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} /> {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Category Picker */}
        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 900, display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
            Category / Report Type
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'BUG_REPORT', label: '🐛 Bug Report' },
              { id: 'FEATURE_REQUEST', label: '💡 Feature Request' },
              { id: 'CALL_FEEDBACK', label: '📞 Call Quality' },
              { id: 'GENERAL_FEEDBACK', label: '💬 General' }
            ].map(item => (
              <button
                type="button"
                key={item.id}
                className={`btn ${type === item.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => setType(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Star Rating */}
        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 900, display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
            Experience Rating (1–5 Stars)
          </label>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[1, 2, 3, 4, 5].map(num => (
              <button
                type="button"
                key={num}
                onClick={() => setRating(num)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.2rem',
                  color: num <= rating ? '#F59E0B' : '#D1D5DB'
                }}
              >
                <Star size={24} fill={num <= rating ? '#F59E0B' : 'none'} />
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: 900, display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
            Description & Details
          </label>
          <textarea
            required
            rows="5"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please describe what happened, expected behavior, or your feature idea..."
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '2px solid #111827', fontSize: '0.9rem' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.4rem', alignSelf: 'flex-start' }}
        >
          <Send size={16} /> {loading ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
}
