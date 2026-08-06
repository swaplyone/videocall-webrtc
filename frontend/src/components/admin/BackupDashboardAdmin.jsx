import React, { useState, useEffect } from 'react';
import { Database, Download, ShieldCheck, Play, RefreshCw, CheckCircle } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';

export default function BackupDashboardAdmin() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/backups');
      if (res.success) setBackups(res.backups || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerBackup = async () => {
    setMsg('Generating encrypted backup archive...');
    try {
      const res = await apiClient.post('/backups/trigger', {});
      if (res.success) {
        setMsg(`Backup created successfully: ${res.backup.filename}`);
        fetchBackups();
      }
    } catch (err) {
      setMsg('Failed to trigger backup.');
    }
  };

  const handleVerify = async (filename) => {
    try {
      const res = await apiClient.post('/backups/verify', { filename });
      if (res.success && res.result.valid) {
        alert(`Backup ${filename} is VALID. Table count: ${res.result.tableCount}`);
      } else {
        alert(`Backup invalid: ${res.result.error}`);
      }
    } catch (err) {
      alert('Verification request failed.');
    }
  };

  const handleRestore = async (filename) => {
    if (window.confirm(`Are you sure you want to restore platform state from ${filename}?`)) {
      try {
        const res = await apiClient.post('/backups/restore', { filename });
        if (res.success) {
          alert('Backup restored successfully!');
        }
      } catch (err) {
        alert('Restore failed.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Backup & Disaster Recovery Command</h2>
          <p className="text-xs text-slate-400">Encrypted AES-256 backup archives, checksum verification & disaster recovery restores.</p>
        </div>

        <button
          onClick={handleTriggerBackup}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-lg shadow-cyan-600/20"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Trigger Manual Backup</span>
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-cyan-400" />
          <span>{msg}</span>
        </div>
      )}

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
            <tr>
              <th className="p-3.5">Filename</th>
              <th className="p-3.5">Size</th>
              <th className="p-3.5">Created At</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {backups.map((b) => (
              <tr key={b.filename} className="hover:bg-slate-850/50">
                <td className="p-3.5 font-mono text-cyan-400">{b.filename}</td>
                <td className="p-3.5">{(b.sizeBytes / 1024).toFixed(1)} KB</td>
                <td className="p-3.5">{new Date(b.createdAt).toLocaleString()}</td>
                <td className="p-3.5">
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded-full border border-emerald-800 text-[10px]">
                    Encrypted (AES-256)
                  </span>
                </td>
                <td className="p-3.5 text-right space-x-2">
                  <button
                    onClick={() => handleVerify(b.filename)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px]"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => handleRestore(b.filename)}
                    className="px-2.5 py-1 bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 rounded-lg text-[11px]"
                  >
                    Restore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
