import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api, { apiErrorMessage, getUser } from "../../api/client";

// ── API helpers ───────────────────────────────────────────────────────────────
const srApi = {
  providers:   ()      => api.get("/api/service-request/providers").then(r => r.data),
  clientStaff: ()      => api.get("/api/service-request/client-staff").then(r => r.data),
  sites:       ()      => api.get("/api/service-request/sites").then(r => r.data),
  addSite:     (label, address) => api.post("/api/locations", { label, address }).then(r => r.data),
  submit:      (payload) => api.post("/api/service-request/submit", payload).then(r => r.data),
};

// ── Nominatim reverse geocode (OpenStreetMap, free, no API key) ───────────────
async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) throw new Error("Geocode failed");
  return res.json();
}

// ── Nominatim forward geocode (address → coords) ──────────────────────────────
async function forwardGeocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

// ── theme ─────────────────────────────────────────────────────────────────────
const C = {
  primary:"#2b9d4e", dark:"#1f7a3b", light:"#4fb96e", soft:"#8fd6a3",
  pageBg:"#F5F6FA", card:"#FFFFFF", darkText:"#1A1D23", muted:"#6B7280",
  warning:"#F59E0B", danger:"#EF4444",
  border:"rgba(43,157,78,0.12)", borderMed:"rgba(43,157,78,0.22)",
  bgLight:"rgba(43,157,78,0.05)", bgMed:"rgba(43,157,78,0.09)",
  bgIcon:"rgba(43,157,78,0.1)", warnBg:"rgba(245,158,11,0.1)",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: ${C.pageBg}; color: ${C.darkText}; }
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
  .notif-btn { width: 34px; height: 34px; border-radius: 50%; background: ${C.dark}; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; position: relative; }
  .notif-pip { position: absolute; top: 5px; right: 6px; width: 8px; height: 8px; background: ${C.warning}; border-radius: 50%; border: 2px solid ${C.primary}; }
  .nav-av    { width: 34px; height: 34px; border-radius: 50%; background: ${C.dark}; border: 2px solid rgba(255,255,255,0.35); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; }
  .nav-name  { color: #fff; font-size: 13px; font-weight: 500; }
  .page { padding: 28px; min-height: calc(100vh - 60px); display: flex; flex-direction: column; align-items: center; }
  .back-link { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: ${C.muted}; cursor: pointer; margin-bottom: 20px; transition: color 0.13s; font-weight: 500; }
  .back-link:hover { color: ${C.primary}; }
  .wizard-card { background: ${C.card}; border: 1px solid ${C.border}; border-radius: 16px; overflow: hidden; width: 100%; max-width: 680px; }
  .stepper { background: ${C.primary}; padding: 0 28px; display: flex; align-items: stretch; position: relative; }
  .step-item { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 16px 8px 14px; cursor: pointer; position: relative; transition: background 0.15s; }
  .step-item:hover { background: rgba(255,255,255,0.06); }
  .step-connector { position: absolute; top: 22px; left: calc(50% + 18px); right: calc(-50% + 18px); height: 1px; background: rgba(255,255,255,0.25); z-index: 0; }
  .step-num { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11.5px; font-weight: 700; z-index: 1; margin-bottom: 6px; transition: all 0.2s; }
  .step-num.active   { background: #fff; color: ${C.primary}; }
  .step-num.done     { background: ${C.dark}; color: #fff; border: 2px solid rgba(255,255,255,0.4); }
  .step-num.inactive { background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.7); }
  .step-lbl { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
  .step-lbl.active   { color: #fff; }
  .step-lbl.done     { color: rgba(255,255,255,0.85); }
  .step-lbl.inactive { color: rgba(255,255,255,0.5); }
  .wizard-body { padding: 28px; }
  .step-title { font-size: 17px; font-weight: 700; color: ${C.darkText}; margin-bottom: 4px; }
  .step-sub   { font-size: 13px; color: ${C.muted}; margin-bottom: 22px; }
  .field      { margin-bottom: 16px; }
  .field:last-of-type { margin-bottom: 0; }
  .f-lbl      { font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: ${C.muted}; margin-bottom: 6px; display: flex; align-items: center; gap: 5px; }
  .f-lbl .opt { font-size: 10px; font-weight: 400; text-transform: none; letter-spacing: 0; color: #9CA3AF; }
  .f-inp      { width: 100%; background: ${C.bgLight}; border: 1.5px solid ${C.border}; border-radius: 9px; padding: 10px 14px; font-size: 13px; color: ${C.darkText}; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s, background 0.15s; }
  .f-inp:focus { border-color: ${C.primary}; background: #fff; }
  .f-inp::placeholder { color: #9CA3AF; }
  .f-inp.has-val { background: #fff; border-color: ${C.borderMed}; }
  .f-select   { width: 100%; background: ${C.bgLight}; border: 1.5px solid ${C.border}; border-radius: 9px; padding: 10px 14px; font-size: 13px; color: ${C.darkText}; font-family: 'DM Sans', sans-serif; outline: none; appearance: none; cursor: pointer; transition: border-color 0.15s; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }
  .f-select:focus { border-color: ${C.primary}; }
  .f-hint     { font-size: 11px; color: #9CA3AF; margin-top: 5px; }
  .f-row2     { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .partner-display { display: flex; align-items: center; gap: 14px; background: ${C.bgLight}; border: 1.5px solid ${C.border}; border-radius: 10px; padding: 14px 16px; }
  .partner-av { width: 44px; height: 44px; border-radius: 10px; background: ${C.primary}; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; color: #fff; font-family: 'DM Mono', monospace; flex-shrink: 0; }
  .partner-name { font-size: 14px; font-weight: 600; color: ${C.darkText}; }
  .partner-type { font-size: 11.5px; color: ${C.muted}; margin-top: 2px; }
  .partner-badge { margin-left: auto; background: ${C.bgIcon}; color: ${C.dark}; border: 1px solid ${C.borderMed}; border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 600; }
  .partner-badge.warn { background: rgba(245,158,11,0.1); color: #92400e; border-color: rgba(245,158,11,0.3); }

  /* ── MAP STYLES ── */
  .map-section { border: 1.5px solid ${C.borderMed}; border-radius: 12px; overflow: hidden; margin-bottom: 16px; background: #f0faf4; }
  .map-toolbar { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: ${C.bgLight}; border-bottom: 1px solid ${C.border}; flex-wrap: wrap; }
  .map-toolbar-title { font-size: 11.5px; font-weight: 600; color: ${C.dark}; text-transform: uppercase; letter-spacing: 0.4px; margin-right: 4px; }
  .map-search-wrap { flex: 1; position: relative; min-width: 200px; }
  .map-search-input { width: 100%; background: #fff; border: 1.5px solid ${C.border}; border-radius: 8px; padding: 7px 36px 7px 12px; font-size: 12.5px; color: ${C.darkText}; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.15s; }
  .map-search-input:focus { border-color: ${C.primary}; }
  .map-search-btn { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; display: flex; align-items: center; padding: 0; }
  .map-suggest-list { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #fff; border: 1.5px solid ${C.borderMed}; border-radius: 9px; z-index: 9999; box-shadow: 0 6px 20px rgba(0,0,0,0.10); overflow: hidden; }
  .map-suggest-item { padding: 9px 14px; font-size: 12.5px; color: ${C.darkText}; cursor: pointer; border-bottom: 1px solid ${C.border}; transition: background 0.12s; line-height: 1.4; }
  .map-suggest-item:last-child { border-bottom: none; }
  .map-suggest-item:hover { background: ${C.bgLight}; }
  .map-suggest-item strong { color: ${C.dark}; }
  .map-myloc-btn { display: flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 7px; border: 1.5px solid ${C.borderMed}; background: #fff; color: ${C.dark}; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; white-space: nowrap; transition: all 0.13s; }
  .map-myloc-btn:hover { background: ${C.primary}; color: #fff; border-color: ${C.primary}; }
  #sr-leaflet-map { width: 100%; height: 280px; z-index: 1; }
  .map-pin-hint { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: ${C.bgLight}; border-top: 1px solid ${C.border}; font-size: 11.5px; color: ${C.muted}; }
  .map-pin-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: ${C.bgIcon}; color: ${C.dark}; border: 1px solid ${C.borderMed}; }
  .map-pin-badge.placed { background: rgba(43,157,78,0.15); color: ${C.dark}; border-color: rgba(43,157,78,0.3); }

  /* ── ADDRESS FIELDS ── */
  .addr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .addr-full  { grid-column: 1 / -1; }
  .addr-field-wrap { position: relative; }
  .addr-autofill-badge { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 9.5px; font-weight: 700; background: ${C.bgIcon}; color: ${C.dark}; border-radius: 4px; padding: 1px 6px; pointer-events: none; border: 1px solid ${C.borderMed}; }

  /* ── SITE CHIPS ── */
  .map-sites { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
  .map-site-chip { padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer; border: 1.5px solid ${C.border}; background: ${C.bgLight}; color: ${C.muted}; transition: all 0.13s; }
  .map-site-chip.selected { background: ${C.primary}; color: #fff; border-color: ${C.primary}; }
  .map-site-chip:hover:not(.selected) { border-color: ${C.primary}; color: ${C.primary}; }

  .verifier-option { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border: 1.5px solid ${C.border}; border-radius: 9px; cursor: pointer; margin-bottom: 8px; transition: all 0.13s; background: ${C.bgLight}; }
  .verifier-option:last-child { margin-bottom: 0; }
  .verifier-option.selected { border-color: ${C.primary}; background: #fff; }
  .verifier-option:hover:not(.selected) { border-color: ${C.borderMed}; }
  .v-radio { width: 16px; height: 16px; border-radius: 50%; border: 2px solid ${C.border}; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .v-radio.checked { border-color: ${C.primary}; background: ${C.primary}; }
  .v-radio.checked::after { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #fff; }
  .v-name { font-size: 13px; font-weight: 500; color: ${C.darkText}; }
  .v-role { font-size: 11px; color: ${C.muted}; }
  .v-av   { width: 30px; height: 30px; border-radius: 8px; background: ${C.bgIcon}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: ${C.dark}; font-family: 'DM Mono', monospace; flex-shrink: 0; }
  .review-section { background: ${C.bgLight}; border: 1px solid ${C.border}; border-radius: 10px; padding: 14px 16px; margin-bottom: 12px; }
  .review-section:last-child { margin-bottom: 0; }
  .review-sec-title { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: ${C.muted}; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
  .review-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 5px 0; border-bottom: 1px solid ${C.border}; }
  .review-row:last-child { border-bottom: none; }
  .review-lbl { font-size: 12px; color: ${C.muted}; }
  .review-val { font-size: 12.5px; font-weight: 500; color: ${C.darkText}; text-align: right; max-width: 60%; }
  .review-edit { font-size: 11px; color: ${C.primary}; cursor: pointer; font-weight: 500; }
  .compliance-notice { background: rgba(43,157,78,0.06); border: 1px solid rgba(43,157,78,0.2); border-radius: 10px; padding: 12px 14px; display: flex; gap: 10px; align-items: flex-start; margin-top: 14px; }
  .cn-icon { width: 28px; height: 28px; border-radius: 7px; background: ${C.bgIcon}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .cn-title { font-size: 12.5px; font-weight: 600; color: ${C.dark}; }
  .cn-sub   { font-size: 11.5px; color: ${C.muted}; margin-top: 2px; line-height: 1.4; }
  .wizard-foot { display: flex; align-items: center; gap: 12px; padding: 18px 28px; border-top: 1px solid ${C.border}; background: ${C.pageBg}; }
  .btn-back  { background: transparent; border: 1px solid ${C.border}; border-radius: 9px; padding: 10px 20px; font-size: 13px; font-weight: 500; cursor: pointer; color: ${C.muted}; font-family: 'DM Sans', sans-serif; transition: all 0.13s; display: flex; align-items: center; gap: 6px; }
  .btn-back:hover { border-color: ${C.primary}; color: ${C.primary}; }
  .progress-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; }
  .progress-track { width: 100%; height: 4px; background: rgba(43,157,78,0.12); border-radius: 2px; overflow: hidden; }
  .progress-fill  { height: 100%; background: ${C.primary}; border-radius: 2px; transition: width 0.4s ease; }
  .progress-lbl   { font-size: 10.5px; color: ${C.muted}; }
  .btn-next  { background: ${C.primary}; border: none; border-radius: 9px; padding: 10px 24px; font-size: 13px; font-weight: 600; cursor: pointer; color: #fff; font-family: 'DM Sans', sans-serif; transition: background 0.15s; display: flex; align-items: center; gap: 6px; }
  .btn-next:hover { background: ${C.dark}; }
  .btn-next:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-submit { background: ${C.primary}; border: none; border-radius: 9px; padding: 10px 24px; font-size: 13px; font-weight: 600; cursor: pointer; color: #fff; font-family: 'DM Sans', sans-serif; transition: background 0.15s; display: flex; align-items: center; gap: 6px; }
  .btn-submit:hover { background: ${C.dark}; }
  .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
  .success-wrap { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 40px 28px; }
  .success-ico  { width: 64px; height: 64px; border-radius: 50%; background: ${C.bgIcon}; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
  .success-title { font-size: 20px; font-weight: 700; color: ${C.darkText}; margin-bottom: 8px; }
  .success-sub   { font-size: 13.5px; color: ${C.muted}; line-height: 1.5; margin-bottom: 24px; max-width: 380px; }
  .success-ref   { background: ${C.bgLight}; border: 1px solid ${C.border}; border-radius: 10px; padding: 12px 20px; margin-bottom: 20px; font-size: 13px; color: ${C.darkText}; }
  .success-ref b { font-family: 'DM Mono', monospace; color: ${C.primary}; }
  .btn-done { background: ${C.primary}; color: #fff; border: none; border-radius: 9px; padding: 11px 28px; font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }
  .err-banner { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); border-radius: 9px; padding: 10px 14px; color: #991b1b; font-size: 12.5px; margin-bottom: 14px; }
  .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: ${C.dark}; color: #fff; padding: 11px 20px; border-radius: 10px; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px; z-index: 9999; animation: tUp 0.22s ease; }
  @keyframes tUp { from{opacity:0;transform:translateX(-50%) translateY(8px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .fu { animation: fadeUp 0.25s ease both; }
  @media(max-width:600px) { .page{padding:14px 16px} .wizard-body{padding:20px 16px} .wizard-foot{padding:14px 16px} .f-row2{grid-template-columns:1fr} .addr-grid{grid-template-columns:1fr} .nav-div,.nav-pg,.nav-site{display:none} }
`;

// ── icons ─────────────────────────────────────────────────────────────────────
const Ico = ({ n, s = 15, c = "currentColor" }) => {
  const d = {
    qr:      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" rx="0.5"/><rect x="18" y="14" width="3" height="3" rx="0.5"/><rect x="14" y="18" width="3" height="3" rx="0.5"/><rect x="18" y="18" width="3" height="3" rx="0.5"/></svg>,
    bell:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
    back:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
    next:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
    check:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    send:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    shield:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    user:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    calendar:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    cash:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    org:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
    map:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>,
    pin:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    locate:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>,
    search:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    clear:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  };
  return d[n] || null;
};

const STEPS = ["Partner", "Location", "Schedule", "Review"];
const SERVICE_TYPES = ["HVAC Maintenance","Facility Cleaning","Security Audit","Electrical Inspection","Plumbing Service","IT Infrastructure","Other"];

// ── Leaflet map loader (lazy – only loads when Step 1 is shown) ───────────────
function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) { resolve(window.L); return; }
    // CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    // JS
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve(window.L);
    document.head.appendChild(script);
  });
}

// ── Interactive Map Component ─────────────────────────────────────────────────
function LocationMap({ pin, onPin, onAddressChange }) {
  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const markerRef       = useRef(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [geocoding, setGeocoding]       = useState(false);
  const [searchQuery, setSearchQuery]   = useState("");
  const [suggestions, setSuggestions]   = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef(null);

  // Load Leaflet once
  useEffect(() => {
    loadLeaflet().then(() => setLeafletReady(true));
  }, []);

  // Init map after Leaflet is ready
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || mapRef.current) return;
    const L = window.L;

    // Default center: Lahore, Pakistan
    const DEFAULT_LAT = 31.5204;
    const DEFAULT_LNG = 74.3587;

    const map = L.map(mapContainerRef.current, {
      center: [DEFAULT_LAT, DEFAULT_LNG],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Custom green pin icon
    const pinIcon = L.divIcon({
      className: "",
      html: `<div style="
        width:32px;height:42px;position:relative;
        filter:drop-shadow(0 3px 6px rgba(0,0,0,0.3));
      ">
        <svg viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 10.627 14.133 24.633 15.27 25.756a1 1 0 001.46 0C17.867 40.633 32 26.627 32 16 32 7.163 24.837 0 16 0z" fill="#2b9d4e"/>
          <circle cx="16" cy="16" r="7" fill="#fff"/>
          <circle cx="16" cy="16" r="4" fill="#2b9d4e"/>
        </svg>
      </div>`,
      iconSize: [32, 42],
      iconAnchor: [16, 42],
      popupAnchor: [0, -44],
    });

    // If there's already a pin, place marker
    if (pin) {
      markerRef.current = L.marker([pin.lat, pin.lng], { icon: pinIcon, draggable: true }).addTo(map);
      map.setView([pin.lat, pin.lng], 15);
      markerRef.current.on("dragend", (e) => {
        const { lat, lng } = e.target.getLatLng();
        onPin({ lat, lng });
        doReverseGeocode(lat, lng);
      });
    }

    // Click to place / move pin
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      onPin({ lat, lng });
      doReverseGeocode(lat, lng);

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(map);
        markerRef.current.on("dragend", (ev) => {
          const pos = ev.target.getLatLng();
          onPin({ lat: pos.lat, lng: pos.lng });
          doReverseGeocode(pos.lat, pos.lng);
        });
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletReady]);

  // Reverse geocode and bubble up parsed address fields
  const doReverseGeocode = useCallback(async (lat, lng) => {
    setGeocoding(true);
    try {
      const data = await reverseGeocode(lat, lng);
      const a = data.address || {};
      onAddressChange({
        streetNumber: a.house_number || "",
        street:       a.road || a.pedestrian || a.footway || "",
        area:         a.suburb || a.neighbourhood || a.quarter || a.city_district || "",
        city:         a.city || a.town || a.village || a.county || "",
        state:        a.state || a.province || "",
        country:      a.country || "",
        postcode:     a.postcode || "",
        displayName:  data.display_name || "",
      });
    } catch {
      // silently ignore — user can type manually
    } finally {
      setGeocoding(false);
    }
  }, [onAddressChange]);

  // Debounced forward-search suggestions
  const handleSearchInput = (val) => {
    setSearchQuery(val);
    clearTimeout(searchTimer.current);
    if (!val.trim()) { setSuggestions([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await forwardGeocode(val);
        setSuggestions(results.slice(0, 5));
      } catch { setSuggestions([]); }
      finally { setSearchLoading(false); }
    }, 400);
  };

  const flyToResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setSuggestions([]);
    setSearchQuery(result.display_name.split(",").slice(0, 2).join(", "));
    onPin({ lat, lng });
    doReverseGeocode(lat, lng);

    const L = window.L;
    if (!mapRef.current || !L) return;
    mapRef.current.setView([lat, lng], 16);

    const pinIcon = L.divIcon({
      className: "",
      html: `<div style="width:32px;height:42px;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.3))">
        <svg viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 10.627 14.133 24.633 15.27 25.756a1 1 0 001.46 0C17.867 40.633 32 26.627 32 16 32 7.163 24.837 0 16 0z" fill="#2b9d4e"/>
          <circle cx="16" cy="16" r="7" fill="#fff"/>
          <circle cx="16" cy="16" r="4" fill="#2b9d4e"/>
        </svg></div>`,
      iconSize: [32, 42], iconAnchor: [16, 42],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: pinIcon, draggable: true }).addTo(mapRef.current);
      markerRef.current.on("dragend", (ev) => {
        const pos = ev.target.getLatLng();
        onPin({ lat: pos.lat, lng: pos.lng });
        doReverseGeocode(pos.lat, pos.lng);
      });
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      onPin({ lat, lng });
      doReverseGeocode(lat, lng);
      if (mapRef.current) mapRef.current.setView([lat, lng], 16);
      flyToResult({ lat, lon: lng, display_name: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    });
  };

  return (
    <div className="map-section">
      {/* Toolbar */}
      <div className="map-toolbar">
        <span className="map-toolbar-title"><Ico n="map" s={12} c={C.dark}/> Map</span>

        {/* Search box */}
        <div className="map-search-wrap">
          <input
            className="map-search-input"
            placeholder="Search address or place…"
            value={searchQuery}
            onChange={e => handleSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && suggestions[0]) flyToResult(suggestions[0]); }}
          />
          {searchQuery
            ? <button className="map-search-btn" onClick={() => { setSearchQuery(""); setSuggestions([]); }}><Ico n="clear" s={13} c={C.muted}/></button>
            : <span className="map-search-btn" style={{ cursor:"default" }}><Ico n="search" s={13} c={C.muted}/></span>
          }
          {/* Suggestions dropdown */}
          {suggestions.length > 0 && (
            <div className="map-suggest-list">
              {searchLoading && <div className="map-suggest-item" style={{ color: C.muted }}>Searching…</div>}
              {suggestions.map((s, i) => (
                <div key={i} className="map-suggest-item" onClick={() => flyToResult(s)}>
                  <strong>{s.display_name.split(",")[0]}</strong>
                  <span style={{ color: C.muted, fontSize: 11 }}>{" · "}{s.display_name.split(",").slice(1, 3).join(", ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My location */}
        <button className="map-myloc-btn" onClick={useMyLocation}>
          <Ico n="locate" s={12} c="currentColor"/> My Location
        </button>
      </div>

      {/* Map container */}
      {!leafletReady ? (
        <div style={{ height: 280, display:"flex", alignItems:"center", justifyContent:"center", color: C.muted, fontSize: 13 }}>
          Loading map…
        </div>
      ) : (
        <div id="sr-leaflet-map" ref={mapContainerRef} />
      )}

      {/* Hint strip */}
      <div className="map-pin-hint">
        <Ico n="pin" s={13} c={C.muted}/>
        <span>Click anywhere on the map to pin your location — address fields will fill automatically.</span>
        {geocoding && <span style={{ marginLeft:"auto", fontSize:11, color: C.primary }}>Auto-filling…</span>}
        {pin && !geocoding && (
          <span className="map-pin-badge placed" style={{ marginLeft:"auto" }}>
            <Ico n="check" s={10} c={C.dark}/> Pinned
          </span>
        )}
        {!pin && !geocoding && (
          <span className="map-pin-badge" style={{ marginLeft:"auto" }}>No pin yet</span>
        )}
      </div>
    </div>
  );
}

// ── Single address field — defined OUTSIDE AddressFields so React never
//    treats it as a new component type on re-render (which would unmount
//    the <input> and lose focus after every keystroke).
function AddrField({ label, field, placeholder, full, addr, onChange, autoFilled }) {
  return (
    <div className={`addr-field-wrap${full ? " addr-full" : ""}`} style={{ marginBottom: 0 }}>
      <div className="f-lbl" style={{ marginBottom: 5 }}>{label}</div>
      <div style={{ position: "relative" }}>
        <input
          className={`f-inp${addr[field] ? " has-val" : ""}`}
          placeholder={placeholder}
          value={addr[field] || ""}
          onChange={e => onChange({ ...addr, [field]: e.target.value })}
          style={{ paddingRight: autoFilled && addr[field] ? 64 : 14 }}
        />
        {autoFilled && addr[field] && (
          <span className="addr-autofill-badge">Auto</span>
        )}
      </div>
    </div>
  );
}

// ── Address fields with auto-fill badge support ───────────────────────────────
function AddressFields({ addr, onChange, autoFilled }) {
  return (
    <div className="addr-grid" style={{ gap: 12 }}>
      <AddrField label="Street / Road"    field="street"       placeholder="e.g. Main Boulevard" addr={addr} onChange={onChange} autoFilled={autoFilled} />
      <AddrField label="House / Plot No." field="streetNumber" placeholder="e.g. 12-B"           addr={addr} onChange={onChange} autoFilled={autoFilled} />
      <AddrField label="Area / Locality"  field="area"         placeholder="e.g. Gulberg III"    addr={addr} onChange={onChange} autoFilled={autoFilled} />
      <AddrField label="City"             field="city"         placeholder="e.g. Lahore"         addr={addr} onChange={onChange} autoFilled={autoFilled} />
      <AddrField label="State / Province" field="state"        placeholder="e.g. Punjab"         addr={addr} onChange={onChange} autoFilled={autoFilled} />
      <AddrField label="Postcode"         field="postcode"     placeholder="e.g. 54000"          addr={addr} onChange={onChange} autoFilled={autoFilled} />
      <AddrField label="Country"          field="country"      placeholder="e.g. Pakistan"       addr={addr} onChange={onChange} autoFilled={autoFilled} />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ServiceRequest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── logged-in user (same pattern as ServiceBookings) ──────────────────────
  const currentUser  = getUser();
  const userName     = currentUser?.organizationName || currentUser?.name || currentUser?.email || "User";
  const userInitials = userName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const [step, setStep]             = useState(0);
  const [toast, setToast]           = useState(null);
  const [submitErr, setSubmitErr]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [result, setResult]         = useState(null);

  // Step 0 — partner
  const [providers, setProviders]               = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [serviceType, setServiceType]           = useState("");
  const [description, setDescription]           = useState("");

  // Step 1 — location (new)
  const [sites, setSites]               = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [newSiteLabel, setNewSiteLabel] = useState("");
  const [addingSite, setAddingSite]     = useState(false);

  const [pin, setPin] = useState(null); // { lat, lng }
  const [addr, setAddr] = useState({
    street: "", streetNumber: "", area: "",
    city: "", state: "", country: "", postcode: "", displayName: "",
  });
  const [autoFilled, setAutoFilled] = useState(false);

  // Step 2 — schedule
  const [staffList, setStaffList]       = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [serviceDate, setServiceDate]   = useState("");
  const [budget, setBudget]             = useState("");
  const [assignedStaffId, setAssignedStaffId] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    srApi.providers()
      .then(data => {
        setProviders(data.providers || []);
        const preId = searchParams.get("providerId");
        if (preId) {
          const found = (data.providers || []).find(p => p.id === preId);
          if (found) setSelectedProvider(found);
        }
      })
      .catch(() => showToast("Could not load providers"))
      .finally(() => setLoadingProviders(false));

    srApi.sites()
      .then(data => setSites(data.sites || []))
      .catch(() => {});

    setLoadingStaff(true);
    srApi.clientStaff()
      .then(data => setStaffList(data.staff || []))
      .catch(() => showToast("Could not load staff"))
      .finally(() => setLoadingStaff(false));
  }, []);

  const handleAddressFromMap = useCallback((parsedAddr) => {
    setAddr(parsedAddr);
    setAutoFilled(true);
  }, []);

  // When a saved site chip is clicked, auto-fill address fields + map pin
  const handleSiteSelect = useCallback(async (site) => {
    // Toggle off if already selected
    if (selectedSite?.id === site.id) {
      setSelectedSite(null);
      return;
    }
    setSelectedSite(site);

    // Use address string saved with site; fall back to label
    const addressQuery = (site.address || site.label || "").trim();
    if (!addressQuery) return;

    // Immediately split the address string into fields so fields fill
    // even if geocoding is slow or fails
    const parts = addressQuery.split(",").map(p => p.trim()).filter(Boolean);
    const quickAddr = {
      streetNumber: "",
      street:       parts[0] || "",
      area:         parts[1] || "",
      city:         parts[2] || "",
      state:        parts[3] || "",
      country:      parts[4] || "",
      postcode:     parts[5] || "",
      displayName:  addressQuery,
    };
    setAddr(quickAddr);
    setAutoFilled(true);

    // Now try to enrich via geocoding for accurate structured fields + map pin
    try {
      const results = await forwardGeocode(addressQuery);
      if (results && results.length > 0) {
        const hit = results[0];
        const lat = parseFloat(hit.lat);
        const lng = parseFloat(hit.lon);
        setPin({ lat, lng });

        const geoData = await reverseGeocode(lat, lng);
        const a = geoData.address || {};
        setAddr({
          streetNumber: a.house_number || "",
          street:       a.road || a.pedestrian || a.footway || "",
          area:         a.suburb || a.neighbourhood || a.quarter || a.city_district || "",
          city:         a.city || a.town || a.village || a.county || "",
          state:        a.state || a.province || "",
          country:      a.country || "",
          postcode:     a.postcode || "",
          displayName:  geoData.display_name || addressQuery,
        });
        setAutoFilled(true);
      }
    } catch {
      // Geocoding failed — quick-fill from address string stays in place
    }
  }, [selectedSite]);

  const handlePinChange = useCallback((newPin) => {
    setPin(newPin);
    setAutoFilled(false); // reset — will be set again after reverse geocode
  }, []);

  const progressPct = ((step + 1) / STEPS.length) * 100;

  // Location is valid if pin set OR at least city + street typed
  const locationValid = !!pin || !!(addr.city.trim() && addr.street.trim()) || !!selectedSite;

  const canNext = () => {
    if (step === 0) return !!selectedProvider && !!serviceType;
    if (step === 1) return locationValid;
    if (step === 2) return !!serviceDate && !!budget && !!assignedStaffId;
    return true;
  };

  const handleNext = () => {
    if (!canNext()) { showToast("Please fill in all required fields."); return; }
    setStep(s => s + 1);
  };

  // Build a clean single-line address for display & API
  const buildAddressLine = () => {
    const parts = [addr.streetNumber, addr.street, addr.area, addr.city, addr.state, addr.country]
      .filter(Boolean);
    return parts.join(", ") || addr.displayName || "";
  };

  const handleSubmit = async () => {
    setSubmitErr("");
    setSubmitting(true);
    try {
      const payload = {
        providerOrgId:  selectedProvider.id,
        serviceType,
        description,
        siteLocationId: selectedSite?.id,
        manualAddress:  buildAddressLine(),
        pinLat:         pin?.lat,
        pinLng:         pin?.lng,
        scheduledDate:  serviceDate,
        amount:         parseFloat(budget),
        assignedStaffId,
        priority:       "medium",
      };
      const data = await srApi.submit(payload);
      setResult(data);
      setSubmitted(true);
    } catch (err) {
      setSubmitErr(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedStaff = staffList.find(s => s.id === assignedStaffId);
  const locationDisplay = selectedSite?.label
    ? `${selectedSite.label}${buildAddressLine() ? ` — ${buildAddressLine()}` : ""}`
    : buildAddressLine() || (pin ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}` : "—");

  // ── SUCCESS ───────────────────────────────────────────────────────────────
  if (submitted && result) {
    return (
      <>
        <style>{css}</style>
        <nav className="topnav">
          <div className="nav-left">
            <div className="nav-logobox"><Ico n="qr" s={15} c="#fff"/></div>
            <div><div className="nav-title">ComplianceQR</div><div className="nav-sub">Client Portal</div></div>
            <div className="nav-div"/><span className="nav-pg">Service Request</span>
          </div>
          <div className="nav-right">
            <button className="notif-btn"><Ico n="bell" s={15} c="rgba(255,255,255,0.85)"/><span className="notif-pip"/></button>
            <div className="nav-av">{userInitials}</div><span className="nav-name">{userName}</span>
          </div>
        </nav>
        <div className="page">
          <div className="wizard-card" style={{ maxWidth:520 }}>
            <div className="success-wrap fu">
              <div className="success-ico"><Ico n="check" s={28} c={C.primary}/></div>
              <div className="success-title">Request Sent!</div>
              <div className="success-sub">
                Your service request has been sent to <strong>{result.providerName}</strong>. They will confirm the booking and you'll receive a notification once accepted.
              </div>
              <div className="success-ref">PO Number: <b>{result.poNumber}</b></div>
              {result.bookingQrPng && (
                <img src={result.bookingQrPng} alt="Booking QR" style={{ width:140, height:140, marginBottom:16, borderRadius:8, border:`1px solid ${C.border}` }}/>
              )}
              <button className="btn-done" onClick={() => navigate("/Bookings")}>View All Bookings</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── WIZARD ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>

      <nav className="topnav">
        <div className="nav-left">
          <div className="nav-logobox"><Ico n="qr" s={15} c="#fff"/></div>
          <div><div className="nav-title">ComplianceQR</div><div className="nav-sub">Client Portal</div></div>
          <div className="nav-div"/><span className="nav-pg">New Service Request</span>
        </div>
        <div className="nav-right">
          <button className="notif-btn"><Ico n="bell" s={15} c="rgba(255,255,255,0.85)"/><span className="notif-pip"/></button>
          <div className="nav-av">{userInitials}</div><span className="nav-name">{userName}</span>
        </div>
      </nav>

      <div className="page">
        <div className="back-link" onClick={() => navigate("/Bookings")}>
          <Ico n="back" s={14} c="currentColor"/> Back to Bookings
        </div>

        <div className="wizard-card fu">
          {/* STEPPER */}
          <div className="stepper">
            {STEPS.map((s, i) => (
              <div className="step-item" key={i} onClick={() => i < step && setStep(i)}>
                {i < STEPS.length - 1 && <div className="step-connector"/>}
                <div className={`step-num ${i === step ? "active" : i < step ? "done" : "inactive"}`}>
                  {i < step ? <Ico n="check" s={11} c="#fff"/> : i + 1}
                </div>
                <div className={`step-lbl ${i === step ? "active" : i < step ? "done" : "inactive"}`}>{s}</div>
              </div>
            ))}
          </div>

          {/* STEP CONTENT */}
          <div className="wizard-body fu" key={step}>

            {/* ── STEP 0: PARTNER ── */}
            {step === 0 && (
              <>
                <div className="step-title">Select Service Partner</div>
                <div className="step-sub">Choose a provider and the service you need.</div>

                {loadingProviders ? (
                  <div style={{ padding:"20px 0", color: C.muted, fontSize:13 }}>Loading providers…</div>
                ) : (
                  <div className="field">
                    <div className="f-lbl">Partner Organization</div>
                    <select className="f-select" value={selectedProvider?.id || ""} onChange={e => {
                      const found = providers.find(p => p.id === e.target.value);
                      setSelectedProvider(found || null);
                    }}>
                      <option value="">Select a provider…</option>
                      {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}

                {selectedProvider && (
                  <div className="partner-display" style={{ marginBottom:16 }}>
                    <div className="partner-av">{selectedProvider.initials}</div>
                    <div>
                      <div className="partner-name">{selectedProvider.name}</div>
                      <div className="partner-type">{selectedProvider.industry || "Service Provider"}</div>
                    </div>
                    <div className={`partner-badge ${selectedProvider.complianceOk ? "" : "warn"}`}>
                      {selectedProvider.complianceOk ? "Verified ✓" : "⚠ Compliance issue"}
                    </div>
                  </div>
                )}

                <div className="field">
                  <div className="f-lbl">Service Type</div>
                  <select className="f-select" value={serviceType} onChange={e => setServiceType(e.target.value)}>
                    <option value="">Select a service type…</option>
                    {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="field">
                  <div className="f-lbl">Description <span className="opt">(optional)</span></div>
                  <textarea className="f-inp" rows={3} placeholder="Describe what service you need…"
                    value={description} onChange={e => setDescription(e.target.value)}
                    style={{ resize:"none", lineHeight:1.5 }}/>
                </div>
              </>
            )}

            {/* ── STEP 1: LOCATION ── */}
            {step === 1 && (
              <>
                <div className="step-title">Service Location</div>
                <div className="step-sub">
                  Pin your location on the map — address fills automatically. Or type it manually below.
                </div>

                {/* Saved site chips */}
                {sites.length > 0 && (
                  <div className="field">
                    <div className="f-lbl"><Ico n="org" s={12} c={C.muted}/> Saved Sites <span className="opt">(quick pick)</span></div>
                    <div className="map-sites">
                      {sites.map(site => (
                        <div key={site.id}
                          className={`map-site-chip ${selectedSite?.id === site.id ? "selected" : ""}`}
                          onClick={() => handleSiteSelect(site)}>
                          {site.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interactive map */}
                <div className="field">
                  <div className="f-lbl" style={{ marginBottom:8 }}>
                    <Ico n="pin" s={12} c={C.muted}/> Pin on Map
                    {pin && (
                      <span style={{ marginLeft:"auto", fontSize:10, color: C.primary, fontWeight:600, textTransform:"none", letterSpacing:0 }}>
                        {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
                      </span>
                    )}
                  </div>
                  <LocationMap
                    pin={pin}
                    onPin={handlePinChange}
                    onAddressChange={(parsed) => {
                      handleAddressFromMap(parsed);
                    }}
                  />
                </div>

                {/* Address fields — auto-filled from map click, editable too */}
                <div className="field">
                  <div className="f-lbl" style={{ marginBottom:10 }}>
                    <Ico n="pin" s={12} c={C.muted}/> Address Details
                    {autoFilled && (
                      <span style={{ marginLeft:6, fontSize:10, background: C.bgIcon, color: C.dark, border:`1px solid ${C.borderMed}`, borderRadius:4, padding:"1px 7px", fontWeight:600, textTransform:"none", letterSpacing:0 }}>
                        Auto-filled from map
                      </span>
                    )}
                    <span className="opt">({!locationValid ? "required if no pin" : "optional — edit if needed"})</span>
                  </div>
                  <AddressFields addr={addr} onChange={(a) => { setAddr(a); setAutoFilled(false); }} autoFilled={autoFilled} />
                </div>

                {/* Add new site from current address */}
                <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:14, marginTop:4 }}>
                  <div className="f-lbl" style={{ marginBottom:8 }}><Ico n="org" s={12} c={C.muted}/> Save as Site</div>
                  <div style={{ display:"flex", gap:8 }}>
                    <input
                      className="f-inp"
                      placeholder="Site name (e.g. Main Warehouse, DHA)"
                      value={newSiteLabel}
                      onChange={e => setNewSiteLabel(e.target.value)}
                      onKeyDown={async e => {
                        if (e.key !== "Enter") return;
                        e.preventDefault();
                        if (!newSiteLabel.trim()) return;
                        setAddingSite(true);
                        try {
                          const addrLine = buildAddressLine();
                          if (!addrLine) { showToast("Please fill in at least City and Street before saving a site."); setAddingSite(false); return; }
                          const data = await srApi.addSite(newSiteLabel.trim(), addrLine);
                          const newSite = { id: data.id, label: data.label };
                          setSites(prev => [...prev, newSite]);
                          setSelectedSite(newSite);
                          setNewSiteLabel("");
                          showToast("Site saved!");
                        } catch { showToast("Could not save site"); }
                        finally { setAddingSite(false); }
                      }}
                      style={{ flex:1 }}
                    />
                    <button
                      disabled={addingSite || !newSiteLabel.trim()}
                      onClick={async () => {
                        if (!newSiteLabel.trim()) return;
                        setAddingSite(true);
                        try {
                          const addrLine = buildAddressLine();
                          if (!addrLine) { showToast("Please fill in at least City and Street before saving a site."); setAddingSite(false); return; }
                          const data = await srApi.addSite(newSiteLabel.trim(), addrLine);
                          const newSite = { id: data.id, label: data.label };
                          setSites(prev => [...prev, newSite]);
                          setSelectedSite(newSite);
                          setNewSiteLabel("");
                          showToast("Site saved!");
                        } catch { showToast("Could not save site"); }
                        finally { setAddingSite(false); }
                      }}
                      style={{
                        padding:"10px 16px", borderRadius:9, border:"none",
                        background: C.primary, color:"#fff", fontWeight:600,
                        fontSize:12.5, cursor:"pointer", whiteSpace:"nowrap",
                        fontFamily:"'DM Sans', sans-serif",
                        opacity: addingSite || !newSiteLabel.trim() ? 0.6 : 1,
                      }}
                    >
                      {addingSite ? "Saving…" : "Save Site"}
                    </button>
                  </div>
                  <div className="f-hint">Save this location as a site for quick selection in future requests.</div>
                </div>
              </>
            )}

            {/* ── STEP 2: SCHEDULE ── */}
            {step === 2 && (
              <>
                <div className="step-title">Schedule & Budget</div>
                <div className="step-sub">Set the service date, budget, and assign a staff member.</div>

                <div className="f-row2" style={{ marginBottom:16 }}>
                  <div className="field" style={{ marginBottom:0 }}>
                    <div className="f-lbl"><Ico n="calendar" s={12} c={C.muted}/>Service Date</div>
                    <input type="date" className={`f-inp ${serviceDate ? "has-val" : ""}`}
                      value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
                  </div>
                  <div className="field" style={{ marginBottom:0 }}>
                    <div className="f-lbl"><Ico n="cash" s={12} c={C.muted}/>Budget (PKR)</div>
                    <input type="number" className={`f-inp ${budget ? "has-val" : ""}`} placeholder="0.00"
                      value={budget} onChange={e => setBudget(e.target.value)}/>
                  </div>
                </div>

                <div className="field">
                  <div className="f-lbl"><Ico n="user" s={12} c={C.muted}/>Assign Staff Member</div>
                  {loadingStaff ? (
                    <div style={{ fontSize:12.5, color: C.muted, padding:"10px 0" }}>Loading staff…</div>
                  ) : staffList.length === 0 ? (
                    <div style={{ fontSize:12.5, color: C.muted, padding:"10px 0" }}>No staff found for this provider.</div>
                  ) : staffList.map(s => (
                    <div key={s.id} className={`verifier-option ${assignedStaffId === s.id ? "selected" : ""}`}
                      onClick={() => setAssignedStaffId(s.id)}>
                      <div className={`v-radio ${assignedStaffId === s.id ? "checked" : ""}`}/>
                      <div className="v-av">{s.initials}</div>
                      <div>
                        <div className="v-name">{s.fullName}</div>
                        <div className="v-role">{s.role} · {s.email}</div>
                      </div>
                    </div>
                  ))}
                  <div className="f-hint">This staff member will scan the QR code on the service date to confirm completion.</div>
                </div>
              </>
            )}

            {/* ── STEP 3: REVIEW ── */}
            {step === 3 && (
              <>
                <div className="step-title">Review & Submit</div>
                <div className="step-sub">Check all details before sending the request.</div>

                {submitErr && <div className="err-banner">⚠️ {submitErr}</div>}

                <div className="review-section">
                  <div className="review-sec-title"><Ico n="org" s={12} c={C.muted}/>Partner & Service</div>
                  <div className="review-row"><span className="review-lbl">Partner</span><span className="review-val">{selectedProvider?.name}</span></div>
                  <div className="review-row"><span className="review-lbl">Service type</span><span className="review-val">{serviceType}</span></div>
                  {description && <div className="review-row"><span className="review-lbl">Description</span><span className="review-val">{description}</span></div>}
                  <div className="review-row"><span className="review-lbl"></span><span className="review-edit" onClick={() => setStep(0)}>Edit →</span></div>
                </div>

                <div className="review-section">
                  <div className="review-sec-title"><Ico n="pin" s={12} c={C.muted}/>Location</div>
                  {selectedSite && <div className="review-row"><span className="review-lbl">Saved site</span><span className="review-val">{selectedSite.label}</span></div>}
                  {pin && <div className="review-row"><span className="review-lbl">Coordinates</span><span className="review-val" style={{ fontFamily:"'DM Mono', monospace", fontSize:11.5 }}>{pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</span></div>}
                  <div className="review-row"><span className="review-lbl">Address</span><span className="review-val">{buildAddressLine() || "—"}</span></div>
                  <div className="review-row"><span className="review-lbl"></span><span className="review-edit" onClick={() => setStep(1)}>Edit →</span></div>
                </div>

                <div className="review-section">
                  <div className="review-sec-title"><Ico n="calendar" s={12} c={C.muted}/>Schedule & Budget</div>
                  <div className="review-row"><span className="review-lbl">Service date</span><span className="review-val">{serviceDate}</span></div>
                  <div className="review-row"><span className="review-lbl">Budget</span><span className="review-val">{budget ? `PKR ${Number(budget).toLocaleString()}` : "—"}</span></div>
                  <div className="review-row"><span className="review-lbl">Assigned staff</span><span className="review-val">{selectedStaff?.fullName || "—"}</span></div>
                  <div className="review-row"><span className="review-lbl"></span><span className="review-edit" onClick={() => setStep(2)}>Edit →</span></div>
                </div>

                <div className="compliance-notice">
                  <div className="cn-icon"><Ico n="shield" s={14} c={C.primary}/></div>
                  <div>
                    <div className="cn-title">Compliance auto-check</div>
                    <div className="cn-sub">{selectedProvider?.name}'s compliance documents will be verified automatically before the service date.</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* FOOTER */}
          <div className="wizard-foot">
            {step > 0 ? (
              <button className="btn-back" onClick={() => setStep(s => s - 1)}>
                <Ico n="back" s={13} c="currentColor"/> Back
              </button>
            ) : <div style={{ width:80 }}/>}

            <div className="progress-wrap">
              <div className="progress-track">
                <div className="progress-fill" style={{ width:`${progressPct}%` }}/>
              </div>
              <div className="progress-lbl">Step {step + 1} of {STEPS.length}</div>
            </div>

            {step < STEPS.length - 1 ? (
              <button className="btn-next" onClick={handleNext} disabled={!canNext()}>
                Next <Ico n="next" s={13} c="#fff"/>
              </button>
            ) : (
              <button className="btn-submit" onClick={handleSubmit} disabled={submitting}>
                <Ico n="send" s={13} c="#fff"/> {submitting ? "Sending…" : "Send Request"}
              </button>
            )}
          </div>
        </div>
      </div>

      {toast && <div className="toast"><Ico n="check" s={13} c="#fff"/>{toast}</div>}
    </>
  );
}