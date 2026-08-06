import React, { useState, useEffect } from 'react';
import { Search, Filter, Clock, ShieldAlert } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';

export default function AuditTrailAdmin() {
  const [logs, setLogs] = useState([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [category]);

  const fetchLogs = async () => {
    try {
      const res = await apiClient.get(`/audit-logs?category=${category}&search=${encodeURIComponent(search)}`);
      if (res.success) {
        setLogs(res.logs || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Searchable Audit Log Timeline</h2>
          <p className="text-xs text-slate-400">Track user logins, calls, friend events, admin actions, and security alerts.</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex space-x-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="activity">Activity Logs</option>
            <option value="admin">Admin Actions</option>
            <option value="security">Security Logs</option>
            <option value="api">API Telemetry</option>
          </select>
        </form>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
        {logs.map((log, idx) => (
          <div key={idx} className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-800 text-cyan-400 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-white flex items-center space-x-2">
                  <span>{log.event_type}</span>
                  <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] uppercase font-mono">
                    {log.log_category}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  IP: {log.ip_address} | User ID: {log.user_id || 'System'}
                </div>
              </div>
            </div>
            <div className="text-slate-500 text-[11px]">
              {new Date(log.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
