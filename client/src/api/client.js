/**
 * BiVerify API client — client/src/api/client.js
 */

import axios from "axios";

export const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:5050";

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("biverify_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("biverify_token");
      localStorage.removeItem("biverify_user");
    }
    return Promise.reject(err);
  }
);
export const auditLogs = {
  list: (params = {}) =>
    api.get('/api/audit-logs', { params }).then((r) => r.data),
};

export const auth = {
  login: (email, password) =>
    api.post("/api/auth/login", { email, password }).then((r) => r.data),
  me: () => api.get("/api/auth/me").then((r) => r.data),
  forgotPassword: (email) =>
    api.post("/api/auth/forgot-password", { email }).then((r) => r.data),
  verifyOtp: (email, otp) =>
    api.post("/api/auth/verify-otp", { email, otp }).then((r) => r.data),
  resetPassword: (resetKey, password) =>
    api.post("/api/auth/reset-password", { resetKey, password }).then((r) => r.data),
};

export const scan = {
  site: (siteToken, requestId) =>
    api.post("/api/scan/site", { siteToken, requestId }).then((r) => r.data),
  booking: (bookingToken) =>
    api.post("/api/scan/booking", { bookingToken }).then((r) => r.data),
  jobs: () => api.get("/api/scan/jobs").then((r) => r.data),
};

export const team = {
  list: () => api.get("/api/team").then((r) => r.data),
  create: (payload) => api.post("/api/team", payload).then((r) => r.data),
  remove: (id) => api.delete(`/api/team/${id}`).then((r) => r.data),
};

export const bookings = {
  list: (params = {}) =>
    api.get("/api/bookings", { params }).then((r) => r.data),
  stats: () => api.get("/api/bookings/stats").then((r) => r.data),
  get: (id) => api.get(`/api/bookings/${id}`).then((r) => r.data),
  create: (payload) =>
    api.post("/api/bookings", payload).then((r) => r.data),
  cancel: (id) =>
    api.patch(`/api/bookings/${id}/cancel`).then((r) => r.data),
  qrPngBlob: (requestId) =>
    api
      .get(`/api/bookings/${requestId}/qr.png`, { responseType: "blob" })
      .then((r) => r.data),
};

export const locations = {
  list: () => api.get("/api/locations").then((r) => r.data),
  create: (label, address) =>
    api.post("/api/locations", { label, address }).then((r) => r.data),
};

export const compliance = {
  getStats: () => api.get("/api/compliance/stats").then((r) => r.data),
  listVerifications: () =>
    api.get("/api/compliance/verifications").then((r) => r.data),
  listOrders: () => api.get("/api/compliance/orders").then((r) => r.data),
};

// ── B2B ──────────────────────────────────────────────────────────────────────

export const b2b = {
  searchOrgs: (params = {}) =>
    api.get("/api/b2b/orgs/search", { params }).then((r) => r.data),
  listPartners: (params = {}) =>
    api.get("/api/b2b/partners", { params }).then((r) => r.data),
  getPartner: (connectionId) =>
    api.get(`/api/b2b/partners/${connectionId}`).then((r) => r.data),
  receivedRequests: () =>
    api.get("/api/b2b/requests/received").then((r) => r.data),
  sentRequests: () =>
    api.get("/api/b2b/requests/sent").then((r) => r.data),
  sendRequest: (targetOrgId, notes = "") =>
    api.post("/api/b2b/requests", { targetOrgId, notes }).then((r) => r.data),
  acceptRequest: (connectionId) =>
    api.patch(`/api/b2b/requests/${connectionId}/accept`).then((r) => r.data),
  declineRequest: (connectionId) =>
    api.patch(`/api/b2b/requests/${connectionId}/decline`).then((r) => r.data),
  cancelRequest: (connectionId) =>
    api.patch(`/api/b2b/requests/${connectionId}/cancel`).then((r) => r.data),
  disconnect: (connectionId) =>
    api.delete(`/api/b2b/partners/${connectionId}`).then((r) => r.data),
};

// ── CLIENT DASHBOARD ─────────────────────────────────────────────────────────

export const clientDashboard = {
  stats: () =>
    api.get("/api/client/dashboard/stats").then((r) => r.data),
  me: () =>
    api.get("/api/client/dashboard/me").then((r) => r.data),
  scanChart: (period = "year") =>
    api.get("/api/client/dashboard/scan-chart", { params: { period } }).then((r) => r.data),
  providerRanking: (limit = 7) =>
    api.get("/api/client/dashboard/provider-ranking", { params: { limit } }).then((r) => r.data),
  recentScans: (limit = 12) =>
    api.get("/api/client/dashboard/recent-scans", { params: { limit } }).then((r) => r.data),
};

// ── CLIENT COMPLIANCE VAULT ───────────────────────────────────────────────────

export const complianceVault = {
  stats:       ()            => api.get("/api/compliance-vault/stats").then((r) => r.data),
  list:        (params = {}) => api.get("/api/compliance-vault/documents", { params }).then((r) => r.data),
  get:         (id)          => api.get(`/api/compliance-vault/documents/${id}`).then((r) => r.data),
  downloadUrl: (id)          => api.get(`/api/compliance-vault/documents/${id}/download`).then((r) => r.data),
};

// ── PROVIDER COMPLIANCE DOCUMENTS ────────────────────────────────────────────

export const providerCompliance = {
  stats: () =>
    api.get("/api/provider/compliance/stats").then((r) => r.data),
  list: (params = {}) =>
    api.get("/api/provider/compliance/documents", { params }).then((r) => r.data),
  get: (id) =>
    api.get(`/api/provider/compliance/documents/${id}`).then((r) => r.data),
  create: (payload) =>
    api.post("/api/provider/compliance/documents", payload).then((r) => r.data),
  update: (id, payload) =>
    api.patch(`/api/provider/compliance/documents/${id}`, payload).then((r) => r.data),
  remove: (id) =>
    api.delete(`/api/provider/compliance/documents/${id}`).then((r) => r.data),
  downloadUrl: (id) =>
    api.get(`/api/provider/compliance/documents/${id}/download`).then((r) => r.data),
};

// ── CLIENT SETTINGS ───────────────────────────────────────────────────────────

export const clientSettings = {
  getProfile: () =>
    api.get("/api/client/settings/profile").then((r) => r.data),
  updateProfile: (payload) =>
    api.patch("/api/client/settings/profile", payload).then((r) => r.data),
  changePassword: (currentPassword, newPassword) =>
    api.patch("/api/client/settings/password", { currentPassword, newPassword }).then((r) => r.data),
};

// ── SESSION HELPERS ───────────────────────────────────────────────────────────

export function saveSession(token, user) {
  localStorage.setItem("biverify_token", token);
  localStorage.setItem("biverify_user", JSON.stringify(user));
}

export function getUser() {
  const raw = localStorage.getItem("biverify_user");
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  localStorage.removeItem("biverify_token");
  localStorage.removeItem("biverify_user");
}

export function apiErrorMessage(err) {
  return (
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.response?.data?.detail ||
    (err?.response?.status === 409
      ? "This booking cannot be cancelled in its current status."
      : null) ||
    err?.message ||
    "Something went wrong"
  );
}

export default api;