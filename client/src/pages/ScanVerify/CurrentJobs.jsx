import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProviderStaffSidebar from "../../components/ProviderStaffSidebar";
import { scan, getUser, apiErrorMessage } from "../../api/client";
import "./ScanVerifyPage.css";

// Colors
const G = "#3db546";
const G_SOFT = "#f0fdf4";
const BG = "#f4f5f7";

export default function ProviderDashboard() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;
        scan.jobs()
            .then((data) => { if (!cancelled) setJobs(data); })
            .catch((err) => { if (!cancelled) setError(apiErrorMessage(err)); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, []);

    const me = getUser();

    const handleStartVerification = (job) => {
        const params = new URLSearchParams({ requestId: job.requestId });
        if (job.poNumber) params.set("po", job.poNumber);
        navigate(`/provider/scan?${params.toString()}`);
    };

    return (
        <div className="layout-container">
            <ProviderStaffSidebar activeItem="jobs" isOpen={isSidebarOpen} />
            {isSidebarOpen && <div className="staff-sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />}

            <div className="body-row">
                <main className="staff-main-content" style={{ background: BG }}>
                    <div style={{
                        display: "flex",
                        justifyContent: "center",
                        paddingTop: 60,
                        paddingBottom: 60,
                        fontFamily: "sans-serif",
                    }}>
                        <div style={{ width: 500 }}>

                            {/* Title */}
                            <h1 style={{ fontSize: 28, fontWeight: "bold", marginBottom: 20 }}>
                                Service Provider Dashboard
                            </h1>

                            {/* Active Operations */}
                            <h3 style={{ marginBottom: 20 }}>
                                Active Operations ({jobs.length})
                            </h3>

                            {loading && <p style={{ color: "#6B7280" }}>Loading…</p>}
                            {error && (
                                <div style={{ padding: "10px 12px", background: "#fee2e2", color: "#991b1b", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                                    {error}
                                </div>
                            )}
                            {!loading && !error && jobs.length === 0 && (
                                <p style={{ color: "#6B7280" }}>No assigned jobs.</p>
                            )}

                            {jobs.map((job) => (
                                <div
                                    key={job.requestId}
                                    style={{
                                        background: "#fff",
                                        padding: 20,
                                        borderRadius: 12,
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                                        marginBottom: 16,
                                    }}
                                >
                                    {/* ID + Status */}
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        <strong>{job.poNumber || job.requestId}</strong>
                                        <span
                                            style={{
                                                background: "#e8f4fd",
                                                padding: "4px 10px",
                                                borderRadius: 20,
                                                fontSize: 12,
                                            }}
                                        >
                                            {job.status}
                                        </span>
                                    </div>

                                    {/* Info */}
                                    <div style={{ marginTop: 10, color: "#555" }}>
                                        <div>📅 {job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : "—"}</div>
                                        <div>📍 {job.siteLabel || job.clientName}</div>
                                        <div style={{ fontSize: 13, marginTop: 4 }}>{job.serviceType}</div>
                                    </div>

                                    {/* Assigned */}
                                    <div style={{ marginTop: 15 }}>
                                        Assigned to: <strong>{me?.fullName || "you"}</strong>
                                    </div>

                                    {/* Button */}
                                    <button
                                        onClick={() => handleStartVerification(job)}
                                        style={{
                                            marginTop: 20,
                                            width: "100%",
                                            padding: 12,
                                            background: G,
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: 8,
                                            fontWeight: "bold",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Start Verification →
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}