import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, User, Users, Inbox, Clock, Bell, Shield, Settings, LogOut } from 'lucide-react';
import SwaplyLogo from './SwaplyLogo';

export default function Sidebar({ currentUser, onLogout }) {
  return (
    <aside className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem', borderBottom: '3px solid #111827', paddingBottom: '1rem' }}>
        <SwaplyLogo size={42} />
        <span style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', textTransform: 'uppercase', color: '#111827' }}>
          Swaply
        </span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link-retro ${isActive ? 'active' : ''}`}>
          <Home size={18} /> Dashboard
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `nav-link-retro ${isActive ? 'active' : ''}`}>
          <User size={18} /> Profile
        </NavLink>
        <NavLink to="/friends" className={({ isActive }) => `nav-link-retro ${isActive ? 'active' : ''}`}>
          <Users size={18} /> Friends
        </NavLink>
        <NavLink to="/friend-requests" className={({ isActive }) => `nav-link-retro ${isActive ? 'active' : ''}`}>
          <Inbox size={18} /> Friend Requests
        </NavLink>
        <NavLink to="/call-history" className={({ isActive }) => `nav-link-retro ${isActive ? 'active' : ''}`}>
          <Clock size={18} /> Call History
        </NavLink>
        <NavLink to="/notifications" className={({ isActive }) => `nav-link-retro ${isActive ? 'active' : ''}`}>
          <Bell size={18} /> Notifications
        </NavLink>
        <NavLink to="/privacy" className={({ isActive }) => `nav-link-retro ${isActive ? 'active' : ''}`}>
          <Shield size={18} /> Privacy & Safety
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-link-retro ${isActive ? 'active' : ''}`}>
          <Settings size={18} /> Settings
        </NavLink>
      </nav>

      <button 
        onClick={onLogout} 
        className="btn btn-secondary" 
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          width: '100%',
          padding: '0.65rem',
          border: '2px solid #111827',
          boxShadow: '3px 3px 0 #111827'
        }}
      >
        <LogOut size={18} /> Logout
      </button>
    </aside>
  );
}
