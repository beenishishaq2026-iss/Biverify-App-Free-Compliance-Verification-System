import React, { useState, useEffect } from 'react';
import { UserPlus, Users, Trash2, Mail, Shield, Eye, EyeOff } from 'lucide-react';
import { team as teamApi, clientDashboard, apiErrorMessage } from '../../api/client';
import './MyTeam.css';

// ─────────────────────────────────────────────────────────────────────────────
//  Role label map
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_LABEL = {
  client_staff:       'Client Staff',
  compliance_officer: 'Compliance Officer',
  org_admin:          'Org Admin',
};

// Users icon for the nav
const UsersNavIcon = () => (
  <svg
    width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="#ffffff" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ display: 'block', flexShrink: 0 }}
  >
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
    <path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Top Navbar — accepts navInfo prop for real org data
// ─────────────────────────────────────────────────────────────────────────────
const TopNavbar = ({ title, navInfo, loadingNav }) => {
  const G = '#2b9d4e';

  // Build initials from org name for the avatar
  const initials = navInfo?.orgName
    ? navInfo.orgName.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase()
    : '…';

  return (
    <nav style={{
      width: 'calc(100% - 240px)', height: 60, background: G, padding: '0 28px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'fixed', top: 0, left: 240, zIndex: 100,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)', boxSizing: 'border-box',
    }}>
      {/* Left: icon + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36, height: 36,
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 9,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <UsersNavIcon />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
            {title}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>CLIENT PORTAL</span>
        </div>
      </div>

      {/* Right: avatar + org name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Avatar — initials from real org name */}
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'rgba(255,255,255,0.18)',
          border: '2px solid rgba(255,255,255,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 12, fontWeight: 600,
          flexShrink: 0, letterSpacing: '0.3px',
        }}>
          {loadingNav ? '…' : initials}
        </div>

        {/* Org name — real data, skeleton while loading */}
        {loadingNav ? (
          <span style={{
            display: 'inline-block', width: 90, height: 14,
            borderRadius: 4,
            background: 'rgba(255,255,255,0.2)',
            animation: 'navPulse 1.4s infinite',
          }}/>
        ) : navInfo?.orgName ? (
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
            {navInfo.orgName}
          </span>
        ) : null}
      </div>

      {/* Keyframe for the loading skeleton */}
      <style>{`
        @keyframes navPulse {
          0%,100% { opacity: 0.4; }
          50%      { opacity: 0.8; }
        }
      `}</style>
    </nav>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────────────────────────────────────
