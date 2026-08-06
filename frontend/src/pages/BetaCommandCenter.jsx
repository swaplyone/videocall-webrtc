import React, { useState, useEffect } from 'react';
import {
  Activity, Users, Video, Clock, UserCheck, Mail, ShieldAlert,
  Server, Database, ToggleRight, AlertTriangle, QrCode, UserPlus, Eye
} from 'lucide-react';
import { socketClient } from '../utils/socketClient';

export default function BetaCommandCenter() {
  const [telemetry, setTelemetry] = useState({
    platformHealth: 'OPERATIONAL',
    activeUsers: 0,
    activeCalls: 0,
    waitingQueue: 0,
    todaysRollout: 10,
    acceptedUsers: 0,
    pendingInvitations: 0,
    emailQueue: 0,
    smtpStatus: 'CONNECTED',
    privacyAlerts: 0,
    securityIncidents: 0,
    screenshotWarnings: 0,
    friendRequests: 0,
    qrScans: 0,
    serverResources: { memoryUsageMb: 45, uptimeSeconds: 300 },
    databaseStatus: 'HEALTHY',
    maintenanceStatus: 'INACTIVE'
  });

  useEffect(() => {
    const socket = socketClient.initialize();
    if (socket) {
      socket.on('command_center_telemetry', (data) => {
        setTelemetry(prev => ({ ...prev, ...data }));
      });
    }

    return () => {
      if (socket) socket.off('command_center_telemetry');
    };
  }, []);

  const widgets = [
    { title: 'Platform Health', value: telemetry.platformHealth, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Active Users', value: telemetry.activeUsers, icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { title: 'Active Calls', value: telemetry.activeCalls, icon: Video, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { title: 'Waiting Queue', value: telemetry.waitingQueue, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { title: "Today's Rollout", value: telemetry.todaysRollout, icon: UserCheck, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { title: 'Accepted Users', value: telemetry.acceptedUsers, icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Pending Invitations', value: telemetry.pendingInvitations, icon: Mail, color: 'text-sky-400', bg: 'bg-sky-500/10' },
    { title: 'Email Queue', value: telemetry.emailQueue, icon: Mail, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { title: 'SMTP Status', value: telemetry.smtpStatus, icon: Mail, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Privacy Alerts', value: telemetry.privacyAlerts, icon: ShieldAlert, color: 'text-rose-400', bg: 'bg-rose-500/10' },
    { title: 'Security Incidents', value: telemetry.securityIncidents, icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10' },
    { title: 'Screenshot Warnings', value: telemetry.screenshotWarnings, icon: Eye, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { title: 'Friend Requests', value: telemetry.friendRequests, icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { title: 'QR Scans', value: telemetry.qrScans, icon: QrCode, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { title: 'Server Resources', value: `${telemetry.serverResources?.memoryUsageMb || 45} MB`, icon: Server, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { title: 'Database Status', value: telemetry.databaseStatus, icon: Database, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Recent Logs', value: 'Streaming', icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { title: 'Feature Flags', value: 'Active', icon: ToggleRight, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Maintenance Status', value: telemetry.maintenanceStatus, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center space-x-3">
            <Activity className="w-8 h-8 text-cyan-400" />
            <span>Beta Command Center</span>
          </h1>
          <p className="text-sm text-slate-400">Real-time Socket.io platform telemetry & operations dashboard</p>
        </div>
        <div className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>SOCKET.IO LIVE TELEMETRY</span>
        </div>
      </div>

      {/* 19 Live Telemetry Widgets Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {widgets.map((w, idx) => {
          const IconComp = w.icon;
          return (
            <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg hover:border-slate-700 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium truncate">{w.title}</span>
                <div className={`p-2 rounded-xl ${w.bg}`}>
                  <IconComp className={`w-4 h-4 ${w.color}`} />
                </div>
              </div>
              <div className={`text-xl font-bold ${w.color}`}>{w.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
