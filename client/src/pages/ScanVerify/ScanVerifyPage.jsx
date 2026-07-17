import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import './ScanVerifyPage.css';
import ProviderStaffSidebar from '../../components/ProviderStaffSidebar';
import { scan, bookings, apiErrorMessage } from '../../api/client';

const Ico = ({ n, s = 15, c = "#fff" }) => {
  const icons = {
    shield: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    jobs: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
    scan: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><rect x="7" y="7" width="10" height="10" rx="1" /></svg>,
    logout: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
    scanqr: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="3" height="3" /><rect x="18" y="14" width="3" height="3" /><rect x="14" y="18" width="3" height="3" /><rect x="18" y="18" width="3" height="3" /></svg>,
    menu: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
    close: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  };
  return icons[n] || null;
};

const TopNav = ({ onMenuToggle, isSidebarOpen }) => (
  <nav className="top-navbar">
    <div className="navbar-left">
      <button className="navbar-menu-btn" onClick={onMenuToggle}>
        <Ico n={isSidebarOpen ? "close" : "menu"} s={20} c="#fff" />
      </button>
      <div className="navbar-icon-box">
        <Ico n="scanqr" s={16} c="#fff" />
      </div>
      <div className="navbar-titles">
        <span className="navbar-title">Scan &amp; Verify</span>
        <span className="navbar-subtitle">SERVICE PROVIDER</span>
      </div>
    </div>
    <div className="navbar-right">
      <div className="topnav-avatar">s</div>
      <span className="topnav-username">shawn</span>
    </div>
  </nav>
);

