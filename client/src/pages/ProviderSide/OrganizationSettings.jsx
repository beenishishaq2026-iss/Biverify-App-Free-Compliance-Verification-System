import React, { useState } from 'react';
import { Settings, Save, Clock, Globe } from 'lucide-react';
import './OrganizationSettings.css';

// ── Icons Helper ──
const Ico = ({ n, s = 15, c = "#fff" }) => {
  const icons = {
    bell:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
    settings: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  };
  return icons[n] || null;
};

// ── Top Navbar Style ──
const TopNavbar = ({ title, icon }) => {
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
          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>PROVIDER PORTAL</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <Ico n="bell" s={15} />
          <span style={{ position: "absolute", top: 5, right: 6, width: 8, height: 8, background: "#F59E0B", borderRadius: "50%", border: `2px solid ${G}` }} />
        </button>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "2px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 600 }}>AO</div>
        <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>Asset Owner</span>
      </div>
    </nav>
  );
};

export default function OrganizationSettings() {
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [timezone, setTimezone] = useState('UTC (Universal Coordinated Time)');
  const [currency, setCurrency] = useState('USD ($)');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Settings saved');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0fdf4' }}>
      <TopNavbar title="Organization Settings" icon="settings" />
      <main style={{ marginTop: 60, padding: '32px', boxSizing: 'border-box' }}>
        <div className="settings-wrapper" style={{ padding: 0, maxWidth: 'none', margin: 0 }}>
          <div className="settings-container" style={{ margin: 0, padding: 0, maxWidth: 'none' }}>
            <div className="settings-card" style={{ width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
              <form onSubmit={handleSubmit}>
                <div className="form-section">
                  <h2 className="section-title">Branding & Identity</h2>
                  <div className="section-divider"></div>
                  <div className="form-grid">
                    <div className="form-group"><label className="form-label">Organization Name</label><input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="input-field" placeholder="spark" /></div>
                    <div className="form-group"><label className="form-label">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="spark@example.com" /></div>
                  </div>
                  <div className="form-grid" style={{ marginTop: '32px' }}><div className="form-group"><label className="form-label">Website URL</label><input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className="input-field" placeholder="https://" /></div></div>
                </div>
                <div className="form-section localization-section">
                  <h2 className="section-title">Localization</h2>
                  <div className="section-divider"></div>
                  <div className="form-grid">
                    <div className="form-group"><label className="form-label icon-label"><Clock size={16} />Timezone</label><select className="select-field" value={timezone} onChange={(e) => setTimezone(e.target.value)}><option value="UTC (Universal Coordinated Time)">UTC (Universal Coordinated Time)</option><option value="EST (Eastern Standard Time)">EST (Eastern Standard Time)</option><option value="PST (Pacific Standard Time)">PST (Pacific Standard Time)</option></select></div>
                    <div className="form-group"><label className="form-label icon-label"><Globe size={16} />Currency</label><select className="select-field" value={currency} onChange={(e) => setCurrency(e.target.value)}><option value="USD ($)">USD ($)</option><option value="EUR (€)">EUR (€)</option><option value="GBP (£)">GBP (£)</option></select></div>
                  </div>
                </div>
                <div className="form-footer"><button type="submit" className="btn-save"><Save size={18} />Save Settings</button></div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
