import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserX, AlertCircle, FileText, HelpCircle, ChevronRight } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.protocol + '//' + window.location.hostname + ':5000');

export default function SafetyCenter({ authToken }) {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('guidelines'); // guidelines, blocks, reports, disclosure

  const fetchSafetyData = async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      // Fetch blocked users
      const blockRes = await fetch(`${BACKEND_URL}/api/users/blocks`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const blockData = await blockRes.json();
      if (blockData.success) {
        setBlockedUsers(blockData.blocks || []);
      }

      // Fetch my filed reports
      const reportsRes = await fetch(`${BACKEND_URL}/api/users/reports/my`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const reportsData = await reportsRes.json();
      if (reportsData.success) {
        setMyReports(reportsData.reports || []);
      }
    } catch (err) {
      console.error('Error fetching safety data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSafetyData();
  }, [authToken]);

  const handleUnblock = async (username) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/unblock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      if (data.success) {
        fetchSafetyData();
      }
    } catch (err) {
      console.error('Error unblocking user:', err);
    }
  };

  return (
    <div className="safety-center-container" style={containerStyle}>
      <h3 style={headerStyle}>
        <ShieldCheck style={{ color: 'var(--color-primary)' }} />
        <span>🔒 Swaply Safety Center</span>
      </h3>

      <div style={layoutStyle}>
        {/* Navigation Sidebar */}
        <div style={sidebarStyle}>
          <button
            style={navBtnStyle(activeSubTab === 'guidelines')}
            onClick={() => setActiveSubTab('guidelines')}
          >
            <HelpCircle size={16} />
            <span>Guidelines & Recommendations</span>
          </button>
          <button
            style={navBtnStyle(activeSubTab === 'blocks')}
            onClick={() => setActiveSubTab('blocks')}
          >
            <UserX size={16} />
            <span>Blocked Users ({blockedUsers.length})</span>
          </button>
          <button
            style={navBtnStyle(activeSubTab === 'reports')}
            onClick={() => setActiveSubTab('reports')}
          >
            <AlertCircle size={16} />
            <span>My Submitted Reports ({myReports.length})</span>
          </button>
          <button
            style={navBtnStyle(activeSubTab === 'disclosure')}
            onClick={() => setActiveSubTab('disclosure')}
          >
            <FileText size={16} />
            <span>Web Privacy Disclosures</span>
          </button>
        </div>

        {/* Content Area */}
        <div style={contentStyle}>
          {activeSubTab === 'guidelines' && (
            <div>
              <h4 style={titleStyle}>Safety Guidelines & Recommendations</h4>
              <div style={cardStyle}>
                <p>Your privacy and safety are our highest priority during this beta period.</p>
                <ul style={listStyle}>
                  <li>
                    <strong>Never share sensitive details:</strong> Do not share passwords, OTP codes, addresses, phone numbers, or private documents.
                  </li>
                  <li>
                    <strong>Suspect abuse? Take action:</strong> If someone threatens you, misuses your content, or behaves abusively:
                    <ol style={{ marginTop: '0.4rem', paddingLeft: '1.2rem' }}>
                      <li>End the interaction immediately.</li>
                      <li>Block the user (stops future calls and messaging).</li>
                      <li>Report the account to trigger admin review.</li>
                    </ol>
                  </li>
                  <li>
                    <strong>Contact authorities:</strong> Reach out to appropriate local law enforcement when there is an immediate threat or extortion.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeSubTab === 'blocks' && (
            <div>
              <h4 style={titleStyle}>Blocked Users</h4>
              {blockedUsers.length === 0 ? (
                <p style={emptyStyle}>You have not blocked any users yet.</p>
              ) : (
                <div style={listContainerStyle}>
                  {blockedUsers.map((u) => (
                    <div key={u.blocked_username} style={listItemStyle}>
                      <div>
                        <strong>@{u.blocked_username}</strong>
                        <span style={subtextStyle}>Blocked on {new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                        onClick={() => handleUnblock(u.blocked_username)}
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'reports' && (
            <div>
              <h4 style={titleStyle}>My Submitted Reports</h4>
              {myReports.length === 0 ? (
                <p style={emptyStyle}>You have not submitted any abuse reports.</p>
              ) : (
                <div style={listContainerStyle}>
                  {myReports.map((r) => (
                    <div key={r.id} style={{ ...listItemStyle, flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <strong>Report #{r.id} against @{r.reported_username}</strong>
                        <span style={badgeStyle(r.status)}>{r.status}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>
                        <strong>Reason:</strong> {r.reason}
                      </p>
                      {r.description && (
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <strong>Notes:</strong> {r.description}
                        </p>
                      )}
                      <span style={subtextStyle}>Filed on {new Date(r.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'disclosure' && (
            <div>
              <h4 style={titleStyle}>Web Privacy & Capture Disclosures</h4>
              <div style={cardStyle}>
                <p style={{ fontWeight: 'bold' }}>Important limitations of web-based privacy tools:</p>
                <p style={disclosureTextStyle}>
                  Swaply uses browser-supported APIs to identify possible capture and screenshot events.
                  However, web browsers operate in sandboxed environments and cannot guarantee detection of all operating system-level screenshot mechanisms or external recording devices.
                </p>
                <p style={disclosureTextStyle}>
                  Swaply does NOT claim that screen capture is technically impossible on web clients.
                  The future native Swaply mobile applications will enforce absolute OS-level screenshot and hardware rendering blocks.
                </p>
                <p style={disclosureTextStyle}>
                  We encourage users to remain cautious and report any suspected misuse or harassment immediately.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Styling definitions (Neobrutalist Theme match)
const containerStyle = {
  background: '#FFFDF8',
  border: '4px solid #111827',
  borderRadius: '12px',
  boxShadow: '4px 4px 0px #111827',
  padding: '1.5rem',
  marginTop: '1rem',
  textAlign: 'left'
};

const headerStyle = {
  fontFamily: 'var(--font-display)',
  fontWeight: '900',
  fontSize: '1.4rem',
  color: '#111827',
  margin: '0 0 1.5rem 0',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  textTransform: 'uppercase'
};

const layoutStyle = {
  display: 'flex',
  gap: '1.5rem',
  flexWrap: 'wrap'
};

const sidebarStyle = {
  flex: '1 1 240px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem'
};

const contentStyle = {
  flex: '2 1 400px',
  minWidth: '280px',
  borderLeft: '2px dashed var(--border-color)',
  paddingLeft: '1.5rem'
};

const navBtnStyle = (isActive) => ({
  background: isActive ? 'var(--color-primary)' : '#FFF',
  color: '#111827',
  border: '2px solid #111827',
  borderRadius: '8px',
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.85rem',
  fontWeight: '700',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  boxShadow: isActive ? '2px 2px 0px #111827' : '4px 4px 0px #111827',
  transform: isActive ? 'translate(2px, 2px)' : 'none',
  transition: 'all 0.15s ease'
});

const titleStyle = {
  margin: '0 0 1rem 0',
  fontSize: '1.1rem',
  fontWeight: '800',
  textTransform: 'uppercase',
  color: '#111827'
};

const cardStyle = {
  background: '#FFF',
  border: '2px solid #111827',
  borderRadius: '8px',
  padding: '1rem',
  boxShadow: '3px 3px 0px #111827'
};

const listStyle = {
  paddingLeft: '1.2rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
  fontSize: '0.9rem',
  lineHeight: '1.5',
  color: '#374151'
};

const emptyStyle = {
  fontSize: '0.9rem',
  color: 'var(--text-secondary)',
  fontStyle: 'italic',
  margin: '1.5rem 0'
};

const listContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.8rem'
};

const listItemStyle = {
  background: '#FFF',
  border: '2px solid #111827',
  borderRadius: '8px',
  padding: '0.8rem 1rem',
  boxShadow: '2px 2px 0px #111827',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const subtextStyle = {
  display: 'block',
  fontSize: '0.75rem',
  color: 'var(--text-secondary)',
  marginTop: '0.2rem'
};

const badgeStyle = (status) => {
  const bg = status === 'ESCALATED' ? 'var(--color-danger)' : 'var(--color-accent)';
  return {
    background: bg,
    color: bg === 'var(--color-accent)' ? '#000' : '#FFF',
    fontSize: '0.7rem',
    fontWeight: '800',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    border: '1.5px solid #111827'
  };
};

const disclosureTextStyle = {
  fontSize: '0.85rem',
  lineHeight: '1.5',
  color: '#4B5563',
  marginBottom: '0.8rem'
};
