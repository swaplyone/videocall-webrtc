import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, User, Users, Inbox, Clock, Bell, Shield, Settings, LogOut } from 'lucide-react';
import SwaplyLogo from './SwaplyLogo';

export default function Navbar({ currentUser, userDetails, onLogout }) {
  return (
    <>
      {/* Top App Header Bar */}
      <header className="mobile-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SwaplyLogo size={32} />
          <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'var(--font-display)', textTransform: 'uppercase', color: '#111827', letterSpacing: '0.5px' }}>
            Swaply
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {userDetails && userDetails.is_admin && (
            <NavLink to="/admin" className={({ isActive }) => `header-icon-btn admin-btn ${isActive ? 'active' : ''}`} title="Admin Controls" style={{ color: '#E11D48', borderColor: '#E11D48', border: '2px solid #E11D48', boxShadow: '2px 2px 0 #E11D48' }}>
              <Shield size={18} />
            </NavLink>
          )}
          <NavLink to="/call-history" className={({ isActive }) => `header-icon-btn ${isActive ? 'active' : ''}`} title="Call History">
            <Clock size={18} />
          </NavLink>
          <NavLink to="/notifications" className={({ isActive }) => `header-icon-btn ${isActive ? 'active' : ''}`} title="Notifications">
            <Bell size={18} />
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `header-icon-btn ${isActive ? 'active' : ''}`} title="Profile">
            <User size={18} />
          </NavLink>
          <button onClick={onLogout} className="header-icon-btn logout-btn" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Bottom Tab Bar */}
      <nav className="mobile-bottom-bar">
        <NavLink to="/dashboard" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
          <Home size={20} />
          <span>Dial</span>
        </NavLink>
        <NavLink to="/friends" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
          <Users size={20} />
          <span>Friends</span>
        </NavLink>
        <NavLink to="/friend-requests" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
          <Inbox size={20} />
          <span>Invites</span>
        </NavLink>
        <NavLink to="/privacy" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
          <Shield size={20} />
          <span>Privacy</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}>
          <Settings size={20} />
          <span>Settings</span>
        </NavLink>
      </nav>
    </>
  );
}
