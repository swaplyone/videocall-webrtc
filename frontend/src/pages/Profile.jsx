import React, { useState } from 'react';
import { User, AlertCircle, CheckCircle } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function Profile({ userDetails, onUpdateUserDetails }) {
  const [name, setName] = useState(userDetails?.name || '');
  const [bio, setBio] = useState(userDetails?.bio || '');
  const [profileImage, setProfileImage] = useState(userDetails?.profile_image || '');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const data = await apiClient.request('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim() || null,
          profile_image: profileImage.trim() || null
        })
      });

      if (data.success) {
        setSuccess('Profile updated successfully!');
        onUpdateUserDetails(data.user);
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px' }}>
      <div className="glass-panel" style={{ padding: '2rem', border: '3px solid #111827', boxShadow: '6px 6px 0 #111827' }}>
        <h2 style={{ margin: '0 0 1.5rem 0', fontFamily: 'var(--font-display)', textTransform: 'uppercase', fontSize: '1.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <User size={24} style={{ color: 'var(--color-primary)' }} /> Edit Profile
        </h2>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '2px solid var(--color-danger)', background: 'rgba(239,68,68,0.08)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.25rem', color: 'var(--color-danger)', fontSize: '0.85rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '2px solid var(--color-success)', background: 'rgba(16,185,129,0.08)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.25rem', color: 'var(--color-success)', fontSize: '0.85rem' }}>
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="input-group">
            <label htmlFor="name-input" style={{ fontWeight: 'bold' }}>Display Name</label>
            <input
              id="name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alice Smith"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="bio-input" style={{ fontWeight: 'bold' }}>Biography</label>
            <textarea
              id="bio-input"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '3px solid #111827',
                borderRadius: '6px',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                background: '#FFFDF9',
                resize: 'vertical'
              }}
            />
          </div>

          <div className="input-group">
            <label htmlFor="avatar-input" style={{ fontWeight: 'bold' }}>Profile Image URL (Optional)</label>
            <input
              id="avatar-input"
              type="url"
              value={profileImage}
              onChange={(e) => setProfileImage(e.target.value)}
              placeholder="e.g. https://example.com/avatar.jpg"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{ padding: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            {isSubmitting ? 'Saving Changes...' : 'Save Profile Details'}
          </button>
        </form>
      </div>
    </div>
  );
}
