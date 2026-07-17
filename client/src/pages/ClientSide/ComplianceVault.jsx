import { useState, useEffect, useCallback } from "react";
import { complianceVault, apiErrorMessage, auth, getUser } from "../../api/client";
import api from "../../api/client";

const C = {
  primary:   "#2b9d4e",
  dark:      "#1f7a3b",
  light:     "#4fb96e",
  soft:      "#8fd6a3",
  pageBg:    "#F5F6FA",
  card:      "#FFFFFF",
  darkText:  "#1A1D23",
  muted:     "#6B7280",
  warning:   "#F59E0B",
  danger:    "#EF4444",
  border:    "rgba(43,157,78,0.12)",
  borderMed: "rgba(43,157,78,0.2)",
  bgLight:   "rgba(43,157,78,0.05)",
  bgMed:     "rgba(43,157,78,0.09)",
  bgIcon:    "rgba(43,157,78,0.1)",
  warnBg:    "rgba(245,158,11,0.1)",
  dangerBg:  "rgba(239,68,68,0.08)",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { overflow-x: hidden; width: 100%; }
  body { font-family: 'DM Sans', sans-serif; background: ${C.pageBg}; color: ${C.darkText}; }

  /* ── NAV ── */
  .topnav { background: ${C.primary}; height: 60px; padding: 0 28px; display: flex; align-items: center; justify-content: space-between; position: fixed; top: 0; left: 240px; right: 0; z-index: 100; box-shadow: 0 2px 8px rgba(31,122,59,0.18); }
  .nav-left  { display: flex; align-items: center; gap: 10px; }
  .nav-logobox { width: 30px; height: 30px; background: ${C.dark}; border-radius: 7px; display: flex; align-items: center; justify-content: center; }
  .nav-title { color: #fff; font-size: 16px; font-weight: 600; letter-spacing: -0.3px; }
  .nav-sub   { color: rgba(255,255,255,0.65); font-size: 10.5px; letter-spacing: 0.6px; text-transform: uppercase; }
  .nav-div   { width: 1px; height: 28px; background: rgba(255,255,255,0.2); margin: 0 14px; }
  .nav-pg    { color: rgba(255,255,255,0.9); font-size: 13.5px; font-weight: 500; }
  .nav-right { display: flex; align-items: center; gap: 10px; }
  .nav-site  { background: ${C.dark}; border-radius: 20px; padding: 4px 12px; color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
  .pulse     { width: 6px; height: 6px; background: ${C.soft}; border-radius: 50%; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.3)} }
  .nav-av    { width: 34px; height: 34px; border-radius: 50%; background: ${C.dark}; border: 2px solid rgba(255,255,255,0.35); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; }
  .nav-name  { color: #fff; font-size: 13px; font-weight: 500; }

  /* ── PAGE ── */
  .page { padding: 24px 28px; min-height: calc(100vh - 60px); margin-top: 60px; background: #F5F6FA; width: 100%; box-sizing: border-box; }

  /* ── PAGE HEADER ── */
  .page-hdr { margin-bottom: 22px; }
  .breadcrumb { font-size: 12px; color: ${C.muted}; margin-bottom: 5px; display: flex; align-items: center; gap: 5px; }
  .bc-active { color: ${C.primary}; font-weight: 500; }
  .page-title-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
  .page-title { font-size: 22px; font-weight: 600; color: ${C.darkText}; letter-spacing: -0.5px; }
  .verified-badge { display: flex; align-items: center; gap: 6px; background: ${C.bgLight}; border: 1px solid ${C.borderMed}; border-radius: 20px; padding: 6px 14px; font-size: 12.5px; font-weight: 500; color: ${C.dark}; }

  /* ── STAT STRIP ── */
  .stat-strip { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 22px; }
  @media(max-width:700px){ .stat-strip { grid-template-columns: 1fr 1fr; } }
  .stat-card { background: ${C.card}; border: 1px solid ${C.border}; border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; gap: 14px; transition: transform 0.15s; }
  .stat-card:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(43,157,78,0.09); }
  .stat-ico { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .stat-ico.green  { background: ${C.bgIcon}; }
  .stat-ico.warn   { background: ${C.warnBg}; }
  .stat-ico.danger { background: ${C.dangerBg}; }
  .stat-ico.gray   { background: rgba(107,114,128,0.08); }
  .stat-val { font-size: 22px; font-weight: 600; color: ${C.darkText}; font-family: 'DM Mono', monospace; letter-spacing: -0.5px; line-height: 1; }
  .stat-lbl { font-size: 11.5px; color: ${C.muted}; margin-top: 3px; }

  /* ── TOOLBAR ── */
  .toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
  .search-wrap { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 8px; background: ${C.card}; border: 1px solid ${C.border}; border-radius: 9px; padding: 9px 13px; transition: border-color 0.15s; }
  .search-wrap:focus-within { border-color: ${C.primary}; }
  .search-wrap input { background: none; border: none; outline: none; font-size: 13px; color: ${C.darkText}; flex: 1; font-family: 'DM Sans', sans-serif; }
  .search-wrap input::placeholder { color: ${C.muted}; }
  .filter-pills { display: flex; gap: 6px; flex-wrap: wrap; }
  .fpill { padding: 7px 14px; font-size: 12.5px; font-weight: 500; border-radius: 8px; cursor: pointer; border: 1px solid ${C.border}; background: ${C.card}; color: ${C.muted}; transition: all 0.13s; font-family: 'DM Sans', sans-serif; }
  .fpill:hover:not(.active) { border-color: ${C.primary}; color: ${C.primary}; }
  .fpill.active { background: ${C.primary}; color: #fff; border-color: ${C.primary}; }
  .fpill.active-warn { background: ${C.warning}; color: #fff; border-color: ${C.warning}; }
  .fpill.active-danger { background: ${C.danger}; color: #fff; border-color: ${C.danger}; }

  /* ── SECTION GROUPS ── */
  .vault-section { margin-bottom: 24px; }
  .vault-section:last-child { margin-bottom: 0; }
  .sec-label-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .sec-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.7px; color: ${C.muted}; white-space: nowrap; }
  .sec-line  { flex: 1; height: 1px; background: ${C.border}; }
  .sec-count { border-radius: 20px; padding: 2px 8px; font-size: 10.5px; font-weight: 700; }
  .sc-ok     { background: ${C.bgIcon}; color: ${C.dark}; }
  .sc-warn   { background: ${C.warnBg}; color: #92400e; }
  .sc-danger { background: ${C.dangerBg}; color: #991b1b; }

  /* ── DOC ROW ── */
  .doc-row {
    display: flex; align-items: center; gap: 14px;
    background: ${C.card}; border: 1px solid ${C.border};
    border-radius: 11px; padding: 14px 16px;
    margin-bottom: 8px; transition: all 0.13s; cursor: default;
  }
  .doc-row:last-child { margin-bottom: 0; }
  .doc-row:hover { border-color: ${C.borderMed}; box-shadow: 0 2px 10px rgba(43,157,78,0.07); }
  .doc-row.expired { border-color: rgba(239,68,68,0.2); background: rgba(239,68,68,0.02); }
  .doc-row.expiring { border-color: rgba(245,158,11,0.2); background: rgba(245,158,11,0.02); }

  /* provider avatar */
  .prov-av { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; font-family: 'DM Mono', monospace; flex-shrink: 0; }
  .pav-green  { background: ${C.bgIcon}; color: ${C.dark}; }
  .pav-warn   { background: ${C.warnBg}; color: #92400e; }
  .pav-danger { background: ${C.dangerBg}; color: #991b1b; }

  /* doc icon */
  .doc-ico { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .di-ok  { background: ${C.bgIcon}; }
  .di-w   { background: ${C.warnBg}; }
  .di-d   { background: ${C.dangerBg}; }

  .doc-info { flex: 1; min-width: 0; }
  .doc-name { font-size: 13.5px; font-weight: 600; color: ${C.darkText}; }
  .doc-prov { font-size: 12px; color: ${C.muted}; margin-top: 2px; }

  .doc-expiry { text-align: right; }
  .exp-label { font-size: 10.5px; color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 3px; }
  .exp-date  { font-size: 12.5px; font-weight: 500; font-family: 'DM Mono', monospace; color: ${C.darkText}; }
  .exp-date.danger { color: ${C.danger}; }
  .exp-date.warn   { color: #92400e; }
  .days-left { font-size: 11px; font-weight: 600; margin-top: 2px; }
  .dl-ok     { color: ${C.primary}; }
  .dl-warn   { color: #92400e; }
  .dl-danger { color: ${C.danger}; }

  /* badges */
  .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; white-space: nowrap; }
  .b-ok     { background: ${C.bgIcon}; color: ${C.dark}; border: 1px solid ${C.borderMed}; }
  .b-warn   { background: ${C.warnBg}; color: #92400e; border: 1px solid rgba(245,158,11,0.28); }
  .b-danger { background: ${C.dangerBg}; color: #991b1b; border: 1px solid rgba(239,68,68,0.22); }
  .b-pend   { background: rgba(107,114,128,0.08); color: ${C.muted}; border: 1px solid rgba(107,114,128,0.15); }

  /* view link */
  .view-link { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: ${C.primary}; font-weight: 500; cursor: pointer; padding: 5px 10px; border-radius: 7px; border: 1px solid ${C.borderMed}; background: ${C.bgLight}; transition: all 0.13s; white-space: nowrap; flex-shrink: 0; }
  .view-link:hover { background: ${C.bgMed}; border-color: ${C.primary}; }

  /* urgency bar at bottom of expired rows */
  .urgency-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; border-radius: 0 0 11px 11px; }
  .ub-danger { background: ${C.danger}; opacity: 0.4; }
  .ub-warn   { background: ${C.warning}; opacity: 0.4; }

  /* doc row position relative for urgency bar */
  .doc-row { position: relative; overflow: hidden; }

  /* ── SKELETON LOADER ── */
  .skeleton { animation: shimmer 1.4s infinite; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; border-radius: 8px; }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .skel-row { height: 68px; border-radius: 11px; margin-bottom: 8px; }
  .skel-stat { height: 66px; border-radius: 12px; }

  /* ── ERROR BANNER ── */
  .error-banner { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.22); border-radius: 10px; padding: 12px 16px; display: flex; align-items: center; gap: 10px; margin-bottom: 20px; font-size: 13px; color: #991b1b; }

  /* ── EMPTY STATE ── */
  .empty { text-align: center; padding: 40px 20px; color: ${C.muted}; }
  .empty-ico { width: 48px; height: 48px; background: ${C.bgIcon}; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; }
  .empty-t { font-size: 14px; font-weight: 600; color: ${C.darkText}; margin-bottom: 4px; }
  .empty-s { font-size: 12.5px; color: ${C.muted}; }

  /* ── MODAL (doc preview) ── */
  .modal-ov  { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
  .modal-box { background: ${C.card}; border-radius: 14px; width: 100%; max-width: 460px; border: 1px solid ${C.border}; overflow: hidden; }
  .modal-hdr { background: ${C.primary}; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; }
  .modal-title { color: #fff; font-size: 15px; font-weight: 600; }
  .modal-close { background: rgba(255,255,255,0.18); border: none; border-radius: 6px; width: 28px; height: 28px; color: #fff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .modal-body { padding: 20px; }
  .modal-field { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid ${C.border}; font-size: 13px; }
  .modal-field:last-child { border-bottom: none; }
  .mf-lbl { color: ${C.muted}; font-size: 12px; }
  .mf-val { font-weight: 500; color: ${C.darkText}; }
  .modal-preview { background: ${C.bgLight}; border: 1px dashed ${C.borderMed}; border-radius: 10px; margin-top: 14px; padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .modal-preview-ico { width: 44px; height: 44px; background: ${C.bgIcon}; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
  .modal-preview-name { font-size: 13px; font-weight: 500; color: ${C.darkText}; }
  .modal-preview-sub  { font-size: 11.5px; color: ${C.muted}; }
  .modal-download { width: 100%; background: ${C.primary}; color: #fff; border: none; border-radius: 9px; padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer; margin-top: 14px; font-family: 'DM Sans', sans-serif; display: flex; align-items: center; justify-content: center; gap: 7px; }
  .modal-download:hover { background: ${C.dark}; }
  .modal-download:disabled { opacity: 0.6; cursor: not-allowed; }

  /* ── TOAST ── */
  .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: ${C.dark}; color: #fff; padding: 11px 20px; border-radius: 10px; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px; z-index: 999; white-space: nowrap; animation: tUp 0.22s ease; }
  @keyframes tUp { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

  /* ── RESPONSIVE ── */
  @media(max-width: 700px) {
    .page { padding: 14px 16px; }
    .doc-row { flex-wrap: wrap; gap: 10px; }
    .doc-expiry { flex: none; width: 100%; display: flex; align-items: center; gap: 10px; justify-content: space-between; }
    .nav-div,.nav-pg,.nav-site { display: none; }
  }

  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .fu  { animation: fadeUp 0.3s ease both; }
  .fu1 { animation-delay: 0.04s; }
  .fu2 { animation-delay: 0.1s; }
  .fu3 { animation-delay: 0.16s; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: ${C.soft}; border-radius: 4px; }
`;

const Ico = ({ n, s = 15, c = "currentColor" }) => {
  const d = {
    qr:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" rx="0.5"/><rect x="18" y="14" width="3" height="3" rx="0.5"/><rect x="14" y="18" width="3" height="3" rx="0.5"/><rect x="18" y="18" width="3" height="3" rx="0.5"/></svg>,
    search:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    shield:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    doc:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>,
    alert:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    check:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    ext:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
    download:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    clock:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    filter:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
    refresh: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
    map:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  };
  return d[n] || null;
};

function statusInfo(doc) {
  if (doc.status === "expired")  return { cls:"b-danger", label:"Expired",  dlCls:"dl-danger", expCls:"danger" };
  if (doc.status === "expiring") return { cls:"b-warn",   label:"Expiring", dlCls:"dl-warn",   expCls:"warn"   };
  if (doc.status === "pending")  return { cls:"b-pend",   label:"Pending",  dlCls:"dl-ok",     expCls:""       };
  return                                { cls:"b-ok",     label:"Approved", dlCls:"dl-ok",     expCls:""       };
}

function daysLabel(d) {
  if (d == null) return "No expiry set";
  if (d < 0)    return `${Math.abs(d)}d overdue`;
  if (d === 0)  return "Expires today";
  return `${d}d left`;
}

const FILTERS = ["All", "Expired", "Expiring", "Approved", "Pending"];

export default function ComplianceVault() {
  const [docs,        setDocs]        = useState([]);
  const [stats,       setStats]       = useState({ expired: 0, expiring: 0, approved: 0, pending: 0 });
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [search,      setSearch]      = useState("");
  const [filter,      setFilter]      = useState("All");
  const [preview,     setPreview]     = useState(null);
  const [toast,       setToast]       = useState(null);
  const [downloading, setDownloading] = useState(false);

  // ── Logged-in user (from localStorage, enriched via /api/auth/me) ──────────
  const [currentUser, setCurrentUser] = useState(() => getUser() || {});
  const [activeSite,  setActiveSite]  = useState(null);   // first site from /api/locations

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  // ── Fetch current user profile & active site on mount ────────────────────
  useEffect(() => {
    auth.me()
      .then(res => {
        if (res?.user) {
          setCurrentUser(res.user);
          try {
            const stored = JSON.parse(localStorage.getItem("biverify_user") || "{}");
            localStorage.setItem("biverify_user", JSON.stringify({ ...stored, ...res.user }));
          } catch { /* ignore */ }
        }
      })
      .catch(() => { /* silent – use cached value */ });

    api.get("/api/locations")
      .then(res => {
        const sites = res.data;
        if (Array.isArray(sites) && sites.length > 0) {
          const active = sites.find(s => s.isActive !== false) || sites[0];
          setActiveSite(active.label);
        }
      })
      .catch(() => { /* silent – no site badge shown */ });
  }, []);

  // ── Derived nav values ────────────────────────────────────────────────────
  const navName = currentUser?.orgName || currentUser?.fullName || currentUser?.email || "My Org";
  const navInitials = navName
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "??";

  // ── Fetch stats + documents ───────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, docsRes] = await Promise.all([
        complianceVault.stats(),
        complianceVault.list({ limit: 200 }),
      ]);
      setStats(statsRes);
      setDocs(docsRes.documents || []);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Client-side filter + search (instant UX) ──────────────────────────────
  const filtered = docs.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = d.provider.toLowerCase().includes(q) || d.docType.toLowerCase().includes(q);
    const matchFilter =
      filter === "All"      ? true :
      filter === "Expired"  ? d.status === "expired"  :
      filter === "Expiring" ? d.status === "expiring" :
      filter === "Approved" ? d.status === "approved" :
      filter === "Pending"  ? d.status === "pending"  : true;
    return matchSearch && matchFilter;
  });

  const expired  = filtered.filter(d => d.status === "expired");
  const expiring = filtered.filter(d => d.status === "expiring");
  const valid    = filtered.filter(d => d.status === "approved" || d.status === "pending");

  // ── Download handler ──────────────────────────────────────────────────────
  const handleDownload = async (doc) => {
    setDownloading(true);
    try {
      const res = await complianceVault.downloadUrl(doc.id);
      if (res.url) {
        window.open(res.url, "_blank", "noopener,noreferrer");
        showToast(`Downloading ${doc.docType}…`);
      } else {
        showToast("File URL not available");
      }
    } catch (err) {
      showToast(apiErrorMessage(err));
    } finally {
      setDownloading(false);
      setPreview(null);
    }
  };

  // ── Sub-components ────────────────────────────────────────────────────────
  const DocRow = ({ doc }) => {
    const si = statusInfo(doc);
    const isExpired  = doc.status === "expired";
    const isExpiring = doc.status === "expiring";
    const diCls    = isExpired ? "di-d" : isExpiring ? "di-w" : "di-ok";
    const docIcoC  = isExpired ? C.danger : isExpiring ? C.warning : C.primary;

    return (
      <div className={`doc-row ${isExpired ? "expired" : isExpiring ? "expiring" : ""}`}>
        {isExpired  && <div className="urgency-bar ub-danger"/>}
        {isExpiring && <div className="urgency-bar ub-warn"/>}

        <div className={`prov-av ${doc.pavCls}`}>{doc.initials}</div>

        <div className={`doc-ico ${diCls}`}>
          <Ico n="doc" s={14} c={docIcoC}/>
        </div>

        <div className="doc-info">
          <div className="doc-name">{doc.docType}</div>
          <div className="doc-prov">
            {doc.provider} · Uploaded by {doc.uploadedBy}
          </div>
        </div>

        <span className={`badge ${si.cls}`}>{si.label}</span>

        <div className="doc-expiry">
          <div className="exp-label">Expiry</div>
          <div className={`exp-date ${si.expCls}`}>
            {doc.expiry
              ? new Date(doc.expiry).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" })
              : "—"}
          </div>
          <div className={`days-left ${si.dlCls}`}>{daysLabel(doc.daysLeft)}</div>
        </div>

        <button className="view-link" onClick={() => setPreview(doc)}>
          <Ico n="ext" s={12} c={C.primary}/> View
        </button>
      </div>
    );
  };

  const Section = ({ title, docs: sectionDocs, countCls }) => {
    if (sectionDocs.length === 0) return null;
    return (
      <div className="vault-section">
        <div className="sec-label-row">
          <span className="sec-label">{title}</span>
          <span className={`sec-count ${countCls}`}>{sectionDocs.length}</span>
          <div className="sec-line"/>
        </div>
        {sectionDocs.map(d => <DocRow key={d.id} doc={d}/>)}
      </div>
    );
  };

  const SkeletonStrip = () => (
    <div className="stat-strip fu fu1">
      {[0,1,2,3].map(i => <div key={i} className="skeleton skel-stat"/>)}
    </div>
  );

  const SkeletonRows = () => (
    <div className="fu fu3">
      {[0,1,2,3,4].map(i => <div key={i} className="skeleton skel-row"/>)}
    </div>
  );

  return (
    <>
      <style>{css}</style>

      {/* NAV */}
      <nav className="topnav">
        <div className="nav-left">
          <div className="nav-logobox"><Ico n="qr" s={15} c="#fff"/></div>
          <div><div className="nav-title">ComplianceQR</div><div className="nav-sub">Client Portal</div></div>
          <div className="nav-div"/><span className="nav-pg">Compliance Vault</span>
        </div>
        <div className="nav-right">
          {activeSite && (
            <div className="nav-site">
              <span className="pulse"/>
              <Ico n="map" s={11} c="rgba(255,255,255,0.75)"/>
              {activeSite}
            </div>
          )}
          <div className="nav-av" title={navName}>{navInitials}</div>
          <span className="nav-name">{navName}</span>
        </div>
      </nav>

      <div className="page" style={{ width: "100%", minWidth: 0, display: "block" }}>

        {/* PAGE HEADER */}
        <div className="page-hdr fu fu1">
          <div className="breadcrumb">
            <span>Dashboard</span><span>/</span>
            <span className="bc-active">Compliance Vault</span>
          </div>
          <div className="page-title-row">
            <div className="page-title">Compliance Vault</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {!loading && (
                <button
                  onClick={fetchData}
                  style={{ background:"none", border:`1px solid ${C.borderMed}`, borderRadius:8, padding:"5px 10px", cursor:"pointer", display:"flex", alignItems:"center", gap:5, color:C.primary, fontSize:12 }}
                >
                  <Ico n="refresh" s={12} c={C.primary}/> Refresh
                </button>
              )}
              <div className="verified-badge">
                <Ico n="shield" s={13} c={C.primary}/>
                Verified by Platform
              </div>
            </div>
          </div>
        </div>

        {/* ERROR BANNER */}
        {error && (
          <div className="error-banner">
            <Ico n="alert" s={16} c={C.danger}/>
            {error}
            <button onClick={fetchData} style={{ marginLeft:"auto", background:C.danger, color:"#fff", border:"none", borderRadius:6, padding:"4px 10px", fontSize:12, cursor:"pointer" }}>
              Retry
            </button>
          </div>
        )}

        {/* STAT STRIP */}
        {loading ? <SkeletonStrip/> : (
          <div className="stat-strip fu fu1">
            <div className="stat-card">
              <div className="stat-ico danger"><Ico n="alert" s={18} c={C.danger}/></div>
              <div><div className="stat-val">{stats.expired}</div><div className="stat-lbl">Expired</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-ico warn"><Ico n="clock" s={18} c={C.warning}/></div>
              <div><div className="stat-val">{stats.expiring}</div><div className="stat-lbl">Expiring soon</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-ico green"><Ico n="check" s={18} c={C.primary}/></div>
              <div><div className="stat-val">{stats.approved}</div><div className="stat-lbl">Approved</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-ico gray"><Ico n="doc" s={18} c={C.muted}/></div>
              <div><div className="stat-val">{stats.pending}</div><div className="stat-lbl">Pending review</div></div>
            </div>
          </div>
        )}

        {/* TOOLBAR */}
        <div className="toolbar fu fu2">
          <div className="search-wrap">
            <Ico n="search" s={14} c={C.muted}/>
            <input
              placeholder="Search by provider or document type…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-pills">
            {FILTERS.map(f => (
              <button key={f} className={`fpill ${
                filter === f
                  ? f === "Expired"  ? "active-danger"
                  : f === "Expiring" ? "active-warn"
                  : "active"
                  : ""
              }`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
        </div>

        {/* GROUPED SECTIONS */}
        {loading ? <SkeletonRows/> : (
          <div className="fu fu3">
            {expired.length === 0 && expiring.length === 0 && valid.length === 0 ? (
              <div className="empty">
                <div className="empty-ico"><Ico n="search" s={22} c={C.primary}/></div>
                <div className="empty-t">No documents found</div>
                <div className="empty-s">
                  {docs.length === 0
                    ? "No provider compliance documents are available yet."
                    : "Try adjusting your search or filter."}
                </div>
              </div>
            ) : (
              <>
                <Section title="Expired"       docs={expired}  countCls="sc-danger"/>
                <Section title="Expiring Soon" docs={expiring} countCls="sc-warn"/>
                <Section title="Valid"         docs={valid}    countCls="sc-ok"/>
              </>
            )}
          </div>
        )}
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      {preview && (
        <div className="modal-ov" onClick={() => setPreview(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <div className="modal-title">{preview.docType}</div>
              <button className="modal-close" onClick={() => setPreview(null)}>✕</button>
            </div>
            <div className="modal-body">
              {[
                { l:"Provider",      v: preview.provider },
                { l:"Uploaded by",   v: preview.uploadedBy },
                { l:"Document type", v: preview.docType },
                { l:"Expiry date",   v: preview.expiry
                    ? new Date(preview.expiry).toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" })
                    : "—" },
                { l:"Days left",     v: daysLabel(preview.daysLeft) },
                { l:"Status",        v: statusInfo(preview).label },
                { l:"File type",     v: preview.fileType },
              ].map((f, i) => (
                <div className="modal-field" key={i}>
                  <span className="mf-lbl">{f.l}</span>
                  <span className="mf-val">{f.v}</span>
                </div>
              ))}

              <div className="modal-preview">
                <div className="modal-preview-ico">
                  <Ico n="doc" s={22} c={C.primary}/>
                </div>
                <div className="modal-preview-name">
                  {preview.fileName || `${preview.docType}.pdf`}
                </div>
                <div className="modal-preview-sub">Uploaded by {preview.uploadedBy}</div>
              </div>

              <button
                className="modal-download"
                disabled={downloading}
                onClick={() => handleDownload(preview)}
              >
                <Ico n="download" s={14} c="#fff"/>
                {downloading ? "Opening…" : "Download File"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast"><Ico n="check" s={13} c="#fff"/>{toast}</div>}
    </>
  );
}