import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, UserCheck, Clock, Mail, ShieldAlert, CheckCircle, XCircle,
  Play, Pause, Plus, Minus, Download, Search, RefreshCw, AlertTriangle, Sparkles, Filter
} from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function BetaCommandCenter() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState(null);

  // Filters & Search
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // Batch rollout inputs
  const [batchSizeInput, setBatchSizeInput] = useState(10);
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const data = await apiClient.request(`/api/beta/admin-list?filter=${filter}&search=${encodeURIComponent(search)}`);
      setUsers(data.users || []);
      setTotalCount(data.total || 0);
      setStats(data.stats || null);
    } catch (err) {
      console.error('Error loading beta admin queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [filter, search]);

  // Bulk Selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedUserIds(users.map(u => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedUserIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 1. Roll Out Next Batch
  const handleExecuteRolloutBatch = async () => {
    setIsSubmittingBatch(true);
    try {
      await apiClient.request('/api/beta/rollout-batch', {
        method: 'POST',
        body: JSON.stringify({ batchSize: batchSizeInput })
      });
      await fetchAdminData();
    } catch (err) {
      alert(err.message || 'Failed to execute rollout batch');
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  // 2. Bulk Approve
  const handleBulkApprove = async () => {
    if (selectedUserIds.length === 0) return;
    try {
      await apiClient.request('/api/beta/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ waitlistIds: selectedUserIds, notes: 'Approved via Beta Management Hub' })
      });
      setSelectedUserIds([]);
      await fetchAdminData();
    } catch (err) {
      alert('Failed to approve selected users');
    }
  };

  // 3. Bulk Reject
  const handleBulkReject = async () => {
    if (selectedUserIds.length === 0) return;
    try {
      await apiClient.request('/api/beta/bulk-reject', {
        method: 'POST',
        body: JSON.stringify({ waitlistIds: selectedUserIds, reason: 'Rejected by admin' })
      });
      setSelectedUserIds([]);
      await fetchAdminData();
    } catch (err) {
      alert('Failed to reject selected users');
    }
  };

  // 4. Update Capacity
  const handleUpdateCapacity = async (delta) => {
    const currentMax = stats?.maxCapacity || 150;
    const newMax = Math.max(10, currentMax + delta);
    try {
      await apiClient.request('/api/beta/config', {
        method: 'POST',
        body: JSON.stringify({ maxCapacity: newMax })
      });
      await fetchAdminData();
    } catch (err) {
      alert('Failed to update capacity');
    }
  };

  // 5. Pause / Resume Rollout
  const handleToggleRolloutActive = async () => {
    try {
      await apiClient.request('/api/beta/config', {
        method: 'POST',
        body: JSON.stringify({ rolloutActive: Boolean(stats?.rolloutPaused) })
      });
      await fetchAdminData();
    } catch (err) {
      alert('Failed to toggle rollout state');
    }
  };

  // 6. Export CSV
  const handleExportCsv = () => {
    window.open('/api/beta/export-csv', '_blank');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #F8F3EA)', padding: '2rem 1.5rem', color: '#1B2233', fontFamily: 'var(--font-mono)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Header Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#D85B3E', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              ADMINISTRATION COMMAND HUB
            </span>
            <h1 style={{ margin: '0.2rem 0 0 0', fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 900 }}>
              Smart Beta Rollout Manager
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={handleToggleRolloutActive}
              style={{
                padding: '0.6rem 1.1rem',
                borderRadius: '50px',
                background: stats?.rolloutPaused ? '#BE4D4D' : '#6D7B55',
                border: '2px solid #1B2233',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              {stats?.rolloutPaused ? <Play size={16} /> : <Pause size={16} />}
              {stats?.rolloutPaused ? 'Resume Rollout' : 'Pause Rollout'}
            </button>

            <button
              onClick={handleExportCsv}
              style={{
                padding: '0.6rem 1.1rem',
                borderRadius: '50px',
                background: '#FFFDF8',
                border: '2px solid #1B2233',
                color: '#1B2233',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Download size={16} /> Export Queue CSV
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
          
          {/* Capacity Card */}
          <div style={{ background: '#FFFDF8', border: '2.5px solid #1B2233', boxShadow: '4px 4px 0px 0px #1B2233', borderRadius: '18px', padding: '1.25rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#7A7A7A', fontWeight: 800, textTransform: 'uppercase' }}>
              Beta Capacity
            </span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.35rem' }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, color: '#D85B3E' }}>
                {stats?.activeCapacity || 0} / {stats?.maxCapacity || 150}
              </h2>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button onClick={() => handleUpdateCapacity(10)} style={{ background: '#F8F3EA', border: '1.5px solid #1B2233', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Plus size={14} />
                </button>
                <button onClick={() => handleUpdateCapacity(-10)} style={{ background: '#F8F3EA', border: '1.5px solid #1B2233', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Minus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Waiting Queue */}
          <div style={{ background: '#FFFDF8', border: '2.5px solid #1B2233', boxShadow: '4px 4px 0px 0px #1B2233', borderRadius: '18px', padding: '1.25rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#7A7A7A', fontWeight: 800, textTransform: 'uppercase' }}>
              Waiting Queue
            </span>
            <h2 style={{ margin: '0.35rem 0 0 0', fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, color: '#1B2233' }}>
              {stats?.waitingQueueCount || 0}
            </h2>
          </div>

          {/* Today's Invitations */}
          <div style={{ background: '#FFFDF8', border: '2.5px solid #1B2233', boxShadow: '4px 4px 0px 0px #1B2233', borderRadius: '18px', padding: '1.25rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#7A7A7A', fontWeight: 800, textTransform: 'uppercase' }}>
              Today's Invitations
            </span>
            <h2 style={{ margin: '0.35rem 0 0 0', fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, color: '#6D7B55' }}>
              {stats?.todayInvitations || 0}
            </h2>
          </div>

          {/* Emails Sent */}
          <div style={{ background: '#FFFDF8', border: '2.5px solid #1B2233', boxShadow: '4px 4px 0px 0px #1B2233', borderRadius: '18px', padding: '1.25rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#7A7A7A', fontWeight: 800, textTransform: 'uppercase' }}>
              Emails Sent
            </span>
            <h2 style={{ margin: '0.35rem 0 0 0', fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, color: '#4C779F' }}>
              {stats?.emailsSentCount || 0}
            </h2>
          </div>

          {/* Acceptance Rate */}
          <div style={{ background: '#FFFDF8', border: '2.5px solid #1B2233', boxShadow: '4px 4px 0px 0px #1B2233', borderRadius: '18px', padding: '1.25rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#7A7A7A', fontWeight: 800, textTransform: 'uppercase' }}>
              Acceptance Rate
            </span>
            <h2 style={{ margin: '0.35rem 0 0 0', fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, color: '#C8A76A' }}>
              {stats?.acceptanceRate || '82%'}
            </h2>
          </div>

          {/* Avg Wait Time */}
          <div style={{ background: '#FFFDF8', border: '2.5px solid #1B2233', boxShadow: '4px 4px 0px 0px #1B2233', borderRadius: '18px', padding: '1.25rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#7A7A7A', fontWeight: 800, textTransform: 'uppercase' }}>
              Avg Wait Time
            </span>
            <h2 style={{ margin: '0.35rem 0 0 0', fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, color: '#1B2233' }}>
              {stats?.avgWaitTimeDays || '3.2 days'}
            </h2>
          </div>

        </div>

        {/* Smart Rollout Batch Controls Panel */}
        <div style={{ background: '#FFFDF8', border: '2.5px solid #1B2233', boxShadow: '6px 6px 0px 0px #1B2233', borderRadius: '20px', padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800 }}>
              ⚡ Smart Rollout Batch Trigger
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#7A7A7A' }}>
              Automatically selects the next top eligible users and dispatches official invitation passes.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#F8F3EA', border: '2px solid #1B2233', borderRadius: '50px', padding: '0.3rem 0.85rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>Rollout Size:</span>
              <input
                type="number"
                min="1"
                max="100"
                value={batchSizeInput}
                onChange={(e) => setBatchSizeInput(e.target.value)}
                style={{ width: '50px', background: 'transparent', border: 'none', fontWeight: 900, fontSize: '0.95rem', fontFamily: 'var(--font-mono)', outline: 'none', textAlign: 'center' }}
              />
            </div>

            <button
              onClick={handleExecuteRolloutBatch}
              disabled={isSubmittingBatch}
              style={{
                padding: '0.75rem 1.4rem',
                borderRadius: '50px',
                background: '#D85B3E',
                border: '2.5px solid #1B2233',
                boxShadow: '4px 4px 0px 0px #1B2233',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: isSubmittingBatch ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {isSubmittingBatch ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Roll Out {batchSizeInput} Users Today
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', background: '#F8F3EA', padding: '0.3rem', borderRadius: '50px', border: '2px solid #1B2233' }}>
            {['all', 'waiting_for_beta', 'approved', 'invited', 'rejected', 'expired'].map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: '50px',
                  border: filter === t ? '2px solid #1B2233' : 'none',
                  background: filter === t ? '#D85B3E' : 'transparent',
                  color: filter === t ? '#FFF' : '#1B2233',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {t.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#FFFDF8', border: '2px solid #1B2233', borderRadius: '50px', padding: '0.4rem 0.85rem', width: '280px' }}>
            <Search size={16} color="#7A7A7A" />
            <input
              type="text"
              placeholder="Search user, email, Beta ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', width: '100%' }}
            />
          </div>

        </div>

        {/* Bulk Action Controls */}
        {selectedUserIds.length > 0 && (
          <div style={{ background: '#F8F3EA', border: '2px solid #1B2233', borderRadius: '16px', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>
              {selectedUserIds.length} users selected
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleBulkApprove} style={{ padding: '0.45rem 1rem', borderRadius: '50px', background: '#6D7B55', border: '1.5px solid #1B2233', color: '#FFF', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}>
                Approve Selected ({selectedUserIds.length})
              </button>
              <button onClick={handleBulkReject} style={{ padding: '0.45rem 1rem', borderRadius: '50px', background: '#BE4D4D', border: '1.5px solid #1B2233', color: '#FFF', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}>
                Reject Selected ({selectedUserIds.length})
              </button>
            </div>
          </div>
        )}

        {/* Main Sortable Data Table */}
        <div style={{ background: '#FFFDF8', border: '2.5px solid #1B2233', boxShadow: '6px 6px 0px 0px #1B2233', borderRadius: '20px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#F8F3EA', borderBottom: '2.5px solid #1B2233' }}>
                <th style={{ padding: '0.85rem', width: '40px' }}>
                  <input type="checkbox" onChange={handleSelectAll} checked={selectedUserIds.length > 0 && selectedUserIds.length === users.length} />
                </th>
                <th style={{ padding: '0.85rem', fontWeight: 800 }}>Queue Pos</th>
                <th style={{ padding: '0.85rem', fontWeight: 800 }}>User / Email</th>
                <th style={{ padding: '0.85rem', fontWeight: 800 }}>Beta ID</th>
                <th style={{ padding: '0.85rem', fontWeight: 800 }}>Batch</th>
                <th style={{ padding: '0.85rem', fontWeight: 800 }}>Priority</th>
                <th style={{ padding: '0.85rem', fontWeight: 800 }}>Status</th>
                <th style={{ padding: '0.85rem', fontWeight: 800, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: '#7A7A7A' }}>
                    <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
                    Loading Beta Queue Data...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: '#7A7A7A' }}>
                    No waitlist records found.
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F3ECE0' }}>
                    <td style={{ padding: '0.85rem' }}>
                      <input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={() => handleToggleSelect(u.id)} />
                    </td>
                    <td style={{ padding: '0.85rem', fontWeight: 900, color: '#D85B3E' }}>
                      #{u.queue_position || u.waitlist_position || '-'}
                    </td>
                    <td style={{ padding: '0.85rem' }}>
                      <div style={{ fontWeight: 800, color: '#1B2233' }}>@{u.username}</div>
                      <div style={{ fontSize: '0.75rem', color: '#7A7A7A' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '0.85rem', fontWeight: 800, color: '#4C779F' }}>
                      {u.beta_id}
                    </td>
                    <td style={{ padding: '0.85rem', fontWeight: 700 }}>
                      {u.beta_batch || 'Batch 1'}
                    </td>
                    <td style={{ padding: '0.85rem', fontWeight: 800 }}>
                      {u.priority_score || 0}
                    </td>
                    <td style={{ padding: '0.85rem' }}>
                      <span style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '20px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        border: '1.5px solid #1B2233',
                        background: u.rollout_status === 'APPROVED' || u.rollout_status === 'ACTIVE' ? '#F1F6F1' : (u.rollout_status === 'REJECTED' ? '#FFF0EB' : '#F8F3EA'),
                        color: u.rollout_status === 'APPROVED' || u.rollout_status === 'ACTIVE' ? '#6D7B55' : (u.rollout_status === 'REJECTED' ? '#BE4D4D' : '#1B2233')
                      }}>
                        {u.rollout_status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => apiClient.request('/api/beta/bulk-approve', { method: 'POST', body: JSON.stringify({ waitlistIds: [u.id] }) }).then(fetchAdminData)}
                          style={{ padding: '0.3rem 0.65rem', borderRadius: '50px', background: '#6D7B55', border: '1.5px solid #1B2233', color: '#FFF', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer' }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => apiClient.request('/api/beta/bulk-reject', { method: 'POST', body: JSON.stringify({ waitlistIds: [u.id] }) }).then(fetchAdminData)}
                          style={{ padding: '0.3rem 0.65rem', borderRadius: '50px', background: '#BE4D4D', border: '1.5px solid #1B2233', color: '#FFF', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer' }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
