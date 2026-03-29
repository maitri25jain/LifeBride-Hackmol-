/**
 * API client for LifeBridge FastAPI backend.
 * Maps 1:1 to every endpoint in your backend.
 *
 * Auth strategy:
 *   Hospital staff → email + password → JWT stored in localStorage + httpOnly cookie
 *   Citizens       → phone + OTP (always 123456) → JWT stored in localStorage
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('lb_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401) {
    localStorage.removeItem('lb_token');
    localStorage.removeItem('lb_user');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.detail || data.error || 'Request failed');
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

// ═══════════════════════════════════════════════
// HOSPITAL STAFF AUTH — email + password
// Backend: POST /api/auth/login, GET /api/auth/me
// ═══════════════════════════════════════════════

export const hospitalAuth = {
  login: async (email, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.access_token) {
      localStorage.setItem('lb_token', data.access_token);
    }
    return data;
  },

  getMe: () => request('/auth/me'),
};

// ═══════════════════════════════════════════════
// CITIZEN AUTH — phone + OTP
// Backend: POST /api/auth/register/send-otp
//          POST /api/auth/register/verify
//          POST /api/auth/login/send-otp
//          POST /api/auth/login/verify
// ═══════════════════════════════════════════════

export const citizenAuth = {
  registerSendOTP: (payload) =>
    request('/auth/register/send-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  registerVerify: async (phone, otp) => {
    const data = await request('/auth/register/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
    if (data.access_token) {
      localStorage.setItem('lb_token', data.access_token);
      localStorage.setItem(
        'lb_user',
        JSON.stringify({
          id: data.citizen_id,
          name: data.full_name,
          phone: data.phone,
          blood_type: data.blood_type,
          role: 'citizen',
          has_pledge: data.has_pledge,
        })
      );
    }
    return data;
  },

  loginSendOTP: (phone) =>
    request('/auth/login/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  loginVerify: async (phone, otp) => {
    const data = await request('/auth/login/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
    if (data.access_token) {
      localStorage.setItem('lb_token', data.access_token);
      localStorage.setItem(
        'lb_user',
        JSON.stringify({
          id: data.citizen_id,
          name: data.full_name,
          phone: data.phone,
          blood_type: data.blood_type,
          role: 'citizen',
          has_pledge: data.has_pledge,
        })
      );
    }
    return data;
  },
};

// ═══════════════════════════════════════════════
// CITIZEN ENDPOINTS
// Backend: GET  /api/citizens/me
//          POST /api/citizens/pledge
//          GET  /api/citizens/alerts
//          POST /api/citizens/alerts/{id}/respond
// ═══════════════════════════════════════════════

export const citizens = {
  getMe: () => request('/citizens/me'),

  submitPledge: (payload) =>
    request('/citizens/pledge', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAlerts: () => request('/citizens/alerts'),

  respondToAlert: (alertId) =>
    request(`/citizens/alerts/${alertId}/respond`, { method: 'POST' }),
};

// ═══════════════════════════════════════════════
// HOSPITAL DASHBOARD
// Backend: GET /api/dashboard/stats
// ═══════════════════════════════════════════════

export const dashboard = {
  getStats: () => request('/dashboard/stats'),
};

// ═══════════════════════════════════════════════
// RECIPIENTS
// Backend: POST /api/recipients/
//          GET  /api/recipients/
// ═══════════════════════════════════════════════

export const recipients = {
  create: (payload) =>
    request('/recipients/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  list: () => request('/recipients/'),
};

// ═══════════════════════════════════════════════
// DONORS
// Backend: POST /api/donors/
//          GET  /api/donors/
//          POST /api/donors/match/organ
//          POST /api/donors/match/blood
//          GET  /api/donors/match/history
// ═══════════════════════════════════════════════

export const donors = {
  create: (payload) =>
    request('/donors/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  list: () => request('/donors/'),

  matchOrgan: () => request('/donors/match/organ', { method: 'POST' }),

  matchBlood: () => request('/donors/match/blood', { method: 'POST' }),

  matchHistory: () => request('/donors/match/history'),
};

// ═══════════════════════════════════════════════
// ACCOUNTS — hospital_admin manages coordinators
// Backend: POST /api/accounts/coordinators
//          GET  /api/accounts/coordinators
//          PUT  /api/accounts/coordinators/{id}
// ═══════════════════════════════════════════════

export const accounts = {
  createCoordinator: (payload) =>
    request('/accounts/coordinators', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listCoordinators: () => request('/accounts/coordinators'),

  updateCoordinator: (id, payload) =>
    request(`/accounts/coordinators/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};

// ═══════════════════════════════════════════════
// BLOOD ALERTS — coordinator broadcasts
// Backend: POST /api/alerts/
//          GET  /api/alerts/
//          PUT  /api/alerts/{id}/close
// ═══════════════════════════════════════════════

export const alerts = {
  create: (payload) =>
    request('/alerts/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  list: () => request('/alerts/'),

  close: (alertId) =>
    request(`/alerts/${alertId}/close`, { method: 'PUT' }),
};

// ═══════════════════════════════════════════════
// HEALTH
// Backend: GET /api/health
// ═══════════════════════════════════════════════

export const health = {
  check: () => request('/health').catch(() => ({ status: 'unreachable' })),
};

// ═══════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════

export function logout() {
  localStorage.removeItem('lb_token');
  localStorage.removeItem('lb_user');
  window.location.href = '/';
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('lb_user'));
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!localStorage.getItem('lb_token');
}