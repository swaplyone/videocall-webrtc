import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Users, Shield, Bell, CheckCircle, ArrowRight, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import SwaplyLogo from '../components/SwaplyLogo';
import { apiClient } from '../utils/apiClient';

export default function WaitingForBeta({ currentUser, onStatusApproved }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState(null);
  const [notifySaved, setNotifySaved] = useState(false);
  const [isSubmittingNotify, setIsSubmittingNotify] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await apiClient.request('/api/beta/status');
      setStatusData(data);
      if (data.userStatus === 'APPROVED' || data.userStatus === 'ACTIVE') {
        if (onStatusApproved) onStatusApproved(data);
      }
    } catch (err) {
      console.warn('Error fetching beta status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll status every 8 seconds for live approval detection
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleNotifyMe = async () => {
    setIsSubmittingNotify(true);
    try {
      await apiClient.request('/api/beta/notify', { method: 'POST' });
      setNotifySaved(true);
    } catch (err) {
      console.error('Notify error:', err);
    } finally {
      setIsSubmittingNotify(false);
    }
  };

  const isApproved = statusData?.userStatus === 'APPROVED' || statusData?.userStatus === 'ACTIVE';
  const capacityFull = statusData?.capacity?.full;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary, #F8F3EA)', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: 'var(--font-mono)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#FFFDF8',
          border: '2.5px solid #1B2233',
          boxShadow: '10px 10px 0px 0px #1B2233',
          borderRadius: '24px',
          padding: '2.5rem',
          color: '#1B2233',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Top Header Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2rem' }}>
          <SwaplyLogo size={68} style={{ margin: '0 auto 0.75rem auto' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#D85B3E', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.25rem' }}>
            SWAPLYONE SMART BETA ROLLOUT
          </span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.85rem', fontWeight: 800, margin: 0, textAlign: 'center', color: '#1B2233' }}>
            {isApproved ? '🎉 Welcome to SwaplyOne Beta!' : 'Thank you for joining SwaplyOne Beta.'}
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#7A7A7A', margin: '0.5rem 0 0 0', textAlign: 'center' }}>
            {isApproved
              ? 'Your invitation pass has been activated. You now have full access to SwaplyOne.'
              : 'Your registration is complete. You are currently waiting for approval.'}
          </p>
        </div>

        {/* Live Approval Banner */}
        {isApproved && (
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            style={{
              background: '#F1F6F1',
              border: '2.5px solid #6D7B55',
              borderRadius: '16px',
              padding: '1.25rem',
              textAlign: 'center',
              marginBottom: '1.5rem'
            }}
          >
            <CheckCircle size={32} color="#6D7B55" style={{ margin: '0 auto 0.5rem auto' }} />
            <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', fontFamily: 'var(--font-display)', color: '#6D7B55' }}>
              Access Granted!
            </h4>
            <p style={{ margin: '0.25rem 0 1rem 0', fontSize: '0.85rem', color: '#1B2233' }}>
              Click below to enter the live SwaplyOne platform.
            </p>
            <button
              onClick={() => {
                localStorage.setItem('swaply_notice_accepted', 'true');
                window.location.href = '/dashboard';
              }}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '50px',
                background: '#6D7B55',
                border: '2.5px solid #1B2233',
                boxShadow: '4px 4px 0px 0px #1B2233',
                color: '#FFF',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                fontFamily: 'var(--font-body)'
              }}
            >
              Enter Dashboard Now <ArrowRight size={18} />
            </button>
          </motion.div>
        )}

        {/* Queue Metrics Display Grid */}
        {!isApproved && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem', marginBottom: '1.5rem' }}>
              
              {/* Queue Position */}
              <div style={{ background: '#F8F3EA', border: '2px solid #1B2233', borderRadius: '16px', padding: '1rem 0.75rem', textAlign: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#7A7A7A', textTransform: 'uppercase' }}>
                  Queue Position
                </span>
                <h3 style={{ margin: '0.35rem 0 0 0', fontSize: '1.6rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#D85B3E' }}>
                  #{statusData?.queuePosition || '24'}
                </h3>
              </div>

              {/* Beta Capacity */}
              <div style={{ background: '#F8F3EA', border: '2px solid #1B2233', borderRadius: '16px', padding: '1rem 0.75rem', textAlign: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#7A7A7A', textTransform: 'uppercase' }}>
                  Beta Capacity
                </span>
                <h3 style={{ margin: '0.35rem 0 0 0', fontSize: '1.25rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#1B2233' }}>
                  {statusData?.capacity?.current || '128'} / {statusData?.capacity?.max || '150'}
                </h3>
              </div>

              {/* Estimated Invitation */}
              <div style={{ background: '#F8F3EA', border: '2px solid #1B2233', borderRadius: '16px', padding: '1rem 0.75rem', textAlign: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#7A7A7A', textTransform: 'uppercase' }}>
                  Estimated Invitation
                </span>
                <h3 style={{ margin: '0.35rem 0 0 0', fontSize: '1.1rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: '#6D7B55' }}>
                  {statusData?.estimatedInvitation || '2–4 days'}
                </h3>
              </div>

            </div>

            {/* Capacity Full Notification Card */}
            {capacityFull && (
              <div style={{ background: '#FFF0EB', border: '2px solid #D85B3E', borderRadius: '16px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <AlertCircle size={20} color="#D85B3E" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.9rem', color: '#D85B3E' }}>
                    Current beta slots are full.
                  </h4>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#1B2233' }}>
                    You have successfully joined the waiting list. You'll receive an email automatically when the next beta batch opens.
                  </p>
                </div>
              </div>
            )}

            {/* Notify Me Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={handleNotifyMe}
                disabled={notifySaved || isSubmittingNotify}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '50px',
                  background: notifySaved ? '#6D7B55' : '#D85B3E',
                  border: '2.5px solid #1B2233',
                  boxShadow: notifySaved ? 'none' : '6px 6px 0px 0px #1B2233',
                  color: '#FFF',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: notifySaved ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontFamily: 'var(--font-body)'
                }}
              >
                {notifySaved ? (
                  <>
                    <CheckCircle size={18} /> Email Notification Subscribed!
                  </>
                ) : (
                  <>
                    <Bell size={18} /> Notify Me When Approved
                  </>
                )}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#7A7A7A', marginTop: '0.5rem' }}>
                <RefreshCw size={12} className="animate-spin" />
                <span>Checking rollout status automatically...</span>
              </div>
            </div>
          </>
        )}

      </motion.div>
    </div>
  );
}
