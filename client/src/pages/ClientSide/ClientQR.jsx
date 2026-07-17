import React, { useState, useEffect } from 'react';
import { Plus, Download, Printer, Eye, MapPin, QrCode, Loader2, AlertCircle } from 'lucide-react';
import './ClientQR.css';
import { locations, apiErrorMessage, getUser } from '../../api/client';

// ── Icons Helper ──
const Ico = ({ n, s = 15, c = "#fff" }) => {
  const icons = {
    qrcode: <QrCode size={s} color={c} />,
  };
  return icons[n] || null;
};

// ── Top Navbar Style ──
const TopNavbar = ({ title, icon }) => {
  const user = getUser();
  const G = "#2b9d4e";
  return (
    <nav style={{
      width: "calc(100% - 240px)", height: 60, background: G, padding: "0 28px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      position: "fixed", top: 0, left: 240, zIndex: 100,
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)", boxSizing: "border-box",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.12)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Ico n={icon} s={16} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ color: "#fff", fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px", lineHeight: 1.2 }}>{title}</span>
          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>CLIENT PORTAL</span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "2px solid rgba(255,255,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 600 }}>
          {user?.fullName?.substring(0,2).toUpperCase() || "AC"}
        </div>
        <span style={{ color: "#fff", fontSize: 13, fontWeight: 500 }}>{user?.fullName || "Asset Owner"}</span>
      </div>
    </nav>
  );
};

export default function ClientQR() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: '', address: '' });
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const data = await locations.list();
      setBranches(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAddBranch = async (e) => {
    e.preventDefault();
    if (newBranch.name && newBranch.address) {
      try {
        setSubmitting(true);
        const created = await locations.create(newBranch.name, newBranch.address);
        setBranches([created, ...branches]);
        setNewBranch({ name: '', address: '' });
        setIsFormOpen(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } catch (err) {
        alert(apiErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    }
  };

  const getQRSource = (branch) => {
    return branch.qrPng || `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(branch.siteToken)}`;
  };

  const handlePrint = (branch) => {
    const qrUrl = getQRSource(branch);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Print QR - ${branch.label}</title></head>
          <body style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; text-align: center; padding: 20px;">
            <h1 style="color: #2b9d4e; margin-bottom: 10px;">${branch.label}</h1>
            <p style="color: #666; font-size: 18px; margin-bottom: 30px;">${branch.address}</p>
            <div style="border: 1px solid #eee; padding: 20px; border-radius: 10px;">
              <img src="${qrUrl}" style="width: 300px; height: 300px;" />
            </div>
            <p style="margin-top: 30px; font-weight: bold; color: #1a1a1a;">BiVerify Compliance System</p>
            <script>
              window.onload = function() { 
                setTimeout(() => {
                  window.print(); 
                  window.close();
                }, 500);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownload = (branch) => {
    const qrUrl = getQRSource(branch);
    fetch(qrUrl)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `QR_${branch.label.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(err => console.error('Download failed:', err));
  };

  const handleView = (branch) => {
    const qrUrl = getQRSource(branch);
    const viewWindow = window.open('', '_blank');
    if (viewWindow) {
      viewWindow.document.write(`
        <html>
          <head><title>View QR - ${branch.label}</title></head>
          <body style="margin:0; display:flex; align-items:center; justify-content:center; height:100vh; background:#111; font-family: sans-serif;">
            <div style="text-align:center;">
              <img src="${qrUrl}" style="width: 400px; height: 400px; background:#fff; padding:20px; border-radius:12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />
              <div style="color:#fff; margin-top:20px; font-size:18px; font-weight:600;">${branch.label}</div>
              <div style="color:rgba(255,255,255,0.5); margin-top:5px; font-size:14px;">${branch.address}</div>
            </div>
          </body>
        </html>
      `);
      viewWindow.document.close();
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f6fa' }}>
      <TopNavbar title="ClientQR" icon="qrcode" />
      <main style={{ marginTop: 60, padding: '32px', boxSizing: 'border-box' }}>
        <div className="client-qr-container" style={{ padding: 0, maxWidth: 'none', margin: 0 }}>
          <div className="page-header">
            <div>
              <p className="page-subtitle">Manage branch locations and static verification QR codes.</p>
            </div>
            {!isFormOpen && (
              <button className="btn-add-branch" onClick={() => setIsFormOpen(true)} disabled={loading}>
                <Plus size={18} />
                <span>Add New Branch</span>
              </button>
            )}
          </div>

          {showSuccess && (
            <div className="success-banner">
              <QrCode size={18} />
              <span>New branch added and QR code generated successfully!</span>
            </div>
          )}

          {isFormOpen && (
            <div className="form-card">
              <h2 className="form-card-title">Register New Branch Location</h2>
              <form className="branch-form" onSubmit={handleAddBranch}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Branch Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. North Regional Office" 
                      value={newBranch.name} 
                      onChange={(e) => setNewBranch({...newBranch, name: e.target.value})}
                      className="input-field" 
                      required 
                      disabled={submitting}
                    />
                  </div>
                  <div className="form-group">
                    <label>Full Address</label>
                    <input 
                      type="text" 
                      placeholder="123 Street, City, State" 
                      value={newBranch.address} 
                      onChange={(e) => setNewBranch({...newBranch, address: e.target.value})}
                      className="input-field" 
                      required 
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={() => setIsFormOpen(false)} disabled={submitting}>Cancel</button>
                  <button type="submit" className="btn-create" disabled={submitting}>
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : "Create Branch"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {error && (
            <div className="error-state" style={{ background: '#fee2e2', color: '#b91c1c', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={20} />
              <span>{error}</span>
              <button onClick={fetchBranches} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#b91c1c', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
            </div>
          )}

          {loading ? (
            <div className="loading-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#6b7280' }}>
              <Loader2 className="animate-spin" size={40} style={{ marginBottom: '16px', color: '#2b9d4e' }} />
              <p>Loading your branch locations...</p>
            </div>
          ) : (
            <div className="qr-grid">
              {branches.map((branch) => (
                <div className="qr-card" key={branch.id}>
                  <div className="qr-header">
                    <h3 className="qr-title">{branch.label}</h3>
                    <p className="qr-address"><MapPin size={14} /> {branch.address}</p>
                  </div>
                  <div className="qr-image-container">
                    <img src={getQRSource(branch)} alt={`QR for ${branch.label}`} />
                  </div>
                  <div className="qr-actions">
                    <button className="btn-qr-action" onClick={() => handleDownload(branch)} title="Download PNG">
                      <Download size={16} />
                      <span>Download</span>
                    </button>
                    <button className="btn-qr-action" onClick={() => handlePrint(branch)} title="Print Label">
                      <Printer size={16} />
                      <span>Print</span>
                    </button>
                    <button className="btn-qr-action" onClick={() => handleView(branch)} title="View Full Image">
                      <Eye size={16} />
                      <span>View</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && branches.length === 0 && !isFormOpen && (
            <div className="empty-state">
              <div className="empty-icon-wrapper">
                <QrCode size={48} />
              </div>
              <p className="empty-text">No branch locations registered yet. Click "Add New Branch" to get started.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}