import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, Activity, Users, Mail, AlertOctagon, 
  Search, Shield, Check, X, ArrowLeft, RefreshCw, Lock, Trash2 
} from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function AdminDashboard({ userDetails }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Stats data states
  const [stats, setStats] = useState({ totalUsers: 0, onlineUsers: 0, totalCalls: 0, flaggedMessages: 0 });
  const [reports, setReports] = useState([]);
  const [emailStats, setEmailStats] = useState({});
  const [emailLogs, setEmailLogs] = useState([]);
  const [otpStats, setOtpStats] = useState({});
  const [suspiciousAttempts, setSuspiciousAttempts] = useState([]);
  const [betaUsers, setBetaUsers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [lifecycleFilter, setLifecycleFilter] = useState('ALL');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('1_email_verification_otp');
  const [templateHtml, setTemplateHtml] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Phase 11: Beta Rollout State
  const [betaMetrics, setBetaMetrics] = useState({
    totalRegistered: 0,
    acceptedUsers: 0,
    invitedUsers: 0,
    readyUsers: 0,
    waitingQueue: 0,
    expiredUsers: 0,
    rejectedUsers: 0,
    acceptedToday: 0,
    availableSlots: 0,
    rolloutProgress: 0
  });
  const [betaConfig, setBetaConfig] = useState({ max_capacity: 150, daily_batch_size: 10, rollout_active: true, expiry_hours: 72 });
  const [betaWaitlistUsers, setBetaWaitlistUsers] = useState([]);
  const [betaFilterStatus, setBetaFilterStatus] = useState('ALL');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [capInput, setCapInput] = useState(150);
  const [batchInput, setBatchInput] = useState(10);

  useEffect(() => {
    if (activeTab === 'templates' && selectedTemplateKey) {
      apiClient.request(`/api/admin/email-templates/${selectedTemplateKey}`)
        .then((html) => {
          if (typeof html === 'string') {
            setTemplateHtml(html);
          }
        })
        .catch((err) => console.error('Error fetching email template preview:', err));
    }
  }, [activeTab, selectedTemplateKey]);

  const fetchBetaRolloutData = async () => {
    try {
      const [metricsRes, usersRes] = await Promise.allSettled([
        apiClient.request('/api/admin/beta/metrics'),
        apiClient.request(`/api/admin/beta/users?status=${betaFilterStatus}&search=${encodeURIComponent(searchQuery)}`)
      ]);

      if (metricsRes.status === 'fulfilled' && metricsRes.value.success) {
        setBetaMetrics(metricsRes.value.metrics || {});
        setBetaConfig(metricsRes.value.config || {});
        setCapInput(metricsRes.value.config?.max_capacity || 150);
        setBatchInput(metricsRes.value.config?.daily_batch_size || 10);
      }
      if (usersRes.status === 'fulfilled' && usersRes.value.success) {
        setBetaWaitlistUsers(usersRes.value.users || []);
      }
    } catch (e) {
      console.error('Error fetching beta rollout data:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'beta_rollout') {
      fetchBetaRolloutData();
    }
  }, [activeTab, betaFilterStatus, searchQuery]);

  const loadAllAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, reportsRes, emailStatsRes, emailLogsRes, otpStatsRes, betaUsersRes, incidentsRes, delReqRes] = await Promise.allSettled([
        apiClient.request('/api/admin/stats'),
        apiClient.request('/api/admin/reports'),
        apiClient.request('/api/admin/email-stats'),
        apiClient.request('/api/admin/email-logs'),
        apiClient.request('/api/admin/otp-stats'),
        apiClient.request('/api/admin/beta-users'),
        apiClient.request('/api/privacy/admin/incidents'),
        apiClient.request('/api/admin/deletion-requests')
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.success) setStats(statsRes.value.stats);
      if (reportsRes.status === 'fulfilled' && reportsRes.value.success) setReports(reportsRes.value.reports || []);
      if (emailStatsRes.status === 'fulfilled' && emailStatsRes.value.success) setEmailStats(emailStatsRes.value.stats || {});
      if (emailLogsRes.status === 'fulfilled' && emailLogsRes.value.success) setEmailLogs(emailLogsRes.value.logs || []);
      if (otpStatsRes.status === 'fulfilled' && otpStatsRes.value.success) {
        setOtpStats(otpStatsRes.value.stats || {});
        setSuspiciousAttempts(otpStatsRes.value.suspicious || []);
      }
      if (betaUsersRes.status === 'fulfilled' && betaUsersRes.value.success) setBetaUsers(betaUsersRes.value.users || []);
      if (incidentsRes.status === 'fulfilled' && incidentsRes.value.success) setIncidents(incidentsRes.value.incidents || []);
      if (delReqRes.status === 'fulfilled' && delReqRes.value.success) setDeletionRequests(delReqRes.value.requests || []);

      await fetchBetaRolloutData();
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
      setError('Failed to fetch some administration metrics.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecBetaControl = async (action, payload = {}) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await apiClient.request('/api/admin/beta/controls', {
        method: 'POST',
        body: JSON.stringify({ action, ...payload })
      });
      if (res && res.success) {
        setSuccess(res.message || 'Action executed successfully');
        await fetchBetaRolloutData();
      } else {
        setError(res.error || 'Failed to execute control action');
      }
    } catch (err) {
      setError(err.message || 'Server error executing control action');
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const handleUpdateReportStatus = async (reportId, status) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await apiClient.request(`/api/admin/reports/${reportId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status })
      });
      if (res.success) {
        setSuccess(`Report status updated to ${status}`);
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
      }
    } catch (err) {
      setError('Failed to update report status.');
    }
  };

  const handleUpdateIncidentStatus = async (incidentId, status) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await apiClient.request(`/api/privacy/admin/incidents/${incidentId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status })
      });
      if (res.success) {
        setSuccess(`Incident updated to ${status}`);
        setIncidents(prev => prev.map(i => i.id === incidentId ? { ...i, status } : i));
      }
    } catch (err) {
      setError('Failed to update incident status.');
    }
  };

  const handleToggleUserSuspension = async (userId, currentStatus) => {
    setError(null);
    setSuccess(null);
    const isCurrentlySuspended = currentStatus === 'suspended';
    const newStatus = isCurrentlySuspended ? 'active' : 'suspended';
    
    // Fast Optimistic UI Update
    setBetaUsers(prev => prev.map(u => 
      u.id === userId 
        ? { ...u, online_status: newStatus === 'suspended' ? 'suspended' : 'offline', is_suspended: newStatus === 'suspended' } 
        : u
    ));

    try {
      const res = await apiClient.request(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.success) {
        setSuccess(`User status updated to ${newStatus}`);
      } else {
        // Rollback on failure
        setBetaUsers(prev => prev.map(u => u.id === userId ? { ...u, online_status: currentStatus, is_suspended: isCurrentlySuspended } : u));
        setError('Failed to update user status.');
      }
    } catch (err) {
      setBetaUsers(prev => prev.map(u => u.id === userId ? { ...u, online_status: currentStatus, is_suspended: isCurrentlySuspended } : u));
      setError('Failed to update user status.');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to permanently delete user @${username}? This action cannot be undone.`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    // Fast Optimistic Removal
    const previousUsers = [...betaUsers];
    setBetaUsers(prev => prev.filter(u => u.id !== userId));

    const endpoints = [
      { path: `/api/admin/users/${userId}`, method: 'DELETE' },
      { path: `/api/admin/users/${userId}/delete`, method: 'POST' },
      { path: `/api/admin/delete-user/${userId}`, method: 'DELETE' },
      { path: `/api/admin/delete-user/${userId}`, method: 'POST' }
    ];

    let lastError = null;
    let res = null;

    for (const ep of endpoints) {
      try {
        res = await apiClient.request(ep.path, { method: ep.method });
        if (res && res.success) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (res && res.success) {
      setSuccess(`Account @${username} permanently deleted.`);
    } else {
      setBetaUsers(previousUsers);
      setError(lastError?.message || 'Failed to delete user account. Server updating...');
    }
  };

  const handleToggleBetaAccess = async (userId, currentAccess) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await apiClient.request(`/api/admin/users/${userId}/beta-access`, {
        method: 'POST',
        body: JSON.stringify({ allowed: !currentAccess })
      });
      if (res.success) {
        setSuccess(`User Beta access updated successfully`);
        const betaUsersRes = await apiClient.request('/api/admin/beta-users');
        if (betaUsersRes.success) setBetaUsers(betaUsersRes.users || []);
      }
    } catch (err) {
      setError('Failed to update user beta access.');
    }
  };

  // Filtered Beta Users
  const filteredUsers = betaUsers.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.beta_id && u.beta_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #111827', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={() => navigate('/dashboard')} className="header-icon-btn" style={{ padding: '0.4rem' }}>
            <ArrowLeft size={18} />
          </button>
          <h2 style={{ margin: 0, fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Shield size={22} style={{ color: '#E11D48' }} />
            Security Hub
          </h2>
        </div>
        <button onClick={loadAllAdminData} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <RefreshCw size={12} />
          Reload
        </button>
      </div>

      {/* Notifications banner */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '3px solid #111827', background: '#FEE2E2', padding: '0.75rem', borderRadius: '6px', color: '#B91C1C', fontSize: '0.85rem', boxShadow: '3px 3px 0 #111827' }}>
          <AlertOctagon size={18} style={{ flexShrink: 0 }} />
          <strong>{error}</strong>
        </div>
      )}

      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '3px solid #111827', background: '#ECFDF5', padding: '0.75rem', borderRadius: '6px', color: '#047857', fontSize: '0.85rem', boxShadow: '3px 3px 0 #111827' }}>
          <Check size={18} style={{ flexShrink: 0 }} />
          <strong>{success}</strong>
        </div>
      )}

      {/* Admin Panel Nav Tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        <button 
          className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
          onClick={() => setActiveTab('users')}
        >
          Beta Directory ({betaUsers.length})
        </button>
        <button 
          className={`btn ${activeTab === 'beta_rollout' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
          onClick={() => setActiveTab('beta_rollout')}
        >
          ⚡ Smart Beta Rollout ({betaMetrics.waitingQueue || 0})
        </button>
        <button 
          className={`btn ${activeTab === 'safety' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
          onClick={() => setActiveTab('safety')}
        >
          Complaints & Incidents
        </button>
        <button 
          className={`btn ${activeTab === 'email' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
          onClick={() => setActiveTab('email')}
        >
          Mail & Logs
        </button>
        <button 
          className={`btn ${activeTab === 'lifecycle' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
          onClick={() => setActiveTab('lifecycle')}
        >
          Account Lifecycle ({deletionRequests.length})
        </button>
        <button 
          className={`btn ${activeTab === 'templates' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
          onClick={() => setActiveTab('templates')}
        >
          Email Showcase (24)
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
          FETCHING SECURITY METRICS...
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div className="stat-card-retro">
                  <span className="stat-card-label">TOTAL NODES</span>
                  <span className="stat-card-value" style={{ color: '#3B82F6' }}>{stats.totalUsers}</span>
                </div>
                <div className="stat-card-retro">
                  <span className="stat-card-label">ONLINE NODES</span>
                  <span className="stat-card-value" style={{ color: '#10B981' }}>{stats.onlineUsers}</span>
                </div>
                <div className="stat-card-retro">
                  <span className="stat-card-label">SECURE CALLS</span>
                  <span className="stat-card-value" style={{ color: '#8B5CF6' }}>{stats.totalCalls}</span>
                </div>
                <div className="stat-card-retro">
                  <span className="stat-card-label">FLAGGED COMPLAINTS</span>
                  <span className="stat-card-value" style={{ color: '#EF4444' }}>{reports.filter(r => r.status === 'PENDING').length}</span>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem', border: '3px solid #111827', boxShadow: '4px 4px 0 #111827' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldAlert size={18} style={{ color: '#E11D48' }} /> Safety Diagnostics
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #CCC', paddingBottom: '0.4rem' }}>
                    <span>Active Verification Codes:</span>
                    <strong>{otpStats.activeCount || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #CCC', paddingBottom: '0.4rem' }}>
                    <span>Total Email Dispatches:</span>
                    <strong>{emailStats.totalSent || 0}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #CCC', paddingBottom: '0.4rem' }}>
                    <span>SMTP Engine Mode:</span>
                    <strong style={{ color: emailStats.localFallback ? '#F59E0B' : '#10B981' }}>
                      {emailStats.localFallback ? 'LOCAL LOGS FALLBACK' : 'LIVE SMTP'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BETA DIRECTORY */}
          {activeTab === 'users' && (
            <div className="glass-panel" style={{ padding: '1.25rem', border: '3px solid #111827', boxShadow: '4px 4px 0 #111827' }}>
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Search by username, email, or Beta ID..." 
                  style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {filteredUsers.length === 0 ? (
                <div className="empty-state">No matching users found in the system registry.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {filteredUsers.map(user => (
                    <div 
                      key={user.id} 
                      style={{ 
                        border: '2px solid #111827', 
                        borderRadius: '6px', 
                        padding: '0.75rem', 
                        background: '#FFF', 
                        boxShadow: '2px 2px 0 #111827',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem' }}>{user.name}</strong>
                          <span style={{ fontSize: '0.8rem', color: '#6B7280', display: 'block' }}>@{user.username} • {user.email}</span>
                          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', display: 'block', marginTop: '0.2rem' }}>
                            Beta ID: <strong style={{ color: '#E11D48' }}>{user.beta_id || 'N/A'}</strong>
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <span className={`badge ${user.online_status === 'online' ? 'badge-success' : 'badge-secondary'}`}>
                            {user.online_status}
                          </span>
                          {user.is_suspended && (
                            <span className="badge" style={{ background: '#EF4444', color: '#FFF' }}>SUSPENDED</span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem', borderTop: '1px dashed #EEE', paddingTop: '0.5rem' }}>
                        <button 
                          className={`btn ${user.online_status === 'suspended' || user.is_suspended ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => handleToggleUserSuspension(user.id, (user.online_status === 'suspended' || user.is_suspended) ? 'suspended' : 'active')}
                        >
                          {(user.online_status === 'suspended' || user.is_suspended) ? 'Unsuspend' : 'Suspend User'}
                        </button>
                        <button 
                          className="btn btn-secondary"
                          style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => handleToggleBetaAccess(user.id, user.searchable)}
                        >
                          {user.searchable ? 'Revoke Beta' : 'Grant Beta'}
                        </button>
                        <button 
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#BE4D4D', borderColor: '#BE4D4D', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          title="Delete Account Permanently"
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COMPLAINTS & INCIDENTS */}
          {activeTab === 'safety' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Complaints Table */}
              <div className="glass-panel" style={{ padding: '1.25rem', border: '3px solid #111827', boxShadow: '4px 4px 0 #111827' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertOctagon size={18} /> Safety Complaints
                </h3>
                {reports.length === 0 ? (
                  <div className="empty-state">No safety complaints logged.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {reports.map((report) => (
                      <div key={report.id} style={{ border: '2px solid #111827', borderRadius: '6px', padding: '0.75rem', background: '#FFF', boxShadow: '2px 2px 0 #111827' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                            By <strong>@{report.reporter_username}</strong> against <strong style={{ color: '#EF4444' }}>@{report.reported_username}</strong>
                          </span>
                          <span className={`badge ${report.status === 'PENDING' ? 'badge-primary' : 'badge-secondary'}`}>{report.status}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', margin: '0.3rem 0' }}>
                          <strong>Reason:</strong> {report.reason}
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#4B5563', margin: '0.2rem 0' }}>{report.description}</p>
                        
                        {report.status === 'PENDING' && (
                          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem', borderTop: '1px dashed #EEE', paddingTop: '0.5rem' }}>
                            <button className="btn btn-secondary" style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.7rem' }} onClick={() => handleUpdateReportStatus(report.id, 'REVIEWED')}>Review</button>
                            <button className="btn btn-primary" style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.7rem' }} onClick={() => handleUpdateReportStatus(report.id, 'ACTION_TAKEN')}>Resolve</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Incidents Table */}
              <div className="glass-panel" style={{ padding: '1.25rem', border: '3px solid #111827', boxShadow: '4px 4px 0 #111827' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldAlert size={18} style={{ color: '#E11D48' }} /> Capture Incidents Feed
                </h3>
                {incidents.length === 0 ? (
                  <div className="empty-state">No capture incidents detected.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {incidents.map((inc) => (
                      <div key={inc.id} style={{ border: '2px solid #111827', borderRadius: '6px', padding: '0.75rem', background: '#FFF', boxShadow: '2px 2px 0 #111827' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                            Offender: <strong style={{ color: '#EF4444' }}>@{inc.offender_username}</strong>
                          </span>
                          <span className={`badge ${inc.status === 'PENDING' ? 'badge-primary' : 'badge-secondary'}`}>{inc.status}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem' }}>
                          Event: <strong style={{ color: '#E11D48' }}>{inc.event_type}</strong>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.2rem' }}>
                          Victim: @{inc.victim_username} • Browser: {inc.browser_info || 'Unknown'}
                        </div>
                        
                        {inc.status === 'PENDING' && (
                          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem', borderTop: '1px dashed #EEE', paddingTop: '0.5rem' }}>
                            <button className="btn btn-secondary" style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.7rem' }} onClick={() => handleUpdateIncidentStatus(inc.id, 'REVIEWED')}>Review</button>
                            <button className="btn btn-primary" style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.7rem' }} onClick={() => handleUpdateIncidentStatus(inc.id, 'RESOLVED')}>Resolve</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: MAIL & LOGS */}
          {activeTab === 'email' && (
            <div className="glass-panel" style={{ padding: '1.25rem', border: '3px solid #111827', boxShadow: '4px 4px 0 #111827' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={18} /> Automated Email Activity Log
              </h3>
              {emailLogs.length === 0 ? (
                <div className="empty-state">No email activity logs recorded.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {emailLogs.map((log) => (
                    <div 
                      key={log.id} 
                      style={{ 
                        border: '1.5px solid #111827', 
                        borderRadius: '4px', 
                        padding: '0.5rem 0.75rem', 
                        background: '#F9FAFB',
                        fontSize: '0.8rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <strong>{log.email_type}</strong>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: 'bold',
                          color: log.status === 'SENT' ? '#10B981' : '#F59E0B' 
                        }}>
                          {log.status}
                        </span>
                      </div>
                      <div style={{ color: '#4B5563' }}>Recipient: {log.recipient_email}</div>
                      <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ACCOUNT LIFECYCLE */}
          {activeTab === 'lifecycle' && (
            <div className="glass-panel" style={{ padding: '1.25rem', border: '3px solid #111827', boxShadow: '4px 4px 0 #111827' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <ShieldAlert size={18} style={{ color: '#E11D48' }} /> Account Lifecycle & Deletion Requests
                </h3>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {['ALL', 'PENDING_DELETION', 'RECOVERED', 'PERMANENTLY_DELETED'].map(st => (
                    <button
                      key={st}
                      className={`btn ${lifecycleFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
                      onClick={() => setLifecycleFilter(st)}
                    >
                      {st === 'PENDING_DELETION' ? 'PENDING' : st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {deletionRequests.filter(r => lifecycleFilter === 'ALL' || r.deletion_status === lifecycleFilter).length === 0 ? (
                <div className="empty-state">No deletion requests matching filter.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {deletionRequests
                    .filter(r => lifecycleFilter === 'ALL' || r.deletion_status === lifecycleFilter)
                    .map((req) => (
                      <div 
                        key={req.id}
                        style={{ 
                          border: '2px solid #111827', 
                          borderRadius: '6px', 
                          padding: '0.75rem', 
                          background: '#FFF', 
                          boxShadow: '2px 2px 0 #111827',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <strong style={{ fontSize: '0.9rem' }}>@{req.username || 'Deleted User'}</strong>
                            <span style={{ fontSize: '0.75rem', color: '#6B7280', display: 'block' }}>{req.email || 'No Email'} • Beta ID: {req.beta_id || 'N/A'}</span>
                          </div>
                          <span className="badge" style={{
                            background: req.deletion_status === 'PENDING_DELETION' ? '#EF4444' : req.deletion_status === 'RECOVERED' ? '#10B981' : '#6B7280',
                            color: '#FFF'
                          }}>
                            {req.deletion_status}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.8rem', color: '#374151', background: '#F9FAFB', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid #E5E7EB' }}>
                          <strong>Reason:</strong> {req.deletion_reason || 'N/A'}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#6B7280', fontFamily: 'var(--font-mono)' }}>
                          <span>Requested: {new Date(req.deletion_requested_at).toLocaleString()}</span>
                          <span>Scheduled: {new Date(req.scheduled_deletion_at).toLocaleString()}</span>
                          {req.recovered_at && <span style={{ color: '#10B981' }}>Recovered: {new Date(req.recovered_at).toLocaleString()}</span>}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: EMAIL TEMPLATES SHOWCASE */}
          {activeTab === 'templates' && (
            <div className="glass-panel" style={{ padding: '1.25rem', border: '3px solid #111827', boxShadow: '4px 4px 0 #111827' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Mail size={20} style={{ color: '#2563EB' }} /> SwaplyOne HTML Email Design System (24 Templates)
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Tagline: "In a Deep Ocean of Skills." &bull; Table-Based Inline CSS HTML Email Showcase</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label htmlFor="template-picker" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Template:</label>
                  <select
                    id="template-picker"
                    value={selectedTemplateKey}
                    onChange={(e) => setSelectedTemplateKey(e.target.value)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      border: '2px solid #111827',
                      fontWeight: 'bold',
                      fontSize: '0.8rem',
                      background: '#FFF',
                      cursor: 'pointer'
                    }}
                  >
                    {[
                      { key: '1_email_verification_otp', label: '1. Email Verification OTP' },
                      { key: '2_welcome_to_swaplyone', label: '2. Welcome to SwaplyOne' },
                      { key: '3_beta_registration_successful', label: '3. Beta Registration Successful' },
                      { key: '4_beta_waitlist_confirmation', label: '4. Beta Waitlist Confirmation' },
                      { key: '5_beta_invitation', label: '5. Beta Invitation' },
                      { key: '6_beta_accepted', label: '6. Beta Accepted' },
                      { key: '7_rollout_update', label: '7. Rollout Update' },
                      { key: '8_friend_request_received', label: '8. Friend Request Received' },
                      { key: '9_friend_request_accepted', label: '9. Friend Request Accepted' },
                      { key: '10_password_reset_otp', label: '10. Password Reset OTP' },
                      { key: '11_email_change_verification', label: '11. Email Change Verification' },
                      { key: '12_new_device_login_alert', label: '12. New Device Login Alert' },
                      { key: '13_security_alert', label: '13. Security Alert' },
                      { key: '14_privacy_warning', label: '14. Screenshot / Privacy Warning' },
                      { key: '15_call_missed_notification', label: '15. Call Missed Notification' },
                      { key: '16_call_summary', label: '16. Call Summary' },
                      { key: '17_account_scheduled_deletion', label: '17. Account Scheduled for Deletion' },
                      { key: '18_account_recovery_successful', label: '18. Account Recovery Successful' },
                      { key: '19_account_permanently_deleted', label: '19. Account Permanently Deleted' },
                      { key: '20_feature_announcement', label: '20. Feature Announcement' },
                      { key: '21_maintenance_notification', label: '21. Maintenance Notification' },
                      { key: '22_admin_announcement', label: '22. Admin Announcement' },
                      { key: '23_beta_feedback_request', label: '23. Beta Feedback Request' },
                      { key: '24_weekly_product_updates', label: '24. Weekly Product Updates' }
                    ].map(t => (
                      <option key={t.key} value={t.key}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Template Preview Stage */}
              <div style={{
                background: '#F1F5F9',
                border: '2px solid #111827',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                justifyContent: 'center',
                minHeight: '620px'
              }}>
                <iframe
                  title="SwaplyOne Email Template Live Preview"
                  srcDoc={templateHtml || '<p style="font-family:sans-serif;padding:20px;">Loading SwaplyOne Email Template...</p>'}
                  style={{
                    width: '100%',
                    maxWidth: '650px',
                    height: '620px',
                    border: '3px solid #111827',
                    borderRadius: '12px',
                    boxShadow: '4px 4px 0 #111827',
                    background: '#FFF'
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 7: SMART BETA ROLLOUT MANAGEMENT */}
          {activeTab === 'beta_rollout' && (
            <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '6px 6px 0 #111827', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Header & Controls Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '2px solid #E5E7EB', paddingBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={22} style={{ color: 'var(--color-primary)' }} /> Smart Beta Waitlist & Batch Rollout System
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Automated Slot Allocator &bull; Capacity: <strong>{betaConfig.max_capacity} Users</strong> &bull; Batch Rate: <strong>{betaConfig.daily_batch_size}/Day</strong> &bull; Expiry: <strong>{betaConfig.expiry_hours}h</strong>
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 'bold' }}
                    onClick={() => handleExecBetaControl('approve_batch')}
                  >
                    ⚡ Approve Today's Batch ({betaMetrics.readyUsers})
                  </button>
                  <button
                    className={`btn ${betaConfig.rollout_active ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 'bold' }}
                    onClick={() => handleExecBetaControl(betaConfig.rollout_active ? 'pause_rollout' : 'resume_rollout')}
                  >
                    {betaConfig.rollout_active ? '⏸ Pause Rollout' : '▶ Resume Rollout'}
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 'bold' }}
                    onClick={() => setShowConfigModal(true)}
                  >
                    ⚙️ Limits & Capacity
                  </button>
                  <a
                    href="/api/admin/beta/report"
                    download="swaply_beta_rollout_report.csv"
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'none' }}
                  >
                    📥 Download CSV Report
                  </a>
                </div>
              </div>

              {/* Metrics Grid & Capacity Fill Gauge */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div style={{ background: '#FFF', padding: '1rem', borderRadius: '8px', border: '2px solid #111827', boxShadow: '3px 3px 0 #111827' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Registered</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#111827' }}>{betaMetrics.totalRegistered}</div>
                </div>
                <div style={{ background: '#FEF3C7', padding: '1rem', borderRadius: '8px', border: '2px solid #111827', boxShadow: '3px 3px 0 #111827' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase' }}>Waiting Queue</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#78350F' }}>{betaMetrics.waitingQueue}</div>
                </div>
                <div style={{ background: '#E0F2FE', padding: '1rem', borderRadius: '8px', border: '2px solid #111827', boxShadow: '3px 3px 0 #111827' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#075985', textTransform: 'uppercase' }}>Ready for Rollout</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0369A1' }}>{betaMetrics.readyUsers}</div>
                </div>
                <div style={{ background: '#FDE68A', padding: '1rem', borderRadius: '8px', border: '2px solid #111827', boxShadow: '3px 3px 0 #111827' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase' }}>Invited (Pending)</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#B45309' }}>{betaMetrics.invitedUsers}</div>
                </div>
                <div style={{ background: '#D1FAE5', padding: '1rem', borderRadius: '8px', border: '2px solid #111827', boxShadow: '3px 3px 0 #111827' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase' }}>Accepted Users</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#047857' }}>{betaMetrics.acceptedUsers}</div>
                </div>
                <div style={{ background: '#FEE2E2', padding: '1rem', borderRadius: '8px', border: '2px solid #111827', boxShadow: '3px 3px 0 #111827' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase' }}>Expired / Reallocated</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#B91C1C' }}>{betaMetrics.expiredUsers}</div>
                </div>
              </div>

              {/* Progress Gauge */}
              <div style={{ background: '#FAF6EE', border: '2px solid #111827', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.4rem' }}>
                  <span>Beta Network Capacity Fill Progress</span>
                  <span>{betaMetrics.acceptedUsers} / {betaConfig.max_capacity} Users ({betaMetrics.rolloutProgress}%)</span>
                </div>
                <div style={{ height: '14px', background: '#E5E7EB', borderRadius: '7px', border: '1.5px solid #111827', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, betaMetrics.rolloutProgress)}%`, background: 'var(--color-primary)', transition: 'width 0.4s ease' }} />
                </div>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {['ALL', 'READY_FOR_ROLLOUT', 'INVITED', 'ACCEPTED', 'WAITING_QUEUE', 'EXPIRED', 'REJECTED'].map(st => (
                    <button
                      key={st}
                      className={`btn ${betaFilterStatus === st ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      onClick={() => setBetaFilterStatus(st)}
                    >
                      {st.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Search by Username, Email or Beta ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: '2px solid #111827',
                    fontSize: '0.8rem',
                    width: '240px'
                  }}
                />
              </div>

              {/* Interactive User Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#111827', color: '#FFF', textAlign: 'left' }}>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Pos #</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>User / Email</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Beta ID</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Status</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Batch</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Registered</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Expiry / Notes</th>
                      <th style={{ padding: '0.6rem 0.8rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {betaWaitlistUsers.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                          No beta waitlist entries match the current filter.
                        </td>
                      </tr>
                    ) : (
                      betaWaitlistUsers.map((u) => (
                        <tr key={u.id} style={{ borderBottom: '1px solid #E5E7EB', background: u.rollout_status === 'INVITED' ? '#FFFBEB' : '#FFF' }}>
                          <td style={{ padding: '0.6rem 0.8rem', fontWeight: 900, fontFamily: 'var(--font-mono)' }}>
                            #{u.waitlist_position || '-'}
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem' }}>
                            <strong style={{ display: 'block' }}>@{u.username}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{u.email}</span>
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                            {u.beta_id}
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem' }}>
                            <span style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              border: '1px solid #111827',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              background:
                                u.rollout_status === 'ACCEPTED' ? '#D1FAE5' :
                                u.rollout_status === 'INVITED' ? '#FEF3C7' :
                                u.rollout_status === 'READY_FOR_ROLLOUT' ? '#E0F2FE' :
                                u.rollout_status === 'EXPIRED' ? '#FEE2E2' : '#F3F4F6'
                            }}>
                              {u.rollout_status}
                            </span>
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem', fontFamily: 'var(--font-mono)' }}>
                            Batch {u.rollout_batch || 1}
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {new Date(u.registration_timestamp).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.75rem' }}>
                            {u.invitation_expiry_time ? (
                              <span style={{ color: new Date(u.invitation_expiry_time) < new Date() ? '#EF4444' : '#D97706', fontWeight: 'bold' }}>
                                {new Date(u.invitation_expiry_time).toLocaleString()}
                              </span>
                            ) : (u.admin_notes || 'N/A')}
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
                              {(u.rollout_status === 'READY_FOR_ROLLOUT' || u.rollout_status === 'WAITING_QUEUE') && (
                                <button
                                  className="btn btn-primary"
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                                  onClick={() => handleExecBetaControl('approve_selected', { ids: [u.id] })}
                                >
                                  Invite
                                </button>
                              )}
                              {u.rollout_status === 'INVITED' && (
                                <>
                                  <button
                                    className="btn btn-secondary"
                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                                    onClick={() => handleExecBetaControl('extend_invitation', { waitlistId: u.id })}
                                  >
                                    +48h
                                  </button>
                                  <button
                                    className="btn btn-secondary"
                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: '#EF4444' }}
                                    onClick={() => handleExecBetaControl('cancel_invitation', { waitlistId: u.id })}
                                  >
                                    Revoke
                                  </button>
                                </>
                              )}
                              {u.rollout_status !== 'REJECTED' && u.rollout_status !== 'ACCEPTED' && (
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: '#DC2626' }}
                                  onClick={() => handleExecBetaControl('reject_user', { waitlistId: u.id, reason: 'Admin rejected' })}
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Configuration Modal */}
              {showConfigModal && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999
                }}>
                  <div className="glass-panel" style={{ padding: '2rem', maxWidth: '420px', width: '90%', border: '3px solid #111827', background: '#FFF' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 900, textTransform: 'uppercase' }}>
                      ⚙️ Configure Beta Rollout Limits
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>
                          Maximum Beta Network Capacity (Users)
                        </label>
                        <input
                          type="number"
                          value={capInput}
                          onChange={(e) => setCapInput(parseInt(e.target.value) || 0)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '2px solid #111827', fontSize: '0.9rem', fontWeight: 'bold' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>
                          Daily Batch Rollout Size (Users / Day)
                        </label>
                        <input
                          type="number"
                          value={batchInput}
                          onChange={(e) => setBatchInput(parseInt(e.target.value) || 0)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '2px solid #111827', fontSize: '0.9rem', fontWeight: 'bold' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setShowConfigModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          handleExecBetaControl('update_config', { config: { max_capacity: capInput, daily_batch_size: batchInput } });
                          setShowConfigModal(false);
                        }}
                      >
                        Save Configuration
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}
        </>
      )}

    </div>
  );
}
