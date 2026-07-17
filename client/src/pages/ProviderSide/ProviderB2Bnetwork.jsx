import { useState, useEffect, useCallback, useRef } from "react";
import api, { apiErrorMessage } from "../../api/client";
import PartnerProfile from "../ClientSide/PartnerProfile";

const C = {
  primary:    "#2b9d4e",
  dark:       "#1f7a3b",
  light:      "#4fb96e",
  soft:       "#8fd6a3",
  pageBg:     "#F5F6FA",
  card:       "#FFFFFF",
  darkText:   "#1A1D23",
  muted:      "#6B7280",
  warning:    "#F59E0B",
  danger:     "#EF4444",
  border:     "rgba(43,157,78,0.12)",
  borderMed:  "rgba(43,157,78,0.18)",
  bgLight:    "rgba(43,157,78,0.05)",
  bgMed:      "rgba(43,157,78,0.08)",
  bgIcon:     "rgba(43,157,78,0.1)",
  warnBg:     "rgba(245,158,11,0.1)",
  dangerBg:   "rgba(239,68,68,0.1)",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: ${C.pageBg}; color: ${C.darkText}; }

  .topnav { background: ${C.primary}; height: 60px; padding: 0 28px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 8px rgba(31,122,59,0.18); }
  .topnav-left { display: flex; align-items: center; gap: 10px; }
  .topnav-logobox { width: 30px; height: 30px; background: ${C.dark}; border-radius: 7px; display: flex; align-items: center; justify-content: center; }
  .topnav-title { color: #fff; font-size: 16px; font-weight: 600; letter-spacing: -0.3px; }
  .topnav-sub { color: rgba(255,255,255,0.65); font-size: 10.5px; letter-spacing: 0.6px; text-transform: uppercase; }
  .topnav-div { width: 1px; height: 28px; background: rgba(255,255,255,0.2); margin: 0 14px; }
  .topnav-pg { color: rgba(255,255,255,0.9); font-size: 13.5px; font-weight: 500; }
  .topnav-right { display: flex; align-items: center; gap: 10px; }
  .topnav-site { background: ${C.dark}; border-radius: 20px; padding: 4px 12px; color: rgba(255,255,255,0.9); font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
  .pulse-dot { width: 6px; height: 6px; background: ${C.soft}; border-radius: 50%; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.3)} }
  .notif-btn { width: 34px; height: 34px; border-radius: 50%; background: ${C.dark}; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; position: relative; }
  .notif-pip { position: absolute; top: 5px; right: 6px; width: 8px; height: 8px; background: ${C.warning}; border-radius: 50%; border: 2px solid ${C.primary}; }

  .page { padding: 28px; min-height: calc(100vh - 60px); display: flex; flex-direction: column;}
  .page-hdr { margin-bottom: 22px; }
  .breadcrumb { font-size: 12px; color: ${C.muted}; margin-bottom: 5px; display: flex; align-items: center; gap: 5px; }
  .bc-active { color: ${C.primary}; font-weight: 500; }
  .page-title { font-size: 22px; font-weight: 600; color: ${C.darkText}; letter-spacing: -0.5px; }
  .page-sub { font-size: 13px; color: ${C.muted}; margin-top: 3px; }

  .stat-strip { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 22px; }
  @media(max-width:700px){ .stat-strip{ grid-template-columns: 1fr 1fr; } }
  .stat-card { background: ${C.card}; border: 1px solid ${C.border}; border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; gap: 14px; transition: transform 0.15s; }
  .stat-card:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(43,157,78,0.09); }
  .stat-ico { width: 38px; height: 38px; border-radius: 10px; background: ${C.bgIcon}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .stat-ico.warn { background: ${C.warnBg}; }
  .stat-val { font-size: 22px; font-weight: 600; color: ${C.darkText}; font-family: 'DM Mono', monospace; letter-spacing: -0.5px; line-height: 1; }
  .stat-lbl { font-size: 11.5px; color: ${C.muted}; margin-top: 3px; }

  .split { display: grid; grid-template-columns: 1fr 340px; gap: 16px; align-items: start; flex: 1; min-height: 0; }
  @media(max-width:960px){ .split{ grid-template-columns: 1fr; } }

  .panel { background: ${C.card}; border: 1px solid ${C.border}; border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; height: 100%;}
  .req-list { flex: 1; overflow-y: auto; }

  .panel-head { background: ${C.primary}; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; }
  .ph-title { color: #fff; font-size: 14px; font-weight: 600; }
  .ph-sub { color: rgba(255,255,255,0.7); font-size: 11.5px; margin-top: 2px; }
  .ph-badge { background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.28); border-radius: 20px; padding: 3px 11px; color: #fff; font-size: 11px; font-weight: 500; }

  .tab-row { display: flex; gap: 0; border-bottom: 1px solid ${C.border}; }
  .tab { flex: 1; padding: 11px 14px; font-size: 12.5px; font-weight: 500; color: ${C.muted}; border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.13s; font-family: 'DM Sans', sans-serif; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .tab.active { color: ${C.primary}; border-bottom-color: ${C.primary}; background: ${C.bgLight}; }
  .tab-badge { background: ${C.warning}; color: #fff; border-radius: 20px; padding: 1px 6px; font-size: 10px; font-weight: 700; }
  .tab-badge.green { background: ${C.primary}; }

  .search-row { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid ${C.border}; }
  .search-wrap { flex: 1; display: flex; align-items: center; gap: 8px; background: ${C.bgLight}; border: 1px solid ${C.border}; border-radius: 8px; padding: 8px 12px; }
  .search-wrap input { background: none; border: none; outline: none; font-size: 13px; color: ${C.darkText}; flex: 1; font-family: 'DM Sans', sans-serif; }
  .search-wrap input::placeholder { color: ${C.muted}; }

  .req-list { padding: 4px 0; }
  .req-row { display: flex; align-items: flex-start; gap: 12px; padding: 14px 18px; border-bottom: 1px solid ${C.border}; transition: background 0.12s; cursor: pointer; }
  .req-row:last-child { border-bottom: none; }
  .req-row:hover { background: ${C.bgLight}; }
  .req-av { width: 40px; height: 40px; border-radius: 10px; background: ${C.bgIcon}; border: 1px solid ${C.borderMed}; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: ${C.dark}; flex-shrink: 0; font-family: 'DM Mono', monospace; }
  .req-name { font-size: 13.5px; font-weight: 600; color: ${C.darkText}; }
  .req-ind { font-size: 11.5px; color: ${C.muted}; margin-top: 2px; }
  .req-msg { font-size: 11.5px; color: ${C.muted}; margin-top: 5px; font-style: italic; background: ${C.bgLight}; border-radius: 6px; padding: 5px 8px; }
  .req-meta { font-size: 10.5px; color: ${C.muted}; margin-top: 3px; }
  .req-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; margin-left: auto; }
  .btn-accept { background: ${C.primary}; color: #fff; border: none; border-radius: 7px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: background 0.13s; }
  .btn-accept:hover { background: ${C.dark}; }
  .btn-reject { background: transparent; color: ${C.muted}; border: 1px solid ${C.border}; border-radius: 7px; padding: 5px 12px; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.13s; }
  .btn-reject:hover { border-color: ${C.danger}; color: ${C.danger}; background: ${C.dangerBg}; }
  .btn-disconnect { background: transparent; color: ${C.muted}; border: 1px solid ${C.border}; border-radius: 7px; padding: 5px 9px; font-size: 12px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.13s; }
  .btn-disconnect:hover { border-color: ${C.danger}; color: ${C.danger}; background: ${C.dangerBg}; }
  .btn-withdraw { background: transparent; color: ${C.muted}; border: 1px solid ${C.border}; border-radius: 7px; padding: 5px 10px; font-size: 11.5px; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.13s; display: flex; align-items: center; gap: 4px; }
  .btn-withdraw:hover { border-color: ${C.danger}; color: ${C.danger}; background: ${C.dangerBg}; }

  .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .b-client { background: rgba(99,102,241,0.08); color: #4338ca; border: 1px solid rgba(99,102,241,0.2); }
  .b-provider { background: ${C.bgIcon}; color: ${C.dark}; border: 1px solid ${C.borderMed}; }
  .b-pending { background: ${C.warnBg}; color: #92400e; border: 1px solid rgba(245,158,11,0.25); }
  .b-sent { background: rgba(99,102,241,0.07); color: #4338ca; border: 1px solid rgba(99,102,241,0.18); }
  .bdot { width: 5px; height: 5px; border-radius: 50%; }
  .bdot-g { background: ${C.primary}; }
  .bdot-w { background: ${C.warning}; }
  .bdot-b { background: #6366f1; }

  /* pending section dividers */
  .pending-section-label {
    padding: 10px 18px 5px;
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.65px;
    color: ${C.muted};
    background: ${C.bgLight};
    border-bottom: 1px solid ${C.border};
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .pending-section-label .psl-count {
    background: ${C.warning};
    color: #fff;
    border-radius: 20px;
    padding: 1px 7px;
    font-size: 10px;
    font-weight: 700;
  }
  .pending-section-label .psl-count.blue {
    background: #6366f1;
  }

  .right-col { display: flex; flex-direction: column; gap: 14px; }

  .connect-card { background: ${C.card}; border: 1px solid ${C.border}; border-radius: 14px; overflow: visible; }
  .cc-head { background: ${C.primary}; padding: 14px 18px; display: flex; align-items: center; gap: 10px; border-radius: 14px 14px 0 0; }
  .cc-head-ico { width: 30px; height: 30px; background: rgba(255,255,255,0.18); border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .cc-head-t { color: #fff; font-size: 14px; font-weight: 600; }
  .cc-head-s { color: rgba(255,255,255,0.7); font-size: 11px; margin-top: 1px; }
  .cc-body { padding: 18px; }

  .field-lbl { font-size: 11.5px; font-weight: 600; color: ${C.muted}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 7px; }

  .org-search-wrap { position: relative; }
  .org-input-row { display: flex; align-items: center; gap: 8px; background: ${C.bgLight}; border: 1.5px solid ${C.border}; border-radius: 9px; padding: 9px 12px; transition: border-color 0.15s; }
  .org-input-row.focused { border-color: ${C.primary}; background: #fff; }
  .org-input-row input { background: none; border: none; outline: none; font-size: 13px; color: ${C.darkText}; flex: 1; font-family: 'DM Sans', sans-serif; }
  .org-input-row input::placeholder { color: ${C.muted}; }
  .org-dropdown { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: #fff; border: 1px solid ${C.borderMed}; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); z-index: 50; overflow: hidden; }
  .org-dd-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; transition: background 0.1s; border-bottom: 1px solid ${C.border}; }
  .org-dd-item:last-child { border-bottom: none; }
  .org-dd-item:hover { background: ${C.bgLight}; }
  .org-dd-av { width: 32px; height: 32px; border-radius: 8px; background: ${C.bgIcon}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: ${C.dark}; flex-shrink: 0; font-family: 'DM Mono', monospace; }
  .org-dd-name { font-size: 13px; font-weight: 500; color: ${C.darkText}; }
  .org-dd-ind { font-size: 11px; color: ${C.muted}; }
  .org-dd-badge { margin-left: auto; }
  .org-dd-empty { padding: 16px 14px; text-align: center; font-size: 13px; color: ${C.muted}; }
  .org-dd-searching { padding: 14px; text-align: center; font-size: 12px; color: ${C.muted}; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .selected-org { display: flex; align-items: center; gap: 10px; background: ${C.bgLight}; border: 1px solid ${C.border}; border-radius: 9px; padding: 10px 14px; margin-top: 10px; }
  .selected-av { width: 36px; height: 36px; border-radius: 8px; background: ${C.bgIcon}; border: 1px solid ${C.borderMed}; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: ${C.dark}; font-family: 'DM Mono', monospace; flex-shrink: 0; }
  .selected-name { font-size: 13px; font-weight: 600; color: ${C.darkText}; }
  .selected-ind { font-size: 11px; color: ${C.muted}; margin-top: 1px; }
  .selected-clear { margin-left: auto; background: none; border: none; cursor: pointer; color: ${C.muted}; font-size: 14px; line-height: 1; }
  .msg-area { width: 100%; background: ${C.bgLight}; border: 1.5px solid ${C.border}; border-radius: 9px; padding: 10px 12px; font-size: 13px; color: ${C.darkText}; font-family: 'DM Sans', sans-serif; resize: none; outline: none; transition: border-color 0.15s; }
  .msg-area:focus { border-color: ${C.primary}; background: #fff; }
  .char-count { font-size: 11px; color: ${C.muted}; text-align: right; margin-top: 4px; }
  .send-btn { width: 100%; background: ${C.primary}; color: #fff; border: none; border-radius: 9px; padding: 12px; font-size: 13.5px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-family: 'DM Sans', sans-serif; transition: background 0.15s; }
  .send-btn:hover:not(:disabled) { background: ${C.dark}; }
  .send-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .info-card { background: ${C.card}; border: 1px solid ${C.border}; border-radius: 14px; overflow: hidden; }
  .ic-head { background: ${C.primary}; padding: 14px 18px; }
  .ic-head-t { color: #fff; font-size: 14px; font-weight: 600; }
  .ic-head-s { color: rgba(255,255,255,0.7); font-size: 11px; margin-top: 2px; }
  .ic-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
  .ic-row { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid ${C.border}; }
  .ic-row:last-child { border-bottom: none; padding-bottom: 0; }
  .ic-lbl { font-size: 12px; color: ${C.muted}; }
  .ic-val { font-size: 13px; font-weight: 600; color: ${C.darkText}; font-family: 'DM Mono', monospace; }

  .reject-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 200; }
  .reject-modal { background: #fff; border-radius: 14px; padding: 24px; width: 380px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
  .rm-title { font-size: 16px; font-weight: 600; color: ${C.darkText}; margin-bottom: 6px; }
  .rm-sub { font-size: 13px; color: ${C.muted}; margin-bottom: 16px; }
  .rm-textarea { width: 100%; background: ${C.bgLight}; border: 1.5px solid ${C.border}; border-radius: 9px; padding: 10px 12px; font-size: 13px; color: ${C.darkText}; font-family: 'DM Sans', sans-serif; resize: none; outline: none; }
  .rm-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px; }
  .rm-cancel { background: transparent; color: ${C.muted}; border: 1px solid ${C.border}; border-radius: 8px; padding: 8px 16px; font-size: 13px; cursor: pointer; font-family: 'DM Sans', sans-serif; }
  .rm-confirm { background: ${C.danger}; color: #fff; border: none; border-radius: 8px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; }

  .withdraw-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 200; }
  .withdraw-modal { background: #fff; border-radius: 14px; padding: 24px; width: 360px; max-width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }

  .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; gap: 8px; }
  .empty-ico { width: 48px; height: 48px; border-radius: 12px; background: ${C.bgIcon}; display: flex; align-items: center; justify-content: center; }
  .empty-t { font-size: 14px; font-weight: 600; color: ${C.darkText}; }
  .empty-s { font-size: 12px; color: ${C.muted}; text-align: center; }

  .toast { position: fixed; bottom: 24px; right: 24px; background: ${C.dark}; color: #fff; border-radius: 10px; padding: 11px 16px; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 18px rgba(0,0,0,0.15); z-index: 999; animation: slideUp 0.2s ease; }
  .toast.err { background: ${C.danger}; }
  @keyframes slideUp { from{transform:translateY(12px);opacity:0} to{transform:translateY(0);opacity:1} }

  .skeleton { background: linear-gradient(90deg, ${C.bgLight} 25%, ${C.bgMed} 50%, ${C.bgLight} 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  @keyframes fu { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .fu { animation: fu 0.3s ease both; }
  .fu1 { animation-delay: 0.05s; }
  .fu2 { animation-delay: 0.12s; }

  /* ── Org Preview Modal ── */
  .opm-overlay {
    position: fixed; inset: 0;
    background: rgba(10,20,14,0.55);
    backdrop-filter: blur(3px);
    display: flex; align-items: center; justify-content: center;
    z-index: 300;
    animation: opmFadeIn 0.18s ease both;
  }
  @keyframes opmFadeIn { from{opacity:0} to{opacity:1} }
  .opm-box {
    background: ${C.card};
    border-radius: 18px;
    width: 480px;
    max-width: 94vw;
    max-height: 88vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 64px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.1);
    animation: opmSlideUp 0.22s cubic-bezier(.22,.9,.36,1) both;
  }
  @keyframes opmSlideUp {
    from { opacity:0; transform: translateY(18px) scale(0.97); }
    to   { opacity:1; transform: translateY(0) scale(1); }
  }
  .opm-hero {
    background: ${C.primary};
    padding: 24px 24px 0;
    position: relative;
    flex-shrink: 0;
  }
  .opm-close {
    position: absolute; top: 14px; right: 14px;
    width: 28px; height: 28px; border-radius: 50%;
    background: rgba(255,255,255,0.18);
    border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 14px; line-height: 1;
    transition: background 0.13s;
  }
  .opm-close:hover { background: rgba(255,255,255,0.3); }
  .opm-av {
    width: 68px; height: 68px; border-radius: 16px;
    background: rgba(255,255,255,0.22);
    border: 2px solid rgba(255,255,255,0.45);
    display: flex; align-items: center; justify-content: center;
    font-size: 26px; font-weight: 700; color: #fff;
    font-family: 'DM Mono', monospace;
    letter-spacing: -1px;
    margin-bottom: 12px;
    box-shadow: 0 0 0 5px rgba(255,255,255,0.07);
  }
  .opm-name { color: #fff; font-size: 20px; font-weight: 700; letter-spacing: -0.4px; margin-bottom: 4px; }
  .opm-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
  .opm-meta-item { display: flex; align-items: center; gap: 5px; color: rgba(255,255,255,0.78); font-size: 12px; }
  .opm-type-strip {
    display: flex; gap: 8px;
    border-top: 1px solid rgba(255,255,255,0.15);
    margin: 0 -24px; padding: 12px 24px;
  }
  .opm-body {
    padding: 20px 24px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .opm-section-title {
    font-size: 10.5px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.7px; color: ${C.muted}; margin-bottom: 10px;
  }
  .opm-desc {
    font-size: 13px; color: ${C.darkText}; line-height: 1.6;
    background: ${C.bgLight}; border-radius: 10px;
    padding: 12px 14px;
    border: 1px solid ${C.border};
  }
  .opm-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .opm-f-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: ${C.muted}; margin-bottom: 3px; }
  .opm-f-val { font-size: 13px; font-weight: 500; color: ${C.darkText}; }
  .opm-f-val.email { color: ${C.primary}; font-size: 12.5px; }
  .opm-f-val.mono  { font-family: 'DM Mono', monospace; font-size: 11px; color: ${C.muted}; word-break: break-all; }
  .opm-notice {
    display: flex; align-items: flex-start; gap: 10px;
    background: ${C.warnBg};
    border: 1px solid rgba(245,158,11,0.25);
    border-radius: 10px; padding: 11px 13px;
    font-size: 12px; color: #92400e; line-height: 1.5;
  }
  .opm-footer {
    padding: 16px 24px;
    border-top: 1px solid ${C.border};
    display: flex; gap: 10px;
    flex-shrink: 0;
    background: ${C.pageBg};
  }
  .opm-btn-cancel {
    flex: 0 0 auto;
    background: transparent; color: ${C.muted};
    border: 1px solid ${C.border}; border-radius: 10px;
    padding: 10px 18px; font-size: 13px; font-weight: 500;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: border-color 0.13s, color 0.13s;
  }
  .opm-btn-cancel:hover { border-color: ${C.muted}; color: ${C.darkText}; }
  .opm-btn-connect {
    flex: 1;
    background: ${C.primary}; color: #fff;
    border: none; border-radius: 10px;
    padding: 11px 20px; font-size: 13.5px; font-weight: 600;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: background 0.15s;
  }
  .opm-btn-connect:hover { background: ${C.dark}; }
  .opm-b-white { background: rgba(255,255,255,0.18); color: #fff; border: 1px solid rgba(255,255,255,0.32); border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
`;

const Ico = ({ n, s = 16, c = C.primary }) => {
  const d = {
    network:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="13" x2="5" y2="16"/><line x1="12" y1="13" x2="19" y2="16"/></svg>,
    search:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    bell:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
    qr:       <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" rx="0.5"/><rect x="18" y="14" width="3" height="3" rx="0.5"/><rect x="14" y="18" width="3" height="3" rx="0.5"/><rect x="18" y="18" width="3" height="3" rx="0.5"/></svg>,
    partners: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
    clock:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    check:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    send:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    inbox:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>,
    globe:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
    trash:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
    industry: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>,
    location: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    email:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    warn:     <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    xCircle:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  };
  return d[n] || null;
};

function initials(name = "") {
  return name.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "?";
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── Org Preview Modal ─────────────────────────────────────────────────────────
function OrgPreviewModal({ org, onClose, onConnect }) {
  if (!org) return null;
  const location = [org.city, org.country].filter(Boolean).join(", ") || null;

  return (
    <div className="opm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="opm-box" onClick={e => e.stopPropagation()}>

        <div className="opm-hero">
          <button className="opm-close" onClick={onClose}>✕</button>
          <div className="opm-av">{initials(org.name)}</div>
          <div className="opm-name">{org.name}</div>
          <div className="opm-meta">
            {org.industry && (
              <div className="opm-meta-item">
                <Ico n="industry" s={13} c="rgba(255,255,255,0.65)"/>
                {org.industry}
              </div>
            )}
            {location && (
              <div className="opm-meta-item">
                <Ico n="location" s={13} c="rgba(255,255,255,0.65)"/>
                {location}
              </div>
            )}
            {org.contactEmail && (
              <div className="opm-meta-item">
                <Ico n="email" s={13} c="rgba(255,255,255,0.65)"/>
                {org.contactEmail}
              </div>
            )}
          </div>
          <div className="opm-type-strip">
            <span className="opm-b-white">{org.type}</span>
          </div>
        </div>

        <div className="opm-body">
          {org.description && (
            <div>
              <div className="opm-section-title">About</div>
              <div className="opm-desc">{org.description}</div>
            </div>
          )}

          <div>
            <div className="opm-section-title">Public Details</div>
            <div className="opm-fields">
              <div>
                <div className="opm-f-lbl">Industry</div>
                <div className="opm-f-val">{org.industry || "—"}</div>
              </div>
              <div>
                <div className="opm-f-lbl">Type</div>
                <div className="opm-f-val" style={{ textTransform: "capitalize" }}>{org.type || "—"}</div>
              </div>
              {org.city && (
                <div>
                  <div className="opm-f-lbl">City</div>
                  <div className="opm-f-val">{org.city}</div>
                </div>
              )}
              {org.country && (
                <div>
                  <div className="opm-f-lbl">Country</div>
                  <div className="opm-f-val">{org.country}</div>
                </div>
              )}
              {org.contactEmail && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="opm-f-lbl">Contact Email</div>
                  <div className="opm-f-val email">{org.contactEmail}</div>
                </div>
              )}
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="opm-f-lbl">Organization ID</div>
                <div className="opm-f-val mono">{org.id}</div>
              </div>
            </div>
          </div>

          <div className="opm-notice">
            <Ico n="warn" s={14} c="#92400e"/>
            <span>
              Full compliance documents, verification history, and activity data become
              visible only after a connection is established.
            </span>
          </div>
        </div>

        <div className="opm-footer">
          <button className="opm-btn-cancel" onClick={onClose}>Close</button>
          <button className="opm-btn-connect" onClick={() => onConnect(org)}>
            <Ico n="send" s={13} c="#fff"/>
            Connect with {org.name.split(" ")[0]}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProviderB2BNetwork() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [stats, setStats]             = useState({ connected: 0, pending: 0, total: 0 });
  const [activeTab, setActiveTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting]       = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState(null);
  const [withdrawing, setWithdrawing]       = useState(false);

  const [orgQuery, setOrgQuery]       = useState("");
  const [ddResults, setDdResults]     = useState([]);
  const [ddOpen, setDdOpen]           = useState(false);
  const [ddLoading, setDdLoading]     = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [message, setMessage]         = useState("");
  const [sending, setSending]         = useState(false);

  const [toast, setToast]             = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [previewOrg, setPreviewOrg]   = useState(null);

  const ddRef     = useRef(null);
  const ccBodyRef = useRef(null);
  const MAX_MSG   = 160;

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [connRes, reqRes, statsRes] = await Promise.all([
        api.get("/api/b2b/connections", { params: { per_page: 100 } }),
        api.get("/api/b2b/requests",    { params: { status: "pending", per_page: 100 } }),
        api.get("/api/b2b/stats"),
      ]);
      const allById = new Map();
      (reqRes.data.items  || []).forEach(c => allById.set(c.id, c));
      (connRes.data.items || []).forEach(c => allById.set(c.id, c));
      setConnections(Array.from(allById.values()));
      setStats(statsRes.data);
    } catch (err) {
      showToast(apiErrorMessage(err), "err");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!orgQuery.trim()) { setDdOpen(false); setDdResults([]); return; }
    setDdLoading(true);
    setDdOpen(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.get("/api/b2b/discover", { params: { q: orgQuery, per_page: 8 } });
        setDdResults(res.data.items || []);
      } catch { setDdResults([]); }
      finally { setDdLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [orgQuery]);

  useEffect(() => {
    const handler = (e) => {
      if (ddRef.current && !ddRef.current.contains(e.target)) setDdOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSendRequest = async () => {
    if (!selectedOrg) { showToast("Please select an organization first.", "err"); return; }
    setSending(true);
    try {
      await api.post("/api/b2b/connections", {
        targetOrgId: selectedOrg.id,
        notes: message || undefined,
      });
      setSelectedOrg(null); setOrgQuery(""); setMessage("");
      showToast(`Connection request sent to ${selectedOrg.name}`);
      await loadData();
    } catch (err) { showToast(apiErrorMessage(err), "err"); }
    finally { setSending(false); }
  };

  const handleAccept = async (connId, name) => {
    try {
      await api.post(`/api/b2b/requests/${connId}/accept`);
      showToast(`${name} is now a connected client!`);
      await loadData();
    } catch (err) {
      showToast(apiErrorMessage(err), "err");
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      await api.post(`/api/b2b/requests/${rejectTarget.id}/reject`, {
        reason: rejectReason || undefined,
      });
      showToast(`Request from ${rejectTarget.name} declined.`);
      setRejectTarget(null);
      setRejectReason("");
      await loadData();
    } catch (err) {
      showToast(apiErrorMessage(err), "err");
    } finally {
      setRejecting(false);
    }
  };

  const handleWithdrawConfirm = async () => {
    if (!withdrawTarget) return;
    setWithdrawing(true);
    try {
      await api.delete(`/api/b2b/connections/${withdrawTarget.id}`);
      showToast(`Request to ${withdrawTarget.name} withdrawn.`);
      setWithdrawTarget(null);
      await loadData();
    } catch (err) {
      showToast(apiErrorMessage(err), "err");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleDisconnect = async (connId, name) => {
    try {
      await api.delete(`/api/b2b/connections/${connId}`);
      showToast(`Disconnected from ${name}.`);
      await loadData();
    } catch (err) {
      showToast(apiErrorMessage(err), "err");
    }
  };

  const handlePreviewConnect = (org) => {
    setSelectedOrg(org);
    setOrgQuery("");
    setPreviewOrg(null);
    setTimeout(() => {
      ccBodyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  // ── Derived lists ────────────────────────────────────────────────────────
  const pendingIncoming = connections.filter(c => c.status === "pending" && c.direction === "incoming");
  const pendingOutgoing = connections.filter(c => c.status === "pending" && c.direction === "outgoing");
  const pending         = connections.filter(c => c.status === "pending"); // all, for counts
  const connected       = connections.filter(c => c.status === "connected");
  const history         = connections.filter(c => c.status === "disconnected" || c.status === "blocked");

  const applySearch = (list) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(c =>
      (c.partner?.name     || "").toLowerCase().includes(q) ||
      (c.partner?.industry || "").toLowerCase().includes(q)
    );
  };

  // For non-pending tabs we still use simple displayList
  const tabMap = { connected, history };
  const displayList = applySearch(tabMap[activeTab] || []);

  // Filtered pending sub-lists
  const filteredIncoming = applySearch(pendingIncoming);
  const filteredOutgoing = applySearch(pendingOutgoing);

  if (selectedPartner) {
    return (
      <PartnerProfile
        connectionId={selectedPartner}
        onBack={() => { setSelectedPartner(null); loadData(); }}
      />
    );
  }

  return (
    <>
      <style>{css}</style>

      <nav className="topnav">
        <div className="topnav-left">
          <div className="topnav-logobox"><Ico n="qr" s={15} c="#fff"/></div>
          <div>
            <div className="topnav-title">BiVerify</div>
            <div className="topnav-sub">Provider Portal</div>
          </div>
          <div className="topnav-div" style={{width:1,height:28,background:"rgba(255,255,255,0.2)",margin:"0 14px"}}/>
          <span className="topnav-pg">B2B Network</span>
        </div>
        <div className="topnav-right">
          <div className="topnav-site"><span className="pulse-dot"/>Live</div>
          <button className="notif-btn">
            <Ico n="bell" s={15} c="rgba(255,255,255,0.85)"/>
            {pendingIncoming.length > 0 && <span className="notif-pip"/>}
          </button>
        </div>
      </nav>

      <div className="page">
        <div className="page-hdr fu fu1">
          <div className="breadcrumb"><span>Dashboard</span><span>/</span><span className="bc-active">B2B Network</span></div>
          <div className="page-title">B2B Network</div>
          <div className="page-sub">Manage connection requests and reach out to other organizations directly.</div>
        </div>

        <div className="stat-strip fu fu1">
          {[
            { ico: "partners", icoCls: "",    val: stats.connected,      lbl: "Connected clients"  },
            { ico: "clock",    icoCls: "warn", val: stats.pending,        lbl: "Pending requests"  },
            { ico: "globe",    icoCls: "",     val: stats.total,          lbl: "Total connections" },
            { ico: "check",    icoCls: "",     val: history.length,       lbl: "Past connections"  },
          ].map((s, i) => (
            <div className="stat-card" key={i}>
              <div className={`stat-ico ${s.icoCls}`}>
                <Ico n={s.ico} s={18} c={s.icoCls === "warn" ? C.warning : C.primary}/>
              </div>
              <div>
                <div className="stat-val">{s.val}</div>
                <div className="stat-lbl">{s.lbl}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="split fu fu2">
          <div className="panel">
            <div className="panel-head">
              <div>
                <div className="ph-title">Client Connections</div>
                <div className="ph-sub">Manage all connection requests and active clients</div>
              </div>
              <div className="ph-badge">{stats.connected} active</div>
            </div>

            <div className="tab-row">
              {[
                { key: "pending",   label: "Pending",   count: pending.length,   countCls: "" },
                { key: "connected", label: "Connected", count: connected.length, countCls: "green" },
                { key: "history",   label: "History",   count: history.length,   countCls: "" },
              ].map(t => (
                <button key={t.key} className={`tab ${activeTab === t.key ? "active" : ""}`} onClick={() => setActiveTab(t.key)}>
                  {t.label}
                  {t.count > 0 && <span className={`tab-badge ${t.countCls}`}>{t.count}</span>}
                </button>
              ))}
            </div>

            <div className="search-row">
              <div className="search-wrap">
                <Ico n="search" s={14} c={C.muted}/>
                <input placeholder="Search by name or industry…" value={search} onChange={e => setSearch(e.target.value)}/>
              </div>
            </div>

            <div className="req-list">
              {loading ? (
                [1,2,3].map(i => (
                  <div className="req-row" key={i}>
                    <div className="req-av skeleton" style={{background:"none"}}/>
                    <div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>
                      <div className="skeleton" style={{height:13,width:"50%"}}/>
                      <div className="skeleton" style={{height:11,width:"30%"}}/>
                    </div>
                  </div>
                ))
              ) : activeTab === "pending" ? (
                <>
                  {/* ── Outgoing / sent requests ── */}
                  {filteredOutgoing.length > 0 && (
                    <>
                      <div className="pending-section-label">
                        <Ico n="send" s={11} c={C.muted}/>
                        Sent by you · awaiting response
                        <span className="psl-count blue">{filteredOutgoing.length}</span>
                      </div>
                      {filteredOutgoing.map(c => (
                        <div className="req-row" key={c.id} onClick={() => setSelectedPartner(c.id)}>
                          <div className="req-av">{initials(c.partner?.name)}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div className="req-name">{c.partner?.name}</div>
                            <div className="req-ind">{c.partner?.industry}</div>
                            {c.notes && <div className="req-msg">"{c.notes}"</div>}
                            <div className="req-meta">Sent {fmtDate(c.createdAt)}</div>
                          </div>
                          <span className={`badge ${c.partner?.type === "client" ? "b-client" : "b-provider"}`}>
                            <span className="bdot bdot-g"/>{c.partner?.type}
                          </span>
                          <div className="req-actions">
                            <span className="badge b-sent"><span className="bdot bdot-b"/>Awaiting</span>
                            <button
                              className="btn-withdraw"
                              onClick={(e) => {
                                e.stopPropagation();
                                setWithdrawTarget({ id: c.id, name: c.partner?.name });
                              }}
                            >
                              <Ico n="xCircle" s={12} c="currentColor"/>
                              Withdraw
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* ── Incoming requests ── */}
                  {filteredIncoming.length > 0 && (
                    <>
                      <div className="pending-section-label" style={{ borderTop: filteredOutgoing.length > 0 ? `1px solid ${C.border}` : "none" }}>
                        <Ico n="inbox" s={11} c={C.muted}/>
                        Received · awaiting your response
                        <span className="psl-count">{filteredIncoming.length}</span>
                      </div>
                      {filteredIncoming.map(c => (
                        <div className="req-row" key={c.id} onClick={() => setSelectedPartner(c.id)}>
                          <div className="req-av">{initials(c.partner?.name)}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div className="req-name">{c.partner?.name}</div>
                            <div className="req-ind">{c.partner?.industry}</div>
                            {c.notes && <div className="req-msg">"{c.notes}"</div>}
                            <div className="req-meta">Requested {fmtDate(c.createdAt)}</div>
                          </div>
                          <span className={`badge ${c.partner?.type === "client" ? "b-client" : "b-provider"}`}>
                            <span className="bdot bdot-g"/>{c.partner?.type}
                          </span>
                          <div className="req-actions">
                            <button className="btn-accept" onClick={(e) => { e.stopPropagation(); handleAccept(c.id, c.partner?.name); }}>Accept</button>
                            <button className="btn-reject" onClick={(e) => { e.stopPropagation(); setRejectTarget({ id: c.id, name: c.partner?.name }); setRejectReason(""); }}>Decline</button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* ── Empty state ── */}
                  {filteredOutgoing.length === 0 && filteredIncoming.length === 0 && (
                    <div className="empty">
                      <div className="empty-ico"><Ico n="inbox" s={22} c={C.primary}/></div>
                      <div className="empty-t">No pending requests</div>
                      <div className="empty-s">New requests from organizations will appear here</div>
                    </div>
                  )}
                </>
              ) : displayList.length === 0 ? (
                <div className="empty">
                  <div className="empty-ico"><Ico n="inbox" s={22} c={C.primary}/></div>
                  <div className="empty-t">
                    {activeTab === "connected" ? "No connected clients" : "No history yet"}
                  </div>
                  <div className="empty-s">
                    {activeTab === "connected" ? "Accepted connections will appear here" : "Declined or removed connections appear here"}
                  </div>
                </div>
              ) : displayList.map(c => (
                <div className="req-row" key={c.id} onClick={() => setSelectedPartner(c.id)}>
                  <div className="req-av">{initials(c.partner?.name)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="req-name">{c.partner?.name}</div>
                    <div className="req-ind">{c.partner?.industry}</div>
                    {c.notes && <div className="req-msg">"{c.notes}"</div>}
                    <div className="req-meta">
                      {activeTab === "connected"
                        ? `Connected ${fmtDate(c.connectedAt)}`
                        : `Requested ${fmtDate(c.createdAt)}`}
                    </div>
                  </div>
                  <span className={`badge ${c.partner?.type === "client" ? "b-client" : "b-provider"}`}>
                    <span className="bdot bdot-g"/>{c.partner?.type}
                  </span>
                  <div className="req-actions">
                    {activeTab === "connected" && (
                      <button className="btn-disconnect" onClick={(e) => { e.stopPropagation(); handleDisconnect(c.id, c.partner?.name); }}>
                        <Ico n="trash" s={12} c="currentColor"/>
                      </button>
                    )}
                    {activeTab === "history" && (
                      <span className="badge b-pending"><span className="bdot bdot-w"/>Inactive</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="right-col">
            <div className="connect-card">
              <div className="cc-head">
                <div className="cc-head-ico"><Ico n="network" s={15} c="#fff"/></div>
                <div>
                  <div className="cc-head-t">Connect with an Organization</div>
                  <div className="cc-head-s">Reach out to client orgs directly</div>
                </div>
              </div>
              <div className="cc-body" ref={ccBodyRef}>
                <div style={{ marginBottom: 14 }}>
                  <div className="field-lbl">Organization name</div>
                  <div className="org-search-wrap" ref={ddRef}>
                    <div className={`org-input-row ${ddOpen ? "focused" : ""}`}>
                      <Ico n="search" s={14} c={C.muted}/>
                      <input
                        placeholder="Search registered organizations…"
                        value={orgQuery}
                        onChange={e => { setOrgQuery(e.target.value); setSelectedOrg(null); }}
                        onFocus={() => orgQuery.trim() && setDdOpen(true)}
                      />
                      {orgQuery && (
                        <button onClick={() => { setOrgQuery(""); setDdOpen(false); setSelectedOrg(null); }}
                          style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:14,lineHeight:1,padding:"0 2px"}}>✕</button>
                      )}
                    </div>
                    {ddOpen && (
                      <div className="org-dropdown">
                        {ddLoading ? (
                          <div className="org-dd-searching">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                            Searching…
                          </div>
                        ) : ddResults.length === 0 ? (
                          <div className="org-dd-empty">No organizations found for "{orgQuery}"</div>
                        ) : ddResults.map(org => (
                          <div
                            className="org-dd-item"
                            key={org.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setDdOpen(false);
                              setPreviewOrg(org);
                            }}
                          >
                            <div className="org-dd-av">{initials(org.name)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="org-dd-name">{org.name}</div>
                              <div className="org-dd-ind">{org.industry}</div>
                            </div>
                            <div className="org-dd-badge" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span className={`badge ${org.type === "client" ? "b-client" : "b-provider"}`}>{org.type}</span>
                              <span style={{ fontSize: 10, color: C.muted, whiteSpace: "nowrap" }}>View →</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedOrg && (
                    <div className="selected-org">
                      <div className="selected-av">{initials(selectedOrg.name)}</div>
                      <div>
                        <div className="selected-name">{selectedOrg.name}</div>
                        <div className="selected-ind">{selectedOrg.industry} · {selectedOrg.type}</div>
                      </div>
                      <button className="selected-clear" onClick={() => setSelectedOrg(null)}>✕</button>
                    </div>
                  )}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div className="field-lbl">Message <span style={{fontWeight:400,textTransform:"none",letterSpacing:0,fontSize:11}}>(optional)</span></div>
                  <textarea className="msg-area" rows={3} maxLength={MAX_MSG}
                    placeholder="Add a short note with your request…"
                    value={message} onChange={e => setMessage(e.target.value)}/>
                  <div className="char-count">{message.length}/{MAX_MSG}</div>
                </div>
                <button className="send-btn" onClick={handleSendRequest} disabled={sending || !selectedOrg}>
                  {sending ? "Sending…" : <><Ico n="send" s={14} c="#fff"/>Send Connection Request</>}
                </button>
              </div>
            </div>

            <div className="info-card">
              <div className="ic-head">
                <div className="ic-head-t">Network Summary</div>
                <div className="ic-head-s">Your B2B connection overview</div>
              </div>
              <div className="ic-body">
                <div className="ic-row">
                  <span className="ic-lbl">Connected clients</span>
                  <span className="ic-val">{stats.connected}</span>
                </div>
                <div className="ic-row">
                  <span className="ic-lbl">Received · awaiting you</span>
                  <span className="ic-val">{pendingIncoming.length}</span>
                </div>
                <div className="ic-row">
                  <span className="ic-lbl">Sent · awaiting them</span>
                  <span className="ic-val">{pendingOutgoing.length}</span>
                </div>
                <div className="ic-row">
                  <span className="ic-lbl">Past connections</span>
                  <span className="ic-val">{history.length}</span>
                </div>
                <div className="ic-row">
                  <span className="ic-lbl">Total all-time</span>
                  <span className="ic-val">{stats.total}</span>
                </div>
              </div>
            </div>

            {pendingIncoming.length > 0 && (
              <div className="info-card">
                <div className="ic-head" style={{background: C.warning}}>
                  <div className="ic-head-t">{pendingIncoming.length} Request{pendingIncoming.length > 1 ? "s" : ""} Awaiting</div>
                  <div className="ic-head-s">Review and respond to stay current</div>
                </div>
                <div className="ic-body">
                  {pendingIncoming.slice(0, 3).map(c => (
                    <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,paddingBottom:10,borderBottom:`1px solid ${C.border}`,cursor:"pointer"}} onClick={() => setSelectedPartner(c.id)}>
                      <div style={{width:32,height:32,borderRadius:8,background:C.bgIcon,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.dark,fontFamily:"'DM Mono', monospace",flexShrink:0}}>
                        {initials(c.partner?.name)}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:C.darkText,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.partner?.name}</div>
                        <div style={{fontSize:11,color:C.muted}}>{new Date(c.createdAt).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}</div>
                      </div>
                    </div>
                  ))}
                  {pendingIncoming.length > 3 && (
                    <div style={{fontSize:12,color:C.muted,textAlign:"center",marginTop:4}}>+{pendingIncoming.length - 3} more — switch to Pending tab</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Org Preview Modal ── */}
      {previewOrg && (
        <OrgPreviewModal
          org={previewOrg}
          onClose={() => setPreviewOrg(null)}
          onConnect={handlePreviewConnect}
        />
      )}

      {/* ── Reject Modal ── */}
      {rejectTarget && (
        <div className="reject-modal-overlay" onClick={() => setRejectTarget(null)}>
          <div className="reject-modal" onClick={e => e.stopPropagation()}>
            <div className="rm-title">Decline request from {rejectTarget.name}?</div>
            <div className="rm-sub">You can optionally provide a reason. They will not see this message.</div>
            <textarea
              className="rm-textarea"
              rows={3}
              maxLength={300}
              placeholder="Reason (optional)…"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="rm-actions">
              <button className="rm-cancel" onClick={() => setRejectTarget(null)}>Cancel</button>
              <button className="rm-confirm" onClick={handleRejectConfirm} disabled={rejecting}>
                {rejecting ? "Declining…" : "Decline Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Withdraw Modal ── */}
      {withdrawTarget && (
        <div className="withdraw-modal-overlay" onClick={() => setWithdrawTarget(null)}>
          <div className="withdraw-modal" onClick={e => e.stopPropagation()}>
            <div className="rm-title">Withdraw request to {withdrawTarget.name}?</div>
            <div className="rm-sub">This will cancel your pending connection request. You can send a new one at any time.</div>
            <div className="rm-actions">
              <button className="rm-cancel" onClick={() => setWithdrawTarget(null)}>Keep Request</button>
              <button className="rm-confirm" onClick={handleWithdrawConfirm} disabled={withdrawing}>
                {withdrawing ? "Withdrawing…" : "Withdraw Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type === "err" ? "err" : ""}`}>
          <Ico n="check" s={13} c="#fff"/>
          {toast.msg}
        </div>
      )}
    </>
  );
}