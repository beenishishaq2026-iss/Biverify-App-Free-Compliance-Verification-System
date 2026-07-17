import { useState, useEffect, useCallback } from "react";
import api, { apiErrorMessage } from "../../api/client";
import { useNavigate } from "react-router-dom";

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
  dangerBg:  "rgba(239,68,68,0.1)",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: ${C.pageBg}; color: ${C.darkText}; }

  /* ── NAV ── */
  .topnav { background: ${C.primary}; height: 60px; padding: 0 28px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 8px rgba(31,122,59,0.18); }
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
  .page { padding: 16px 24px; }
  .back-link { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: ${C.muted}; cursor: pointer; margin-bottom: 10px; transition: color 0.13s; font-weight: 500; }
  .back-link:hover { color: ${C.primary}; }

  /* ── HERO ── */
  .hero { background: ${C.primary}; border-radius: 14px 14px 0 0; overflow: hidden; }
  .hero-top { padding: 22px 26px 18px; display: flex; align-items: flex-start; gap: 18px; position: relative; }
  .hero-av { width: 82px; height: 82px; border-radius: 20px; background: rgba(255,255,255,0.25); border: 2px solid rgba(255,255,255,0.5); display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 700; color: #fff; flex-shrink: 0; font-family: 'DM Mono', monospace; letter-spacing: -1px; box-shadow: 0 0 0 6px rgba(255,255,255,0.08); }
  .hero-info { flex: 1; }
  .hero-name-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
  .hero-name  { color: #fff; font-size: 22px; font-weight: 700; letter-spacing: -0.4px; }
  .hero-meta  { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 4px; }
  .hero-meta-item { display: flex; align-items: center; gap: 5px; color: rgba(255,255,255,0.8); font-size: 12.5px; }
  .hero-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
  .conn-pill  { background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.32); border-radius: 20px; padding: 5px 13px; color: #fff; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
  .conn-dot   { width: 7px; height: 7px; border-radius: 50%; background: ${C.soft}; animation: pulse 2s infinite; }
  .hero-date  { color: rgba(255,255,255,0.65); font-size: 11.5px; }

  .hero-stats { display: grid; grid-template-columns: repeat(4, 1fr); background: rgba(0,0,0,0.18); border-top: 1px solid rgba(0,0,0,0.15); }
  .hs-item { padding: 13px 20px; display: flex; flex-direction: column; gap: 3px; }
  .hs-item + .hs-item { border-left: 1px solid rgba(0,0,0,0.15); }
  .hs-val  { color: #fff; font-size: 22px; font-weight: 700; font-family: 'DM Mono', monospace; line-height: 1; letter-spacing: -0.5px; }
  .hs-lbl  { color: rgba(255,255,255,0.6); font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; }

  .body-grid { display: grid; grid-template-columns: 1fr 320px; gap: 0; background: ${C.card}; border: 1px solid ${C.border}; border-top: none; border-radius: 0 0 14px 14px; overflow: hidden; }
  .body-left  { padding: 22px 24px; border-right: 1px solid ${C.border}; }
  .body-right { padding: 20px; display: flex; flex-direction: column; gap: 20px; }

  .sec-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .sec-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: ${C.darkText}; }
  .sec-action { font-size: 12px; color: ${C.primary}; font-weight: 500; cursor: pointer; }
  .sec-action:hover { text-decoration: underline; }

  .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 24px; }
  .field { }
  .f-lbl { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: ${C.muted}; margin-bottom: 4px; }
  .f-val { font-size: 13px; color: ${C.darkText}; font-weight: 500; }
  .f-mono { font-family: 'DM Mono', monospace; font-size: 11.5px; color: ${C.muted}; word-break: break-all; }
  .status-active { display: inline-flex; align-items: center; gap: 5px; color: ${C.primary}; font-size: 13px; font-weight: 600; }
  .sdot { width: 7px; height: 7px; border-radius: 50%; background: ${C.primary}; }

  .divider { border: none; border-top: 1px solid ${C.border}; margin: 20px 0; }

  .doc-row   { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid ${C.border}; }
  .doc-row:last-child { border-bottom: none; }
  .doc-ico   { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .di-ok     { background: ${C.bgIcon}; }
  .di-w      { background: ${C.warnBg}; }
  .di-d      { background: ${C.dangerBg}; }
  .doc-name  { font-size: 13px; font-weight: 500; color: ${C.darkText}; }
  .doc-exp   { font-size: 11px; color: ${C.muted}; margin-top: 2px; }
  .doc-right { margin-left: auto; text-align: right; }
  .doc-days  { font-size: 12px; font-weight: 600; font-family: 'DM Mono', monospace; }
  .doc-days.ok { color: ${C.primary}; }
  .doc-days.w  { color: #92400e; }
  .doc-days.d  { color: ${C.danger}; }

  .act-row   { display: flex; align-items: flex-start; gap: 10px; padding: 9px 0; border-bottom: 1px solid ${C.border}; }
  .act-row:last-child { border-bottom: none; }
  .adot      { width: 8px; height: 8px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
  .adot-g    { background: ${C.primary}; }
  .adot-w    { background: ${C.warning}; }
  .adot-d    { background: ${C.danger}; }
  .a-t       { font-size: 12.5px; font-weight: 500; color: ${C.darkText}; }
  .a-s       { font-size: 11px; color: ${C.muted}; margin-top: 2px; }
  .a-ts      { margin-left: auto; font-size: 10.5px; color: ${C.muted}; white-space: nowrap; font-family: 'DM Mono', monospace; }

  .badge     { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; white-space: nowrap; }
  .b-prov    { background: rgba(255,255,255,0.18); color: #fff; border: 1px solid rgba(255,255,255,0.32); }
  .b-ok      { background: ${C.bgIcon}; color: ${C.dark}; border: 1px solid ${C.borderMed}; }
  .b-warn    { background: ${C.warnBg}; color: #92400e; border: 1px solid rgba(245,158,11,0.28); }
  .b-crit    { background: ${C.dangerBg}; color: #991b1b; border: 1px solid rgba(239,68,68,0.22); }

  .chip-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .chip { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; padding: 14px 10px; border-radius: 10px; background: rgba(43,157,78,0.06); border: 1px solid rgba(43,157,78,0.15); cursor: pointer; transition: all 0.13s; }
  .chip:hover { background: rgba(43,157,78,0.12); border-color: rgba(43,157,78,0.25); }
  .chip.danger { background: rgba(239,68,68,0.05); border-color: rgba(239,68,68,0.15); }
  .chip.danger:hover { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.25); }
  .chip-lbl { font-size: 11.5px; font-weight: 500; color: #1f7a3b; text-align: center; line-height: 1.3; }
  .chip.danger .chip-lbl { color: #dc2626; }

  .sum-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid ${C.border}; }
  .sum-row:last-child { border-bottom: none; }
  .sum-lbl  { font-size: 12px; color: ${C.muted}; }
  .sum-val  { font-size: 12px; font-weight: 600; color: ${C.darkText}; font-family: 'DM Mono', monospace; }

  /* ── MODALS ── */
  .modal-ov  { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 200; }
  .modal-box { background: ${C.card}; border-radius: 14px; padding: 26px; max-width: 380px; width: 90%; border: 1px solid ${C.border}; box-shadow: 0 16px 48px rgba(0,0,0,0.14); }
  .modal-t   { font-size: 16px; font-weight: 700; color: ${C.darkText}; margin-bottom: 8px; }
  .modal-s   { font-size: 13px; color: ${C.muted}; line-height: 1.55; margin-bottom: 16px; }
  .modal-btns { display: flex; gap: 10px; }
  .m-cancel  { flex: 1; background: transparent; border: 1px solid ${C.border}; border-radius: 9px; padding: 10px; font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; color: ${C.darkText}; transition: border-color 0.13s; }
  .m-cancel:hover { border-color: ${C.muted}; }
  .m-confirm { flex: 1; background: ${C.danger}; border: none; border-radius: 9px; padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; color: #fff; transition: background 0.13s; }
  .m-confirm:hover { background: #dc2626; }
  .m-primary { flex: 1; border: none; border-radius: 9px; padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; color: #fff; transition: background 0.13s; }
  .m-primary:hover { filter: brightness(0.92); }

  .email-box { display: flex; align-items: center; gap: 10px; background: rgba(43,157,78,0.06); border: 1px solid rgba(43,157,78,0.15); border-radius: 9px; padding: 11px 14px; margin-bottom: 20px; }
  .email-box-text { font-size: 13px; font-weight: 600; color: ${C.darkText}; word-break: break-all; }

  .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: ${C.dark}; color: #fff; padding: 11px 20px; border-radius: 10px; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px; z-index: 999; white-space: nowrap; animation: tUp 0.22s ease; }
  @keyframes tUp { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }

  .skeleton { background: linear-gradient(90deg, ${C.bgLight} 25%, ${C.bgMed} 50%, ${C.bgLight} 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; height: 20px; }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  @media(max-width: 960px) {
    .body-grid  { grid-template-columns: 1fr; }
    .body-left  { border-right: none; border-bottom: 1px solid rgba(43,157,78,0.12); }
  }
  @media(max-width: 600px) {
    .hero-top   { flex-wrap: wrap; }
    .hero-right { margin-left: 0; width: 100%; flex-direction: row; justify-content: space-between; align-items: center; }
    .details-grid { grid-template-columns: 1fr; }
    .page       { padding: 14px 16px; }
    .nav-div,.nav-pg,.nav-site { display: none; }
  }

  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .fu  { animation: fadeUp 0.3s ease both; }
  .fu1 { animation-delay: 0.04s; }
  .fu2 { animation-delay: 0.1s; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: ${C.soft}; border-radius: 4px; }
`;

const Ico = ({ n, s = 15, c = "currentColor" }) => {
  const d = {
    qr:       <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" rx="0.5"/><rect x="18" y="14" width="3" height="3" rx="0.5"/><rect x="14" y="18" width="3" height="3" rx="0.5"/><rect x="18" y="18" width="3" height="3" rx="0.5"/></svg>,
    back:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
    check:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    booking:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    email:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    doc:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>,
    org:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
    activity: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    calendar: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    industry: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
    trash:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
    copy:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
    open:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  };
  return d[n] || null;
};

function initials(name = "") {
  return name.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "?";
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtSince(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function PartnerProfile({ connectionId, onBack }) {
  const [loading, setLoading]             = useState(true);
  const [connection, setConnection]       = useState(null);
  const [docs, setDocs]                   = useState([]);
  const [showModal, setShowModal]         = useState(false);
  const [showContact, setShowContact]     = useState(false);
  const [toast, setToast]                 = useState(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const navigate = useNavigate();

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const connRes = await api.get(`/api/b2b/connections/${connectionId}`);
        setConnection(connRes.data);

        const partnerId = connRes.data?.partner?.id;
        if (partnerId) {
          try {
            const docsRes = await api.get(`/api/compliance_documents`, {
              params: { orgId: partnerId },
            });
            setDocs(docsRes.data.items || []);
          } catch {
            setDocs([]);
          }
        }
      } catch (err) {
        showToast(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    if (connectionId) fetchData();
  }, [connectionId]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await api.delete(`/api/b2b/connections/${connectionId}`);
      showToast(`Partnership ended. ${connection?.partner?.name} has been removed.`);
      setShowModal(false);
      setTimeout(() => onBack?.(), 1500);
    } catch (err) {
      showToast(apiErrorMessage(err));
    } finally {
      setDisconnecting(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(p.adminEmail);
    showToast("Email address copied!");
    setShowContact(false);
  };

  const handleOpenEmail = () => {
    window.location.href = `mailto:${p.adminEmail}`;
    setShowContact(false);
  };

  // ── Loading state ──
  if (loading) {
    return (
      <>
        <style>{css}</style>
        <nav className="topnav">
          <div className="nav-left">
            <div className="nav-logobox"><Ico n="qr" s={15} c="#fff"/></div>
            <div><div className="nav-title">BiVerify</div><div className="nav-sub">Portal</div></div>
          </div>
        </nav>
        <div className="page"><div className="skeleton" style={{ height: 300 }}/></div>
      </>
    );
  }

  // ── Not found state ──
  if (!connection || !connection.partner) {
    return (
      <>
        <style>{css}</style>
        <nav className="topnav">
          <div className="nav-left">
            <div className="nav-logobox"><Ico n="qr" s={15} c="#fff"/></div>
          </div>
        </nav>
        <div className="page" style={{ textAlign: "center", paddingTop: 60 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.darkText, marginBottom: 10 }}>
            Partner not found
          </div>
          <button
            onClick={onBack}
            style={{ fontSize: 13, color: C.primary, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
          >
            ← Back
          </button>
        </div>
      </>
    );
  }

  const p = connection.partner;

  const activity = [
    { t: "Connection established", s: p.name, ts: fmtSince(connection.connectedAt || connection.createdAt), dot: "g" },
    { t: "Profile viewed", s: "by your organization", ts: "now", dot: "g" },
  ];

  return (
    <>
      <style>{css}</style>

      {/* ── NAV ── */}
      <nav className="topnav">
        <div className="nav-left">
          <div className="nav-logobox"><Ico n="qr" s={15} c="#fff"/></div>
          <div><div className="nav-title">BiVerify</div><div className="nav-sub">Portal</div></div>
          <div className="nav-div"/>
          <span className="nav-pg">Partner Profile</span>
        </div>
        <div className="nav-right">
          <div className="nav-site"><span className="pulse"/>Live</div>
        </div>
      </nav>

      <div className="page">
        <div className="back-link fu fu1" onClick={onBack}>
          <Ico n="back" s={14} c="currentColor"/> Back to B2B Network
        </div>

        {/* ── HERO ── */}
        <div className="hero fu fu1">
          <div className="hero-top">
            <div className="hero-av">{initials(p.name)}</div>
            <div className="hero-info">
              <div className="hero-name-row">
                <span className="hero-name">{p.name}</span>
                <span className="badge b-prov">{p.type}</span>
              </div>
              <div className="hero-meta">
                <div className="hero-meta-item">
                  <Ico n="industry" s={13} c="rgba(255,255,255,0.7)"/>
                  {p.industry || "—"}
                </div>
                <div className="hero-meta-item">
                  <Ico n="email" s={13} c="rgba(255,255,255,0.7)"/>
                  {p.adminEmail || "No email on file"}
                </div>
                <div className="hero-meta-item">
                  <Ico n="calendar" s={13} c="rgba(255,255,255,0.7)"/>
                  Since {fmtSince(connection.connectedAt || connection.createdAt)}
                </div>
              </div>
            </div>
            <div className="hero-right">
              <div className="conn-pill"><span className="conn-dot"/>Connected</div>
              <div className="hero-date">{fmtSince(connection.connectedAt || connection.createdAt)}</div>
            </div>
          </div>

          <div className="hero-stats">
            {[
              { val: docs.filter(d => d.status === "verified").length, lbl: "Valid docs" },
              { val: docs.length,   lbl: "Total docs" },
              { val: "—",           lbl: "Avg response" },
              { val: "Connected",   lbl: "Status" },
            ].map((s, i) => (
              <div className="hs-item" key={i}>
                <div className="hs-val">{s.val}</div>
                <div className="hs-lbl">{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="body-grid fu fu2">
          {/* Left col */}
          <div className="body-left">
            <div className="sec-hdr">
              <div className="sec-title"><Ico n="org" s={15} c={C.primary}/>Organization Details</div>
            </div>
            <div className="details-grid">
              <div className="field">
                <div className="f-lbl">Organization ID</div>
                <div className="f-val f-mono">{p.id}</div>
              </div>
              <div className="field">
                <div className="f-lbl">Status</div>
                <div className="status-active"><span className="sdot"/>{p.status || "Active"}</div>
              </div>
              <div className="field">
                <div className="f-lbl">Industry / Service</div>
                <div className="f-val">{p.industry || p.serviceType || "—"}</div>
              </div>
              <div className="field">
                <div className="f-lbl">Partner type</div>
                <div className="f-val">{p.type}</div>
              </div>
              <div className="field">
                <div className="f-lbl">Contact email</div>
                <div className="f-val" style={{ color: C.primary, fontSize: 12.5 }}>
                  {p.adminEmail || "—"}
                </div>
              </div>
              <div className="field">
                <div className="f-lbl">Connected since</div>
                <div className="f-val">{fmtSince(connection.connectedAt || connection.createdAt)}</div>
              </div>
            </div>

            <div className="divider"/>

            <div className="sec-hdr">
              <div className="sec-title"><Ico n="activity" s={15} c={C.primary}/>Activity Feed</div>
            </div>
            {activity.map((a, i) => (
              <div className="act-row" key={i}>
                <span className={`adot adot-${a.dot}`}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="a-t">{a.t}</div>
                  <div className="a-s">{a.s}</div>
                </div>
                <span className="a-ts">{a.ts}</span>
              </div>
            ))}
          </div>

          {/* Right col */}
          <div className="body-right">
            {/* Compliance docs */}
            <div>
              <div className="sec-hdr">
                <div className="sec-title"><Ico n="doc" s={15} c={C.primary}/>Compliance Documents</div>
              </div>
              {docs.length === 0 ? (
                <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: "20px 0" }}>
                  No documents on file
                </div>
              ) : docs.slice(0, 5).map((d, i) => {
                const statusCls = d.status === "verified" ? "ok" : d.status === "expired" ? "d" : "w";
                return (
                  <div className="doc-row" key={i}>
                    <div className={`doc-ico di-${statusCls}`}>
                      <Ico n="doc" s={14} c={statusCls === "ok" ? C.primary : statusCls === "w" ? C.warning : C.danger}/>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="doc-name">{d.label || d.type}</div>
                      <div className="doc-exp">{d.status}</div>
                    </div>
                    <div className="doc-right">
                      <span className={`badge ${statusCls === "ok" ? "b-ok" : statusCls === "w" ? "b-warn" : "b-crit"}`}>
                        {d.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div>
              <div className="sec-hdr" style={{ marginBottom: 10 }}>
                <div className="sec-title"><Ico n="org" s={15} c={C.primary}/>Actions</div>
              </div>
              <div className="chip-grid">
                {p.type === "provider" && (
                  <div
                    className="chip"
                    onClick={() => navigate(`/new-request?providerId=${connection?.partner?.id}`)}
                  >
                    <Ico n="booking" s={20} c="#2b9d4e"/>
                    <span className="chip-lbl">Request Service</span>
                  </div>
                )}
                <div
                  className="chip"
                  style={{ gridColumn: p.type === "provider" ? "span 1" : "span 2" }}
                  onClick={() => setShowContact(true)}
                >
                  <Ico n="email" s={20} c="#2b9d4e"/>
                  <span className="chip-lbl">Email</span>
                </div>
                <div
                  className="chip danger"
                  style={{ gridColumn: "span 2" }}
                  onClick={() => setShowModal(true)}
                >
                  <Ico n="trash" s={20} c="#dc2626"/>
                  <span className="chip-lbl">End Partnership</span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div>
              <div className="sec-hdr" style={{ marginBottom: 10 }}>
                <div className="sec-title"><Ico n="activity" s={15} c={C.primary}/>Summary</div>
              </div>
              {[
                { l: "Partner since",   v: fmtSince(connection.connectedAt || connection.createdAt) },
                { l: "Valid documents", v: `${docs.filter(d => d.status === "verified").length}/${docs.length}` },
                { l: "Connection type", v: connection.direction || "—" },
              ].map((s, i) => (
                <div className="sum-row" key={i}>
                  <span className="sum-lbl">{s.l}</span>
                  <span className="sum-val">{s.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Contact / Email Modal ── */}
      {showContact && (
        <div className="modal-ov" onClick={() => setShowContact(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-t">Contact {p.name}</div>
            <div className="modal-s">
              Reach out to this partner via their registered email address.
            </div>
            <div className="email-box">
              <Ico n="email" s={16} c={C.primary}/>
              <span className="email-box-text">
                {p.adminEmail || "No email address on file"}
              </span>
            </div>
            <div className="modal-btns">
              <button
                className="m-cancel"
                onClick={handleCopyEmail}
                disabled={!p.adminEmail}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <Ico n="copy" s={13} c={C.darkText}/>
                Copy Email
              </button>
              <button
                className="m-primary"
                style={{ background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                onClick={handleOpenEmail}
                disabled={!p.adminEmail}
              >
                <Ico n="open" s={13} c="#fff"/>
                Open Email App
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── End Partnership Confirm Modal ── */}
      {showModal && (
        <div className="modal-ov" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-t">End partnership?</div>
            <div className="modal-s">
              This will remove <strong>{p.name}</strong> from your B2B network.
              Active service bookings won't be affected, but future requests will be unavailable.
            </div>
            <div className="modal-btns">
              <button className="m-cancel" onClick={() => setShowModal(false)} disabled={disconnecting}>
                Cancel
              </button>
              <button className="m-confirm" onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? "Removing…" : "End Partnership"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="toast">
          <Ico n="check" s={13} c="#fff"/>
          {toast}
        </div>
      )}
    </>
  );
}