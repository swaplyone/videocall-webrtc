import React, { useState, useEffect } from 'react';
import { Clock, Filter, Star, Check, AlertCircle } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function CallHistory({ currentUser }) {
  const [calls, setCalls] = useState([]);
  const [filterType, setFilterType] = useState('All');
  const [filterQuality, setFilterQuality] = useState('All');
  
  // Feedback states
  const [selectedCallForFeedback, setSelectedCallForFeedback] = useState(null);
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [issues, setIssues] = useState([]);
  
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    try {
      let url = '/api/calls/history';
      const queryParams = [];
      if (filterType !== 'All') queryParams.push(`type=${filterType.toLowerCase()}`);
      if (filterQuality !== 'All') queryParams.push(`quality=${filterQuality.toLowerCase()}`);
      
      if (queryParams.length > 0) {
        url += '?' + queryParams.join('&');
      }

      const data = await apiClient.request(url);
      if (data.success) {
        setCalls(data.calls || []);
      }
    } catch (err) {
      console.error('Failed to load call history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [filterType, filterQuality]);

  const toggleIssue = (issue) => {
    setIssues(prev =>
      prev.includes(issue) ? prev.filter(i => i !== issue) : [...prev, issue]
    );
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCallForFeedback) return;
    
    setError(null);
    setSuccess(null);

    try {
      const data = await apiClient.request('/api/calls/feedback', {
        method: 'POST',
        body: JSON.stringify({
          callId: selectedCallForFeedback.id,
          rating,
          issues: issues.length > 0 ? issues : null,
          comments: comments.trim() || null
        })
      });

      if (data.success) {
        setSuccess('Call feedback submitted successfully!');
        setSelectedCallForFeedback(null);
        setComments('');
        setIssues([]);
        setRating(5);
        fetchHistory();
      }
    } catch (err) {
      setError(err.message || 'Failed to submit feedback.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Title block */}
      <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontSize: '1.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Clock size={24} style={{ color: 'var(--color-primary)' }} /> Call Connection Logs
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
          Track past beta testing session durations, direction logs, and rate network quality.
        </p>
      </div>

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '2px solid var(--color-success)', background: 'rgba(16,185,129,0.08)', padding: '0.75rem', borderRadius: '6px', color: 'var(--color-success)', fontSize: '0.85rem' }}>
          <Check size={18} style={{ flexShrink: 0 }} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '2px solid var(--color-danger)', background: 'rgba(239,68,68,0.08)', padding: '0.75rem', borderRadius: '6px', color: 'var(--color-danger)', fontSize: '0.85rem' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Panel */}
      <div className="glass-panel" style={{ padding: '1rem 1.5rem', border: '3px solid #111827', boxShadow: '4px 4px 0 #111827', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', textTransform: 'uppercase' }}>
          <Filter size={16} /> Filters:
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="filter-type" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Type:</label>
          <select id="filter-type" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '0.35rem 0.6rem', border: '2px solid #111827', borderRadius: '4px', background: '#FFF' }}>
            <option value="All">All Types</option>
            <option value="Incoming">Incoming Only</option>
            <option value="Outgoing">Outgoing Only</option>
            <option value="Missed">Missed Only</option>
            <option value="Rejected">Rejected Only</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="filter-quality" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Quality Rating:</label>
          <select id="filter-quality" value={filterQuality} onChange={(e) => setFilterQuality(e.target.value)} style={{ padding: '0.35rem 0.6rem', border: '2px solid #111827', borderRadius: '4px', background: '#FFF' }}>
            <option value="All">All Quality Ratings</option>
            <option value="Excellent">Excellent (5 Stars)</option>
            <option value="Good">Good (4 Stars)</option>
            <option value="Fair">Fair (3 Stars)</option>
            <option value="Poor">Poor (2 Stars)</option>
            <option value="Critical">Critical (1 Star)</option>
          </select>
        </div>
      </div>

      {/* History table */}
      <div className="glass-panel" style={{ padding: '1.25rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827', overflowX: 'auto' }}>
        <table className="retro-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '3px solid #111827' }}>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem' }}>Session ID</th>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem' }}>Node Peer</th>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem' }}>Direction</th>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem' }}>Duration</th>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem' }}>Timestamp</th>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem' }}>Connection Quality</th>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem' }}>Feedback</th>
            </tr>
          </thead>
          <tbody>
            {calls.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0', fontStyle: 'italic' }}>
                  No call logs found matching current filter options.
                </td>
              </tr>
            ) : (
              calls.map(call => (
                <tr key={call.id} style={{ borderBottom: '2px solid #111827' }}>
                  <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>#{call.id.substring(0, 8)}</td>
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold' }}>
                    @{call.direction === 'Outgoing' ? call.receiver_username : call.caller_username}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span className={`status-tag ${call.direction === 'Outgoing' ? 'tag-info' : 'tag-success'}`} style={{ fontSize: '0.75rem' }}>
                      {call.direction}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>{call.durationStr}</td>
                  <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem' }}>{new Date(call.started_at).toLocaleString()}</td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span className={`status-tag ${call.qualityTag === 'Excellent' || call.qualityTag === 'Good' ? 'tag-success' : call.qualityTag === 'Fair' ? 'tag-warning' : 'tag-danger'}`} style={{ fontSize: '0.75rem' }}>
                      {call.qualityTag}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    {call.feedback_rating ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.1rem', fontSize: '0.8rem' }}>
                        {call.feedback_rating} <Star size={12} fill="#FBBF24" color="#FBBF24" />
                      </span>
                    ) : (
                      <button className="btn btn-primary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }} onClick={() => setSelectedCallForFeedback(call)}>
                        Rate Call
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Feedback Modal */}
      {selectedCallForFeedback && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px', border: '4px solid #111827', boxShadow: '8px 8px 0 #111827' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontSize: '1.25rem', fontWeight: 900 }}>Rate Connection Quality</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              How was your secure call with <strong>@{selectedCallForFeedback.direction === 'Outgoing' ? selectedCallForFeedback.receiver_username : selectedCallForFeedback.caller_username}</strong>?
            </p>

            <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', fontSize: '1.75rem', margin: '0.5rem 0 1rem 0' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      size={32}
                      fill={star <= rating ? '#FBBF24' : 'none'}
                      color={star <= rating ? '#FBBF24' : '#9CA3AF'}
                      strokeWidth={2}
                    />
                  </button>
                ))}
              </div>

              <div style={{ borderTop: '2px dashed #111827', paddingTop: '1rem' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Report Network Issues</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {['Audio Delay', 'Video Lag', 'Echo', 'Dropped Call', 'Low Resolution', 'Other'].map(issue => {
                    const isChecked = issues.includes(issue);
                    return (
                      <button
                        key={issue}
                        type="button"
                        className={`btn ${isChecked ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.35rem', fontSize: '0.75rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        onClick={() => toggleIssue(issue)}
                      >
                        {isChecked && <Check size={12} />} {issue}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="comments-input" style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>Comments or Suggestions</label>
                <textarea
                  id="comments-input"
                  rows={3}
                  placeholder="Optional connection notes..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  style={{ width: '100%', border: '2px solid #111827', padding: '0.5rem', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedCallForFeedback(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, fontWeight: 'bold' }}>Submit Rating</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
