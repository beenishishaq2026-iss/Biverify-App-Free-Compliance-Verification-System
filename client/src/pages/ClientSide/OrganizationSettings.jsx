import React, { useState, useEffect } from 'react';
import { Settings, Save, Clock, Globe } from 'lucide-react';
import { clientSettings, apiErrorMessage, getUser } from '../../api/client';
import './OrganizationSettings.css';

// ── Icons Helper ──
const Ico = ({ n, s = 15, c = "#fff" }) => {
  const icons = {
    settings: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  };
  return icons[n] || null;
};

// ── Top Navbar — now shows real logged-in user ──
const TopNavbar = ({ title, icon, navName, navInitials }) => {
  const G = "#2b9d4e";
  return (
    <nav style={{
      width: "calc(100% - 240px)", height: 60, background: G, padding: "0 28px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      position: "fixed", top: 0, left: 240, zIndex: 100,
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)", boxSizing: "border-box",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.12)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ico n={icon} s={16} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px", lineHeight: 1.2 }}>{title}</span>
          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>CLIENT PORTAL</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Real logged-in user */}
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "2px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 600 }}>
          {navInitials}
        </div>
        <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{navName}</span>
      </div>
    </nav>
  );
};

// ── Toast ──────────────────────────────────────────────────────────────────────
const Toast = ({ msg, type }) => (
  <div style={{
    position: "fixed", bottom: 28, right: 28, zIndex: 999,
    background: type === "error" ? "#fef2f2" : "#ecfdf5",
    border: `1px solid ${type === "error" ? "#fca5a5" : "#6ee7b7"}`,
    color: type === "error" ? "#991b1b" : "#065f46",
    padding: "12px 20px", borderRadius: 12, fontSize: 13.5, fontWeight: 600,
    boxShadow: "0 4px 20px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: 10,
    animation: "fadeIn 0.2s ease",
  }}>
    {type === "error" ? "✕" : "✓"} {msg}
  </div>
);

