import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Users, Mail, Settings, AlertTriangle, Check, AlertCircle } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function PrivacyCenter({ userDetails }) {
  const isAdmin = userDetails?.is_admin === true;
  const [activeTab, setActiveTab] = useState('disclosure'); // 'disclosure', 'blocks', 'admin'
  const [blockedUsers, setBlockedUsers] = useState([]);
  
  // Admin states
  const [incidents, setIncidents] = useState([]);
  const [emailStats, setEmailStats] = useState(null);
  const [emailLogs, setEmailLogs] = useState([]);
  const [otpStats, setOtpStats] = useState(null);
  const [suspiciousOtps, setSuspiciousOtps] = useState([]);
  const [betaUsers, setBetaUsers] = useState([]);
  
  // Feedback
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchBlockedUsers = async () => {
    try {
      const data = await apiClient.request('/api/users/blocked');
      if (data.success) {
        setBlockedUsers(data.blocked || []);
      }
    } catch (err) {
      console.error('Error fetching blocked users:', err);
    }
  };

  const handleUnblock = async (blockedUserId) => {
    setError(null);
    setSuccess(null);
    try {
      const data = await apiClient.request('/api/users/unblock', {
        method: 'POST',
        body: JSON.stringify({ blockedUserId })
      });
      if (data.success) {
        setSuccess('User unblocked successfully.');
        fetchBlockedUsers();
      }
    } catch (err) {
      setError(err.message || 'Failed to unblock user.');
    }
  };

  // Admin loaders
  const loadAdminData = async () => {
    if (!isAdmin) return;
    try {
      const incData = await apiClient.request('/api/privacy/admin/incidents');
      if (incData.success) setIncidents(incData.incidents || []);

      const mailStatsData = await apiClient.request('/api/admin/email-stats');
      if (mailStatsData.success) setEmailStats(mailStatsData.stats);

      const mailLogsData = await apiClient.request('/api/admin/email-logs');
      if (mailLogsData.success) setEmailLogs(mailLogsData.logs || []);

      const otpStatsData = await apiClient.request('/api/admin/otp-stats');
      if (otpStatsData.success) {
        setOtpStats(otpStatsData.stats);
        setSuspiciousOtps(otpStatsData.suspicious || []);
      }

      const betaUsersData = await apiClient.request('/api/admin/beta-users');
      if (betaUsersData.success) setBetaUsers(betaUsersData.users || []);
    } catch (err) {
      console.error('Error loading admin control panel data:', err);
    }
  };

  useEffect(() => {
    fetchBlockedUsers();
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin]);

  const handleUpdateIncidentStatus = async (incidentId, status) => {
    setError(null);
    setSuccess(null);
    try {
      const data = await apiClient.request(`/api/privacy/admin/incidents/${incidentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      if (data.success) {
        setSuccess('Incident status updated.');
        loadAdminData();
      }
    } catch (err) {
      setError(err.message || 'Failed to update status.');
    }
  };

  const handleUserStatusUpdate = async (userId, status) => {
    setError(null);
    setSuccess(null);
    try {
      const data = await apiClient.request(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status })
      });
      if (data.success) {
        setSuccess(`User status successfully updated to ${status}.`);
        loadAdminData();
      }
    } catch (err) {
      setError(err.message || 'Failed to update user status.');
    }
  };

  const handleBetaAccessUpdate = async (userId, allowRequests, searchable) => {
    setError(null);
    setSuccess(null);
    try {
      const data = await apiClient.request(`/api/admin/users/${userId}/beta-access`, {
        method: 'POST',
        body: JSON.stringify({ allowRequests, searchable })
      });
      if (data.success) {
        setSuccess('Beta access configurations updated.');
        loadAdminData();
      }
    } catch (err) {
      setError(err.message || 'Failed to update beta access.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Title section */}
      <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontSize: '1.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Shield size={24} style={{ color: 'var(--color-primary)' }} /> Privacy & Safety Center
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
          Manage your blocked users list, read safety disclosures, or view admin telemetry controls.
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
          <Check size={18} style={{ flexShrink: 0 }} />
          <span>{success}</span>
        </div>
      )}

      {/* Tabs list */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '3px solid #111827', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'disclosure' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
          onClick={() => setActiveTab('disclosure')}
        >
          Disclosures & Info
        </button>
        <button
          className={`btn ${activeTab === 'blocks' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
          onClick={() => setActiveTab('blocks')}
        >
          Blocked Users ({blockedUsers.length})
        </button>
        {isAdmin && (
          <button
            className={`btn ${activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', color: '#B91C1C' }}
            onClick={() => setActiveTab('admin')}
          >
            Admin Mod Panel
          </button>
        )}
      </div>

      {/* TAB CONTENT: Disclosure */}
      {activeTab === 'disclosure' && (
        <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h3 style={{ margin: 0, fontWeight: 900, textTransform: 'uppercase', fontSize: '1.2rem' }}>How Swaply Protects Your Camera Feed</h3>
          
          <div style={{ display: 'flex', gap: '0.75rem', borderLeft: '4px solid var(--color-primary)', paddingLeft: '1rem', margin: '0.5rem 0' }}>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.5', margin: 0, color: 'var(--text-secondary)' }}>
              <strong>Best-Effort Browser Disclosures:</strong> Web-based capture protection uses PrintScreen keyboard listeners, Visibility API change triggers, and Window focus/blur trackers. These signals are best-effort, meaning a window blur is not absolute proof of a screenshot.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', borderLeft: '4px solid var(--color-success)', paddingLeft: '1rem', margin: '0.5rem 0' }}>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.5', margin: 0, color: 'var(--text-secondary)' }}>
              <strong>Zero Storage Principle:</strong> Swaply does not record your video feeds, store screenshots, or capture camera frames secretly to the backend. Video streams remain end-to-end peer connections.
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Block list */}
      {activeTab === 'blocks' && (
        <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontWeight: 900, textTransform: 'uppercase', fontSize: '1.2rem' }}>Blocked Connections</h3>
          
          {blockedUsers.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1.5rem 0' }}>
              Your blocked users list is currently empty.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {blockedUsers.map(user => (
                <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFF', border: '2px solid #111827', padding: '0.6rem 0.8rem', borderRadius: '6px', boxShadow: '2px 2px 0 #111827' }}>
                  <div>
                    <strong style={{ display: 'block' }}>@{user.username}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Blocked on: {new Date(user.created_at).toLocaleDateString()}</span>
                  </div>
                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }} onClick={() => handleUnblock(user.id)}>
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Admin Console */}
      {activeTab === 'admin' && isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Sub-section: Security Incidents */}
          <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontWeight: 900, textTransform: 'uppercase', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={20} style={{ color: 'var(--color-danger)' }} /> Capture Incidents Feed
            </h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table className="retro-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '3px solid #111827' }}>
                    <th style={{ padding: '0.5rem' }}>Offender</th>
                    <th style={{ padding: '0.5rem' }}>Victim</th>
                    <th style={{ padding: '0.5rem' }}>Event Type</th>
                    <th style={{ padding: '0.5rem' }}>Severity</th>
                    <th style={{ padding: '0.5rem' }}>Status</th>
                    <th style={{ padding: '0.5rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem 0' }}>No incidents reported yet.</td>
                    </tr>
                  ) : (
                    incidents.map(inc => (
                      <tr key={inc.id} style={{ borderBottom: '2px solid #111827' }}>
                        <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>@{inc.offender_username}</td>
                        <td style={{ padding: '0.5rem' }}>@{inc.victim_username}</td>
                        <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{inc.event_type}</td>
                        <td style={{ padding: '0.5rem' }}>
                          <span className={`status-tag ${inc.severity === 'critical' ? 'tag-danger' : 'tag-warning'}`} style={{ fontSize: '0.75rem' }}>
                            {inc.severity}
                          </span>
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <span className="status-tag tag-info" style={{ fontSize: '0.75rem' }}>{inc.status}</span>
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          {inc.status === 'NEW' && (
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button className="btn btn-primary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }} onClick={() => handleUpdateIncidentStatus(inc.id, 'RESOLVED')}>Resolve</button>
                              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }} onClick={() => handleUpdateIncidentStatus(inc.id, 'ESCALATED')}>Escalate</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sub-section: Email SMTP logs & stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontWeight: 900, textTransform: 'uppercase', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Mail size={20} /> SMTP Email Logs
              </h3>
              {emailStats && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                  <div>Total Sent: <strong>{emailStats.total}</strong></div>
                  <div>Successful: <strong style={{ color: 'var(--color-success)' }}>{emailStats.sent}</strong></div>
                  <div>Failed: <strong style={{ color: 'var(--color-danger)' }}>{emailStats.failed}</strong></div>
                  <div>OTP Verification: <strong>{emailStats.otp}</strong></div>
                </div>
              )}
              
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '2px solid #111827', borderRadius: '4px', background: '#FFF' }}>
                {emailLogs.length === 0 ? (
                  <p style={{ padding: '0.5rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0, fontSize: '0.8rem' }}>No logs.</p>
                ) : (
                  emailLogs.slice(0, 10).map(log => (
                    <div key={log.id} style={{ borderBottom: '1px solid #E5E7EB', padding: '0.4rem', fontSize: '0.75rem' }}>
                      <strong style={{ color: log.status === 'SENT' ? 'green' : 'red' }}>[{log.status}]</strong> {log.email_type} to <em>{log.recipient}</em>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sub-section: OTP Stats */}
            <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontWeight: 900, textTransform: 'uppercase', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={20} /> OTP Security Stats
              </h3>
              {otpStats && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', marginBottom: '1rem' }}>
                  <div>Total Verification Attempts: <strong>{otpStats.requests}</strong></div>
                  <div>Success Codes: <strong>{otpStats.successful}</strong></div>
                  <div>Failed/Active Codes: <strong>{otpStats.failed}</strong></div>
                  <div>Expired Codes: <strong>{otpStats.expired}</strong></div>
                </div>
              )}

              {/* Suspicious flood alarms */}
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--color-danger)' }}>Flood Alarms</h4>
              {suspiciousOtps.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic' }}>No anomalous OTP flooding patterns detected.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {suspiciousOtps.map((alarm, idx) => (
                    <div key={idx} style={{ background: 'rgba(239,68,68,0.08)', border: '1.5px solid var(--color-danger)', color: 'var(--color-danger)', padding: '0.4rem', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                      ⚠️ <strong>{alarm.email}</strong> requested {alarm.requests} codes in last 10m!
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sub-section: Beta Users Directory Mod */}
          <div className="glass-panel" style={{ padding: '1.5rem', border: '3px solid #111827', boxShadow: '5px 5px 0 #111827' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontWeight: 900, textTransform: 'uppercase', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={20} /> Beta Users Directory Moderator
            </h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table className="retro-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '3px solid #111827' }}>
                    <th style={{ padding: '0.5rem' }}>Beta ID</th>
                    <th style={{ padding: '0.5rem' }}>Username</th>
                    <th style={{ padding: '0.5rem' }}>Email</th>
                    <th style={{ padding: '0.5rem' }}>Status</th>
                    <th style={{ padding: '0.5rem' }}>Telemetry</th>
                    <th style={{ padding: '0.5rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {betaUsers.map(user => (
                    <tr key={user.id} style={{ borderBottom: '2px solid #111827' }}>
                      <td style={{ padding: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{user.beta_id}</td>
                      <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>@{user.username}</td>
                      <td style={{ padding: '0.5rem', fontSize: '0.8rem' }}>{user.email}</td>
                      <td style={{ padding: '0.5rem' }}>
                        <span className={`status-tag ${user.online_status === 'suspended' ? 'tag-danger' : user.email_verified ? 'tag-success' : 'tag-warning'}`} style={{ fontSize: '0.75rem' }}>
                          {user.online_status === 'suspended' ? 'SUSPENDED' : user.email_verified ? 'VERIFIED' : 'UNVERIFIED'}
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem', fontSize: '0.75rem', lineHeight: '1.3' }}>
                        Calls: {user.calls_completed}<br />
                        Privacy Alerts: {user.privacy_event_count}<br />
                        Reports: {user.report_count}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {user.online_status === 'suspended' ? (
                            <button className="btn btn-primary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }} onClick={() => handleUserStatusUpdate(user.id, 'offline')}>Restore</button>
                          ) : (
                            <button className="btn btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', color: 'red' }} onClick={() => handleUserStatusUpdate(user.id, 'suspended')}>Suspend</button>
                          )}
                          <button className="btn btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }} onClick={() => handleBetaAccessUpdate(user.id, false, false)}>Restrict Calling</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
