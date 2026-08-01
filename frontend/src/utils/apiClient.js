const getBackendUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  if (typeof process !== 'undefined' && process.env && process.env.VITE_BACKEND_URL) {
    return process.env.VITE_BACKEND_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${window.location.protocol}//${hostname}:5000`;
    }
  }
  return 'https://videocall-webrtc-uiwb.onrender.com';
};

const BACKEND_URL = getBackendUrl();

let authToken = null;

/**
 * Configure the active authentication token for REST HTTP requests.
 * @param {string|null} token 
 */
export const setAuthToken = (token) => {
  authToken = token;
};

/**
 * Common request dispatcher wrapper.
 */
const request = async (path, options = {}) => {
  const url = `${BACKEND_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP error! status: ${res.status}`);
  }
  return data;
};

export const apiClient = {
  setAuthToken,
  request,

  // Auth Operations
  async register({ name, username, email, password }) {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, username, email, password })
    });
  },

  async login(identifier, password) {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
    if (data.accessToken) {
      setAuthToken(data.accessToken);
    }
    return data;
  },

  async acceptNotice() {
    return request('/api/auth/accept-notice', {
      method: 'POST'
    });
  },

  async getMe() {
    return request('/api/auth/me');
  },

  async refresh() {
    const data = await request('/api/auth/refresh', {
      method: 'POST'
    });
    if (data.accessToken) {
      setAuthToken(data.accessToken);
    }
    return data;
  },

  async logout() {
    const data = await request('/api/auth/logout', {
      method: 'POST'
    });
    setAuthToken(null);
    return data;
  },

  // Calling & Logs Operations
  async submitFeedback(callId, rating, issues, comments) {
    return request('/api/calls/feedback', {
      method: 'POST',
      body: JSON.stringify({ callId, rating, issues, comments })
    });
  },

  async getCallHistory(type = 'All', quality = 'All') {
    const params = {};
    if (type && type !== 'All') params.type = type.toLowerCase();
    if (quality && quality !== 'All') params.quality = quality.toLowerCase();
    const query = new URLSearchParams(params).toString();
    return request(`/api/calls/history${query ? '?' + query : ''}`);
  },

  async getIceServers() {
    return request('/api/calls/ice-servers');
  },

  // Telemetry Operations
  async getHealth() {
    return request('/api/health');
  },

  // Admin Operations
  async getAdminStats() {
    return request('/api/admin/stats');
  },

  async getAdminReports() {
    return request('/api/admin/reports');
  },

  async updateReportStatus(reportId, status) {
    return request(`/api/admin/reports/${reportId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  },

  // Phase 8 OTP & Verification Operations
  async sendOtp(purpose) {
    return request('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ purpose })
    });
  },

  async verifyOtp(code, purpose) {
    return request('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ code, purpose })
    });
  },

  async resendOtp(purpose) {
    return request('/api/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ purpose })
    });
  },

  async requestPasswordReset(email) {
    return request('/api/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  },

  async resetPassword(email, code, newPassword) {
    return request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword })
    });
  },

  async requestEmailChange(newEmail) {
    return request('/api/auth/request-email-change', {
      method: 'POST',
      body: JSON.stringify({ newEmail })
    });
  },

  async verifyEmailChange(newEmail, code) {
    return request('/api/auth/verify-email-change', {
      method: 'POST',
      body: JSON.stringify({ newEmail, code })
    });
  },

  async updateEmailPreferences(preferences) {
    return request('/api/auth/email-preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    });
  }
};
