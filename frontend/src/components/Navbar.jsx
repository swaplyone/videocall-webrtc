import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Users,
  Inbox,
  Clock,
  Bell,
  Shield,
  Settings,
  Activity,
  Sparkles,
  Server,
  ShieldCheck,
  Power,
  X,
  Menu,
  User,
  ChevronRight
} from 'lucide-react';
import SwaplyLogo from './SwaplyLogo';
import './FloatingIslandNav.css';

export default function Navbar({ currentUser, userDetails, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const islandRef = useRef(null);

  // Track scroll direction for visibility & outside click listener
  useEffect(() => {
    let lastY = window.scrollY;
    let lastCheck = 0;

    const handleScroll = () => {
      const now = Date.now();
      if (now - lastCheck < 50) return;

      const latest = window.scrollY;
      const diff = latest - lastY;

      if (Math.abs(diff) > 15) {
        if (isExpanded) setIsExpanded(false);

        if (diff > 0 && latest > 150) {
          if (isVisible) setIsVisible(false);
        } else if (diff < -30 || latest < 50) {
          if (!isVisible) setIsVisible(true);
        }
        lastY = latest;
        lastCheck = now;
      }
    };

    const handleClickOutside = (e) => {
      if (islandRef.current && !islandRef.current.contains(e.target)) {
        setIsExpanded(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, isExpanded]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { path: '/dashboard', label: 'Dial Console', desc: 'Call node & WebRTC', icon: <Home size={18} />, color: '#2563EB' },
    { path: '/friends', label: 'Peer Friends', desc: 'Active connections', icon: <Users size={18} />, color: '#10B981' },
    { path: '/friend-requests', label: 'Invites', desc: 'Pending requests', icon: <Inbox size={18} />, color: '#F59E0B' },
    { path: '/call-history', label: 'Recent Calls', desc: 'Call logs & telemetry', icon: <Clock size={18} />, color: '#6366F1' },
    { path: '/notifications', label: 'Alert Center', desc: 'Notifications', icon: <Bell size={18} />, color: '#EC4899' },
    { path: '/privacy', label: 'Privacy Center', desc: 'Security & shield', icon: <Shield size={18} />, color: '#8B5CF6' },
    { path: '/settings', label: 'App Settings', desc: 'Hardware & config', icon: <Settings size={18} />, color: '#64748B' },
    { path: '/diagnostics', label: 'Diagnostics', desc: 'RTCStats inspector', icon: <Activity size={18} />, color: '#06B6D4' },
    { path: '/changelog', label: 'Updates', desc: 'Changelog & fixes', icon: <Sparkles size={18} />, color: '#F43F5E' }
  ];

  if (userDetails?.is_admin) {
    navItems.push(
      { path: '/admin', label: 'Admin Hub', desc: 'Rollout & metrics', icon: <ShieldCheck size={18} />, color: '#E11D48' },
      { path: '/health', label: 'System Health', desc: 'Live server metrics', icon: <Server size={18} />, color: '#059669' }
    );
  }

  // Dynamic Island Variants
  const islandVariants = {
    compact: {
      width: '210px',
      height: '56px',
      borderRadius: '28px'
    },
    expanded: {
      width: 'min(94vw, 650px)',
      height: 'min(540px, 78vh)',
      borderRadius: '30px'
    }
  };

  return (
    <div className="island-fixed-wrapper" ref={islandRef}>
      <AnimatePresence>
        {isVisible && (
          <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="island-frame"
          >
            <motion.div
              className="island-body"
              variants={islandVariants}
              animate={isExpanded ? 'expanded' : 'compact'}
              transition={{
                duration: 0.3,
                ease: [0.23, 1, 0.32, 1]
              }}
            >
              <div className="island-content-layer">
                {/* Header Row */}
                <div className={`island-header-row ${isExpanded ? 'is-expanded' : ''}`}>
                  <Link to="/dashboard" className="island-logo-link" onClick={() => setIsExpanded(false)}>
                    <SwaplyLogo size={26} />
                    <span className="island-brand-text">Swaply</span>
                  </Link>

                  <div className="island-header-actions">
                    <AnimatePresence>
                      {currentUser && isExpanded && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="island-power-btn"
                          onClick={onLogout}
                          title="Disconnect Session"
                        >
                          <Power size={18} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                    <button
                      className="island-toggle-btn"
                      onClick={() => setIsExpanded(!isExpanded)}
                    >
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {isExpanded ? <X size={20} /> : <Menu size={20} />}
                      </motion.div>
                    </button>
                  </div>
                </div>

                {/* Expanded Menu Grid */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      key="menu"
                      className="island-menu-area"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="menu-label">Swaply Navigation</div>
                      <div className="island-quick-access">
                        {navItems.map((item) => (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`quick-access-item ${isActive(item.path) ? 'active' : ''}`}
                            onClick={() => setIsExpanded(false)}
                          >
                            <div
                              className="access-icon-box"
                              style={{
                                background: isActive(item.path) ? item.color : 'rgba(255,255,255,0.08)',
                                color: isActive(item.path) ? '#fff' : item.color
                              }}
                            >
                              {item.icon}
                            </div>
                            <div className="access-info">
                              <span className="access-label">{item.label}</span>
                              <span className="access-desc">{item.desc}</span>
                            </div>
                            <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.4 }} />
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Sticky Footer */}
                {isExpanded && (
                  <div className="island-sticky-footer">
                    <Link to="/profile" className="premium-login-btn" onClick={() => setIsExpanded(false)}>
                      <div className="pl-content">
                        <User size={18} />
                        <span>@{currentUser || 'founder'} &bull; View Profile</span>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
