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
  FaChartBar,
  FaNetworkWired,
  FaCalendarAlt,
  FaFileAlt,
  FaUsers,
  FaCog,
  FaSignOutAlt,
  FaHistory,
  FaQrcode,
} from "react-icons/fa";

const G      = "#2b9d4e";
const GD     = "#1f7a3b";
const BORDER = "#174f28";

const SECTIONS = [
  {
    heading: "MANAGEMENT",
    items: [
      { to: "/overview", Icon: FaChartBar,    label: "Overview"         },
      { to: "/network",  Icon: FaNetworkWired, label: "B2B Network"      },
    ],
  },
  {
    heading: "ASSET OPERATIONS",
    items: [
      { to: "/Bookings", Icon: FaCalendarAlt,  label: "Service Bookings" },
      { to: "/vault",    Icon: FaFileAlt,       label: "Compliance Vault" },
      { to: "/team",     Icon: FaUsers,         label: "My Team"          },
      { to: "/audit",     Icon: FaHistory,         label: "Audit Logs"          },
      { to: "/clientqr",  Icon: FaQrcode,          label: "ClientQR"            },
    ],
  },
  {
    heading: "SYSTEM",
    items: [
      { to: "/settings", Icon: FaCog,           label: "Settings"         },
    ],
  },
];

export default function ClientSidebar() {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    localStorage.removeItem("biverify_token"); localStorage.removeItem("biverify_user");
    navigate("/login");
  };

  return (
    <aside style={{
      position:      "fixed",
      top: 0, left: 0,
      width:         240,
      height:        "100vh",
      background:    G,
      zIndex:        10000,
      display:       "flex",
      flexDirection: "column",
      overflowY:     "auto",
      borderRight:   `3px solid ${BORDER}`,
      fontFamily:    "'DM Sans', sans-serif",
    }}>

      {/* ── LOGO ── */}
      <div style={{
        height: 60, minHeight: 60,
        display: "flex", alignItems: "center", gap: 10,
        padding: "0 16px", flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, background: GD, borderRadius: 9,
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

      {/* ── NAV SECTIONS ── */}
      <div style={{
        flex: 1, padding: "8px 0",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div>
          {SECTIONS.map((sec, si) => (
            <div key={si}>
              <p style={{
                fontSize: 10, fontWeight: 700,
                color: "rgba(255,255,255,0.5)",
                textTransform: "uppercase", letterSpacing: "1px",
                padding: "14px 16px 6px", margin: 0,
              }}>
                {sec.heading}
              </p>

              {sec.items.map((item, ii) => (
                <NavLink
                  key={ii}
                  to={item.to}
                  style={({ isActive }) => ({
                    display:        "flex",
                    alignItems:     "center",
                    gap:            10,
                    padding:        "9px 12px",
                    margin:         "2px 8px",
                    borderRadius:   8,
                    background:     isActive ? "rgba(255,255,255,0.22)" : "transparent",
                    color:          isActive ? "#fff" : "rgba(255,255,255,0.82)",
                    fontSize:       13.5,
                    fontWeight:     isActive ? 600 : 500,
                    textDecoration: "none",
                    cursor:         "pointer",
                    transition:     "background 0.15s",
                  })}
                  onMouseEnter={e => {
                    if (e.currentTarget.getAttribute("aria-current") !== "page")
                      e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                  }}
                  onMouseLeave={e => {
                    if (e.currentTarget.getAttribute("aria-current") !== "page")
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  <item.Icon style={{ fontSize: 14, flexShrink: 0, opacity: 0.9 }} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        {/* ── USER + LOGOUT — pinned bottom ── */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 8 }}>
          <div style={{ padding: "8px 12px", margin: "2px 8px", color: "rgba(255,255,255,0.85)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{user?.fullName || "Guest"}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{ROLE_LABEL[user?.role] || user?.role || ""}</div>
          </div>
          <div
            onClick={handleLogout}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", margin: "2px 8px", borderRadius: 8,
              color: "rgba(255,255,255,0.65)",
              fontSize: 13.5, fontWeight: 500,
              cursor: "pointer", transition: "background 0.15s",
            }}
          >
            <FaSignOutAlt style={{ fontSize: 14, flexShrink: 0 }} />
            Logout
          </div>
        </div>
      </div>
    </aside>
  );
}