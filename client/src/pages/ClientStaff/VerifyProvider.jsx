import React, { useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { scan, apiErrorMessage } from "../../api/client";
import ComplianceSidebar from "../../components/ComplianceSidebar";

const G = "#2b9d4e";
const GD = "#1f7a3b";

// ── icon helper (ops icon for navbar)
const Ico = ({ n, s = 15, c = "#fff" }) => {
  const icons = {
    qr: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="2"/></svg>,
  };
  return icons[n] || null;
};

function VerifyProvider() {
  const [currentStep, setCurrentStep] = useState(1);
  const [scanResult, setScanResult]   = useState(null);
  const [verifyError, setVerifyError] = useState("");
  const [cameraOn, setCameraOn]       = useState(false);
  const [scannerInit, setScannerInit] = useState(false);
  const scannerRef   = useRef(null);
  const fileInputRef = useRef(null);

  const handleDecoded = async (decodedText) => {
    await stopCamera();
    setVerifyError("");
    try {
      const res = await scan.booking(decodedText);
      setScanResult(res);
      setCurrentStep(2);
    } catch (err) {
      setVerifyError(apiErrorMessage(err));
    }
  };

  useEffect(() => {
    if (cameraOn && !scannerInit) {
      const html5QrCode = new Html5Qrcode("reader");
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 5, qrbox: 250 },
        (decodedText) => { handleDecoded(decodedText); },
        () => {}
      ).then(() => setScannerInit(true)).catch(console.error);
      scannerRef.current = html5QrCode;
    }
    return () => {
      if (!cameraOn && scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        setScannerInit(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn, scannerInit]);

  const stopCamera    = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
    }
    setCameraOn(false);
  };
  const handleReset    = () => { setCurrentStep(1); setScanResult(null); setVerifyError(""); };

  const handleFileChange = (_e) => {
    // Image-file scanning not wired; user should use camera.
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
        padding: "0 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "fixed", top: 0, left: 240,
        zIndex: 100, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.12)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Ico n="qr" s={16} c="#fff" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px", lineHeight: 1.2 }}>Verify Provider</span>
            <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>ADMIN PORTAL</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "2px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>AO</div>
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>Asset Owner</span>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <div style={{ marginLeft: 240, marginTop: 60, padding: "40px 24px", display: "flex", justifyContent: "center", minHeight: "calc(100vh - 60px)", boxSizing: "border-box" }}>
        <div style={{ width: "100%", maxWidth: 640 }}>

          {currentStep === 1 ? (
            <>
              {/* SCANNER HEADER */}
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{ width: 72, height: 72, background: "rgba(43,157,78,0.10)", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                    <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                    <rect x="7" y="7" width="10" height="10" rx="2"/>
                  </svg>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1A1D23", marginBottom: 8, letterSpacing: "-0.4px" }}>Security Check-In</h2>
                <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>Scan the <strong style={{ color: "#1A1D23" }}>Booking Check-In QR Code</strong> to verify the job being done</p>
              </div>

              {/* SCANNER CARD */}
              <div style={{ position: "relative" }}>
                <div style={{ background: "#fff", borderRadius: 20, border: "1px solid rgba(43,157,78,0.15)", boxShadow: "0 8px 40px rgba(43,157,78,0.12)", overflow: "hidden" }}>

                  <div style={{ background: "rgba(43,157,78,0.06)", padding: "12px 20px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(43,157,78,0.10)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                    <span style={{ fontSize: 12.5, color: "#374151", fontWeight: 500 }}>Position the QR code within the frame to scan</span>
                  </div>

                  <div style={{ padding: "32px 40px", display: "flex", justifyContent: "center" }}>
                    {cameraOn ? (
                      <div style={{ width: "100%" }}>
                        <style>{`
                          #reader { width: 100% !important; }
                          #reader video { width: 100% !important; height: auto !important; display: block !important; border-radius: 12px; }
                          #reader img { display: none !important; }
                        `}</style>
                        <div id="reader" style={{ width: "100%", minHeight: 300, borderRadius: 12, overflow: "hidden" }} />
                      </div>
                    ) : (
                      <div onClick={() => setCameraOn(true)} style={{ position: "relative", width: 240, height: 240, background: "#1a1a1a", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid rgba(43,157,78,0.4)", cursor: "pointer" }}>
                        {[["0","0","border-top","border-left"],["auto","0","border-top","border-right"],["0","auto","border-bottom","border-left"],["auto","auto","border-bottom","border-right"]].map(([t,b,bt,bl], i) => (
                          <div key={i} style={{ position: "absolute", top: t!=="auto"?10:"auto", bottom: b!=="auto"?10:"auto", left: bl==="border-left"?10:"auto", right: bl==="border-right"?10:"auto", width: 28, height: 28, [bt]: `3px solid #4fb96e`, [bl]: `3px solid #4fb96e`, borderRadius: bt==="border-top"&&bl==="border-left"?"4px 0 0 0":bt==="border-top"?"0 4px 0 0":bl==="border-left"?"0 0 0 4px":"0 0 4px 0" }} />
                        ))}
                        <style>{`@keyframes scanLine{0%{top:20px}100%{top:215px}}@keyframes pulse{0%,100%{opacity:0.6}50%{opacity:1}}`}</style>
                        <div style={{ position: "absolute", left: 16, right: 16, height: 2, background: `linear-gradient(90deg, transparent, #4fb96e, transparent)`, animation: "scanLine 2s ease-in-out infinite", borderRadius: 1 }} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, opacity: 0.35 }}>
                          {[...Array(4)].map((_, i) => (
                            <div key={i} style={{ width: 52, height: 52, background: G, borderRadius: i < 3 ? 6 : 0, ...(i===3?{background:"transparent",display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}:{}) }}>
                              {i===3 && [...Array(4)].map((_,j)=>(<div key={j} style={{background:G,borderRadius:2}}/>))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: "0 32px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {cameraOn ? (
                      <button onClick={stopCamera} style={{ width: "100%", padding: "13px 20px", background: "#EF4444", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                        Close Camera
                      </button>
                    ) : (
                      <>
                        <button onClick={() => setCameraOn(true)} style={{ width: "100%", padding: "13px 20px", background: G, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(43,157,78,0.3)", transition: "background 0.15s" }}
                          onMouseEnter={e=>e.currentTarget.style.background=GD} onMouseLeave={e=>e.currentTarget.style.background=G}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                          Request Camera Permissions
                        </button>
                        <button onClick={() => fileInputRef.current.click()} style={{ width: "100%", padding: "12px 20px", background: "#fff", color: G, border: `1.5px solid rgba(43,157,78,0.3)`, borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s" }}
                          onMouseEnter={e=>{e.currentTarget.style.background="rgba(43,157,78,0.05)";e.currentTarget.style.borderColor=G}} onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.borderColor="rgba(43,157,78,0.3)"}}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                          Scan an Image File
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div style={{ position: "absolute", inset: 0, borderRadius: 20, background: `radial-gradient(ellipse at 50% 100%, rgba(43,157,78,0.12), transparent 70%)`, pointerEvents: "none", zIndex: -1, filter: "blur(20px)", transform: "translateY(8px)" }} />
              </div>

              {verifyError && (
                <div style={{ marginTop: 16, padding: "12px 16px", background: "#fee2e2", color: "#991b1b", borderRadius: 10, fontSize: 13 }}>
                  {verifyError}
                </div>
              )}
            </>

          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 80, height: 80, background: "rgba(43,157,78,0.12)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", animation: "pulse 2s infinite" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 700, color: "#1A1D23", marginBottom: 8, letterSpacing: "-0.4px" }}>Verification Successful</h2>
              <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 24 }}>Provider has been verified at this location.</p>

              {scanResult && (
                <div style={{ background: "rgba(43,157,78,0.06)", border: "1px solid rgba(43,157,78,0.15)", borderRadius: 12, padding: "14px 20px", marginBottom: 24, textAlign: "left" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Purchase Order</p>
                  <p style={{ fontSize: 14, color: "#1A1D23", fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>{scanResult.poNumber || "—"}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Completed At</p>
                  <p style={{ fontSize: 13, color: "#1A1D23" }}>{scanResult.completedAt ? new Date(scanResult.completedAt).toLocaleString() : "—"}</p>
                </div>
              )}

              <button onClick={handleReset} style={{ background: G, color: "#fff", border: "none", padding: "12px 32px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Inter', sans-serif", boxShadow: "0 4px 14px rgba(43,157,78,0.3)" }}>
                Scan Another
              </button>
            </div>
          )}

          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: "none" }} />
        </div>
      </div>
    </div>
  );
}

export default VerifyProvider;