import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, Search, Filter, ShieldAlert, UserPlus, PhoneMissed, Mail } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await apiClient.request(`/api/notifications?category=${selectedCategory}&search=${encodeURIComponent(searchQuery)}`);
      if (data && data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [selectedCategory, searchQuery]);

  const handleMarkAllRead = async () => {
    try {
      await apiClient.request('/api/notifications/read', {
        method: 'POST',
        body: JSON.stringify({ markAll: true })
      });
      fetchNotifications();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await apiClient.request(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #111827', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={24} style={{ color: 'var(--color-primary)' }} /> Notification Center
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Unread Notifications: <strong>{unreadCount}</strong>
          </span>
        </div>

        <button onClick={handleMarkAllRead} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <CheckCheck size={16} /> Mark All as Read
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.2rem' }}>
          {['ALL', 'FRIEND_REQUEST', 'BETA_INVITATION', 'SECURITY_ALERT', 'PRIVACY_WARNING', 'MISSED_CALL', 'ADMIN_ANNOUNCEMENT'].map(cat => (
            <button
              key={cat}
              className={`btn ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search notifications..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '0.4rem 0.8rem',
            borderRadius: '6px',
            border: '2px solid #111827',
            fontSize: '0.8rem',
            width: '220px'
          }}
        />
      </div>

      {/* Notification Items List */}
      <div className="glass-panel" style={{ padding: '1.25rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No notifications match the filter.</div>
        ) : (
          notifications.map(item => (
            <div
              key={item.id}
              style={{
                border: '2px solid #111827',
                borderRadius: '8px',
                padding: '0.8rem 1rem',
                background: item.read_status ? '#FFF' : '#FEF3C7',
                boxShadow: '3px 3px 0 #111827',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'flex-start',
                gap: '1rem'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    border: '1px solid #111827',
                    background: '#111827',
                    color: '#FFF'
                  }}>
                    {item.category.replace(/_/g, ' ')}
                  </span>
                  <strong style={{ fontSize: '0.95rem' }}>{item.title}</strong>
                </div>
                <p style={{ margin: '0.25rem 0 0.4rem 0', fontSize: '0.85rem', color: '#374151' }}>{item.message}</p>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </div>

              <button
                onClick={() => handleDeleteNotification(item.id)}
                className="btn btn-secondary"
                style={{ padding: '0.3rem', color: '#EF4444' }}
                title="Delete Notification"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
