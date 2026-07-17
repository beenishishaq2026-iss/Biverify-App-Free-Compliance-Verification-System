import React, { useState, useEffect } from "react";
import ComplianceSidebar from "../../components/ComplianceSidebar";
import { compliance, apiErrorMessage } from "../../api/client";

const G  = "#2b9d4e";

const Ico = ({ n, s = 15, c = "#fff" }) => {
  const icons = {
    download: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  };
  return icons[n] || null;
};

const statusStyle = (s) => {
  const status = s?.toLowerCase() || "";
  if (status === "completed")   return { background: "rgba(43,157,78,0.10)",  color: "#1f7a3b", border: "1px solid rgba(43,157,78,0.18)"  };
  if (status === "in progress") return { background: "rgba(59,130,246,0.10)", color: "#1e40af", border: "1px solid rgba(59,130,246,0.2)"  };
  return                               { background: "rgba(245,158,11,0.10)", color: "#92400e", border: "1px solid rgba(245,158,11,0.25)" };
};

const statusDot = (s) => {
  const status = s?.toLowerCase() || "";
  if (status === "completed")   return "#2b9d4e";
  if (status === "in progress") return null;
  return "#F59E0B";
};

export default function ServiceOrders() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    compliance.listOrders()
      .then(setInvoices)
      .catch(err => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const exportCSV = () => {
    const headers = ["PO", "Date", "Provider", "Status", "Amount"];
    const rows = invoices.map(inv => [inv.po, inv.date, inv.provider, inv.status, inv.amount]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "PurchaseOrders.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F5F6FA", fontFamily: "'Inter', sans-serif" }}>

      {/* ── SIDEBAR ── */}
      <ComplianceSidebar />

      {/* ── TOP NAV ── */}
      <nav style={{
        width: "calc(100% - 240px)",
        height: 60,
        background: G,
        padding: "0 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "fixed", top: 0, left: 240, zIndex: 9999,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)", boxSizing: "border-box",
      }}>
        {/* Left: icon + title + subtitle */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.12)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Ico n="download" s={16} c="#fff" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px", lineHeight: 1.2 }}>Invoices &amp; Purchase Orders</span>
            <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 10, letterSpacing: "0.7px", textTransform: "uppercase" }}>ADMIN PORTAL</span>
          </div>
        </div>

        {/* Right: Download Orders button + avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={exportCSV}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.18)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";  e.currentTarget.style.transform = "translateY(0)"; }}
            style={{
              background: "#fff", color: G,
              padding: "7px 16px", borderRadius: 8,
              fontWeight: 700, fontSize: 13,
              fontFamily: "'Inter', sans-serif",
              border: "none", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              whiteSpace: "nowrap",
              transition: "box-shadow 0.15s, transform 0.15s",
            }}
          >
            <Ico n="download" s={13} c={G} /> Download Orders
          </button>

          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "2px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 600 }}>AO</div>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>Admin</span>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <div style={{
        marginLeft: 240, marginTop: 60,
        padding: "24px",
        background: "#F5F6FA",
        minHeight: "calc(100vh - 60px)",
        boxSizing: "border-box",
      }}>

        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(43,157,78,0.18)", boxShadow: "0 2px 8px rgba(0,0,0,0.03)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(43,157,78,0.05)" }}>
                {["PO Details", "Provider", "Status", "Amount"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "13px 20px", fontSize: 12, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid rgba(43,157,78,0.15)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ padding: "32px", textAlign: "center", color: "#6B7280" }}>Loading orders...</td></tr>
              ) : error ? (
                <tr><td colSpan="4" style={{ padding: "32px", textAlign: "center", color: "#EF4444" }}>{error}</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan="4" style={{ padding: "32px", textAlign: "center", color: "#6B7280" }}>No orders found.</td></tr>
              ) : invoices.map((inv, i) => (
                <tr key={i}
                  style={{ borderTop: "1px solid rgba(43,157,78,0.08)", transition: "background 0.12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(43,157,78,0.03)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13.5, fontWeight: 600, color: "#1A1D23" }}>{inv.po}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#6B7280", marginTop: 3 }}>{inv.date}</div>
                  </td>
                  <td style={{ padding: "16px 20px", fontSize: 14, color: "#1A1D23" }}>{inv.provider}</td>
                  <td style={{ padding: "16px 20px" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                      ...statusStyle(inv.status),
                    }}>
                      {statusDot(inv.status) && <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusDot(inv.status), display: "inline-block" }} />}
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ padding: "16px 20px", fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: 14, color: "#1A1D23" }}>{inv.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}