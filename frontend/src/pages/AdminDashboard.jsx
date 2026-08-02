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

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const loadAllAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, reportsRes, emailStatsRes, emailLogsRes, otpStatsRes, betaUsersRes, incidentsRes] = await Promise.allSettled([
        apiClient.request('/api/admin/stats'),
        apiClient.request('/api/admin/reports'),
        apiClient.request('/api/admin/email-stats'),
        apiClient.request('/api/admin/email-logs'),
        apiClient.request('/api/admin/otp-stats'),
        apiClient.request('/api/admin/beta-users'),
        apiClient.request('/api/privacy/admin/incidents')
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
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
      setError('Failed to fetch some administration metrics.');
    } finally {
      setLoading(false);
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
        </>
      )}

    </div>
  );
}