export default function OrganizationSettings() {
  // ── Form state ─────────────────────────────────────────────────────────────
  const [orgName,    setOrgName]    = useState('');
  const [email,      setEmail]      = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [timezone,   setTimezone]   = useState('UTC (Universal Coordinated Time)');
  const [currency,   setCurrency]   = useState('USD ($)');

  // ── Password change state ──────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]      = useState('');
  const [confirmPassword, setConfirmPassword]  = useState('');

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [toast,    setToast]    = useState(null);

  // ── Nav: real logged-in user ───────────────────────────────────────────────
  const currentUser  = getUser();
  const navName      = currentUser?.orgName || currentUser?.fullName || currentUser?.email || 'Asset Owner';
  const navInitials  = navName
    .split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'AO';

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Load settings on mount ─────────────────────────────────────────────────
  useEffect(() => {
    clientSettings.getProfile()
      .then(res => {
        const p = res.profile;
        setOrgName(p.orgName    || '');
        setEmail(p.email        || '');
        setWebsiteUrl(p.websiteUrl || '');
        setTimezone(p.timezone  || 'UTC (Universal Coordinated Time)');
        setCurrency(p.currency  || 'USD ($)');
      })
      .catch(err => showToast(apiErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  }, []);

  // ── Save profile ───────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await clientSettings.updateProfile({ orgName, email, websiteUrl, timezone, currency });
      try {
        const stored = JSON.parse(localStorage.getItem('biverify_user') || '{}');
        localStorage.setItem('biverify_user', JSON.stringify({ ...stored, orgName }));
      } catch { /* silent */ }
      showToast('Settings saved successfully');
    } catch (err) {
      showToast(apiErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('All password fields are required', 'error'); return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error'); return;
    }
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters', 'error'); return;
    }
    setPwSaving(true);
    try {
      await clientSettings.changePassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      showToast('Password changed successfully');
    } catch (err) {
      showToast(apiErrorMessage(err), 'error');
    } finally {
      setPwSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f0fdf4' }}>
      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }`}</style>

      <TopNavbar title="Organization Settings" icon="settings" navName={navName} navInitials={navInitials} />

      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <main style={{ marginTop: 60, padding: '32px', boxSizing: 'border-box' }}>
        <div className="settings-wrapper" style={{ padding: 0, maxWidth: 'none', margin: 0 }}>
          <div className="settings-container" style={{ margin: 0, padding: 0, maxWidth: 'none' }}>
            <div className="settings-card" style={{ width: '100%', maxWidth: '1100px', margin: '0 auto' }}>

              {/* ── Loading skeleton ── */}
              {loading ? (
                <div style={{ padding: '20px 0' }}>
                  {[120, 80, 160, 80, 120, 80].map((w, i) => (
                    <div key={i} style={{ height: 14, width: `${w}px`, borderRadius: 6, marginBottom: 18, background: 'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                  ))}
                  <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
                </div>
              ) : (
                <>
                  {/* ── PROFILE FORM ── */}
                  <form onSubmit={handleSubmit}>
                    <div className="form-section">
                      <h2 className="section-title">Branding & Identity</h2>
                      <div className="section-divider"></div>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">Organization Name</label>
                          <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} className="input-field" placeholder="Your organization name" required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Email</label>
                          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field" placeholder="admin@example.com" required />
                        </div>
                      </div>
                      <div className="form-grid" style={{ marginTop: '32px' }}>
                        <div className="form-group">
                          <label className="form-label">Website URL</label>
                          <input type="url" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} className="input-field" placeholder="https://" />
                        </div>
                      </div>
                    </div>

                    <div className="form-section localization-section">
                      <h2 className="section-title">Localization</h2>
                      <div className="section-divider"></div>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label icon-label"><Clock size={16} />Timezone</label>
                          <select className="select-field" value={timezone} onChange={e => setTimezone(e.target.value)}>
                            <option value="UTC (Universal Coordinated Time)">UTC (Universal Coordinated Time)</option>
                            <option value="EST (Eastern Standard Time)">EST (Eastern Standard Time)</option>
                            <option value="PST (Pacific Standard Time)">PST (Pacific Standard Time)</option>
                            <option value="CST (Central Standard Time)">CST (Central Standard Time)</option>
                            <option value="MST (Mountain Standard Time)">MST (Mountain Standard Time)</option>
                            <option value="GMT (Greenwich Mean Time)">GMT (Greenwich Mean Time)</option>
                            <option value="CET (Central European Time)">CET (Central European Time)</option>
                            <option value="IST (India Standard Time)">IST (India Standard Time)</option>
                            <option value="PKT (Pakistan Standard Time)">PKT (Pakistan Standard Time)</option>
                            <option value="SGT (Singapore Time)">SGT (Singapore Time)</option>
                            <option value="AEST (Australian Eastern Standard Time)">AEST (Australian Eastern Standard Time)</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label icon-label"><Globe size={16} />Currency</label>
                          <select className="select-field" value={currency} onChange={e => setCurrency(e.target.value)}>
                            <option value="USD ($)">USD ($)</option>
                            <option value="EUR (€)">EUR (€)</option>
                            <option value="GBP (£)">GBP (£)</option>
                            <option value="PKR (₨)">PKR (₨)</option>
                            <option value="INR (₹)">INR (₹)</option>
                            <option value="AED (د.إ)">AED (د.إ)</option>
                            <option value="SAR (﷼)">SAR (﷼)</option>
                            <option value="ZAR (R)">ZAR (R)</option>
                            <option value="CAD (CA$)">CAD (CA$)</option>
                            <option value="AUD (A$)">AUD (A$)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="form-footer">
                      <button type="submit" className="btn-save" disabled={saving}>
                        <Save size={18} />{saving ? 'Saving…' : 'Save Settings'}
                      </button>
                    </div>
                  </form>

                  {/* ── PASSWORD SECTION ── */}
                  <form onSubmit={handlePasswordChange} style={{ marginTop: '48px', borderTop: '1px solid #e5e7eb', paddingTop: '40px' }}>
                    <div className="form-section" style={{ marginBottom: 0 }}>
                      <h2 className="section-title">Change Password</h2>
                      <div className="section-divider"></div>
                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">Current Password</label>
                          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="input-field" placeholder="Enter current password" autoComplete="current-password" />
                        </div>
                        <div className="form-group">
                          <label className="form-label">New Password</label>
                          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input-field" placeholder="Minimum 8 characters" autoComplete="new-password" />
                        </div>
                      </div>
                      <div className="form-grid" style={{ marginTop: '32px' }}>
                        <div className="form-group">
                          <label className="form-label">Confirm New Password</label>
                          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input-field" placeholder="Repeat new password" autoComplete="new-password" />
                        </div>
                      </div>
                    </div>
                    <div className="form-footer">
                      <button type="submit" className="btn-save" disabled={pwSaving}>
                        <Save size={18} />{pwSaving ? 'Updating…' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                </>
              )}

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}