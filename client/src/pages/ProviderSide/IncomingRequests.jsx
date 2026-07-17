import { useState, useEffect, useCallback } from "react";
import api, { getUser } from "../../api/client";

const G  = "#2b9d4e";
const BG = "#F0F2F5";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: ${BG}; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 4px; }
  input, button, select { font-family: 'Inter', sans-serif; }
  input:focus, select:focus { outline: none; }
  input::placeholder { color: rgba(255,255,255,0.45); }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
`;

const PATHS = {
  inbox:    ["M22 12h-6l-2 3H10l-2-3H2","M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"],
  bell:     ["M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9","M13.73 21a2 2 0 01-3.46 0"],
  search:   ["M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"],
  check:    ["M20 6L9 17l-5-5"],
  x:        ["M18 6L6 18","M6 6l12 12"],
  clock:    ["M12 2a10 10 0 100 20A10 10 0 0012 2z","M12 6v6l4 2"],
  alert:    ["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z","M12 9v4","M12 17h.01"],
  checkAll: ["M22 11.08V12a10 10 0 11-5.93-9.14","M22 4L12 14.01l-3-3"],
  building: ["M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z","M9 22V12h6v10"],
  download: ["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4","M7 10l5 5 5-5","M12 15V3"],
  eye:      ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 9a3 3 0 100 6 3 3 0 000-6z"],
  refresh:  ["M23 4v6h-6","M1 20v-6h6","M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"],
  user:     ["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2","M12 11a4 4 0 100-8 4 4 0 000 8z"],
  users:    ["M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2","M23 21v-2a4 4 0 00-3-3.87","M16 3.13a4 4 0 010 7.75","M9 11a4 4 0 100-8 4 4 0 000 8z"],
};

function Icon({ name, size = 16, color = "currentColor", sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {(PATHS[name] || []).map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

function StatCard({ label, value, icon, iconBg, iconColor, accentColor, badge, badgeBg, badgeColor }) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: "#fff", borderRadius: 16, border: "1px solid #e8eaf0",
      boxShadow: hov ? "0 8px 28px rgba(0,0,0,0.10)" : "0 1px 4px rgba(0,0,0,0.05)",
      transform: hov ? "translateY(-2px)" : "translateY(0)",
      transition: "all 0.2s", padding: "22px 20px 20px",
      display: "flex", flexDirection: "column", gap: 14,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, background: accentColor, borderRadius: "16px 0 0 16px" }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", paddingLeft: 8 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={20} color={iconColor} sw={1.9} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: badgeBg, color: badgeColor }}>{badge}</span>
      </div>
      <div style={{ paddingLeft: 8 }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: "#1a1f2e", letterSpacing: "-1.5px", lineHeight: 1 }}>{value ?? "—"}</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}

// ── Staff Assignment Modal ────────────────────────────────────────────────────
function AssignStaffModal({ request, onConfirm, onCancel }) {
  const [staffList,      setStaffList]      = useState([]);
  const [loadingStaff,   setLoadingStaff]   = useState(true);
  const [selectedStaff,  setSelectedStaff]  = useState(null);
  const [confirming,     setConfirming]     = useState(false);
  const [staffError,     setStaffError]     = useState("");

  const loadStaff = () => {
    setLoadingStaff(true);
    setStaffError("");
    api.get("/api/provider/requests/staff")
      .then(r => {
        setStaffList(r.data);
        if (r.data.length > 0) setSelectedStaff(r.data[0].id);
      })
      .catch(err => {
        const msg = err?.response?.data?.error?.message || "Failed to load staff. Please try again.";
        setStaffError(msg);
      })
      .finally(() => setLoadingStaff(false));
  };

  useEffect(() => { loadStaff(); }, []);

  const handleConfirm = async () => {
    if (!selectedStaff) return;
    setConfirming(true);
    try {
      await onConfirm(request.requestId, request.id, selectedStaff);
    } finally {
      setConfirming(false);
    }
  };

  return (
    // Backdrop
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(15,23,42,0.45)", backdropFilter: "blur(3px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.15s ease",
    }}>
      {/* Modal box */}
      <div style={{
        background: "#fff", borderRadius: 20, width: 480, maxWidth: "calc(100vw - 32px)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.20)",
        animation: "modalIn 0.2s ease",
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{ background: G, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="users" size={18} color="#fff" sw={1.8} />
            </div>
            <div>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>Assign Staff Member</div>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>Select who will handle this job</div>
            </div>
          </div>
          <button onClick={onCancel} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon name="x" size={15} color="#fff" sw={2.2} />
          </button>
        </div>

        {/* Request info strip */}
        <div style={{ padding: "14px 24px", background: "#f8fafc", borderBottom: "1px solid #e8eaf0", display: "flex", gap: 24 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.6px", textTransform: "uppercase" }}>Request</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: G, marginTop: 2 }}>{request.id}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.6px", textTransform: "uppercase" }}>Client</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1f2e", marginTop: 2 }}>{request.company}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.6px", textTransform: "uppercase" }}>Service</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{request.service}</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "22px 24px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>
            Choose a staff member to assign:
          </div>

          {loadingStaff ? (
            <div style={{ padding: "28px 0", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
              Loading staff…
            </div>
          ) : staffError ? (
            <div style={{ padding: "16px", background: "#fef2f2", borderRadius: 10, color: "#dc2626", fontSize: 13, textAlign: "center" }}>
              <div style={{ marginBottom: 10 }}>{staffError}</div>
              <button
                onClick={loadStaff}
                style={{ padding: "6px 16px", borderRadius: 8, border: "1.5px solid #dc2626", background: "#fff", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Retry
              </button>
            </div>
          ) : staffList.length === 0 ? (
            <div style={{ padding: "20px", background: "#fffbeb", borderRadius: 10, color: "#d97706", fontSize: 13, textAlign: "center" }}>
              No active staff found. Please add staff members from My Team first.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto" }}>
              {staffList.map(s => {
                const selected = selectedStaff === s.id;
                return (
                  <div key={s.id}
                    onClick={() => setSelectedStaff(s.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                      border: selected ? `2px solid ${G}` : "2px solid #e8eaf0",
                      background: selected ? "#f0fdf4" : "#fafafa",
                      transition: "all 0.15s",
                    }}>
                    {/* Avatar */}
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                      background: selected ? G : "#e5e7eb",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700,
                      color: selected ? "#fff" : "#6b7280",
                      transition: "all 0.15s",
                    }}>
                      {s.initials}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1a1f2e" }}>{s.fullName}</div>
                      <div style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email}</div>
                    </div>
                    {/* Role badge */}
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: selected ? "#dcfce7" : "#f3f4f6", color: selected ? "#166534" : "#6b7280", flexShrink: 0 }}>
                      {s.role}
                    </span>
                    {/* Check */}
                    {selected && (
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: G, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon name="check" size={11} color="#fff" sw={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f0f1f4", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={confirming}
            style={{ padding: "9px 20px", borderRadius: 9, border: "1.5px solid #e5e7eb", background: "#fff", color: "#6b7280", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming || !selectedStaff || staffList.length === 0 || loadingStaff || !!staffError}
            style={{
              padding: "9px 22px", borderRadius: 9, border: "none",
              background: (!selectedStaff || staffList.length === 0 || loadingStaff || staffError) ? "#d1fae5" : G,
              color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: (!selectedStaff || staffList.length === 0 || confirming || loadingStaff || staffError) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 7,
              opacity: confirming ? 0.75 : 1,
            }}>
            <Icon name="check" size={14} color="#fff" sw={2.5} />
            {confirming ? "Accepting…" : "Accept & Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reject Reason Modal ───────────────────────────────────────────────────────
function RejectModal({ request, onConfirm, onCancel }) {
  const [reason,     setReason]     = useState("");
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm(request.requestId, request.id, reason.trim());
    setConfirming(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(15,23,42,0.45)", backdropFilter: "blur(3px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.15s ease",
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, width: 440, maxWidth: "calc(100vw - 32px)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.20)",
        animation: "modalIn 0.2s ease", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ background: "#dc2626", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="x" size={18} color="#fff" sw={2} />
            </div>
            <div>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>Reject Request</div>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>Optionally provide a reason</div>
            </div>
          </div>
          <button onClick={onCancel} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon name="x" size={15} color="#fff" sw={2.2} />
          </button>
        </div>

        {/* Request strip */}
        <div style={{ padding: "14px 24px", background: "#f8fafc", borderBottom: "1px solid #e8eaf0", display: "flex", gap: 24 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.6px", textTransform: "uppercase" }}>Request</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", marginTop: 2 }}>{request.id}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.6px", textTransform: "uppercase" }}>Client</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1f2e", marginTop: 2 }}>{request.company}</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "22px 24px" }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>
            Reason for rejection <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. Outside our service area, capacity full…"
            rows={3}
            style={{
              width: "100%", padding: "10px 12px", border: "1.5px solid #e5e7eb",
              borderRadius: 10, fontSize: 13, color: "#374151", resize: "vertical",
              fontFamily: "Inter, sans-serif", lineHeight: 1.5,
            }}
            onFocus={e => e.target.style.borderColor = "#dc2626"}
            onBlur={e => e.target.style.borderColor = "#e5e7eb"}
          />
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #f0f1f4", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onCancel} disabled={confirming}
            style={{ padding: "9px 20px", borderRadius: 9, border: "1.5px solid #e5e7eb", background: "#fff", color: "#6b7280", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={confirming}
            style={{ padding: "9px 22px", borderRadius: 9, border: "none", background: "#dc2626", color: "#fff", fontSize: 13, fontWeight: 700, cursor: confirming ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 7, opacity: confirming ? 0.75 : 1 }}>
            <Icon name="x" size={14} color="#fff" sw={2.5} />
            {confirming ? "Rejecting…" : "Confirm Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY = {
  High:   { color: "#dc2626", bg: "#fef2f2" },
  Medium: { color: "#d97706", bg: "#fffbeb" },
  Low:    { color: "#059669", bg: "#ecfdf5" },
};

const STATUS_MAP = {
  pending:     { label: "Pending",     color: "#d97706", bg: "#fffbeb" },
  accepted:    { label: "Accepted",    color: "#059669", bg: "#ecfdf5" },
  rejected:    { label: "Rejected",    color: "#dc2626", bg: "#fef2f2" },
  in_progress: { label: "In Progress", color: "#3b82f6", bg: "#eff6ff" },
  completed:   { label: "Completed",   color: "#2b9d4e", bg: "#ecfdf5" },
  cancelled:   { label: "Cancelled",   color: "#6b7280", bg: "#f3f4f6" },
};

const PAGE_SIZE = 10;

export default function IncomingRequests() {
  // ── user ──
  const user     = getUser();
  const fullName = user?.fullName || "Service Provider";
  const initials = fullName.split(" ").filter(Boolean).map(w => w[0].toUpperCase()).join("").slice(0, 2) || "SP";

  // ── data ──
  const [requests,   setRequests]   = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── filters ──
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page,   setPage]   = useState(1);

  // ── modals ──
  const [acceptModal, setAcceptModal] = useState(null); // request object
  const [rejectModal, setRejectModal] = useState(null); // request object

  // ── toast ──
  const [toast, setToast] = useState(null);

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── fetch ──
  const fetchAll = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    else setLoading(true);
    try {
      // Run both independently so one failure doesn't block the other
      const [reqResult, statsResult] = await Promise.allSettled([
        api.get("/api/provider/requests"),
        api.get("/api/provider/requests/stats"),
      ]);
      if (reqResult.status === "fulfilled") {
        setRequests(reqResult.value.data);
      }
      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value.data);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(1); }, [filter, search]);

  // Manual refresh — shows toast only when user explicitly clicks
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [reqResult, statsResult] = await Promise.allSettled([
        api.get("/api/provider/requests"),
        api.get("/api/provider/requests/stats"),
      ]);
      if (reqResult.status === "fulfilled") setRequests(reqResult.value.data);
      if (statsResult.status === "fulfilled") setStats(statsResult.value.data);
      if (reqResult.status === "rejected" && statsResult.status === "rejected") {
        showToast("Failed to refresh. Please try again.", "error");
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  // ── accept (with staff assignment) ──
  const handleAcceptConfirm = async (requestId, displayId, staffId) => {
    try {
      const res = await api.patch(`/api/provider/requests/${requestId}/accept`, { staffId });
      const wasPending = !res.data.alreadyAccepted;
      // Update local state immediately — no background re-fetch (avoids ghost toasts)
      setRequests(prev => prev.map(r =>
        r.requestId === requestId
          ? { ...r, status: "accepted", assignedStaffId: res.data.assignedStaffId }
          : r
      ));
      setStats(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          pending:  wasPending ? prev.pending - 1  : prev.pending,
          accepted: wasPending ? prev.accepted + 1 : prev.accepted,
        };
      });
      setAcceptModal(null);
      showToast(`Request ${displayId} accepted and staff assigned`, "success");
    } catch (e) {
      const msg = e?.response?.data?.error?.message || "Failed to accept request";
      showToast(msg, "error");
    }
  };

  // ── reject (with reason) ──
  const handleRejectConfirm = async (requestId, displayId, reason) => {
    try {
      await api.patch(`/api/provider/requests/${requestId}/reject`, { reason });
      setRequests(prev => prev.map(r =>
        r.requestId === requestId ? { ...r, status: "rejected" } : r
      ));
      setStats(prev => prev ? { ...prev, pending: prev.pending - 1, rejected: prev.rejected + 1 } : prev);
      setRejectModal(null);
      showToast(`Request ${displayId} rejected`, "error");
    } catch (e) {
      const msg = e?.response?.data?.error?.message || "Failed to reject request";
      showToast(msg, "error");
    }
  };

  // ── filter + search ──
  const filtered = requests.filter(r => {
    const matchFilter = filter === "all" || r.status === filter;
    const matchSearch = !search.trim() ||
      r.company.toLowerCase().includes(search.toLowerCase()) ||
      r.service.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const STATS = [
    { label: "Total Requests", value: stats?.total,    icon: "inbox",    accentColor: "#3b82f6", iconBg: "#eff6ff", iconColor: "#3b82f6", badge: "All",      badgeBg: "#eff6ff", badgeColor: "#2563eb" },
    { label: "Pending Review", value: stats?.pending,  icon: "clock",    accentColor: "#f59e0b", iconBg: "#fffbeb", iconColor: "#f59e0b", badge: "Action",   badgeBg: "#fffbeb", badgeColor: "#d97706" },
    { label: "Accepted",       value: stats?.accepted, icon: "checkAll", accentColor: G,         iconBg: "#ecfdf5", iconColor: G,         badge: "Approved", badgeBg: "#ecfdf5", badgeColor: "#059669" },
    { label: "Rejected",       value: stats?.rejected, icon: "x",        accentColor: "#ef4444", iconBg: "#fef2f2", iconColor: "#ef4444", badge: "Declined", badgeBg: "#fef2f2", badgeColor: "#dc2626" },
  ];

  const TABS = [
    { id: "all",         label: `All (${stats?.total      ?? "—"})` },
    { id: "pending",     label: `Pending (${stats?.pending    ?? "—"})` },
    { id: "accepted",    label: `Accepted (${stats?.accepted   ?? "—"})` },
    { id: "in_progress", label: `In Progress (${stats?.inProgress ?? "—"})` },
    { id: "completed",   label: `Completed (${stats?.completed  ?? "—"})` },
    { id: "rejected",    label: `Rejected (${stats?.rejected   ?? "—"})` },
  ];

  const handleExport = () => {
    const rows = [
      ["Request ID", "Company", "Service", "Date", "Priority", "Status", "Location"],
      ...filtered.map(r => [r.id, r.company, r.service, r.date, r.priority, r.status, r.location]),
    ];
    const csv  = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "incoming_requests.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: "100vh", background: BG }}>

        {/* MODALS */}
        {acceptModal && (
          <AssignStaffModal
            request={acceptModal}
            onConfirm={handleAcceptConfirm}
            onCancel={() => setAcceptModal(null)}
          />
        )}
        {rejectModal && (
          <RejectModal
            request={rejectModal}
            onConfirm={handleRejectConfirm}
            onCancel={() => setRejectModal(null)}
          />
        )}

        {/* TOAST */}
        {toast && (
          <div style={{
            position: "fixed", top: 20, right: 24, zIndex: 999,
            background: toast.type === "success" ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${toast.type === "success" ? "#6ee7b7" : "#fca5a5"}`,
            color: toast.type === "success" ? "#065f46" : "#991b1b",
            padding: "12px 20px", borderRadius: 12, fontSize: 13.5, fontWeight: 600,
            boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
            display: "flex", alignItems: "center", gap: 10,
            animation: "fadeIn 0.2s ease",
          }}>
            <Icon name={toast.type === "success" ? "check" : "x"} size={16}
              color={toast.type === "success" ? "#059669" : "#dc2626"} sw={2.5} />
            {toast.msg}
          </div>
        )}

        {/* TOP NAV */}
        <nav style={{ height: 62, background: G, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 12px rgba(0,0,0,0.10)", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="inbox" size={17} color="#fff" sw={1.9} />
            </div>
            <div>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px" }}>Incoming Requests</div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, letterSpacing: "0.8px", textTransform: "uppercase" }}>Service Operations</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <Icon name="search" size={13} color="rgba(255,255,255,0.5)" sw={2} />
              </span>
              <input
                placeholder="Search requests…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ background: "rgba(255,255,255,0.13)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 8, padding: "7px 14px 7px 30px", color: "#fff", fontSize: 13, width: 185 }}
              />
            </div>
            <div style={{ position: "relative", width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.13)", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Icon name="bell" size={15} color="#fff" sw={1.8} />
              {(stats?.pending ?? 0) > 0 && (
                <span style={{ position: "absolute", top: 0, right: 0, width: 8, height: 8, background: "#f59e0b", borderRadius: "50%", border: `2px solid ${G}` }} />
              )}
            </div>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "2px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {initials}
            </div>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 500, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fullName}</span>
          </div>
        </nav>

        {/* CONTENT */}
        <div style={{ padding: "28px 30px", maxWidth: 1300, margin: "0 auto" }}>

          {/* Page heading */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 26 }}>
            <div>
              <h1 style={{ fontSize: 23, fontWeight: 800, color: "#1a1f2e", letterSpacing: "-0.5px" }}>Incoming Requests</h1>
              <p style={{ fontSize: 13.5, color: "#6b7280", marginTop: 4 }}>Review and respond to all incoming service requests from B2B clients.</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleExport}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${G}`, background: "#fff", color: G, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f0fdf4"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                <Icon name="download" size={14} color={G} sw={2} /> Export
              </button>
              <button onClick={handleRefresh} disabled={refreshing}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 9, border: "none", background: G, color: "#fff", fontSize: 13, fontWeight: 600, cursor: refreshing ? "not-allowed" : "pointer", opacity: refreshing ? 0.75 : 1 }}
                onMouseEnter={e => { if (!refreshing) e.currentTarget.style.opacity = "0.88"; }}
                onMouseLeave={e => e.currentTarget.style.opacity = refreshing ? "0.75" : "1"}>
                <span style={{ display: "inline-block", animation: refreshing ? "spin 0.8s linear infinite" : "none" }}>
                  <Icon name="refresh" size={14} color="#fff" sw={2} />
                </span>
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>

          {/* Stat Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginBottom: 24 }}>
            {STATS.map(s => <StatCard key={s.label} {...s} />)}
          </div>

          {/* Table Card */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8eaf0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", overflow: "hidden" }}>

            {/* Toolbar */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f0f1f4", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ position: "relative", minWidth: 260 }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
                  <Icon name="search" size={14} color="#9ca3af" sw={2} />
                </span>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by company, service or ID…"
                  style={{ width: "100%", paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: "1px solid #e5e7eb", borderRadius: 9, fontSize: 13, color: "#374151", background: "#f9fafb" }} />
              </div>
              <div style={{ display: "flex", gap: 4, marginLeft: "auto", flexWrap: "wrap" }}>
                {TABS.map(t => (
                  <button key={t.id} onClick={() => setFilter(t.id)}
                    style={{ padding: "7px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, background: filter === t.id ? G : "#f3f4f6", color: filter === t.id ? "#fff" : "#6b7280", transition: "all 0.15s" }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f0f1f4" }}>
                    {["Request ID", "Company", "Service Type", "Date", "Priority", "Status", "Actions"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.6px", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "52px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
                        Loading requests…
                      </td>
                    </tr>
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "52px 20px", textAlign: "center" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Icon name="inbox" size={20} color="#d1d5db" sw={1.6} />
                          </div>
                          <span style={{ fontSize: 14, color: "#9ca3af" }}>No requests found</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((r, i) => {
                      const st = STATUS_MAP[r.status] || STATUS_MAP.pending;
                      const pr = PRIORITY[r.priority] || PRIORITY.Medium;
                      const isPending = r.status === "pending";
                      return (
                        <tr key={r.requestId}
                          style={{ borderBottom: i < paginated.length - 1 ? "1px solid #f3f4f6" : "none", transition: "background 0.12s" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                          {/* ID */}
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: G }}>{r.id}</span>
                          </td>

                          {/* Company */}
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <Icon name="building" size={14} color={G} sw={1.9} />
                              </div>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1f2e" }}>{r.company}</div>
                                {r.location && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{r.location}</div>}
                              </div>
                            </div>
                          </td>

                          {/* Service */}
                          <td style={{ padding: "14px 16px", fontSize: 13, color: "#6b7280" }}>{r.service}</td>

                          {/* Date */}
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontSize: 12.5, color: "#374151", whiteSpace: "nowrap" }}>{r.date}</div>
                            <div style={{ fontSize: 11, color: "#9ca3af" }}>{r.createdAgo}</div>
                          </td>

                          {/* Priority */}
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: pr.color, background: pr.bg }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: pr.color }} />
                              {r.priority}
                            </span>
                          </td>

                          {/* Status */}
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: st.color, background: st.bg }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.color }} />
                              {st.label}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {isPending ? (
                                <>
                                  <button
                                    onClick={() => setAcceptModal(r)}
                                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "none", background: "#ecfdf5", color: "#059669", fontSize: 12.5, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}
                                    onMouseEnter={e => { e.currentTarget.style.background = G; e.currentTarget.style.color = "#fff"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "#ecfdf5"; e.currentTarget.style.color = "#059669"; }}>
                                    <Icon name="check" size={13} color="currentColor" sw={2.5} />
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => setRejectModal(r)}
                                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 8, border: "none", background: "#fef2f2", color: "#dc2626", fontSize: 12.5, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "#dc2626"; e.currentTarget.style.color = "#fff"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#dc2626"; }}>
                                    <Icon name="x" size={13} color="currentColor" sw={2.5} />
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <span style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>
                                  {r.status === "accepted"     ? "✓ Accepted"
                                  : r.status === "rejected"    ? "✗ Rejected"
                                  : r.status === "in_progress" ? "⟳ In Progress"
                                  : r.status === "completed"   ? "✓ Completed"
                                  : r.status}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div style={{ padding: "13px 20px", borderTop: "1px solid #f0f1f4", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12.5, color: "#9ca3af" }}>
                Showing {paginated.length} of {filtered.length} requests
              </span>
              <div style={{ display: "flex", gap: 5 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", color: page === 1 ? "#d1d5db" : "#6b7280", fontSize: 12.5, cursor: page === 1 ? "not-allowed" : "pointer" }}>
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #e5e7eb", background: page === p ? G : "#fff", color: page === p ? "#fff" : "#6b7280", fontSize: 12.5, fontWeight: page === p ? 700 : 400, cursor: "pointer" }}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #e5e7eb", background: "#fff", color: page === totalPages ? "#d1d5db" : "#6b7280", fontSize: 12.5, cursor: page === totalPages ? "not-allowed" : "pointer" }}>
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}