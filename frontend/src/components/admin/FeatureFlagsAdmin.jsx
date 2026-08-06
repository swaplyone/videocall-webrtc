import React, { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, RefreshCw, CheckCircle } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';

export default function FeatureFlagsAdmin() {
  const [flags, setFlags] = useState({});
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/feature-flags');
      if (res.success) {
        setFlags(res.flags || {});
        setDetails(res.details || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key, currentStatus) => {
    try {
      const res = await apiClient.post('/feature-flags/toggle', { key, enabled: !currentStatus });
      if (res.success) {
        fetchFlags();
      }
    } catch (err) {
      alert('Failed to toggle feature flag.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Runtime Feature Flags Management</h2>
          <p className="text-xs text-slate-400">Toggle live platform features dynamically without server restarts.</p>
        </div>
        <button
          onClick={fetchFlags}
          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-2 border border-slate-700"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {details.map((f) => (
          <div key={f.key} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-white text-sm capitalize">{f.key.replace(/_/g, ' ')}</span>
                <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] uppercase rounded-md font-mono">{f.category}</span>
              </div>
              <p className="text-xs text-slate-400">{f.description}</p>
            </div>

            <button
              onClick={() => handleToggle(f.key, f.enabled)}
              className="p-2 transition focus:outline-none"
            >
              {f.enabled ? (
                <ToggleRight className="w-8 h-8 text-cyan-400" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-slate-600" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
