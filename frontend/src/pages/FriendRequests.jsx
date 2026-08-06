import React, { useState, useEffect } from 'react';
import { Inbox, AlertCircle, CheckCircle } from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import SwipeRequests from '../components/SwipeRequests';

export default function FriendRequests() {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchRequests = async () => {
    try {
      const data = await apiClient.request('/api/friends/requests');
      if (data.success) {
        setRequests(data.requests || data.incoming || []);
      }
    } catch (err) {
      console.error('Error fetching friend requests:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAccept = async (requestId) => {
    setError(null);
    setSuccess(null);
    try {
      const data = await apiClient.request(`/api/friends/request/${requestId}/accept`, {
        method: 'POST'
      });
      if (data.success) {
        setSuccess('Accepted friend connection!');
        fetchRequests();
      }
    } catch (err) {
      setError(err.message || 'Failed to accept request.');
    }
  };

  const handleReject = async (requestId) => {
    setError(null);
    setSuccess(null);
    try {
      const data = await apiClient.request(`/api/friends/request/${requestId}/reject`, {
        method: 'POST'
      });
      if (data.success) {
        setSuccess('Declined friend request.');
        fetchRequests();
      }
    } catch (err) {
      setError(err.message || 'Failed to decline request.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '500px', margin: '0 auto' }}>
      
      {/* Title console */}
      <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontSize: '1.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Inbox size={24} style={{ color: 'var(--color-primary)' }} /> Invitation Inbox
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
          Review pending friend requests and select who you'd like to connect with.
        </p>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '2px solid var(--color-danger)', background: 'rgba(239,68,68,0.08)', padding: '0.75rem', borderRadius: '6px', color: 'var(--color-danger)', fontSize: '0.85rem' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '2px solid var(--color-success)', background: 'rgba(16,185,129,0.08)', padding: '0.75rem', borderRadius: '6px', color: 'var(--color-success)', fontSize: '0.85rem' }}>
          <CheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>{success}</span>
        </div>
      )}

      {/* Swipe card deck */}
      <div style={{ position: 'relative', height: '420px' }}>
        <SwipeRequests 
          requests={requests}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      </div>

    </div>
  );
}
