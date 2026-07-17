import React from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../api/client";

const ROLE_LABEL = {
  super_admin: "Super Admin", org_admin: "Org Admin",
  provider_staff: "Provider Staff", compliance_officer: "Compliance Officer",
  client_staff: "Client Staff",
};

const G      = "#2b9d4e";   // sidebar background
const GD     = "#1f7a3b";   // icon box
const BORDER = "#174f28";   // darker border — separates sidebar from navbar

export default function AdminSidebar() {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    localStorage.removeItem("biverify_token"); localStorage.removeItem("biverify_user");
    navigate("/login");
  };

  return (
    <aside style={{
      position: "fixed", top: 0, left: 0,
      width: 240, height: "100vh",
      background: G,
      zIndex: 10000,
      display: "flex", flexDirection: "column",
      overflowY: "auto",
      borderRight: `3px solid ${BORDER}`,   // darker border — same as ClientSidebar & ComplianceSidebar
      boxSizing: "border-box",
      padding: 16,
    }}>

      {/* ── HEADER: BiVerify logo — aligns with navbar brand zone ── */}
      <div style={{
        height: 60, minHeight: 60,
        display: "flex", alignItems: "center", gap: 10,
        margin: "-16px -16px 8px",               // cancel padding to span full width
        padding: "0 16px",
        flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.15)",
      }}>
        <div style={{
          width: 36, height: 36, background: GD, borderRadius: 9,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          fontSize: 17, color: "#fff",
        }}>
          {/* shield icon inline */}
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <span style={{ color: "#fff", fontSize: 19, fontWeight: 800, letterSpacing: "-0.4px" }}>
          BiVerify
        </span>
      </div>

      {/* ── BOTTOM: Profile + Logout ── */}
      <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: 10, borderRadius: 10,
          background: "rgba(255,255,255,0.08)", marginBottom: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "#4fb96e",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 15, color: "#fff",
          }}>S</div>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "#fff", margin: 0 }}>{user?.fullName || "Guest"}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0 }}>{ROLE_LABEL[user?.role] || user?.role || ""}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
          style={{
            width: "100%", padding: 9, border: "none", borderRadius: 8,
            background: "rgba(255,255,255,0.15)", color: "#fff",
            cursor: "pointer", fontSize: 13.5, fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            transition: "background 0.15s",
          }}
        >
          Logout
        </button>
      </div>

    </aside>
  );
}