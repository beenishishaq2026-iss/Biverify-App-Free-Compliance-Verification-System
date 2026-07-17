import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import RequireAuth from "./api/RequireAuth.jsx";
import ClientSidebar from "./components/ClientSidebar.jsx";
import ProviderSidebar from "./components/ProviderSidebar.jsx";
import ProviderStaffSidebar from "./components/ProviderStaffSidebar.jsx";
import ScanVerifyPage from "./pages/ScanVerify/ScanVerifyPage.jsx";
import CurrentJobs from "./pages/ScanVerify/CurrentJobs.jsx";
import LandingPage from "./pages/Landing/LandingPage.jsx";
import LoginPage from "./pages/Authentication/LoginPage";
import SignupPage from "./pages/Authentication/SignupPage";
import ForgotPassword from "./pages/Authentication/ForgotPassword";

import ClientDashboard from "./pages/ClientSide/ClientDashboard.jsx";
import B2BNetwork from "./pages/ClientSide/B2BNetwork.jsx";
import ServiceBookings from "./pages/ClientSide/ServiceBookings.jsx";
import ComplianceVault from "./pages/ClientSide/ComplianceVault.jsx";
import ServiceRequest from "./pages/ClientSide/ServiceRequest.jsx";
import PartnerProfile from "./pages/ClientSide/PartnerProfile.jsx";

import ProviderDashboard from "./pages/ProviderSide/ServiceProviderDashboard.jsx";
import ProviderB2BNetwork from "./pages/ProviderSide/ProviderB2BNetwork.jsx";

// Client Pages
import MyTeamClient from "./pages/ClientSide/MyTeam.jsx";
import SystemAuditLogsClient from "./pages/ClientSide/SystemAuditLogs.jsx";
import OrganizationSettingsClient from "./pages/ClientSide/OrganizationSettings.jsx";
import ClientQR from "./pages/ClientSide/ClientQR.jsx";

// Provider Pages
import MyTeamProvider from "./pages/ProviderSide/MyTeam.jsx";
import SystemAuditLogsProvider from "./pages/ProviderSide/SystemAuditLogs.jsx";
import OrganizationSettingsProvider from "./pages/ProviderSide/OrganizationSettings.jsx";
import IncomingRequests from "./pages/ProviderSide/IncomingRequests.jsx";
import ComplianceDocuments from "./pages/ProviderSide/ComplianceDocuments.jsx";
import ServiceProviderDashboard from "./pages/ProviderSide/ServiceProviderDashboard.jsx";

//Admin Client Pages
import ComplianceOperations from "./pages/ClientStaff/ComplianceOperations";
import VerifyProvider from "./pages/ClientStaff/VerifyProvider";
import ServiceOrders from "./pages/ClientStaff/ServiceOrders";

//Admin Dashboard
import AdminDashboard from "./pages/AdminDashboard/Admindashboard";

// ── placeholder pages ──────────────────────────────────
const Soon = ({ label }) => (
  <div style={{ padding: 40, fontFamily: "'DM Sans', sans-serif" }}>
    <h2 style={{ color: "#1A1D23" }}>{label}</h2>
    <p style={{ color: "#6B7280", marginTop: 8 }}>Coming soon</p>
  </div>
);