const ScanVerifyPage = () => {
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId');
  const poFromQuery = searchParams.get('po') || '';

  const [currentStep, setCurrentStep] = useState(1);
  const [currentTime, setCurrentTime] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState("");
  const [siteLabel, setSiteLabel] = useState("");
  const [bookingQrUrl, setBookingQrUrl] = useState("");
  const scannerRef = useRef(null);

  const stopCamera = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      try { await scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }
    setCameraOn(false);
  };

  const handleSiteScanResult = async (decoded) => {
    if (!requestId) {
      setError("No booking selected. Open this page from Current Jobs.");
      await stopCamera();
      return;
    }
    try {
      const res = await scan.site(decoded, requestId);
      setSiteLabel(res.siteLabel || "site");
      setCurrentTime(new Date(res.startedAt).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
      }));
      await stopCamera();
      setCurrentStep(2);
    } catch (err) {
      setError(apiErrorMessage(err));
      await stopCamera();
    }
  };

  useEffect(() => {
    if (currentStep !== 1 || !cameraOn) return;
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;
    let active = true;
    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 240 },
      (decodedText) => { if (active) { active = false; handleSiteScanResult(decodedText); } },
      () => {}
    ).catch((e) => setError(apiErrorMessage(e)));
    return () => { active = false; stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn, currentStep]);

  const startCamera = () => { setError(""); setCameraOn(true); };

  const handleAdvanceToHandover = async () => {
    setCurrentStep(3);
    if (requestId && !bookingQrUrl) {
      try {
        const blob = await bookings.qrPngBlob(requestId);
        setBookingQrUrl(URL.createObjectURL(blob));
      } catch (err) {
        setError(apiErrorMessage(err));
      }
    }
  };

  useEffect(() => () => { if (bookingQrUrl) URL.revokeObjectURL(bookingQrUrl); }, [bookingQrUrl]);

  const handleReset = () => {
    stopCamera();
    setCurrentStep(1);
    setCurrentTime("");
    setError("");
    setSiteLabel("");
    setIsSidebarOpen(false);
  };

  return (
    <div className="layout-container">
      <ProviderStaffSidebar activeItem="scan" isOpen={isSidebarOpen} />
      {isSidebarOpen && <div className="staff-sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />}

      <div className="body-row">
        <TopNav onMenuToggle={() => setIsSidebarOpen(p => !p)} isSidebarOpen={isSidebarOpen} />
        <main className="staff-main-content">
          <div className="progress-container">
            <div className="progress-steps">
              <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'success' : ''}`}>
                <div className="step-circle">
                  {currentStep > 1 ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  ) : "1"}
                </div>
              </div>
              <div className={`step-line ${currentStep > 1 ? 'success-line' : ''}`}></div>
              <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'success' : ''}`}>
                <div className="step-circle">
                  {currentStep > 2 ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  ) : "2"}
                </div>
              </div>
              <div className={`step-line ${currentStep > 2 ? 'success-line' : ''}`}></div>
              <div className={`step ${currentStep === 3 ? 'active' : ''}`}>
                <div className="step-circle">3</div>
              </div>
            </div>
          </div>

          <div className="scanner-section">
            {currentStep === 1 && (
              <>
                <div className="scanner-header">
                  <div className="scanner-icon-bg">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2b9d4e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7V5a2 2 0 0 1 2-2h2"></path><path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                      <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path><path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                      <rect x="7" y="7" width="10" height="10" rx="2"></rect>
                    </svg>
                  </div>
                  <h2>Security Check-In</h2>
                  <p className="scanner-subtitle">Scan the <strong>Site QR Code</strong> at the client location to verify your arrival.</p>
                </div>
                <div className="scanner-card-wrapper">
                  <div className="scanner-card">
                    <div className="scanner-info-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>
                      </svg>
                    </div>
                    <div className="scanner-display">
                      {cameraOn ? (
                        <div id="reader" style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <div className="scanner-target">
                          <div className="corner corner-tl"></div><div className="corner corner-tr"></div>
                          <div className="corner corner-bl"></div><div className="corner corner-br"></div>
                          <div className="scanning-animation-line"></div>
                          <div className="qr-elements">
                            <div className="qr-box top-left"></div><div className="qr-box top-right"></div>
                            <div className="qr-box bottom-left"></div><div className="qr-dots"></div>
                          </div>
                        </div>
                      )}
                    </div>
                    {error && (
                      <div style={{ margin: '12px 0', padding: '10px 12px', background: '#fee2e2', color: '#991b1b', borderRadius: 8, fontSize: 13 }}>
                        {error}
                      </div>
                    )}
                    {!requestId && (
                      <div style={{ margin: '12px 0', padding: '10px 12px', background: '#fef3c7', color: '#92400e', borderRadius: 8, fontSize: 13 }}>
                        Open this page from Current Jobs to start a scan.
                      </div>
                    )}
                    <div className="scanner-actions">
                      <button className="btn-primary" onClick={startCamera} disabled={cameraOn || !requestId}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle>
                        </svg>
                        {cameraOn ? 'Scanning…' : 'Request Camera Permissions'}
                      </button>
                    </div>
                  </div>
                  <div className="card-glow"></div>
                </div>
              </>
            )}

            {currentStep === 2 && (
              <div className="verified-card-wrapper">
                <div className="verified-card">
                  <div className="verified-icon-container">
                    <div className="verified-icon-bg">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                    </div>
                  </div>
                  <h2 className="verified-title">Arrival Verified</h2>
                  <p className="verified-subtitle">You are checked in at <strong>{siteLabel || 'site'}</strong>.<br />Please complete the scheduled tasks.</p>
                  <div className="time-block">
                    <p className="time-label">CHECK-IN TIME</p>
                    <p className="time-value">{currentTime}</p>
                  </div>
                  <button className="btn-success-full" onClick={handleAdvanceToHandover}>Perform Completion Handover</button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="completion-container">
                <div className="completion-header">
                  <h2>Service Completion</h2>
                  <p className="completion-subtitle">Present this QR code to the Client Staff to verify work completion.</p>
                </div>
                <div className="qr-card-large">
                  <div className="qr-image-container">
                    <div className="qr-placeholder">
                      {bookingQrUrl ? (
                        <img
                          src={bookingQrUrl}
                          alt="Booking QR"
                          style={{ width: 220, height: 220, display: 'block' }}
                        />
                      ) : (
                        <p style={{ color: '#6b7280' }}>Loading QR…</p>
                      )}
                    </div>
                  </div>
                  <div className="qr-details">
                    <p className="po-number">{poFromQuery || '—'}</p>
                    <p className="scan-instruction">Scan to Verify Completion</p>
                  </div>
                </div>
                <button className="finish-button" onClick={handleReset}>Finish Simulation (Back to Home)</button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ScanVerifyPage;