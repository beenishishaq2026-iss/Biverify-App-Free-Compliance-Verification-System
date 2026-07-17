import React, { useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import api from "../../api/client";

const G = "#2b9d4e", GD = "#1f7a3b";

const Ico = ({ n, s = 15, c = "#fff" }) => {
  const icons = {
    shield:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    calendar: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    org:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    active:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
    pending:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    users:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    check:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    x:        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    empty:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>,
    rejected: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  };
  return icons[n] || null;
};

const STATUS_TABS = [
  { key: "all",      label: "All Applications" },
  { key: "pending",  label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const STATUS_CONFIG = {
  pending:  { color: "#F59E0B", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)",  label: "Pending Review",  textColor: "#92400e" },
  approved: { color: G,         bg: "rgba(43,157,78,0.10)",   border: "rgba(43,157,78,0.25)",  label: "Approved",        textColor: GD        },
  rejected: { color: "#EF4444", bg: "rgba(239,68,68,0.09)",   border: "rgba(239,68,68,0.3)",   label: "Rejected",        textColor: "#991B1B"  },
};

export default function AdminDashboard() {
  const [statsData, setStatsData]         = useState([]);
  const [allProviders, setAllProviders]   = useState([]);
  const [activeTab, setActiveTab]         = useState("all");
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [actionMsg, setActionMsg]         = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, providersRes] = await Promise.all([
        api.get("/api/admin/dashboard/stats"),
        api.get("/api/admin/dashboard/all-providers"),
      ]);
      setStatsData([
        { title: "Total Organizations",  value: statsRes.data.totalOrganizations ?? 0, icon: "org",     accent: "" },
        { title: "Active Organizations", value: statsRes.data.activeOrganizations ?? 0, icon: "active",  accent: "" },
        { title: "Pending Approvals",    value: statsRes.data.pendingApprovals    ?? 0, icon: "pending", accent: "warn" },
        { title: "Total Users",          value: statsRes.data.totalUsers          ?? 0, icon: "users",   accent: "" },
      ]);
      setAllProviders(Array.isArray(providersRes.data) ? providersRes.data : []);
    } catch (err) {
      console.error("Dashboard Load Error:", err?.response?.data || err);
      setError(err?.response?.data?.error?.message || "Failed to load dashboard. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const handleApprove = async (p) => {
    try {
      await api.post(`/api/admin/dashboard/approve-provider/${p.id}`);
      setActionMsg(`✅ ${p.company} has been approved.`);
      setTimeout(() => setActionMsg(null), 4000);
      fetchDashboard();
    } catch (err) {
      alert("Failed to approve: " + (err?.response?.data?.error?.message || err.message));
    }
  };

  const handleReject = async (p) => {
    if (!window.confirm(`Reject ${p.company}? This cannot be undone.`)) return;
    try {
      await api.post(`/api/admin/dashboard/reject-provider/${p.id}`);
      setActionMsg(`❌ ${p.company} has been rejected.`);
      setTimeout(() => setActionMsg(null), 4000);
      fetchDashboard();
    } catch (err) {
      alert("Failed to reject: " + (err?.response?.data?.error?.message || err.message));
    }
  };

  const filteredProviders = activeTab === "all"
    ? allProviders
    : allProviders.filter(p => p.status === activeTab);

  const countByStatus = (s) => allProviders.filter(p => p.status === s).length;

  return (
    <div style={{ minHeight: "100vh", background: "#F5F6FA", fontFamily: "'Inter', sans-serif" }}>

      <AdminSidebar />

      {/* TOP NAV */}
      <nav style={{
        width: "100%", height: 60, background: G,
        padding: "0 20px", display: "flex", alignItems: "center",
        justifyContent: "space-between", position: "fixed", top: 0, left: 0,
        zIndex: 9999, boxShadow: "0 2px 8px rgba(31,122,59,0.2)", boxSizing: "border-box",
      }}>
        <div style={{ width: 240, flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: GD, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico n="shield" s={15} c="#fff" />
          </div>
          <span style={{ color: "#fff", fontSize: 19, fontWeight: 800, letterSpacing: "-0.4px" }}>BiVerify</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <div style={{ width: 36, height: 36, background: GD, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico n="calendar" s={16} c="#fff" />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#fff", fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>Admin Dashboard</span>
            <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 10.5 }}>Overview · Manage organizations</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: GD, border: "2px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 600 }}>AD</div>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>Admin</span>
        </div>
      </nav>

      {/* MAIN */}
      <div style={{ marginLeft: 240, marginTop: 60, padding: 24, minHeight: "calc(100vh - 60px)", boxSizing: "border-box" }}>

        {/* Action toast */}
        {actionMsg && (
          <div style={{ marginBottom: 16, padding: "12px 18px", background: "#fff", border: "1.5px solid rgba(43,157,78,0.35)", borderRadius: 10, fontSize: 14, fontWeight: 500, color: "#1A1D23", boxShadow: "0 2px 8px rgba(43,157,78,0.1)" }}>
            {actionMsg}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{ marginBottom: 20, padding: "16px 20px", background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 12, color: "#991B1B", fontSize: 14 }}>
            ⚠️ {error}
            <button onClick={fetchDashboard} style={{ marginLeft: 16, padding: "4px 12px", borderRadius: 6, border: "1px solid #FCA5A5", background: "#fff", color: "#DC2626", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 200, color: "#6B7280", fontSize: 15 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 36, height: 36, border: `3px solid ${G}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              Loading dashboard…
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
              {statsData.map((k, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(43,157,78,0.12)", padding: "18px 20px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: k.accent === "warn" ? "#F59E0B" : G, borderRadius: "12px 0 0 12px" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 500, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.4px" }}>{k.title}</span>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: k.accent === "warn" ? "rgba(245,158,11,0.10)" : "rgba(43,157,78,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Ico n={k.icon} s={14} c={k.accent === "warn" ? "#F59E0B" : G} />
                    </div>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#1A1D23", letterSpacing: "-0.8px", lineHeight: 1, marginBottom: 6, fontFamily: "'DM Mono', monospace" }}>{k.value}</div>
                  <hr style={{ border: "none", borderTop: "1px solid rgba(43,157,78,0.12)", margin: "8px 0" }} />
                  <span style={{ fontSize: 11, color: "#6B7280" }}>{k.title === "Pending Approvals" ? "Awaiting review" : "Current total"}</span>
                </div>
              ))}
            </div>

            {/* Section header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "#1A1D23", letterSpacing: "-0.3px", margin: 0 }}>
                Provider Applications
              </h2>
              <span style={{ fontSize: 12, color: "#6B7280" }}>{allProviders.length} total applications</span>
            </div>

            {/* Status Tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "#fff", borderRadius: 12, padding: 6, border: "1.5px solid rgba(43,157,78,0.15)", width: "fit-content" }}>
              {STATUS_TABS.map(tab => {
                const isActive = activeTab === tab.key;
                const count = tab.key === "all" ? allProviders.length : countByStatus(tab.key);
                const cfg = STATUS_CONFIG[tab.key];
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      padding: "7px 16px",
                      borderRadius: 8,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.15s",
                      background: isActive
                        ? (cfg ? cfg.bg : "rgba(43,157,78,0.10)")
                        : "transparent",
                      color: isActive
                        ? (cfg ? cfg.textColor : GD)
                        : "#6B7280",
                      boxShadow: isActive ? `0 0 0 1.5px ${cfg ? cfg.border : "rgba(43,157,78,0.3)"}` : "none",
                    }}
                  >
                    {tab.label}
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "1px 7px",
                      borderRadius: 20,
                      background: isActive ? (cfg ? cfg.color : G) : "#E5E7EB",
                      color: isActive ? "#fff" : "#6B7280",
                    }}>{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Applications List */}
            <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1.5px solid rgba(43,157,78,0.2)", boxShadow: "0 2px 12px rgba(43,157,78,0.06)" }}>
              {filteredProviders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#9CA3AF" }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(43,157,78,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                    <Ico n="active" s={22} c={G} />
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#6B7280", margin: "0 0 6px" }}>No applications found</p>
                  <p style={{ fontSize: 13, margin: 0 }}>
                    {activeTab === "pending" ? "No pending provider applications right now." :
                     activeTab === "approved" ? "No approved providers yet." :
                     activeTab === "rejected" ? "No rejected applications." :
                     "No provider applications found."}
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {filteredProviders.map((p, i) => {
                    const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
                    const isPending = p.status === "pending";
                    return (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderRadius: 12, border: "1px solid rgba(43,157,78,0.14)", background: "linear-gradient(135deg, rgba(43,157,78,0.03) 0%, #fff 100%)", gap: 20, position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: cfg.color, borderRadius: "12px 0 0 12px" }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#1A1D23" }}>{p.company}</span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, background: cfg.bg, color: cfg.textColor, border: `1px solid ${cfg.border}`, textTransform: "uppercase", letterSpacing: "0.3px" }}>
                              <span style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.color, display: "inline-block" }} />
                              {cfg.label}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: 24, marginTop: 4, flexWrap: "wrap" }}>
                            {[
                              ["Admin Email", p.admin],
                              ["Signed Up", p.date],
                              ["Service", p.doc],
                              ...(p.status === "approved" && p.approvedAt ? [["Approved On", p.approvedAt]] : []),
                              ...(p.status === "rejected" && p.updatedAt ? [["Rejected On", p.updatedAt]] : []),
                            ].map(([label, val]) => (
                              <div key={label} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                <span style={{ fontSize: 10, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
                                <span style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>{val || "—"}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Action buttons — only for pending */}
                        {isPending ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, minWidth: 155 }}>
                            <button onClick={() => handleApprove(p)} style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: G, color: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 2px 10px rgba(43,157,78,0.3)", width: "100%" }}>
                              <Ico n="check" s={13} c="#fff" /> Approve &amp; Activate
                            </button>
                            <button onClick={() => handleReject(p)} style={{ padding: "8px 14px", borderRadius: 8, border: "1.5px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.04)", color: "#EF4444", cursor: "pointer", fontSize: 12.5, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%" }}>
                              <Ico n="x" s={13} c="#EF4444" /> Reject
                            </button>
                          </div>
                        ) : (
                          <div style={{ flexShrink: 0, minWidth: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: cfg.textColor, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: "6px 14px", borderRadius: 8 }}>
                              {p.status === "approved" ? "✓ Active" : "✗ Rejected"}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}