// ── layout wrapper ───────
// NOTE: Only used for client org_admin and provider org_admin routes.
// Compliance Officer / Client Staff routes manage their own sidebar internally.
function DashboardLayout({ children }) {
  const { pathname } = useLocation();
  const isProvider = pathname.startsWith("/provider");

  return (
    <>
      {isProvider ? <ProviderSidebar /> : <ClientSidebar />}
      <div style={{
        marginLeft: 240,
        minHeight: "100vh",
        background: "#F5F6FA",
        overflowX: "hidden",
        width: "calc(100% - 240px)",
      }}>
        {children}
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Auth Routes ── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* ── Client Org Admin Routes ── */}
        <Route path="/overview" element={<RequireAuth roles={["org_admin"]}><DashboardLayout><ClientDashboard /></DashboardLayout></RequireAuth>} />
        <Route path="/network" element={<RequireAuth roles={["org_admin"]}><DashboardLayout><B2BNetwork /></DashboardLayout></RequireAuth>} />
        <Route path="/Bookings" element={<RequireAuth roles={["org_admin"]}><DashboardLayout><ServiceBookings /></DashboardLayout></RequireAuth>} />
        <Route path="/vault" element={<RequireAuth roles={["org_admin"]}><DashboardLayout><ComplianceVault /></DashboardLayout></RequireAuth>} />
        <Route path="/team" element={<RequireAuth roles={["org_admin"]}><DashboardLayout><MyTeamClient /></DashboardLayout></RequireAuth>} />
        <Route path="/audit" element={<RequireAuth roles={["org_admin"]}><DashboardLayout><SystemAuditLogsClient /></DashboardLayout></RequireAuth>} />
        <Route path="/clientqr" element={<RequireAuth roles={["org_admin"]}><DashboardLayout><ClientQR /></DashboardLayout></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth roles={["org_admin"]}><DashboardLayout><OrganizationSettingsClient /></DashboardLayout></RequireAuth>} />
        <Route path="/new-request" element={<RequireAuth roles={["org_admin"]}><DashboardLayout><ServiceRequest /></DashboardLayout></RequireAuth>} />
        <Route path="/partner"
          element={<RequireAuth roles={["org_admin"]}>
            <DashboardLayout><PartnerProfile /></DashboardLayout>
          </RequireAuth>}
        />

        {/* ── Provider Org Admin Routes ── */}
        <Route path="/provider/overview" element={<RequireAuth roles={["org_admin"]}><DashboardLayout><ServiceProviderDashboard /></DashboardLayout></RequireAuth>} />
        <Route path="/provider/network" element={<RequireAuth roles={["org_admin"]}><DashboardLayout><ProviderB2BNetwork /></DashboardLayout></RequireAuth>} />
        <Route path="/provider/incoming-requests" element={<RequireAuth roles={["org_admin"]}><DashboardLayout><IncomingRequests /></DashboardLayout></RequireAuth>} />
        <Route path="/provider/certifications" element={<RequireAuth roles={["org_admin"]}><DashboardLayout><ComplianceDocuments /></DashboardLayout></RequireAuth>} />
        <Route path="/provider/team" element={<RequireAuth roles={["org_admin"]}><DashboardLayout><MyTeamProvider /></DashboardLayout></RequireAuth>} />
        <Route path="/provider/audit" element={<RequireAuth roles={["org_admin"]}><DashboardLayout><SystemAuditLogsProvider /></DashboardLayout></RequireAuth>} />
        <Route path="/provider/settings" element={<RequireAuth roles={["org_admin"]}><DashboardLayout><OrganizationSettingsProvider /></DashboardLayout></RequireAuth>} />

        {/* ── Compliance Officer / Client Staff Routes ──
            These pages manage their own ComplianceSidebar internally.
            Do NOT wrap them in DashboardLayout — that would inject a second (ClientSidebar) sidebar. */}
        <Route path="/compliance"      element={<RequireAuth roles={["client_staff", "compliance_officer", "org_admin"]}><ComplianceOperations /></RequireAuth>} />
        <Route path="/verify-provider" element={<RequireAuth roles={["client_staff", "compliance_officer", "org_admin"]}><VerifyProvider /></RequireAuth>} />
        <Route path="/service-orders"  element={<RequireAuth roles={["client_staff", "compliance_officer", "org_admin"]}><ServiceOrders /></RequireAuth>} />

        {/* Admin Dashboard */}
        <Route path="/admin-dashboard" element={<RequireAuth roles={["super_admin"]}><AdminDashboard /></RequireAuth>} />

        {/* Provider Staff routes */}
        <Route path="/provider/jobs" element={<RequireAuth roles={["provider_staff"]}><CurrentJobs /></RequireAuth>} />
        <Route path="/provider/scan" element={<RequireAuth roles={["provider_staff"]}><ScanVerifyPage /></RequireAuth>} />

        {/* ── Global Catch-All ── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>

    </BrowserRouter>
  );
}