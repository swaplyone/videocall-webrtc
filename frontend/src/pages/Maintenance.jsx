import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, ShieldAlert, RefreshCw } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function Maintenance() {
  const [status, setStatus] = useState(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await apiClient.get('/maintenance/status');
      if (res.success && res.state) {
        setStatus(res.state);
        setCountdown(res.state.countdownSeconds || 300);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl text-center space-y-6">
        <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto text-amber-400">
          {status?.mode === 'emergency' ? (
            <ShieldAlert className="w-10 h-10 text-red-400" />
          ) : (
            <AlertTriangle className="w-10 h-10" />
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {status?.mode === 'emergency' ? 'Emergency Platform Maintenance' : 'Scheduled Maintenance in Progress'}
          </h1>
          <p className="text-slate-400 text-sm">
            {status?.message || 'Swaply is undergoing scheduled system upgrades to improve real-time streaming reliability.'}
          </p>
        </div>

        {countdown > 0 && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center space-y-2">
            <div className="flex items-center space-x-2 text-slate-400 text-xs uppercase tracking-wider font-semibold">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Estimated Duration Remaining</span>
            </div>
            <div className="text-4xl font-mono font-bold text-cyan-400">
              {formatCountdown(countdown)}
            </div>
          </div>
        )}

        <div className="pt-4 flex justify-center space-x-4">
          <button
            onClick={fetchStatus}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition flex items-center space-x-2 border border-slate-700"
          >
            <RefreshCw className="w-4 h-4 text-cyan-400" />
            <span>Check Platform Status</span>
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Whitelisted administrators can bypass maintenance mode by logging into the Admin Command Portal.
        </p>
      </div>
    </div>
  );
}
