import React, { useState, useEffect } from 'react';
import { ShieldCheck, Download, Trash2, CheckCircle } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function PrivacyPolicy() {
  const [policy, setPolicy] = useState(null);
  const [consented, setConsented] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const res = await apiClient.get('/legal/policies');
      if (res.success && res.policies.PRIVACY) {
        setPolicy(res.policies.PRIVACY);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConsent = async () => {
    if (!policy) return;
    setLoading(true);
    try {
      const res = await apiClient.post('/legal/consent', {
        policyType: 'PRIVACY',
        version: policy.version
      });
      if (res.success) {
        setConsented(true);
        setMessage('Consent successfully recorded!');
      }
    } catch (err) {
      setMessage('Failed to record consent.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await apiClient.post('/legal/export-data', {});
      if (res.success) {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `swaply_personal_data_export.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      }
    } catch (err) {
      alert('Failed to export personal data.');
    }
  };

  const handleDeleteData = async () => {
    if (window.confirm('Are you sure you want to request deletion of all your personal data? This action will queue your account for 30-day permanent deletion.')) {
      try {
        const res = await apiClient.post('/legal/delete-personal-data', { reason: 'User GDPR Request' });
        if (res.success) {
          alert('Personal data deletion requested successfully!');
        }
      } catch (err) {
        alert('Failed to submit deletion request.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center space-x-3 mb-6">
          <ShieldCheck className="w-10 h-10 text-cyan-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
            <p className="text-sm text-slate-400">Version: {policy?.version || '1.0.0'} | Enterprise GDPR Compliance</p>
          </div>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span>{message}</span>
          </div>
        )}

        <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap leading-relaxed mb-8 bg-slate-950/50 p-6 rounded-xl border border-slate-800/80">
          {policy?.content || 'Loading Swaply Privacy Policy...'}
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-wrap gap-4 items-center justify-between">
          <button
            onClick={handleConsent}
            disabled={loading || consented}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center space-x-2 ${
              consented
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/50 cursor-default'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
            }`}
          >
            <CheckCircle className="w-5 h-5" />
            <span>{consented ? 'Consent Recorded' : 'I Agree & Accept Privacy Policy'}</span>
          </button>

          <div className="flex space-x-3">
            <button
              onClick={handleExportData}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-sm font-medium transition flex items-center space-x-2"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Export Personal Data</span>
            </button>

            <button
              onClick={handleDeleteData}
              className="px-4 py-2.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded-xl text-sm font-medium transition flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>Delete Personal Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
