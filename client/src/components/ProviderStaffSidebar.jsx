import React from 'react';
import { NavLink } from 'react-router-dom';
import { getUser } from '../api/client';

const ROLE_LABEL = {
    super_admin: 'Super Admin', org_admin: 'Org Admin',
    provider_staff: 'Provider Staff', compliance_officer: 'Compliance Officer',
    client_staff: 'Client Staff',
};

const Ico = ({ n, s = 15, c = "#fff" }) => {
    const icons = {
        shield: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
        jobs: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>,
        scan: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><rect x="7" y="7" width="10" height="10" rx="1" /></svg>,
        bell: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>,
        logout: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
        scanqr: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="3" height="3" /><rect x="18" y="14" width="3" height="3" /><rect x="14" y="18" width="3" height="3" /><rect x="18" y="18" width="3" height="3" /></svg>,
        menu: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
        close: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
    };
    return icons[n] || null;
};

const navSections = [
    {
        heading: "SERVICE PROVIDER",
        items: [
            { key: "jobs", icon: "jobs", label: "Current Jobs" },
            { key: "scan", icon: "scan", label: "Scan & Verify" },
        ],
    },
];

const ProviderStaffSideBar = ({ activeItem, isOpen }) => {
    const user = getUser();
    return (
    <aside className={`staff-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="staff-sidebar-header desktop-only">
            <div className="staff-logo-icon"><Ico n="shield" s={18} c="#fff" /></div>
            <h1 className="staff-logo-text">Bi-Verify</h1>
        </div>
        <div className="menu-section">
            {navSections.map((sec, si) => (
                <div key={si}>
                    <p className="menu-title">{sec.heading}</p>
                    <ul className="menu-list">
                        {sec.items.map((item) => (
                            <li key={item.key}>
                                <NavLink
                                    to={`/provider/${item.key}`}
                                    className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <div className="menu-icon">
                                                <Ico n={item.icon} s={16} c={isActive ? "#2b9d4e" : "rgba(255,255,255,0.85)"} />
                                            </div>
                                            <span>{item.label}</span>
                                        </>
                                    )}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
        <div className="staff-sidebar-footer">
            <div className="user-profile">
                <div className="avatar">{(user?.fullName || '?').charAt(0).toUpperCase()}</div>
                <div className="user-info">
                    <p className="user-name">{user?.fullName || 'Guest'}</p>
                    <p className="user-role">{ROLE_LABEL[user?.role] || user?.role || ''}</p>
                </div>
            </div>
            <button
                className="logout-button"
                onClick={() => {
                    localStorage.removeItem("biverify_token");
                    localStorage.removeItem("biverify_user");
                    window.location.assign("/login");
                }}
            >
                <Ico n="logout" s={15} c="white" />
                Logout
            </button>
        </div>
    </aside>
    );
};

export default ProviderStaffSideBar;
