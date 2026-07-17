import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api, { getUser } from "../../api/client";
import "./ServiceProviderDashboard.css";

const PATHS = {
  dashboard: ["M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", "M9 22V12h6v10"],
  bell:      ["M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9", "M13.73 21a2 2 0 01-3.46 0"],
  search:    ["M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"],
  clock:     ["M12 2a10 10 0 100 20A10 10 0 0012 2z", "M12 6v6l4 2"],
  check:     ["M22 11.08V12a10 10 0 11-5.93-9.14", "M22 4L12 14.01l-3-3"],
  users:     ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2", "M23 21v-2a4 4 0 00-3-3.87", "M16 3.13a4 4 0 010 7.75", "M9 7a4 4 0 100 8 4 4 0 000-8z"],
  alert:     ["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z", "M12 9v4", "M12 17h.01"],
  inbox:     ["M22 12h-6l-2 3H10l-2-3H2", "M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"],
  badge:     ["M9 12l2 2 4-4", "M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"],
  upload:    ["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"],
  chevron:   ["M9 18l6-6-6-6"],
  refresh:   ["M23 4v6h-6", "M1 20v-6h6", "M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"],
  menu:      ["M3 12h18", "M3 6h18", "M3 18h18"],
  close:     ["M18 6L6 18", "M6 6l12 12"],
};

