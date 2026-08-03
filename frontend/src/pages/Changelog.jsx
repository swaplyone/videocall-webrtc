import React, { useState, useEffect } from 'react';
import { Tag, Calendar, Plus, Sparkles, AlertCircle } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function Changelog({ userDetails }) {
  const [entries, setEntries] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const [version, setVersion] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('FEATURE');
  const [content, setContent] = useState('');

  const fetchChangelog = async () => {
    try {
      const data = await apiClient.request('/api/changelog');
      if (data && data.entries) setEntries(data.entries);
    } catch (err) {
      console.error('Error fetching changelog:', err);
    }
  };

  useEffect(() => {
    fetchChangelog();
  }, []);

  const handlePublish = async (e) => {
    e.preventDefault();
    try {
      await apiClient.request('/api/changelog/admin', {
        method: 'POST',
        body: JSON.stringify({ version, title, category, content })
      });
      setShowModal(false);
      setVersion('');
      setTitle('');
      setContent('');
      fetchChangelog();
    } catch (err) {
      console.error('Error publishing changelog entry:', err);
    }
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #111827', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 900, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={24} style={{ color: 'var(--color-primary)' }} /> Product Changelog & Updates
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Release History, Bug Fixes, and Upcoming Features
          </span>
        </div>

        {userDetails?.is_admin && (
          <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Plus size={16} /> Publish Release
          </button>
        )}
      </div>

      {/* Changelog Entries */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {entries.map(item => (
          <div key={item.id} className="glass-panel" style={{ padding: '1.25rem', border: '3px solid #111827', boxShadow: '4px 4px 0 #111827' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ background: '#FEF3C7', border: '1.5px solid #111827', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 900, fontSize: '0.8rem' }}>
                  {item.version}
                </span>
                <strong style={{ fontSize: '1.1rem' }}>{item.title}</strong>
              </div>

              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {new Date(item.published_at).toLocaleDateString()}
              </span>
            </div>

            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#374151', lineHeight: 1.5 }}>
              {item.content}
            </p>
          </div>
        ))}
      </div>

      {/* Admin Publish Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <form onSubmit={handlePublish} className="glass-panel" style={{ padding: '1.5rem', maxWidth: '480px', width: '90%', border: '3px solid #111827', background: '#FFF', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontWeight: 900, textTransform: 'uppercase' }}>Publish Release Note</h3>

            <input required type="text" placeholder="Version (e.g. v2.6.0)" value={version} onChange={(e) => setVersion(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '2px solid #111827', fontWeight: 'bold' }} />
            <input required type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '2px solid #111827', fontWeight: 'bold' }} />
            
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '2px solid #111827', fontWeight: 'bold' }}>
              <option value="FEATURE">FEATURE</option>
              <option value="BUGFIX">BUGFIX</option>
              <option value="ANNOUNCEMENT">ANNOUNCEMENT</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
            </select>

            <textarea required rows="4" placeholder="Content details..." value={content} onChange={(e) => setContent(e.target.value)} style={{ padding: '0.5rem', borderRadius: '6px', border: '2px solid #111827' }} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              <button type="submit" className="btn btn-primary">Publish Release</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
