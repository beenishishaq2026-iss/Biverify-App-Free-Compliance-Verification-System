import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { getUser } from "../api/client";

const ROLE_LABEL = {
  super_admin: "Super Admin", org_admin: "Org Admin",
  provider_staff: "Provider Staff", compliance_officer: "Compliance Officer",
  client_staff: "Client Staff",
};

import {
  FaShieldAlt,
  FaThLarge,
  FaQrcode,
  FaShoppingCart,
  FaUser,
  FaSignOutAlt
} from "react-icons/fa";

// ── Colors from ClientDashboard reference ──
const G      = "#2b9d4e";   // sidebar background
const GD     = "#1f7a3b";   // icon box, hover accents
const BORDER = "#174f28";   // darker border — separates sidebar from navbar

export default function ComplianceSidebar() {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    localStorage.removeItem("biverify_token"); localStorage.removeItem("biverify_user");
    navigate("/login");
  };

  const navLinkStyle = ({ isActive }) => ({
    display: "flex", alignItems: "center", gap: 10,
    padding: "9px 14px", margin: "6px 0", borderRadius: 8,
    background: isActive ? "rgba(255,255,255,0.22)" : "transparent",
    color: isActive ? "#fff" : "rgba(255,255,255,0.82)",
    fontSize: 13.5, fontWeight: isActive ? 600 : 500,
    textDecoration: "none", cursor: "pointer",
    transition: "background 0.15s",
  });

  const iconStyle = { fontSize: 14, flexShrink: 0, opacity: 0.85 };

  return (
    <aside style={{
      position: "fixed", top: 0, left: 0,
      width: 240, height: "100vh",
      background: G,                            // #2b9d4e — Primary Green
      zIndex: 10000,
      display: "flex", flexDirection: "column",
      overflowY: "auto",
      borderRight: `3px solid ${BORDER}`,       // #174f28 — darker separator
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* ── HEADER ── */}
      <div style={{
        height: 60, minHeight: 60,
        display: "flex", alignItems: "center", gap: 10,
        padding: "0 16px", flexShrink: 0,
        borderBottom: "1px solid rgba(255,255,255,0.15)",
      }}>
        <div style={{
          width: 36, height: 36, background: GD, borderRadius: 9,   // GD = #1f7a3b
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          fontSize: 17, color: "#fff",
        }}>
          <FaShieldAlt />
        </div>
        <span style={{ color: "#fff", fontSize: 19, fontWeight: 800, letterSpacing: "-0.4px" }}>
          BiVerify
        </span>
      </div>

      {/* ── NAV LINKS ── */}
      <div style={{ flex: 1, padding: "12px 0" }}>

        <p style={{
          fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)",
          textTransform: "uppercase", letterSpacing: "1px",
          padding: "14px 14px 8px", margin: 0,
        }}>ASSET OWNER</p>

        {[
          { to: "/compliance",      icon: <FaThLarge style={iconStyle} />,    label: "Compliance Overview" },
          { to: "/verify-provider", icon: <FaQrcode style={iconStyle} />,     label: "Verify Provider"     },
          { to: "/service-orders",  icon: <FaShoppingCart style={iconStyle} />, label: "Service Orders"    },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={navLinkStyle}
            onMouseEnter={e => { if (!e.currentTarget.className.includes("active")) e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
            onMouseLeave={e => { if (!e.currentTarget.className.includes("active")) e.currentTarget.style.background = "transparent"; }}
          >
            {item.icon} {item.label}
          </NavLink>
        ))}

      </div>

      {/* ── BOTTOM: Client + Logout ── */}
      <div style={{
        marginTop: "auto",
        padding: "16px 8px 12px",
        borderTop: "1px solid rgba(255,255,255,0.12)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", borderRadius: 8,
          color: "rgba(255,255,255,0.85)", fontSize: 13.5, fontWeight: 500,
          marginBottom: 6,
        }}>
          <FaUser style={{ fontSize: 14, flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            <span>{user?.fullName || "Guest"}</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{ROLE_LABEL[user?.role] || user?.role || ""}</span>
          </div>
        </div>

        <div
          onClick={handleLogout}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 14px", borderRadius: 8,
            color: "rgba(255,255,255,0.65)", fontSize: 13.5, fontWeight: 500,
            cursor: "pointer", transition: "background 0.15s",
          }}
        >
          <FaSignOutAlt style={{ fontSize: 14, flexShrink: 0 }} /> Logout
        </div>
      </div>

    </aside>
  );
}