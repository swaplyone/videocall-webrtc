import React, { useState, useEffect } from 'react';
import { Cookie, CheckCircle } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function CookiePolicy() {
  const [policy, setPolicy] = useState(null);
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const res = await apiClient.get('/legal/policies');
      if (res.success && res.policies.COOKIES) {
        setPolicy(res.policies.COOKIES);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConsent = async () => {
    if (!policy) return;
    try {
      const res = await apiClient.post('/legal/consent', {
        policyType: 'COOKIES',
        version: policy.version
      });
      if (res.success) setConsented(true);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center space-x-3 mb-6">
          <Cookie className="w-10 h-10 text-amber-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Cookie Policy</h1>
            <p className="text-sm text-slate-400">Version: {policy?.version || '1.0.0'}</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap leading-relaxed mb-8 bg-slate-950/50 p-6 rounded-xl border border-slate-800/80">
          {policy?.content || 'Loading Cookie Policy...'}
        </div>

        <div className="border-t border-slate-800 pt-6">
          <button
            onClick={handleConsent}
            disabled={consented}
            className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center space-x-2 ${
              consented
                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/50 cursor-default'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/25'
            }`}
          >
            <CheckCircle className="w-5 h-5" />
            <span>{consented ? 'Cookies Accepted' : 'Accept Cookie Policy'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
