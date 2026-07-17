/**
 * ServiceBookings.jsx  –  Client-side Service Bookings page
 *
 * CHANGES vs the original (static) version:
 *  • Fetches KPI stats from  GET /api/bookings/stats
 *  • Fetches booking list from  GET /api/bookings  (with status + search filter)
 *  • Cancel button calls  PATCH /api/bookings/<id>/cancel
 *  • QR download calls  GET /api/bookings/<id>/qr.png
 *  • Loading / error states on every async operation
 *  • Sidebar wiring preserved; no auth/login files touched
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { bookings as bookingsApi, apiErrorMessage, getUser } from "../../api/client";

/* ─────────────────────────── theme constants ─────────────────────────────── */
const G  = "#2b9d4e";
const GD = "#1f7a3b";
const NAV_H = 60;

/* ─────────────────────────── sidebar styles (unchanged) ──────────────────── */
const sidebarCss = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  .sb { position: fixed; top: 0; left: 0; width: 240px; height: 100vh; background: #2b9d4e; display: flex; flex-direction: column; z-index: 200; border-right: 1px solid rgba(255,255,255,0.15); }
  .sb-brand { padding: 0 18px; height: 60px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); background: #2b9d4e; }
  .sb-logobox { width: 30px; height: 30px; background: rgba(255,255,255,0.15); border-radius: 7px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .sb-brand-title { color: #fff; font-size: 15px; font-weight: 600; letter-spacing: -0.3px; font-family: 'DM Sans', sans-serif; }
  .sb-brand-sub   { color: rgba(255,255,255,0.6); font-size: 10px; letter-spacing: 0.6px; text-transform: uppercase; font-family: 'DM Sans', sans-serif; }
  .sb-site { margin: 12px 14px 6px; background: rgba(0,0,0,0.18); border-radius: 9px; padding: 9px 12px; display: flex; align-items: center; gap: 8px; }
  .sb-pulse { width: 6px; height: 6px; background: #8fd6a3; border-radius: 50%; flex-shrink: 0; animation: sbpulse 2s infinite; }
  @keyframes sbpulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.3)} }
  .sb-site-name { color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 500; font-family: 'DM Sans', sans-serif; }
  .sb-site-sub  { color: rgba(255,255,255,0.5); font-size: 10.5px; font-family: 'DM Sans', sans-serif; }
  .sb-section-label { padding: 14px 18px 5px; font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.8px; font-family: 'DM Sans', sans-serif; }
  .sb-nav { list-style: none; padding: 0 10px; margin: 0; }
  .sb-item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 8px; cursor: pointer; margin-bottom: 2px; transition: background 0.13s; font-family: 'DM Sans', sans-serif; }
  .sb-item:hover:not(.sb-active) { background: rgba(255,255,255,0.07); }
  .sb-active { background: rgba(255,255,255,0.14); }
  .sb-item-label { color: rgba(255,255,255,0.82); font-size: 13px; font-weight: 500; }
  .sb-active .sb-item-label { color: #fff; font-weight: 600; }
  .sb-badge { margin-left: auto; background: rgba(245,158,11,0.22); color: #F59E0B; border-radius: 20px; padding: 1px 7px; font-size: 10.5px; font-weight: 700; }
  .sb-divider { height: 1px; background: rgba(255,255,255,0.08); margin: 8px 14px; }
  .sb-footer { margin-top: auto; border-top: 1px solid rgba(255,255,255,0.1); padding: 14px 18px; display: flex; align-items: center; gap: 10px; }
  .sb-av { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 600; flex-shrink: 0; font-family: 'DM Mono', monospace; }
  .sb-user-name { color: #fff; font-size: 13px; font-weight: 500; font-family: 'DM Sans', sans-serif; }
  .sb-user-role { color: rgba(255,255,255,0.5); font-size: 11px; font-family: 'DM Sans', sans-serif; }
  .page-shell { display: flex; min-height: 100vh; background: #F5F6FA; font-family: 'DM Sans', sans-serif; }
  .page-shell-right { margin-left: 0; flex: 1; min-width: 0; display: flex; flex-direction: column; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to   { opacity: 1; transform: translateY(0); } }
  .fu  { animation: fadeUp 0.3s ease forwards; opacity: 0; }
  .fu1 { animation-delay: 0.04s; }
  .fu2 { animation-delay: 0.10s; }
  .fu3 { animation-delay: 0.16s; }
  .fu4 { animation-delay: 0.22s; }
`;

/* ─────────────────────────── icon components ─────────────────────────────── */
const SbIco = ({ n, s = 15, c = "rgba(255,255,255,0.75)" }) => {
  const d = {
    qr:       <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" rx="0.5"/><rect x="18" y="14" width="3" height="3" rx="0.5"/><rect x="14" y="18" width="3" height="3" rx="0.5"/><rect x="18" y="18" width="3" height="3" rx="0.5"/></svg>,
    grid:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    bookings: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    shield:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    users:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    file:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>,
    settings: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
    logout:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  };
  return d[n] || null;
};

const Ico = ({ n, s = 15, c = "#fff" }) => {
  const d = {
    bookings:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    plus:       <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    unassigned: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    process:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>,
    info:       <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    check:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
    search:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    qr:         <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" rx="0.5"/><rect x="18" y="14" width="3" height="3" rx="0.5"/><rect x="14" y="18" width="3" height="3" rx="0.5"/><rect x="18" y="18" width="3" height="3" rx="0.5"/></svg>,
    x:          <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  };
  return d[n] || null;
};

/* ─────────────────────────── status styles ───────────────────────────────── */
const SS = {
  completed:  { bg: "rgba(43,157,78,0.10)",  color: "#1f7a3b", border: "1px solid rgba(43,157,78,0.2)",   dot: G         },
  pending:    { bg: "rgba(245,158,11,0.10)", color: "#92400e", border: "1px solid rgba(245,158,11,0.25)", dot: "#F59E0B" },
  accepted:   { bg: "rgba(43,157,78,0.10)",  color: "#1f7a3b", border: "1px solid rgba(43,157,78,0.2)",   dot: G         },
  inprogress: { bg: "rgba(59,130,246,0.09)", color: "#1d4ed8", border: "1px solid rgba(59,130,246,0.2)",  dot: "#3b82f6" },
  cancelled:  { bg: "rgba(239,68,68,0.08)",  color: "#991b1b", border: "1px solid rgba(239,68,68,0.2)",   dot: "#ef4444" },
  rejected:   { bg: "rgba(239,68,68,0.08)",  color: "#991b1b", border: "1px solid rgba(239,68,68,0.2)",   dot: "#ef4444" },
};

/* ─────────────────────────── sidebar ────────────────────────────────────── */
function ClientSidebar({ active, setActive, pendingCount, userName, userRole, userInitials }) {
  const navItems = [
    { id: "dashboard", label: "Dashboard",        icon: "grid"     },
    { id: "bookings",  label: "Service Bookings", icon: "bookings", badge: pendingCount > 0 ? String(pendingCount) : null },
    { id: "vault",     label: "Compliance Vault", icon: "shield"   },
    { id: "providers", label: "Providers",         icon: "users"    },
    { id: "reports",   label: "Reports",           icon: "file"     },
  ];
  return (
    <>
      <style>{sidebarCss}</style>
      <aside className="sb">
        <div className="sb-brand">
          <div className="sb-logobox"><SbIco n="qr" s={15} c="#fff"/></div>
          <div>
            <div className="sb-brand-title">ComplianceQR</div>
            <div className="sb-brand-sub">Client Portal</div>
          </div>
        </div>
        <div className="sb-site">
          <span className="sb-pulse"/>
          <div>
            <div className="sb-site-name">Site A – Lahore HQ</div>
            <div className="sb-site-sub">Active site</div>
          </div>
        </div>
        <div className="sb-section-label">Navigation</div>
        <ul className="sb-nav">
          {navItems.map(item => (
            <li key={item.id} className={`sb-item ${active === item.id ? "sb-active" : ""}`} onClick={() => setActive(item.id)}>
              <SbIco n={item.icon} s={15} c={active === item.id ? "#fff" : "rgba(255,255,255,0.7)"}/>
              <span className="sb-item-label">{item.label}</span>
              {item.badge && <span className="sb-badge">{item.badge}</span>}
            </li>
          ))}
        </ul>
        <div className="sb-divider"/>
        <div className="sb-section-label">Account</div>
        <ul className="sb-nav">
          <li className="sb-item"><SbIco n="settings" s={15} c="rgba(255,255,255,0.7)"/><span className="sb-item-label">Settings</span></li>
          <li className="sb-item"><SbIco n="logout"   s={15} c="rgba(255,255,255,0.7)"/><span className="sb-item-label">Log out</span></li>
        </ul>
        <div className="sb-footer">
          <div className="sb-av">{userInitials}</div>
          <div>
            <div className="sb-user-name">{userName}</div>
            <div className="sb-user-role">{userRole}</div>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ─────────────────────────── booking detail modal ────────────────────────── */
function BookingDetailModal({ booking, onClose, onCancel, onDownloadQr }) {
  const [cancelling, setCancelling] = useState(false);
  const [qrLoading, setQrLoading]   = useState(false);
  const [cancelErr, setCancelErr]   = useState("");
  const [cancelSuccess, setCancelSuccess] = useState(false);

  const canCancel = booking.rawStatus === "accepted" || booking.rawStatus === "pending";

  async function handleCancel() {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    setCancelling(true);
    setCancelErr("");
    try {
      await onCancel(booking.id);
      setCancelSuccess(true);
    } catch (err) {
      setCancelErr(apiErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  }

  async function handleQr() {
    if (!booking.po && !booking.poId) {
      alert("No QR code available. This booking was accepted via an incoming request and does not have a purchase order QR yet.");
      return;
    }
    setQrLoading(true);
    try {
      await onDownloadQr(booking.id, booking.po || booking.id);
    } finally {
      setQrLoading(false);
    }
  }

  const ss = SS[booking.status] || SS.pending;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 999, fontFamily: "'DM Sans', sans-serif",
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: 28, width: 480,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1A1D23" }}>{booking.service}</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 3 }}>{booking.partner}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "rgba(0,0,0,0.06)", borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}>
            <Ico n="x" s={14} c="#6B7280"/>
          </button>
        </div>

        {/* Status badge */}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: ss.bg, color: ss.color, border: ss.border, marginBottom: 18 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: ss.dot }}/>{booking.label}
        </span>

        {/* Detail rows */}
        {[
          ["PO Number",    booking.po || "—"],
          ["Service Type", booking.service],
          ["Description",  booking.description || "—"],
          ["Location",     booking.location || "—"],
          ["Scheduled",    booking.scheduledDate ? new Date(booking.scheduledDate).toLocaleString() : "—"],
          ["Priority",     booking.priority || "—"],
          ["Amount",       booking.amount != null ? `PKR ${booking.amount.toLocaleString()}` : "—"],
          ["Tax",          booking.taxAmount != null ? `PKR ${booking.taxAmount.toLocaleString()}` : "—"],
          ["Total",        booking.totalAmount != null ? `PKR ${booking.totalAmount.toLocaleString()}` : "—"],
          ["Created",      booking.createdAt ? new Date(booking.createdAt).toLocaleString() : "—"],
        ].map(([label, value]) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(43,157,78,0.08)" }}>
            <span style={{ fontSize: 12.5, color: "#6B7280", fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: 12.5, color: "#1A1D23", fontWeight: 600, maxWidth: 260, textAlign: "right" }}>{value}</span>
          </div>
        ))}

        {cancelSuccess && (
          <div style={{ marginTop: 14, background: "rgba(43,157,78,0.08)", border: "1px solid rgba(43,157,78,0.25)", borderRadius: 8, padding: "10px 14px", color: "#1f7a3b", fontSize: 12.5, fontWeight: 600 }}>
            ✓ Booking cancelled successfully.
          </div>
        )}
        {cancelErr && (
          <div style={{ marginTop: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px", color: "#991b1b", fontSize: 12.5 }}>
            {cancelErr}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={handleQr} disabled={qrLoading || (!booking.po && !booking.poId)} style={{
            flex: 1, padding: "9px 0", borderRadius: 9,
            border: `1.5px solid ${(!booking.po && !booking.poId) ? "#d1d5db" : G}`,
            background: "transparent",
            color: (!booking.po && !booking.poId) ? "#9ca3af" : G,
            fontWeight: 700, fontSize: 13,
            cursor: (!booking.po && !booking.poId) ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
          title={(!booking.po && !booking.poId) ? "No QR available for this booking" : "Download QR code"}
          >
            <Ico n="qr" s={13} c={(!booking.po && !booking.poId) ? "#9ca3af" : G}/>
            {qrLoading ? "Downloading…" : "Download QR"}
          </button>

          {canCancel && (
            <button onClick={handleCancel} disabled={cancelling} style={{
              flex: 1, padding: "9px 0", borderRadius: 9, border: "1.5px solid #ef4444",
              background: "transparent", color: "#ef4444", fontWeight: 700, fontSize: 13,
              cursor: cancelling ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              opacity: cancelling ? 0.7 : 1,
            }}>
              <Ico n="x" s={13} c="#ef4444"/>
              {cancelling ? "Cancelling…" : "Cancel Booking"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── skeleton loader ─────────────────────────────── */
function SkeletonRow() {
  return (
    <tr>
      {[...Array(6)].map((_, i) => (
        <td key={i} style={{ padding: "14px 16px" }}>
          <div style={{ height: 14, borderRadius: 6, background: "rgba(43,157,78,0.07)", animation: "fadeUp 1.5s ease infinite" }}/>
        </td>
      ))}
    </tr>
  );
}

/* ─────────────────────────── main page ──────────────────────────────────── */
export default function ServiceBookings() {
  const navigate = useNavigate();

  // logged-in user
  const currentUser = getUser();
  const userName  = currentUser?.organizationName || currentUser?.name || currentUser?.email || "User";
  const userRole  = currentUser?.role || "Client Account";
  const userInitials = userName
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // sidebar
  const [active, setActive] = useState("bookings");

  // data
  const [bookingList, setBookingList] = useState([]);
  const [kpis, setKpis]               = useState([]);
  const [total, setTotal]             = useState(0);

  // loading / error
  const [loadingList,  setLoadingList]  = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [listError,    setListError]    = useState("");

  // filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch]             = useState("");
  const [searchInput, setSearchInput]   = useState("");

  // UI
  const [hoverRow,        setHoverRow]        = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  /* ── fetch stats ── */
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await bookingsApi.stats();
      setKpis(data.kpis || []);
    } catch {
      // stats failure is non-fatal; keep empty kpis
    } finally {
      setLoadingStats(false);
    }
  }, []);

  /* ── fetch list ── */
  const fetchList = useCallback(async () => {
    setLoadingList(true);
    setListError("");
    try {
      const params = { status: statusFilter, search };
      const data = await bookingsApi.list(params);
      setBookingList(data.bookings || []);
      setTotal(data.total || 0);
    } catch (err) {
      setListError(apiErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchList();  }, [fetchList]);

  /* ── cancel handler ── */
  async function handleCancel(id) {
    await bookingsApi.cancel(id);
    setSelectedBooking(prev => prev ? { ...prev, rawStatus: "cancelled", status: "cancelled", label: "Cancelled" } : prev);
    fetchList();
    fetchStats();
  }

  /* ── QR download ── */
  async function handleDownloadQr(id, label) {
    try {
      const blob = await bookingsApi.qrPngBlob(id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `booking-qr-${label}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      let msg = "Could not download QR";
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          msg = json?.error?.message || json?.message || msg;
        } catch (_) {}
      } else {
        msg = "Could not download QR: " + apiErrorMessage(err);
      }
      alert(msg);
    }
  }

  /* ── search (debounce on Enter / button) ── */
  function handleSearchSubmit(e) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  const pendingCount = bookingList.filter(b => b.status === "pending" || b.status === "accepted").length;

  const FILTER_TABS = [
    { id: "all",        label: "All"         },
    { id: "pending",    label: "Pending"     },
    { id: "accepted",   label: "Accepted"    },
    { id: "inprogress", label: "In Progress" },
    { id: "completed",  label: "Completed"   },
    { id: "cancelled",  label: "Cancelled"   },
    { id: "rejected",   label: "Rejected"    },
  ];

  return (
    <div className="page-shell">

      <ClientSidebar active={active} setActive={setActive} pendingCount={pendingCount} userName={userName} userRole={userRole} userInitials={userInitials}/>

      <div className="page-shell-right">

        {/* ── TOP NAV ── */}
        <nav style={{
          height: NAV_H, background: G,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 28px",
          boxShadow: "0 2px 8px rgba(31,122,59,0.2)",
          borderBottom: "1px solid rgba(255,255,255,0.15)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.12)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ico n="bookings" s={16} c="#fff"/>
            </div>
            <div>
              <span style={{ color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px", fontFamily: "'DM Sans', sans-serif" }}>Service Bookings</span>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>
                {loadingList ? "Loading…" : `${total} bookings · ${pendingCount} pending`}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              onClick={() => navigate("/new-request")}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.18)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";  e.currentTarget.style.transform = "translateY(0)"; }}
              style={{ background: "#fff", color: G, padding: "7px 16px", borderRadius: 8, fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", cursor: "pointer", transition: "box-shadow 0.15s, transform 0.15s", fontFamily: "'DM Sans', sans-serif" }}
            >
              <Ico n="plus" s={13} c={G}/> New Request
            </div>

            {/* ── Profile avatar ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
                {userInitials}
              </div>
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>{userName}</span>
            </div>
          </div>
        </nav>

        {/* ── MAIN CONTENT ── */}
        <main style={{ padding: "24px", flex: 1, background: "#F5F6FA" }}>

          {/* Breadcrumb + title */}
          <div className="fu fu1" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 5, display: "flex", alignItems: "center", gap: 5, fontFamily: "'DM Sans', sans-serif" }}>
              <span>Dashboard</span><span>/</span>
              <span style={{ color: G, fontWeight: 500 }}>Service Bookings</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: "#1A1D23", letterSpacing: "-0.5px", fontFamily: "'DM Sans', sans-serif" }}>Service Bookings</div>
            <div style={{ fontSize: 13, color: "#6B7280", marginTop: 3, fontFamily: "'DM Sans', sans-serif" }}>Track and manage all service requests across your active sites.</div>
          </div>

          {/* KPI CARDS */}
          <div className="fu fu2" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {(loadingStats ? [
              { label: "Unassigned", value: "—", icon: "unassigned", warn: true,  sub: "Loading…" },
              { label: "In Process", value: "—", icon: "process",    warn: false, sub: "Loading…" },
              { label: "Need More Info", value: "—", icon: "info",   warn: true,  sub: "Loading…" },
              { label: "Completed",  value: "—", icon: "check",      warn: false, sub: "Loading…" },
            ] : kpis).map((k, i) => (
              <div key={i}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(43,157,78,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)";    e.currentTarget.style.boxShadow = "none"; }}
                style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(43,157,78,0.12)", padding: "14px 16px 12px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", transition: "transform 0.18s, box-shadow 0.18s", cursor: "default" }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: k.warn ? "#F59E0B" : G, borderRadius: "12px 0 0 12px" }}/>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "'DM Sans', sans-serif" }}>{k.label}</span>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: k.warn ? "rgba(245,158,11,0.1)" : "rgba(43,157,78,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Ico n={k.icon} s={13} c={k.warn ? "#F59E0B" : G}/>
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#1A1D23", letterSpacing: "-1px", lineHeight: 1, marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>{k.value}</div>
                <hr style={{ border: "none", borderTop: "1px solid rgba(43,157,78,0.12)", marginBottom: 8 }}/>
                <span style={{ fontSize: 11.5, color: "#6B7280", fontFamily: "'DM Sans', sans-serif" }}>{k.sub}</span>
              </div>
            ))}
          </div>

          {/* FILTER TABS + SEARCH */}
          <div className="fu fu2" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
            {/* Status tabs */}
            <div style={{ display: "flex", gap: 4 }}>
              {FILTER_TABS.map(tab => (
                <button key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                    fontSize: 12.5, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                    background: statusFilter === tab.id ? G : "rgba(43,157,78,0.08)",
                    color: statusFilter === tab.id ? "#fff" : "#6B7280",
                    transition: "background 0.14s",
                  }}
                >{tab.label}</button>
              ))}
            </div>

            {/* Search */}
            <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 6 }}>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
                  <Ico n="search" s={13} c="#9CA3AF"/>
                </span>
                <input
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search service or description…"
                  style={{
                    paddingLeft: 30, paddingRight: 12, height: 34, borderRadius: 8,
                    border: "1px solid rgba(43,157,78,0.2)", outline: "none",
                    fontSize: 12.5, fontFamily: "'DM Sans', sans-serif",
                    background: "#fff", color: "#1A1D23", width: 230,
                  }}
                />
              </div>
              <button type="submit" style={{ padding: "0 14px", borderRadius: 8, border: "none", background: G, color: "#fff", fontWeight: 600, fontSize: 12.5, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                Search
              </button>
              {search && (
                <button type="button" onClick={() => { setSearch(""); setSearchInput(""); }} style={{ padding: "0 10px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", color: "#ef4444", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  Clear
                </button>
              )}
            </form>
          </div>

          {/* BOOKINGS TABLE */}
          <div className="fu fu3" style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(43,157,78,0.15)", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid rgba(43,157,78,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1D23", fontFamily: "'DM Sans', sans-serif" }}>All Bookings</span>
                <span style={{ background: "rgba(43,157,78,0.1)", color: GD, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{total}</span>
              </div>
              <span
                onClick={() => fetchList()}
                style={{ fontSize: 12, color: G, cursor: "pointer", fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}
              >Refresh ↻</span>
            </div>

            {/* Error banner */}
            {listError && (
              <div style={{ background: "rgba(239,68,68,0.07)", borderBottom: "1px solid rgba(239,68,68,0.15)", padding: "12px 20px", color: "#991b1b", fontSize: 13 }}>
                ⚠️ {listError}
              </div>
            )}

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(43,157,78,0.04)" }}>
                  {["PO Number", "Partner Organization", "Service", "Date", "Status", "Actions"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid rgba(43,157,78,0.1)", fontFamily: "'DM Sans', sans-serif" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingList ? (
                  [...Array(5)].map((_, i) => <SkeletonRow key={i}/>)
                ) : bookingList.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "40px 20px", textAlign: "center", color: "#9CA3AF", fontSize: 13.5, fontFamily: "'DM Sans', sans-serif" }}>
                      No bookings found. <span style={{ color: G, cursor: "pointer", fontWeight: 600 }} onClick={() => navigate("/new-request")}>Create your first booking →</span>
                    </td>
                  </tr>
                ) : bookingList.map((b, i) => {
                  const ss = SS[b.status] || SS.pending;
                  return (
                    <tr key={b.id || i}
                      onMouseEnter={() => setHoverRow(i)}
                      onMouseLeave={() => setHoverRow(null)}
                      style={{ borderTop: "1px solid rgba(43,157,78,0.07)", background: hoverRow === i ? "rgba(43,157,78,0.03)" : "transparent", transition: "background 0.12s", cursor: "default" }}
                    >
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600, color: G }}>{b.po || "—"}</span>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 13.5, fontWeight: 500, color: "#1A1D23", fontFamily: "'DM Sans', sans-serif" }}>{b.partner || "—"}</td>
                      <td style={{ padding: "13px 16px", fontSize: 13, color: "#6B7280", fontFamily: "'DM Sans', sans-serif" }}>{b.service}</td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#6B7280" }}>{b.date}</span>
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: ss.bg, color: ss.color, border: ss.border, fontFamily: "'DM Sans', sans-serif" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: ss.dot }}/>
                          {b.label}
                        </span>
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <span
                            onClick={() => setSelectedBooking(b)}
                            style={{ fontSize: 12.5, color: G, fontWeight: 600, cursor: "pointer", textDecoration: hoverRow === i ? "underline" : "none", fontFamily: "'DM Sans', sans-serif" }}
                          >View</span>
                          {b.id && (
                            <span
                              onClick={() => handleDownloadQr(b.id, b.po || b.id)}
                              style={{ fontSize: 12, color: "#6B7280", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}
                              title="Download QR"
                            >
                              <Ico n="qr" s={12} c="#6B7280"/>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </main>
      </div>

      {/* ── DETAIL MODAL ── */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onCancel={handleCancel}
          onDownloadQr={handleDownloadQr}
        />
      )}
    </div>
  );
}