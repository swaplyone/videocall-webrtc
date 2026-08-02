import React, { useState, useEffect } from 'react';
import { Users, Search, Phone, UserMinus, UserPlus, AlertCircle, CheckCircle, Camera } from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import QRScanner from '../components/QRScanner';
import QrcodeIcon from '../components/QrcodeIcon';

export default function Friends({ onInitiateCall }) {
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [inviteUrl, setInviteUrl] = useState('');
  
  // Scanner states
  const [isScanning, setIsScanning] = useState(false);
  const [resolvedProfile, setResolvedProfile] = useState(null);
  
  // Feedbacks
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFriends = async () => {
    try {
      const data = await apiClient.request('/api/friends');
      if (data.success) {
        setFriends(data.friends || []);
      }
    } catch (err) {
      console.error('Error fetching friends list:', err);
    }
  };

  const fetchQRToken = async () => {
    try {
      const data = await apiClient.request('/api/friends/qr');
      if (data.success) {
        setInviteUrl(data.inviteUrl || '');
      }
    } catch (err) {
      console.error('Error fetching QR invitation url:', err);
    }
  };

  useEffect(() => {
    fetchFriends();
    fetchQRToken();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setError(null);
    setIsLoading(true);
    setSearchResults([]);

    try {
      // Strip leading @ character for usernames (User Knowledge #3)
      let cleanQuery = searchQuery.trim();
      if (cleanQuery.startsWith('@')) {
        cleanQuery = cleanQuery.substring(1);
      }

      const data = await apiClient.request(`/api/friends/search?query=${encodeURIComponent(cleanQuery)}`);
      if (data.success) {
        setSearchResults(data.users || []);
        if (data.users.length === 0) {
          setError('No users found matching your query.');
        }
      }
    } catch (err) {
      setError(err.message || 'Search failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRequest = async (target) => {
    setError(null);
    setSuccess(null);
    try {
      const data = await apiClient.request('/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ target })
      });
      if (data.success) {
        setSuccess('Friend invitation request sent!');
        setSearchResults([]);
        setSearchQuery('');
        setResolvedProfile(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to send invitation.');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm('Are you sure you want to remove this connection?')) return;
    setError(null);
    setSuccess(null);
    try {
      const data = await apiClient.request(`/api/friends/${friendId}`, {
        method: 'DELETE'
      });
      if (data.success) {
        setSuccess('Connection successfully removed.');
        fetchFriends();
      }
    } catch (err) {
      setError(err.message || 'Failed to remove connection.');
    }
  };

  // QR Scan handler
  const handleScanSuccess = async (token) => {
    setIsScanning(false);
    setError(null);
    setResolvedProfile(null);
    
    try {
      const data = await apiClient.request(`/api/friends/qr/resolve/${token}`);
      if (data.success) {
        setResolvedProfile(data.user);
      } else {
        setError('Invalid QR Code. Please ask your friend to generate a new QR Code.');
      }
    } catch (err) {
      setError('Invalid QR Code. Please ask your friend to generate a new QR Code.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Title console */}
      <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '6px 6px 0 #111827' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontSize: '1.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Users size={24} style={{ color: 'var(--color-primary)' }} /> Friends Directory
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
          Discover other testers, scan connection tokens, and place authorized calls.
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

      {/* QR scanner preview or resolve preview */}
      {isScanning && (
        <div style={{ maxWidth: '420px', margin: '0 auto', width: '100%' }}>
          <QRScanner onScanResult={handleScanSuccess} onCancel={() => setIsScanning(false)} />
        </div>
      )}

      {resolvedProfile && (
        <div className="glass-panel" style={{ maxWidth: '450px', margin: '0 auto', padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 1rem 0', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-primary)' }}>QR Inviter Resolved</h4>
          <div className="node-avatar-circle" style={{ width: '64px', height: '64px', fontSize: '1.25rem', margin: '0 auto 0.75rem auto' }}>
            {resolvedProfile.username.substring(0, 2).toUpperCase()}
          </div>
          <h3 style={{ margin: 0, fontWeight: 900 }}>@{resolvedProfile.username}</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Beta ID: {resolvedProfile.beta_id}</span>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
            <button className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem' }} onClick={() => setResolvedProfile(null)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 2, padding: '0.5rem', fontWeight: 'bold' }} onClick={() => handleSendRequest(resolvedProfile.username)}>
              <UserPlus size={16} /> Send Friend Request
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        {/* Friends search & Actions row */}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div className="glass-panel" style={{ flex: 2, minWidth: '320px', padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase' }}>Search & Discover</h3>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
              <div className="input-group" style={{ flex: 1, margin: 0 }}>
                <input
                  type="text"
                  placeholder="Username or SWP-XXXXX Beta ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: '0.6rem' }}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Search size={16} /> {isLoading ? 'Searching...' : 'Search'}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div style={{ marginTop: '1.25rem', borderTop: '2px dashed #111827', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {searchResults.map(user => (
                  <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF', border: '2px solid #111827', padding: '0.6rem 0.8rem', borderRadius: '6px', boxShadow: '2px 2px 0 #111827' }}>
                    <div>
                      <strong style={{ display: 'block' }}>@{user.username}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Beta ID: {user.beta_id}</span>
                    </div>
                    <button className="btn btn-primary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }} onClick={() => handleSendRequest(user.username)}>
                      <UserPlus size={14} /> Connect
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QR invitation section */}
          <div className="glass-panel" style={{ flex: 1, minWidth: '280px', padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <QrcodeIcon size={20} color="var(--text-primary)" /> My QR Connection
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
              <div className="mock-qr-code" style={{ border: '3px solid #111827', padding: '10px', background: '#FFF', borderRadius: '6px', boxShadow: '3px 3px 0 #111827' }}>
                <div className="qr-pixel-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 12px)', gap: '1px' }}>
                  {[...Array(64)].map((_, i) => (
                    <div key={i} className={`qr-pixel ${(i % 3 === 0 || i % 7 === 0) ? 'active' : ''}`} style={{ width: '12px', height: '12px', background: (i % 3 === 0 || i % 7 === 0) ? '#111827' : 'transparent' }}></div>
                  ))}
                </div>
              </div>
              
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 'bold' }}
                onClick={() => { setIsScanning(true); setResolvedProfile(null); }}
              >
                <Camera size={16} /> Scan Friend QR
              </button>
            </div>
          </div>
        </div>

        {/* Current connections list */}
        <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase' }}>Active Friends ({friends.length})</h3>
          
          {friends.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1.5rem 0' }}>
              You don't have any friends connected yet. Use discovery search or QR scans to start connecting!
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {friends.map(friend => (
                <div key={friend.id} style={{ display: 'flex', flexDirection: 'column', background: '#FFF', border: '3px solid #111827', borderRadius: '8px', padding: '1rem', boxShadow: '3px 3px 0 #111827' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div className="node-avatar-circle" style={{ width: '42px', height: '42px', fontSize: '0.9rem', flexShrink: 0 }}>
                      {friend.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '1rem' }}>@{friend.username}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Beta ID: {friend.beta_id}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto' }}>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 2, padding: '0.4rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                      onClick={() => onInitiateCall(friend.username)}
                    >
                      <Phone size={14} /> Call Node
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, padding: '0.4rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                      onClick={() => handleRemoveFriend(friend.id)}
                    >
                      <UserMinus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
