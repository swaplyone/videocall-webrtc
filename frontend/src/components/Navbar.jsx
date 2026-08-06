import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Users,
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

  // Ultra-Clean, Non-Congested Nav Items
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <Home size={18} />, color: '#D45B3E' },
    { path: '/friends', label: 'Friends', icon: <Users size={18} />, color: '#4A6E53' },
    { path: '/notifications', label: 'Alerts', icon: <Bell size={18} />, color: '#E5A93C' },
    { path: '/settings', label: 'Settings', icon: <Settings size={18} />, color: '#4C779F' }
  ];

  if (userDetails?.is_admin) {
    navItems.push(
      { path: '/admin', label: 'Admin Hub', icon: <ShieldCheck size={18} />, color: '#BE4D4D' }
    );
  }

  // De-congested Dynamic Island Dimensions
  const islandVariants = {
    compact: {
      width: '180px',
      height: '48px',
      borderRadius: '24px'
    },
    expanded: {
      width: 'min(90vw, 340px)',
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
                duration: 0.25,
                ease: [0.23, 1, 0.32, 1]
              }}
              style={{ paddingBottom: isExpanded ? '12px' : '0px' }}
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

                {/* Expanded Clean Menu List */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      key="menu"
                      className="island-menu-area-clean"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.2 }}
                      style={{ padding: '12px 14px 4px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}
                    >
                      {navItems.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`quick-access-item-clean ${isActive(item.path) ? 'active' : ''}`}
                          onClick={() => setIsExpanded(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 14px',
                            borderRadius: '14px',
                            background: isActive(item.path) ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                            border: '1.5px solid rgba(255, 255, 255, 0.1)',
                            color: '#FFF',
                            textDecoration: 'none',
                            fontWeight: 700,
                            fontSize: '0.9rem'
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '32px',
                              height: '32px',
                              borderRadius: '10px',
                              background: item.color,
                              color: '#FFF'
                            }}
                          >
                            {item.icon}
                          </div>
                          <span>{item.label}</span>
                          <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.4 }} />
                        </Link>
                      ))}

                      <Link
                        to="/profile"
                        onClick={() => setIsExpanded(false)}
                        style={{
                          marginTop: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          borderRadius: '14px',
                          background: 'rgba(212, 91, 62, 0.2)',
                          border: '1.5px solid rgba(212, 91, 62, 0.4)',
                          color: '#FFF',
                          textDecoration: 'none',
                          fontWeight: 800,
                          fontSize: '0.85rem'
                        }}
                      >
                        <User size={16} color="#D45B3E" />
                        <span>@{currentUser || 'founder'} &bull; View Profile</span>
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
