import { useState, useEffect, useCallback } from "react";
import { clientDashboard } from "../../api/client";

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTS / THEME
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  primary: "#2b9d4e", dark: "#1f7a3b", light: "#4fb96e", soft: "#8fd6a3",
  pageBg: "#F5F6FA", card: "#FFFFFF", darkText: "#1A1D23", muted: "#6B7280",
  warning: "#F59E0B", danger: "#EF4444",
  border: "rgba(43,157,78,0.12)", borderMed: "rgba(43,157,78,0.18)",
  bgLight: "rgba(43,157,78,0.05)", bgMed: "rgba(43,157,78,0.08)",
  bgIcon: "rgba(43,157,78,0.1)", warnBg: "rgba(245,158,11,0.1)",
  dangerBg: "rgba(239,68,68,0.1)",
};

// ─────────────────────────────────────────────────────────────────────────────
//  CSS
// ─────────────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: ${C.pageBg}; color: ${C.darkText}; overflow-x: hidden; }
  html, body, #root { overflow-x: hidden; width: 100%; }
  .topnav { background: #2b9d4e; height: 60px; padding: 0 28px; display: flex; align-items: center; justify-content: space-between; position: fixed; top: 0; left: 240px; right: 0; z-index: 100; box-shadow: 0 2px 8px rgba(31,122,59,0.2); }
  .topnav-left { display: flex; align-items: center; gap: 12px; }
  .topnav-right { display: flex; align-items: center; gap: 10px; }
  .topnav-sitebadge { background: #1f7a3b; border-radius: 20px; padding: 4px 12px; color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
  .pulse-dot { width: 6px; height: 6px; background: #8fd6a3; border-radius: 50%; animation: pulse 2s infinite; flex-shrink: 0; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.3)} }
  .notif-btn { width: 34px; height: 34px; border-radius: 50%; background: #1f7a3b; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; position: relative; overflow: visible; flex-shrink: 0; }
  .notif-btn svg { display: block; flex-shrink: 0; }
  .notif-pip { position: absolute; top: 4px; right: 4px; width: 8px; height: 8px; background: #F59E0B; border-radius: 50%; border: 2px solid #2b9d4e; pointer-events: none; }
  .topnav-avatar { width: 34px; height: 34px; border-radius: 50%; background: #1f7a3b; border: 2px solid rgba(255,255,255,0.35); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; flex-shrink: 0; letter-spacing: 0.5px; }
  .topnav-name { color: #fff; font-size: 13px; font-weight: 500; white-space: nowrap; }
  .main { padding: 24px 28px; min-height: calc(100vh - 60px); margin-top: 60px; background: #F5F6FA; width: 100%; box-sizing: border-box; }
  .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 22px; width: 100%; }
  @media(max-width:900px){ .kpi-row{ grid-template-columns: 1fr 1fr; } }
  @media(max-width:500px){ .kpi-row{ grid-template-columns: 1fr; } }
  .kpi-card { background: ${C.card}; border-radius: 12px; border: 1px solid ${C.border}; padding: 12px 16px; position: relative; overflow: hidden; transition: transform 0.18s, box-shadow 0.18s; cursor: default; }
  .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 4px 14px rgba(43,157,78,0.09); }
  .kpi-card-accent { position: absolute; top: 0; left: 0; width: 3px; height: 100%; background: ${C.primary}; border-radius: 12px 0 0 12px; }
  .kpi-card-accent.danger { background: ${C.danger}; }
  .kpi-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
  .kpi-label { font-size: 11px; font-weight: 500; color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.4px; }
  .kpi-icon-wrap { width: 28px; height: 28px; border-radius: 7px; background: ${C.bgIcon}; display: flex; align-items: center; justify-content: center; }
  .kpi-icon-wrap.danger { background: ${C.dangerBg}; }
  .kpi-value { font-size: 22px; font-weight: 600; color: ${C.darkText}; letter-spacing: -0.8px; line-height: 1; margin-bottom: 4px; font-family: 'DM Mono', monospace; }
  .kpi-meta { font-size: 11px; color: ${C.muted}; display: flex; align-items: center; gap: 4px; }
  .kpi-up { color: ${C.primary}; font-weight: 600; }
  .kpi-dn { color: ${C.danger}; font-weight: 600; }
  .kpi-divider { border: none; border-top: 1px solid ${C.border}; margin: 8px 0 6px; }
  .kpi-sub { font-size: 10.5px; color: ${C.muted}; }
  .chart-section { background: ${C.card}; border-radius: 12px; border: 1px solid ${C.border}; padding: 20px; margin-bottom: 22px; width: 100%; box-sizing: border-box; }
  .chart-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
  .chart-tab { padding: 6px 16px; font-size: 13px; font-weight: 500; color: ${C.primary}; border-bottom: 2px solid ${C.primary}; }
  .chart-filter { display: flex; align-items: center; gap: 4px; }
  .filter-btn { padding: 5px 11px; font-size: 12px; font-weight: 500; color: ${C.muted}; border: 1px solid ${C.border}; border-radius: 6px; background: ${C.pageBg}; cursor: pointer; transition: all 0.15s; }
  .filter-btn.active { background: ${C.primary}; color: #fff; border-color: ${C.primary}; }
  .filter-btn:hover:not(.active) { border-color: ${C.primary}; color: ${C.primary}; }
  .chart-body { display: grid; grid-template-columns: 1fr 320px; gap: 24px; }
  @media(max-width:900px){ .chart-body{ grid-template-columns: 1fr; } }
  .chart-title { font-size: 13px; font-weight: 600; color: ${C.darkText}; margin-bottom: 14px; }
  .ranking-title { font-size: 13px; font-weight: 600; color: ${C.darkText}; margin-bottom: 14px; }
  .rank-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid ${C.border}; }
  .rank-item:last-child { border-bottom: none; }
  .rank-num { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
  .rank-num.top { background: ${C.primary}; color: #fff; }
  .rank-num.reg { background: ${C.bgMed}; color: ${C.muted}; }
  .rank-name { flex: 1; font-size: 13px; color: ${C.darkText}; }
  .rank-val { font-size: 12px; font-weight: 600; color: ${C.darkText}; font-family: 'DM Mono', monospace; }
  .card { background: ${C.card}; border-radius: 12px; border: 1px solid ${C.border}; padding: 20px; width: 100%; box-sizing: border-box; }
  .card-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .card-title { font-size: 13.5px; font-weight: 600; color: ${C.darkText}; }
  .card-action { font-size: 12px; color: ${C.primary}; cursor: pointer; font-weight: 500; }
  .card-action:hover { text-decoration: underline; }
  .scan-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid ${C.border}; }
  .scan-row:last-child { border-bottom: none; }
  .scan-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .scan-dot.ok { background: ${C.primary}; }
  .scan-dot.warn { background: ${C.warning}; }
  .scan-dot.gray { background: ${C.muted}; }
  .scan-site { flex: 1; font-size: 13px; color: ${C.darkText}; font-weight: 500; }
  .scan-sub { font-size: 11px; color: ${C.muted}; }
  .scan-time { font-size: 11px; color: ${C.muted}; font-family: 'DM Mono', monospace; white-space: nowrap; }
  .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .badge-green { background: ${C.bgIcon}; color: ${C.dark}; border: 1px solid ${C.borderMed}; }
  .badge-warn  { background: ${C.warnBg}; color: #92400e; border: 1px solid rgba(245,158,11,0.25); }
  .badge-gray  { background: ${C.bgMed}; color: ${C.muted}; border: 1px solid ${C.border}; }
  .skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  @media(max-width:600px){ .main{ padding: 16px; } }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: ${C.soft}; border-radius: 4px; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .fu { animation: fadeUp 0.3s ease forwards; opacity: 0; }
  .fu-1 { animation-delay: 0.04s; } .fu-2 { animation-delay: 0.1s; } .fu-3 { animation-delay: 0.16s; }
  .nav-skeleton { width: 80px; height: 14px; border-radius: 4px; background: rgba(255,255,255,0.2); animation: navShimmer 1.4s infinite; }
  .nav-skeleton-sm { width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,0.2); animation: navShimmer 1.4s infinite; }
  @keyframes navShimmer { 0%,100%{opacity:0.5} 50%{opacity:1} }
`;

// ─────────────────────────────────────────────────────────────────────────────
//  ICONS
// ─────────────────────────────────────────────────────────────────────────────
const Ico = ({ n, s = 16, c = C.primary }) => {
  const d = {
    qr: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="3" height="3" rx="0.5"/>
        <rect x="18" y="14" width="3" height="3" rx="0.5"/>
        <rect x="14" y="18" width="3" height="3" rx="0.5"/>
        <rect x="18" y="18" width="3" height="3" rx="0.5"/>
      </svg>
    ),
    providers: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    doc: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
      </svg>
    ),
    alert: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
    // FIX: Bell icon rewritten with explicit viewBox and clean paths that render reliably
 
    home: (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    ),
  };
  return d[n] || null;
};

// ─────────────────────────────────────────────────────────────────────────────
//  SKELETON — shown while loading
// ─────────────────────────────────────────────────────────────────────────────
const KpiSkeleton = () => (
  <div className="kpi-row fu fu-1">
    {[0, 1, 2, 3].map(i => (
      <div className="kpi-card" key={i}>
        <div className="kpi-card-accent"/>
        <div className="skeleton" style={{ height: 10, width: "60%", marginBottom: 10 }}/>
        <div className="skeleton" style={{ height: 28, width: "40%", marginBottom: 8 }}/>
        <div className="skeleton" style={{ height: 8, width: "80%" }}/>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// QR Verifications: grouped bars per quarter (Q1–Q4) per year
const scanYearGroups = [
  { year: "2023 Q1", bars: [28, 18] },
  { year: "2023 Q2", bars: [34, 22] },
  { year: "2023 Q3", bars: [41, 14] },
  { year: "2023 Q4", bars: [30, 20] },
  { year: "2024 Q1", bars: [38, 16] },
  { year: "2024 Q2", bars: [52, 10] },
  { year: "2024 Q3", bars: [56, 8] },
  { year: "2024 Q4", bars: [44, 12] },
];

const scans = [
  { site: "Site A – Lahore HQ",       provider: "CleanTech Solutions", time: "2m ago",  status: "Verified" },
  { site: "Site B – DHA Warehouse",   provider: "GreenClean Services",  time: "38m ago", status: "Verified" },
  { site: "Site C – Gulberg Office",  provider: "TechFix Pakistan",     time: "1h ago",  status: "Mismatch" },
  { site: "Site A – Lahore HQ",       provider: "SafeGuard Security",   time: "2h ago",  status: "Verified" },
  { site: "Site D – Model Town",      provider: "PowerSystems Ltd",     time: "3h ago",  status: "Verified" },
  { site: "Site B – DHA Warehouse",   provider: "AquaFlow Services",    time: "5h ago",  status: "Verified" },
];

const rankings = [
  { name: "CleanTech Solutions", val: "127 jobs", top: true },
  { name: "GreenClean Services", val: "98 jobs",  top: true },
  { name: "TechFix Pakistan",    val: "81 jobs",  top: true },
  { name: "SafeGuard Security",  val: "64 jobs",  top: false },
  { name: "PowerSystems Ltd",    val: "39 jobs",  top: false },
  { name: "AquaFlow Services",   val: "22 jobs",  top: false },
  { name: "ProBuild Contracts",  val: "14 jobs",  top: false },
];

const NAV_SECTIONS = [
  { section: "MANAGEMENT", items: [
    { id: "overview", icon: "home",     label: "Overview"         },
    { id: "network",  icon: "network",  label: "B2B Network"      },
  ]},
  { section: "ASSET OPERATIONS", items: [
    { id: "bookings", icon: "bookings", label: "Service Bookings" },
    { id: "vault",    icon: "vault",    label: "Compliance Vault" },
    { id: "team",     icon: "team",     label: "My Team"          },
    { id: "clientqr", icon: "qr",       label: "ClientQR"         },
  ]},
  { section: "SYSTEM", items: [
    { id: "audit",    icon: "check",    label: "Audit History"    },
    { id: "settings", icon: "settings", label: "Settings"         },
  ]},
];
/** Turn the /stats response into the 4 KPI card descriptors the template uses. */
function buildKpiCards(stats) {
  if (!stats) return [];
  const { activeProviders, complianceRate, qrScansToday, expiringDocs } = stats;
  return [
    {
      label: "Active Providers",
      value: String(activeProviders.value),
      sub:   activeProviders.sub,
      trend: activeProviders.trend,
      up:    activeProviders.trendUp,
      icon:  "providers",
      accentClass: "",
    },
    {
      label: "Compliance Rate",
      value: complianceRate.value,
      sub:   complianceRate.sub,
      trend: complianceRate.trend,
      up:    complianceRate.trendUp,
      icon:  "doc",
      accentClass: "",
    },
    {
      label: "QR Scans Today",
      value: String(qrScansToday.value),
      sub:   qrScansToday.sub,
      trend: qrScansToday.trend,
      up:    qrScansToday.trendUp,
      icon:  "qr",
      accentClass: "",
    },
    {
      label: "Expiring Docs",
      value: String(expiringDocs.value),
      sub:   expiringDocs.sub,
      trend: expiringDocs.trend,
      up:    expiringDocs.trendUp,
      icon:  "alert",
      accentClass: expiringDocs.value > 0 ? "danger" : "",
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ClientDashboard() {
  // ── period filter for the chart
  const [filterBtn, setFilterBtn] = useState("year");

  // ── Navbar data (replaces static hardcoded values)
  const [navInfo,      setNavInfo]      = useState(null);
  const [loadingNav,   setLoadingNav]   = useState(true);

  // ── API state
  const [stats,         setStats]        = useState(null);
  const [chartData,     setChartData]    = useState([]);
  const [rankings,      setRankings]     = useState([]);
  const [scans,         setScans]        = useState([]);

  const [loadingStats,   setLoadingStats]   = useState(true);
  const [loadingChart,   setLoadingChart]   = useState(true);
  const [loadingRanking, setLoadingRanking] = useState(true);
  const [loadingScans,   setLoadingScans]   = useState(true);

  const [errorStats,   setErrorStats]   = useState(null);
  const [errorScans,   setErrorScans]   = useState(null);

  // ── fetch navbar data on mount
  useEffect(() => {
    setLoadingNav(true);
    clientDashboard.me()
      .then(data  => setNavInfo(data))
      .catch(()   => setNavInfo({ orgName: "My Org", initials: "??", siteLabel: "HQ", userName: "" }))
      .finally(() => setLoadingNav(false));
  }, []);

  // ── fetch stats once on mount
  useEffect(() => {
    setLoadingStats(true);
    clientDashboard.stats()
      .then(data  => { setStats(data); setErrorStats(null); })
      .catch(err  => setErrorStats(err?.response?.data?.error?.message || "Failed to load stats"))
      .finally(() => setLoadingStats(false));
  }, []);

  // ── fetch chart whenever period filter changes
  const fetchChart = useCallback(() => {
    setLoadingChart(true);
    clientDashboard.scanChart(filterBtn)
      .then(data  => setChartData(data.groups || []))
      .catch(()   => setChartData([]))
      .finally(() => setLoadingChart(false));
  }, [filterBtn]);

  useEffect(() => { fetchChart(); }, [fetchChart]);

  // ── fetch ranking + recent scans once on mount
  useEffect(() => {
    setLoadingRanking(true);
    clientDashboard.providerRanking(7)
      .then(data  => setRankings(data.rankings || []))
      .catch(()   => setRankings([]))
      .finally(() => setLoadingRanking(false));

    setLoadingScans(true);
    clientDashboard.recentScans(12)
      .then(data  => { setScans(data.scans || []); setErrorScans(null); })
      .catch(err  => setErrorScans(err?.response?.data?.error?.message || "Failed to load scans"))
      .finally(() => setLoadingScans(false));
  }, []);

  // ── derived data
  const kpiCards = buildKpiCards(stats);
  const maxScan  = Math.max(...chartData.map(g => Math.max(g.qrVerified, g.manual)), 1);

  // badge class → CSS class
  const badgeClass = (cls) =>
    cls === "verified" ? "badge-green" : cls === "warn" ? "badge-warn" : "badge-gray";

  // dot class from statusClass
  const dotClass = (cls) =>
    cls === "verified" ? "ok" : cls === "warn" ? "warn" : "gray";

  // ── render
  return (
    <>
      <style>{css}</style>

      {/* ── TOP NAV ── */}
      <nav className="topnav">
        <div className="topnav-left">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.15)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Ico n="home" s={16} c="#fff"/>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px", lineHeight: 1.2 }}>
                Dashboard
              </span>
              <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>
                Overview · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        <div className="topnav-right">
          {/* ── Site badge — dynamic from /me ── */}
          <div className="topnav-sitebadge">
            <span className="pulse-dot"/>
            {loadingNav
              ? <span className="nav-skeleton" style={{ width: 90, height: 12, borderRadius: 4 }}/>
              : navInfo?.siteLabel ?? "HQ"
            }
          </div>

      

          {/* ── Avatar — dynamic initials from /me ── */}
          {loadingNav
            ? <div className="nav-skeleton-sm"/>
            : (
              <div className="topnav-avatar" title={navInfo?.userName ?? ""}>
                {navInfo?.initials ?? "??"}
              </div>
            )
          }

          {/* ── Org name — dynamic from /me ── */}
          {loadingNav
            ? <div className="nav-skeleton"/>
            : <span className="topnav-name">{navInfo?.orgName ?? ""}</span>
          }
        </div>
      </nav>

      {/* ── MAIN ── */}
      <div className="main" style={{ width: "100%", minWidth: 0, display: "block" }}>

        {/* ── KPI CARDS ── */}
        {loadingStats ? (
          <KpiSkeleton/>
        ) : errorStats ? (
          <div style={{ color: C.danger, fontSize: 13, marginBottom: 22 }}>{errorStats}</div>
        ) : (
          <div className="kpi-row fu fu-1">
            {kpiCards.map((k, i) => (
              <div className="kpi-card" key={i}>
                <div className={`kpi-card-accent ${k.accentClass}`}/>
                <div className="kpi-top">
                  <span className="kpi-label">{k.label}</span>
                  <div className={`kpi-icon-wrap ${k.accentClass}`}>
                    <Ico n={k.icon} s={15} c={k.accentClass === "danger" ? C.danger : C.primary}/>
                  </div>
                </div>
                <div className="kpi-value">{k.value}</div>
                <div className="kpi-meta">
                  <span className={k.up ? "kpi-up" : "kpi-dn"}>{k.trend}</span>
                  <span style={{ color: C.muted }}>
                    &nbsp;{k.up ? "vs last month" : k.accentClass === "danger" ? "action needed" : "vs last month"}
                  </span>
                </div>
                <hr className="kpi-divider"/>
                <div className="kpi-sub">{k.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── CHART SECTION ── */}
        <div className="chart-section fu fu-2">
          <div className="chart-header" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "center" }}>
            <div><span className="chart-tab">QR Verifications</span></div>
            <div className="chart-filter">
              {[["day", "All day"], ["week", "All week"], ["month", "All month"], ["year", "All year"]].map(([f, l]) => (
                <button
                  key={f}
                  className={`filter-btn ${filterBtn === f ? "active" : ""}`}
                  onClick={() => setFilterBtn(f)}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-body">
            {/* Left: Bar Chart */}
            <div>
              <div className="chart-title">
                QR Scan Volume ({filterBtn === "year" ? "by Quarter" : filterBtn === "month" ? "by Week" : filterBtn === "week" ? "by Day" : "by Hour"}) — QR Verified vs Photo/Manual
              </div>

              {loadingChart ? (
                <div className="skeleton" style={{ height: 160, borderRadius: 8 }}/>
              ) : chartData.length === 0 ? (
                <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: 13 }}>
                  No scan data for this period
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                    {/* Y-axis labels */}
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: 160, paddingBottom: 22 }}>
                      {[maxScan, Math.round(maxScan * 0.75), Math.round(maxScan * 0.5), Math.round(maxScan * 0.25), 0].map(v => (
                        <span key={v} style={{ fontSize: 10, color: C.muted, fontFamily: "DM Mono", lineHeight: 1 }}>{v}</span>
                      ))}
                    </div>
                    {/* Bars */}
                    <div style={{ flex: 1, position: "relative" }}>
                      <div style={{ position: "absolute", inset: "0 0 22px 0", display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
                        {[0, 1, 2, 3, 4].map(i => <div key={i} style={{ borderTop: `1px solid ${C.border}`, width: "100%" }}/>)}
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 160 }}>
                        {chartData.map((g, gi) => (
                          <div key={gi} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                            <div style={{ display: "flex", gap: 2, alignItems: "flex-end", width: "100%", height: 138 }}>
                              {[g.qrVerified, g.manual].map((h, bi) => (
                                <div
                                  key={bi}
                                  style={{
                                    height: `${(h / maxScan) * 138}px`,
                                    flex: 1,
                                    borderRadius: "3px 3px 0 0",
                                    background: bi === 0 ? C.primary : C.soft,
                                    cursor: "pointer",
                                    transition: "opacity 0.15s",
                                    minHeight: h > 0 ? 2 : 0,
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.opacity = "0.7"}
                                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                                />
                              ))}
                            </div>
                            <div style={{ fontSize: 9.5, color: C.muted, fontFamily: "DM Mono", marginTop: 5, textAlign: "center", whiteSpace: "nowrap" }}>
                              {g.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Legend */}
                  <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: C.primary }}/>
                      <span style={{ fontSize: 11, color: C.muted }}>QR Verified</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: C.soft }}/>
                      <span style={{ fontSize: 11, color: C.muted }}>Photo / Manual</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right: Provider Ranking */}
            <div>
              <div className="ranking-title">Provider Ranking (by verified jobs)</div>
              {loadingRanking ? (
                [0, 1, 2, 3, 4].map(i => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div className="skeleton" style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0 }}/>
                    <div className="skeleton" style={{ flex: 1, height: 10 }}/>
                    <div className="skeleton" style={{ width: 48, height: 10 }}/>
                  </div>
                ))
              ) : rankings.length === 0 ? (
                <div style={{ color: C.muted, fontSize: 13, paddingTop: 8 }}>No job data yet</div>
              ) : (
                rankings.map((r, i) => (
                  <div className="rank-item" key={i}>
                    <div className={`rank-num ${r.isTop ? "top" : "reg"}`}>{r.rank}</div>
                    <span className="rank-name">{r.name}</span>
                    <span className="rank-val">{r.label}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── RECENT QR SCANS ── */}
        <div className="card fu fu-3">
          <div className="card-hdr">
            <span className="card-title">Recent QR Scans</span>
            <span className="card-action">View All →</span>
          </div>

          {loadingScans ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", gap: "0 32px" }}>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div className="skeleton" style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0 }}/>
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 10, marginBottom: 6, width: "70%" }}/>
                    <div className="skeleton" style={{ height: 8, width: "50%" }}/>
                  </div>
                  <div className="skeleton" style={{ width: 40, height: 8 }}/>
                  <div className="skeleton" style={{ width: 60, height: 20, borderRadius: 20 }}/>
                </div>
              ))}
            </div>
          ) : errorScans ? (
            <div style={{ color: C.danger, fontSize: 13 }}>{errorScans}</div>
          ) : scans.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13 }}>No scans recorded yet</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", gap: "0 32px" }}>
              {scans.map((s, i) => (
                <div className="scan-row" key={i}>
                  <span className={`scan-dot ${dotClass(s.statusClass)}`}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="scan-site">{s.site}</div>
                    <div className="scan-sub">{s.provider}</div>
                  </div>
                  <span className="scan-time">{s.time}</span>
                  <span className={`badge ${badgeClass(s.statusClass)}`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}