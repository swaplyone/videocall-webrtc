import React, { useState, useEffect } from 'react';
import { Users, Search, Phone, UserMinus, UserPlus, AlertCircle, CheckCircle, Camera, Inbox, Sparkles } from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import QRScanner from '../components/QRScanner';
import QrcodeIcon from '../components/QrcodeIcon';
import SwipeRequests from '../components/SwipeRequests';

export default function Friends({ onInitiateCall }) {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'invites' | 'search'
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

  const fetchPendingRequests = async () => {
    try {
      const data = await apiClient.request('/api/friends/requests');
      if (data.success) {
        setPendingRequests(data.requests || data.incoming || []);
      }
    } catch (err) {
      console.error('Error fetching pending friend requests:', err);
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
    fetchPendingRequests();
    fetchQRToken();
    const interval = setInterval(fetchPendingRequests, 6000);
    return () => clearInterval(interval);
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

      const data = await apiClient.request(`/api/friends/search?q=${encodeURIComponent(cleanQuery)}&query=${encodeURIComponent(cleanQuery)}`);
      if (data.success) {
        const foundUsers = data.users || data.results || [];
        setSearchResults(foundUsers);
        if (foundUsers.length === 0) {
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

  const handleAccept = async (requestId) => {
    setError(null);
    setSuccess(null);
    try {
      const data = await apiClient.request(`/api/friends/request/${requestId}/accept`, { method: 'POST' });
      if (data.success) {
        setSuccess('Accepted friend connection! 🎉');
        fetchFriends();
        fetchPendingRequests();
      }
    } catch (err) {
      setError(err.message || 'Failed to accept request.');
    }
  };

  const handleReject = async (requestId) => {
    setError(null);
    setSuccess(null);
    try {
      const data = await apiClient.request(`/api/friends/request/${requestId}/reject`, { method: 'POST' });
      if (data.success) {
        setSuccess('Declined friend request.');
        fetchFriends();
        fetchPendingRequests();
      }
    } catch (err) {
      setError(err.message || 'Failed to decline request.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto', padding: '1.5rem' }}>
      
      {/* Title console & Tab Selector */}
      <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '6px 6px 0 #111827', background: '#FFFDF8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '2px dashed #1B2233', paddingBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontSize: '1.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#1B2233' }}>
              <Users size={24} style={{ color: '#D85B3E' }} /> Friends Directory & Deck
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#7A7A7A', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
              Discover testers, swipe pending connection cards, and place secure calls.
            </p>
          </div>

          {/* Tab Navigation Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', background: '#F8F3EA', padding: '0.35rem', borderRadius: '50px', border: '2px solid #1B2233' }}>
            <button
              type="button"
              onClick={() => setActiveTab('friends')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '50px',
                border: activeTab === 'friends' ? '2px solid #1B2233' : 'none',
                background: activeTab === 'friends' ? '#D85B3E' : 'transparent',
                color: activeTab === 'friends' ? '#FFF' : '#1B2233',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)'
              }}
            >
              Active Friends ({friends.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('invites')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '50px',
                border: activeTab === 'invites' ? '2px solid #1B2233' : 'none',
                background: activeTab === 'invites' ? '#D85B3E' : 'transparent',
                color: activeTab === 'invites' ? '#FFF' : '#1B2233',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontFamily: 'var(--font-mono)'
              }}
            >
              <Inbox size={14} /> Pending Cards ({pendingRequests.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('search')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '50px',
                border: activeTab === 'search' ? '2px solid #1B2233' : 'none',
                background: activeTab === 'search' ? '#D85B3E' : 'transparent',
                color: activeTab === 'search' ? '#FFF' : '#1B2233',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontFamily: 'var(--font-mono)'
              }}
            >
              <Search size={14} /> Search & QR
            </button>
          </div>
        </div>
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

      {/* TINDER-STYLE CARD DECK TAB FOR PENDING INVITES */}
      {activeTab === 'invites' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '480px', margin: '0 auto', width: '100%' }}>
          <div className="glass-panel" style={{ padding: '1.25rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827', textAlign: 'center', background: '#FFFDF8' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', color: '#1B2233' }}>
              🃏 Tinder-Style Invitation Deck
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#7A7A7A', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
              Swipe Right to Accept Connection &bull; Swipe Left to Decline
            </p>
          </div>

          <div style={{ position: 'relative', height: '420px' }}>
            <SwipeRequests
              requests={pendingRequests}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          </div>
        </div>
      )}

      {/* SEARCH & DISCOVER / QR TAB */}
      {(activeTab === 'search' || activeTab === 'friends') && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          {/* Search & Actions Row */}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div className="glass-panel" style={{ flex: 2, minWidth: '320px', padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827', background: '#FFFDF8' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', color: '#1B2233' }}>Search & Discover Testers</h3>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
                <div className="input-group" style={{ flex: 1, margin: 0 }}>
                  <input
                    type="text"
                    placeholder="Username or SWP-XXXXX Beta ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: '0.6rem', border: '2px solid #1B2233', borderRadius: '8px', width: '100%', fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}>
                  <Search size={16} /> {isLoading ? 'Searching...' : 'Search'}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div style={{ marginTop: '1.25rem', borderTop: '2px dashed #111827', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {searchResults.map(user => (
                    <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF', border: '2px solid #111827', padding: '0.6rem 0.8rem', borderRadius: '8px', boxShadow: '3px 3px 0 #111827' }}>
                      <div>
                        <strong style={{ display: 'block', color: '#1B2233' }}>@{user.username}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#7A7A7A', fontFamily: 'var(--font-mono)' }}>Beta ID: {user.beta_id}</span>
                      </div>
                      <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: 800 }} onClick={() => handleSendRequest(user.username)}>
                        <UserPlus size={14} /> Connect
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* QR invitation section */}
            <div className="glass-panel" style={{ flex: 1, minWidth: '280px', padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827', background: '#FFFDF8' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#1B2233' }}>
                <QrcodeIcon size={20} color="#1B2233" /> My QR Connection
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
          <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827', background: '#FFFDF8' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', color: '#1B2233' }}>Active Friends ({friends.length})</h3>
            
            {friends.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#7A7A7A', fontStyle: 'italic', padding: '1.5rem 0', fontFamily: 'var(--font-mono)' }}>
                You don't have any friends connected yet. Use discovery search or QR scans to start connecting!
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                {friends.map(friend => (
                  <div key={friend.id} style={{ display: 'flex', flexDirection: 'column', background: '#FFF', border: '3px solid #111827', borderRadius: '12px', padding: '1rem', boxShadow: '4px 4px 0 #111827' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div className="node-avatar-circle" style={{ width: '42px', height: '42px', fontSize: '0.9rem', flexShrink: 0, background: '#D85B3E', color: '#FFF', fontWeight: 900, border: '2px solid #1B2233' }}>
                        {friend.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <strong style={{ display: 'block', fontSize: '1rem', color: '#1B2233' }}>@{friend.username}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#7A7A7A', fontFamily: 'var(--font-mono)' }}>Beta ID: {friend.beta_id}</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto' }}>
                      <button
                        className="btn btn-primary"
                        style={{ flex: 2, padding: '0.45rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', fontWeight: 800 }}
                        onClick={() => onInitiateCall(friend.username)}
                      >
                        <Phone size={14} /> Call Node
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '0.45rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
      )}

    </div>
  );
}
