import React, { useState, useEffect } from 'react';
import { Terminal, Activity, Database, FileText, CheckCircle, RefreshCw, Play } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function DevDashboard() {
  const [version, setVersion] = useState(null);
  const [health, setHealth] = useState(null);
  const [logs, setLogs] = useState([]);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');

  useEffect(() => {
    fetchDevInfo();
  }, []);

  const fetchDevInfo = async () => {
    try {
      const vRes = await apiClient.get('/dev/version');
      if (vRes.success) setVersion(vRes);

      const hRes = await apiClient.get('/dev/health');
      setHealth(hRes);

      const lRes = await apiClient.get('/dev/logs');
      if (lRes.success && lRes.logs) setLogs(lRes.logs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await apiClient.post('/dev/seed', {});
      if (res.success) {
        setSeedMsg('Database successfully seeded with developer test fixtures.');
      }
    } catch (err) {
      setSeedMsg('Seeding failed or requires administrator session.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Terminal className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Developer Command Center</h1>
            <p className="text-xs text-slate-400">Swagger Specs, Telemetry, Seeders & Runtime Inspector</p>
          </div>
        </div>
        <button
          onClick={fetchDevInfo}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-medium transition flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4 text-cyan-400" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Version & Build</span>
            <FileText className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{version?.version || '1.4.0-beta'}</div>
          <p className="text-xs text-slate-400">{version?.release || 'Phase 14 Public Beta'}</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">System Health</span>
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{health?.status || 'UP'}</div>
          <p className="text-xs text-slate-400">Uptime: {Math.floor(health?.resources?.uptime || 0)}s</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Database Seeder</span>
            <Database className="w-5 h-5 text-amber-400" />
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-amber-600/20"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{seeding ? 'Seeding...' : 'Run Database Seeder'}</span>
          </button>
          {seedMsg && <p className="text-xs text-amber-300">{seedMsg}</p>}
        </div>
      </div>

      {/* API Playground Link Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Interactive API Playground & Swagger Specification</h3>
          <p className="text-xs text-slate-400">Explore platform REST endpoints, request parameters, and response schemas.</p>
        </div>
        <a
          href="/api/dev/playground"
          target="_blank"
          rel="noreferrer"
          className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-cyan-600/20 flex items-center space-x-2"
        >
          <span>Open API Playground</span>
        </a>
      </div>

      {/* Logs console */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-md font-bold text-white flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>Live Debug Log Stream</span>
        </h3>
        <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-slate-300 h-64 overflow-y-auto border border-slate-850 space-y-1">
          {logs.length > 0 ? (
            logs.map((log, idx) => <div key={idx}>{log}</div>)
          ) : (
            <div className="text-slate-500">[INFO] Waiting for log telemetry events...</div>
          )}
        </div>
      </div>
    </div>
  );
}
