import React from 'react';

/**
 * CallFeedbackModal Component
 * Renders the rating and issues checklist overlay after a call completes.
 * 
 * @param {object} props
 * @param {boolean} props.isOpen True if the modal should display
 * @param {number} props.rating The currently selected star rating (1-5)
 * @param {function} props.onRatingSelect Handler called when a star rating is clicked
 * @param {string[]} props.selectedIssues Array of active issue slugs
 * @param {function} props.onToggleIssue Handler called when an issue checkbox changes
 * @param {string} props.comments Current text feedback comments
 * @param {function} props.onCommentsChange Handler called when comment text changes
 * @param {function} props.onSkip Action called when the user skips feedback
 * @param {function} props.onSubmit Action called when the user submits feedback
 */
export default function CallFeedbackModal({
  isOpen,
  rating,
  onRatingSelect,
  selectedIssues,
  onToggleIssue,
  comments,
  onCommentsChange,
  onSkip,
  onSubmit
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(9, 9, 11, 0.85)',
      backdropFilter: 'blur(20px)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      boxSizing: 'border-box'
    }}>
      <div className="modal-content" style={{ maxWidth: '450px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem 0', fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>
          How was your call?
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', margin: '0 0 1.5rem 0' }}>
          Your feedback is anonymous and helps improve quality.
        </p>

        {/* Clickable Star Rating */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              onClick={() => onRatingSelect(star)}
              style={{
                fontSize: '2rem',
                cursor: 'pointer',
                color: star <= rating ? 'var(--color-accent)' : 'var(--text-secondary)',
                transition: 'transform 0.15s ease, color 0.15s ease'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1.0)'}
            >
              ★
            </span>
          ))}
        </div>

        {/* Common Issues Checkboxes */}
        <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
            Did you experience any issues?
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
            {[
              { value: 'audio', label: 'Choppy Audio' },
              { value: 'video', label: 'Blurry Video' },
              { value: 'drop', label: 'Connection Drop' },
              { value: 'lag', label: 'High Lag / Delay' }
            ].map((item) => (
              <label key={item.value} className="checkbox-label" style={{ marginBottom: 0, fontSize: '0.8rem' }}>
                <input
                  type="checkbox"
                  checked={selectedIssues.includes(item.value)}
                  onChange={() => onToggleIssue(item.value)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Comments textbox */}
        <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          <label htmlFor="feedback-comments" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
            Additional Comments:
          </label>
          <textarea
            id="feedback-comments"
            value={comments}
            onChange={(e) => onCommentsChange(e.target.value)}
            placeholder="Let us know what went wrong or well..."
            style={{
              height: '75px',
              resize: 'none'
            }}
          />
        </div>

        {/* Submission and Skip Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={onSkip}
            style={{ flex: 1 }}
          >
            Skip
          </button>
          <button
            className="btn btn-primary"
            onClick={onSubmit}
            style={{ flex: 1.5 }}
          >
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
}
