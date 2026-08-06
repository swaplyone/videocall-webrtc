import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Users,
  Clock,
  Bell,
  Settings,
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
    { path: '/dashboard', label: 'Dashboard', desc: 'Call console & WebRTC', icon: <Home size={18} />, color: '#D45B3E' },
    { path: '/friends', label: 'Friends & Invites', desc: 'Peers & connections', icon: <Users size={18} />, color: '#4A6E53' },
    { path: '/call-history', label: 'Recent Calls', desc: 'Call logs & history', icon: <Clock size={18} />, color: '#4C779F' },
    { path: '/notifications', label: 'Notifications', desc: 'Alerts & activity', icon: <Bell size={18} />, color: '#E5A93C' },
    { path: '/settings', label: 'Settings & Privacy', desc: 'Security, audio & video', icon: <Settings size={18} />, color: '#64748B' }
  ];

  if (userDetails?.is_admin) {
    navItems.push(
      { path: '/admin', label: 'Admin Hub', desc: 'Platform & beta metrics', icon: <ShieldCheck size={18} />, color: '#BE4D4D' }
    );
  }

  // Streamlined Dynamic Island Variants
  const islandVariants = {
    compact: {
      width: '190px',
      height: '52px',
      borderRadius: '26px'
    },
    expanded: {
      width: 'min(92vw, 440px)',
      height: 'min(410px, 68vh)',
      borderRadius: '26px'
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
                duration: 0.28,
                ease: [0.23, 1, 0.32, 1]
              }}
            >
              <div className="island-content-layer">
                {/* Header Row */}
                <div className={`island-header-row ${isExpanded ? 'is-expanded' : ''}`}>
                  <Link to="/dashboard" className="island-logo-link" onClick={() => setIsExpanded(false)}>
                    <SwaplyLogo size={24} />
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
                          <Power size={16} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                    <button
                      className="island-toggle-btn"
                      onClick={() => setIsExpanded(!isExpanded)}
                      aria-label="Toggle navigation menu"
                    >
                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {isExpanded ? <X size={18} /> : <Menu size={18} />}
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
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2 }}
                    >
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
                        <User size={16} />
                        <span>@{currentUser || 'founder'} &bull; Profile</span>
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