function Icon({ name, size = 16, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {(PATHS[name] || []).map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

const STAT_META = [
  { key: "activeServiceJobs",     label: "Active Service Jobs",     icon: "clock",  accent: "#3b82f6", iconBg: "#eff6ff", iconColor: "#3b82f6", badge: "Live",     badgeBg: "#dbeafe", badgeColor: "#1d4ed8" },
  { key: "jobsCompleted",         label: "Jobs Completed",          icon: "check",  accent: "#2b9d4e", iconBg: "#dcfce7", iconColor: "#2b9d4e", badge: "All time", badgeBg: "#dcfce7", badgeColor: "#15803d" },
  { key: "totalStaff",            label: "Total Staff",             icon: "users",  accent: "#8b5cf6", iconBg: "#f5f3ff", iconColor: "#8b5cf6", badge: "Active",   badgeBg: "#ede9fe", badgeColor: "#6d28d9" },
  { key: "pendingComplianceDocs", label: "Pending Compliance Docs", icon: "alert",  accent: "#f59e0b", iconBg: "#fef3c7", iconColor: "#d97706", badge: "Review",   badgeBg: "#fef3c7", badgeColor: "#b45309" },
];

const ACTIVITY_PLACEHOLDER = [
  { text: "New incoming request from TechCorp Ltd", time: "2 min ago",  icon: "inbox",  iconBg: "#eff6ff", iconColor: "#3b82f6" },
  { text: "Certification ISO 9001 approved",        time: "1 hr ago",   icon: "badge",  iconBg: "#dcfce7", iconColor: "#2b9d4e" },
  { text: "Staff member Ahmad added",               time: "3 hrs ago",  icon: "users",  iconBg: "#f5f3ff", iconColor: "#8b5cf6" },
  { text: "Compliance document uploaded",           time: "Yesterday",  icon: "upload", iconBg: "#fef3c7", iconColor: "#d97706" },
  { text: "Request #1042 marked completed",         time: "Yesterday",  icon: "check",  iconBg: "#dcfce7", iconColor: "#2b9d4e" },
];

const QUICK = [
  { label: "View Incoming Requests", icon: "inbox",  iconBg: "#eff6ff", iconColor: "#3b82f6", to: "/provider/incoming-requests" },
  { label: "Manage Certifications",  icon: "badge",  iconBg: "#dcfce7", iconColor: "#2b9d4e", to: "/provider/certifications"    },
  { label: "Upload Compliance Doc",  icon: "upload", iconBg: "#fef3c7", iconColor: "#d97706", to: "/provider/certifications"    },
  { label: "Manage Staff",           icon: "users",  iconBg: "#f5f3ff", iconColor: "#8b5cf6", to: "/provider/team"              },
];

function StatCard({ label, value, icon, iconBg, iconColor, accent, badge, badgeBg, badgeColor }) {
  const [hov, setHov] = useState(false);
  return (
    <div className={`spd-stat-card${hov ? " hov" : ""}`}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div className="spd-stat-accent" style={{ background: accent }} />
      <div className="spd-stat-top">
        <div className="spd-stat-icon" style={{ background: iconBg }}>
          <Icon name={icon} size={20} color={iconColor} sw={2} />
        </div>
        <span className="spd-stat-badge" style={{ background: badgeBg, color: badgeColor }}>{badge}</span>
      </div>
      <div className="spd-stat-bottom">
        <div className="spd-stat-value">{value ?? "—"}</div>
        <div className="spd-stat-label">{label}</div>
      </div>
    </div>
  );
}

export default function ServiceProviderDashboard() {
  const navigate = useNavigate();

  const user     = getUser();
  const fullName = user?.fullName || "Service Provider";
  const initials = fullName.split(" ").filter(Boolean).map(w => w[0].toUpperCase()).join("").slice(0, 2) || "SP";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search,      setSearch]      = useState("");
  const [showNotifs,  setShowNotifs]  = useState(false);
  const [notifCount,  setNotifCount]  = useState(0);

  const NOTIFS = [
    { text: "New service request received",  time: "2 min ago", icon: "inbox",  iconBg: "#eff6ff", iconColor: "#3b82f6" },
    { text: "Compliance doc pending review", time: "1 hr ago",  icon: "alert",  iconBg: "#fef3c7", iconColor: "#d97706" },
    { text: "Staff member login detected",   time: "3 hrs ago", icon: "users",  iconBg: "#f5f3ff", iconColor: "#8b5cf6" },
  ];

  const [stats,      setStats]      = useState(null);
  const [activity,   setActivity]   = useState(null);
  const [compliance, setCompliance] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [s, a, c] = await Promise.all([
        api.get("/api/provider/dashboard/stats"),
        api.get("/api/provider/dashboard/activity"),
        api.get("/api/provider/dashboard/compliance-status"),
      ]);
      setStats(s.data);
      setActivity(a.data);
      setCompliance(c.data);
      setNotifCount(s.data?.pendingComplianceDocs || 0);
    } catch { /* keep existing data */ }
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!showNotifs) return;
    const close = () => setShowNotifs(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showNotifs]);

  const val          = (key) => stats ? stats[key] : "—";
  const activityList = (!activity || activity.length === 0) ? ACTIVITY_PLACEHOLDER : activity;
  const filteredAct  = search.trim()
    ? activityList.filter(a => a.text.toLowerCase().includes(search.toLowerCase()))
    : activityList;
  const showBanner   = compliance === null || compliance.showBanner;

  return (
    <div className="spd-layout">

      {/* mobile overlay */}
      {sidebarOpen && <div className="spd-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className="spd-body-col">

        {/* ══ TOP NAV ══ */}
        <nav className="spd-topnav">

          <div className="spd-nav-left">
            {/* hamburger — same as ScanVerifyPage */}
            <button className="spd-menu-btn" onClick={() => setSidebarOpen(v => !v)}>
              <Icon name={sidebarOpen ? "close" : "menu"} size={20} color="#fff" sw={2} />
            </button>
            <div className="spd-nav-iconbox">
              <Icon name="dashboard" size={17} color="#fff" sw={1.9} />
            </div>
            <div className="spd-nav-titles">
              <span className="spd-nav-title">Provider Dashboard</span>
              <span className="spd-nav-subtitle">SERVICE OPERATIONS</span>
            </div>
          </div>

          <div className="spd-nav-right">
            <div className="spd-search-wrap">
              <Icon name="search" size={13} color="rgba(255,255,255,0.5)" sw={2} />
              <input
                className="spd-search-input"
                placeholder="Search activity…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="spd-notif-wrap" onClick={e => { e.stopPropagation(); setShowNotifs(v => !v); }}>
              <button className="spd-notif-btn">
                <Icon name="bell" size={15} color="#fff" sw={1.8} />
                {notifCount > 0 && <span className="spd-notif-dot" />}
              </button>
              {showNotifs && (
                <div className="spd-notif-panel" onClick={e => e.stopPropagation()}>
                  <div className="spd-notif-hdr">Notifications</div>
                  {NOTIFS.map((n, i) => (
                    <div key={i} className="spd-notif-row">
                      <div className="spd-notif-ico" style={{ background: n.iconBg }}>
                        <Icon name={n.icon} size={14} color={n.iconColor} sw={1.9} />
                      </div>
                      <div>
                        <div className="spd-notif-msg">{n.text}</div>
                        <div className="spd-notif-time">{n.time}</div>
                      </div>
                    </div>
                  ))}
                  <div className="spd-notif-all"
                    onClick={() => { setShowNotifs(false); navigate("/provider/audit"); }}>
                    View all activity
                  </div>
                </div>
              )}
            </div>

            <div className="spd-avatar">{initials}</div>
            <span className="spd-username">{fullName}</span>
          </div>
        </nav>

        {/* ══ MAIN ══ */}
        <main className="spd-main">

          <div className="spd-page-hdr">
            <div>
              <h1 className="spd-page-title">Provider Dashboard</h1>
              <p className="spd-page-sub">Welcome back. Here is your organization overview.</p>
            </div>
            <button className="spd-refresh-btn" onClick={fetchAll} disabled={refreshing}>
              <span className={refreshing ? "spd-spin" : ""}>
                <Icon name="refresh" size={14} color="#2b9d4e" sw={2} />
              </span>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          <div className="spd-stats-grid">
            {STAT_META.map(s => <StatCard key={s.key} {...s} value={val(s.key)} />)}
          </div>

          <div className="spd-panels">
            <div className="spd-panel">
              <div className="spd-panel-hdr">
                <span className="spd-panel-title">Recent Activity</span>
                <span className="spd-view-all" onClick={() => navigate("/provider/audit")}>View all</span>
              </div>
              {filteredAct.length === 0 ? (
                <div className="spd-empty">No activity matching "{search}"</div>
              ) : filteredAct.map((a, i) => (
                <div key={i} className={`spd-act-row${i < filteredAct.length - 1 ? " border" : ""}`}>
                  <div className="spd-act-ico" style={{ background: a.iconBg }}>
                    <Icon name={a.icon} size={16} color={a.iconColor} sw={1.9} />
                  </div>
                  <span className="spd-act-text">{a.text}</span>
                  <span className="spd-act-time">{a.time}</span>
                </div>
              ))}
            </div>

            <div className="spd-panel">
              <div className="spd-panel-title spd-panel-title-mb">Quick Actions</div>
              {QUICK.map((q, i) => (
                <button key={i} className="spd-quick-btn" onClick={() => navigate(q.to)}>
                  <span className="spd-quick-ico" style={{ background: q.iconBg }}>
                    <Icon name={q.icon} size={15} color={q.iconColor} sw={1.9} />
                  </span>
                  <span className="spd-quick-label">{q.label}</span>
                  <Icon name="chevron" size={14} color="#d1d5db" sw={1.8} />
                </button>
              ))}
            </div>
          </div>

          {showBanner && (
            <div className="spd-banner">
              <div className="spd-banner-ico">
                <Icon name="alert" size={18} color="#d97706" sw={2} />
              </div>
              <div className="spd-banner-body">
                <div className="spd-banner-title">Compliance Review Pending</div>
                <div className="spd-banner-text">
                  Your provider account is under review by the SuperAdmin. You will be notified
                  once your documents are approved and your account is fully activated.
                </div>
              </div>
              <button className="spd-banner-btn">Learn more</button>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