export default function MyTeam() {
  const [isFormOpen,   setIsFormOpen]   = useState(false);
  const [teamMembers,  setTeamMembers]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showSuccess,  setShowSuccess]  = useState(false);
  const [error,        setError]        = useState('');
  const [submitting,   setSubmitting]   = useState(false);

  // Form fields
  const [fullName,     setFullName]     = useState('');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [role,         setRole]         = useState('client_staff');
  const [showPassword, setShowPassword] = useState(false);

  // Navbar org data
  const [navInfo,    setNavInfo]    = useState(null);
  const [loadingNav, setLoadingNav] = useState(true);

  // ── Load org info for navbar ───────────────────────────────────────────────
  useEffect(() => {
    setLoadingNav(true);
    clientDashboard.me()
      .then(data  => setNavInfo(data))
      .catch(()   => setNavInfo({ orgName: '', siteLabel: '' }))
      .finally(() => setLoadingNav(false));
  }, []);

  // ── Load team ─────────────────────────────────────────────────────────────
  const loadTeam = () => {
    setLoading(true);
    teamApi.list()
      .then(data  => { setTeamMembers(data); setError(''); })
      .catch(err  => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTeam(); }, []);

  // ── Create member ─────────────────────────────────────────────────────────
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError('');
    if (!fullName || !email || !password) return;
    setSubmitting(true);
    try {
      await teamApi.create({ fullName, email, password, role });
      setIsFormOpen(false);
      setShowSuccess(true);
      setFullName(''); setEmail(''); setPassword(''); setRole('client_staff');
      loadTeam();
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete member ─────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Remove this team member?')) return;
    setError('');
    try {
      await teamApi.remove(id);
      loadTeam();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f0fdf4' }}>
      <TopNavbar title="My Team" navInfo={navInfo} loadingNav={loadingNav} />

      <main style={{ marginTop: 60, padding: '32px', boxSizing: 'border-box' }}>
        <div className="my-team-container" style={{ padding: 0, maxWidth: 'none', margin: 0 }}>

          {/* Header row */}
          <div className="page-header">
            <div>
              <p className="page-subtitle">Manage your organization's login-active personnel.</p>
            </div>
            {!isFormOpen && (
              <button className="btn-add-member" onClick={() => setIsFormOpen(true)}>
                <UserPlus size={18} />
                <span>Add Team Member</span>
              </button>
            )}
          </div>

          {/* Success banner */}
          {showSuccess && !isFormOpen && (
            <div className="success-banner">
              <Shield size={18} className="success-icon" />
              <span>Staff account created successfully!</span>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div style={{
              padding: '10px 14px', background: '#fee2e2', color: '#991b1b',
              borderRadius: 8, marginBottom: 16, fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {/* Create form */}
          {isFormOpen ? (
            <div className="form-card">
              <h2 className="form-card-title">Create New Personnel Account</h2>
              <form className="member-form" onSubmit={handleCreateAccount}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text" placeholder="e.g. John Doe"
                      value={fullName} onChange={e => setFullName(e.target.value)}
                      className="input-field" required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email" placeholder="user@example.com"
                      value={email} onChange={e => setEmail(e.target.value)}
                      className="input-field blue-bg" required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Password</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 6 characters"
                        value={password} onChange={e => setPassword(e.target.value)}
                        className="input-field blue-bg" required
                      />
                      <button
                        type="button" className="password-toggle-btn"
                        onClick={() => setShowPassword(p => !p)} tabIndex="-1"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Assigned Role</label>
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      className="input-field"
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="client_staff">Client Staff</option>
                      <option value="compliance_officer">Compliance Officer</option>
                    </select>
                    <span className="field-hint">Client Staff or Compliance Officer.</span>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={() => setIsFormOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-create" disabled={submitting}>
                    {submitting ? 'Creating…' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>

          ) : (
            /* Team table */
            <div className="table-container">
              <div className="table-header">
                <div className="col-member">Team Member</div>
                <div className="col-role">Role</div>
                <div className="col-status">Status</div>
                <div className="col-actions">Actions</div>
              </div>

              {loading ? (
                <div className="table-body">
                  {[0,1,2].map(i => (
                    <div className="table-row" key={i} style={{ opacity: 0.5 }}>
                      <div className="col-member member-info">
                        <span className="member-name" style={{ background:'#e5e7eb', borderRadius:4, color:'transparent' }}>Loading name</span>
                        <span className="member-email" style={{ background:'#e5e7eb', borderRadius:4, color:'transparent' }}>loading@example.com</span>
                      </div>
                      <div className="col-role"><span className="role-badge" style={{ background:'#e5e7eb', color:'transparent' }}>Role</span></div>
                      <div className="col-status"><span className="status-badge" style={{ background:'#e5e7eb', color:'transparent' }}>Active</span></div>
                      <div className="col-actions"/>
                    </div>
                  ))}
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon-wrapper"><Users size={48} className="empty-icon" /></div>
                  <p className="empty-text">No personnel accounts created for your team yet.</p>
                </div>
              ) : (
                <div className="table-body">
                  {teamMembers.map(member => {
                    const status = member.isActive === false ? 'Inactive' : 'Active';
                    return (
                      <div className="table-row" key={member.id}>
                        <div className="col-member member-info">
                          <span className="member-name">{member.fullName}</span>
                          <span className="member-email"><Mail size={14} />{member.email}</span>
                        </div>
                        <div className="col-role">
                          <span className="role-badge">{ROLE_LABEL[member.role] || member.role}</span>
                        </div>
                        <div className="col-status">
                          <span className={`status-badge ${status.toLowerCase()}`}>
                            <span className="status-dot"/>{status}
                          </span>
                        </div>
                        <div className="col-actions">
                          <button className="btn-icon" onClick={() => handleDelete(member.id)}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}