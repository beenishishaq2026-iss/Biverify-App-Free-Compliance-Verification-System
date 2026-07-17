import React, { useState, useEffect } from 'react';
import './SystemAuditLogs.css';
import { getUser, auditLogs as auditApi, apiErrorMessage } from '../../api/client';

// ── Icons Helper ──
const Ico = ({ n, s = 15, c = "#fff" }) => {
  const icons = {
    history: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>,
    logs:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>,
  };
  return icons[n] || null;
};

// ── Top Navbar ──
const TopNavbar = ({ title, icon }) => {
  const G = "#2b9d4e";
  const user = getUser();
  const navName     = user?.orgName || user?.fullName || user?.email || 'Asset Owner';
  const navInitials = navName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'AO';

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
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "2px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 600 }}>
          {navInitials}
        </div>
        <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{navName}</span>
      </div>
    </nav>
  );
};

export default function SystemAuditLogs() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    auditApi.list({ limit: 50 })
      .then(data  => setLogs(data.logs || []))
      .catch(err  => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f0fdf4' }}>
      <TopNavbar title="System Audit Logs" icon="history" />
      <main style={{ marginTop: 60, padding: '32px', boxSizing: 'border-box' }}>
        <div className="logs-container" style={{ padding: 0, maxWidth: 'none', margin: 0 }}>

          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
              {error}
            </div>
          )}

          <div className="logs-table-wrapper">
            <div className="logs-table-header">
              <div className="col-time">Time</div>
              <div className="col-user">User</div>
              <div className="col-action">Action</div>
              <div className="col-details">Details</div>
            </div>
            <div className="logs-table-body">

              {loading ? (
                [0,1,2,3,4].map(i => (
                  <div className="logs-table-row" key={i} style={{ opacity: 0.4 }}>
                    <div className="col-time"    style={{ background: '#e5e7eb', borderRadius: 4, color: 'transparent' }}>Loading...</div>
                    <div className="col-user"    style={{ background: '#e5e7eb', borderRadius: 4, color: 'transparent' }}>User</div>
                    <div className="col-action"><span className="action-badge" style={{ background: '#e5e7eb', color: 'transparent' }}>ACTION</span></div>
                    <div className="col-details" style={{ background: '#e5e7eb', borderRadius: 4, color: 'transparent' }}>Details here</div>
                  </div>
                ))
              ) : logs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                  No audit logs found.
                </div>
              ) : (
                logs.map((log) => (
                  <div className="logs-table-row" key={log.id}>
                    <div className="col-time">{log.time}</div>
                    <div className="col-user">{log.user}</div>
                    <div className="col-action">
                      <span className={`action-badge ${log.action.toLowerCase()}`}>
                        {log.action}
                      </span>
                    </div>
                    <div className="col-details">{log.details}</div>
                  </div>
                ))
              )}

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}