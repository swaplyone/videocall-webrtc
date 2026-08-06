import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Users,
  Clock,
  Bell,
  Settings,
  Shield,
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

  // Two Clean Grid Sections
  const section1 = [
    { path: '/dashboard', label: 'Dashboard', icon: <Home size={17} />, color: '#D45B3E' },
    { path: '/friends', label: 'Friends', icon: <Users size={17} />, color: '#4A6E53' },
    { path: '/notifications', label: 'Alerts', icon: <Bell size={17} />, color: '#E5A93C' }
  ];

  const section2 = [
    { path: '/call-history', label: 'Recent Calls', icon: <Clock size={17} />, color: '#4C779F' },
    { path: '/settings', label: 'Settings', icon: <Settings size={17} />, color: '#8B5CF6' },
    { path: '/privacy', label: 'Privacy', icon: <Shield size={17} />, color: '#64748B' }
  ];

  if (userDetails?.is_admin) {
    section2.push(
      { path: '/admin', label: 'Admin Hub', icon: <ShieldCheck size={17} />, color: '#BE4D4D' }
    );
  }

  // Clean 2-Section Dynamic Island Dimensions
  const islandVariants = {
    compact: {
      width: '185px',
      height: '48px',
      borderRadius: '24px'
    },
    expanded: {
      width: 'min(92vw, 440px)',
      height: 'auto',
      borderRadius: '24px'
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
                duration: 0.26,
                ease: [0.23, 1, 0.32, 1]
              }}
              style={{ paddingBottom: isExpanded ? '14px' : '0px' }}
            >
              <div className="island-content-layer">
                {/* Header Row */}
                <div className={`island-header-row ${isExpanded ? 'is-expanded' : ''}`}>
                  <Link to="/dashboard" className="island-logo-link" onClick={() => setIsExpanded(false)}>
                    <SwaplyLogo size={22} />
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
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {isExpanded ? <X size={18} /> : <Menu size={18} />}
                      </motion.div>
                    </button>
                  </div>
                </div>

                {/* Expanded Clean 2-Section Grid Layout */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      key="menu"
                      className="island-menu-clean-grid"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.2 }}
                      style={{ padding: '12px 14px 4px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                    >
                      {/* 2-Section Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {/* Section 1 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', paddingLeft: '4px' }}>
                            Main Stage
                          </span>
                          {section1.map((item) => (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setIsExpanded(false)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '9px 12px',
                                borderRadius: '14px',
                                background: isActive(item.path) ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                                border: '1.5px solid rgba(255, 255, 255, 0.1)',
                                color: '#FFF',
                                textDecoration: 'none',
                                fontWeight: 700,
                                fontSize: '0.85rem'
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '8px',
                                  background: item.color,
                                  color: '#FFF'
                                }}
                              >
                                {item.icon}
                              </div>
                              <span>{item.label}</span>
                            </Link>
                          ))}
                        </div>

                        {/* Section 2 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', paddingLeft: '4px' }}>
                            Control Node
                          </span>
                          {section2.map((item) => (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setIsExpanded(false)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '9px 12px',
                                borderRadius: '14px',
                                background: isActive(item.path) ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                                border: '1.5px solid rgba(255, 255, 255, 0.1)',
                                color: '#FFF',
                                textDecoration: 'none',
                                fontWeight: 700,
                                fontSize: '0.85rem'
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '8px',
                                  background: item.color,
                                  color: '#FFF'
                                }}
                              >
                                {item.icon}
                              </div>
                              <span>{item.label}</span>
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Footer Profile Button */}
                      <Link
                        to="/profile"
                        onClick={() => setIsExpanded(false)}
                        style={{
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '9px 12px',
                          borderRadius: '14px',
                          background: 'rgba(212, 91, 62, 0.18)',
                          border: '1.5px solid rgba(212, 91, 62, 0.4)',
                          color: '#FFF',
                          textDecoration: 'none',
                          fontWeight: 800,
                          fontSize: '0.84rem'
                        }}
                      >
                        <User size={16} color="#D45B3E" />
                        <span>@{currentUser || 'founder'} &bull; View Profile</span>
                        <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
