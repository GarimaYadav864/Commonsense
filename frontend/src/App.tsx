
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";

import DashboardLayout from "./layouts/DashboardLayout";

import RequesterDashboard from "./pages/requester/RequesterDashboard";
import CreateRequestPage from "./pages/requester/CreateRequestPage";
import MyRequestsPage from "./pages/requester/MyRequestsPage";
import RequesterOffersPage from "./pages/requester/RequesterOffersPage";
import DeliveryTrackingPage from "./pages/requester/DeliveryTrackingPage";

import ProviderDashboard from "./pages/provider/ProviderDashboard";
import ProviderResourcesPage from "./pages/provider/ProviderResourcesPage";
import ProviderOffersPage from "./pages/provider/ProviderOffersPage";
import ProviderDeliveriesPage from "./pages/provider/ProviderDeliveriesPage";

import VolunteerDashboard from "./pages/volunteer/VolunteerDashboard";
import VolunteerDeliveriesPage from "./pages/volunteer/VolunteerDeliveriesPage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminMonitoring from "./pages/admin/AdminMonitoring";
import AdminRecords from "./pages/admin/AdminRecords";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminReports from "./pages/admin/AdminReports";

import NotificationHistoryPage from "./pages/notifications/NotificationHistoryPage";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";

function AppRoutes() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Requester workspace */}
      <Route element={<ProtectedRoute allowedRoles={["requester"]} />}>
        <Route path="/requester" element={<DashboardLayout />}>
          <Route index element={<RequesterDashboard />} />
          <Route path="dashboard" element={<RequesterDashboard />} />
          <Route path="requests" element={<MyRequestsPage />} />
          <Route path="requests/new" element={<CreateRequestPage />} />
          <Route path="offers" element={<RequesterOffersPage />} />
          <Route path="deliveries" element={<DeliveryTrackingPage />} />
        </Route>
      </Route>

      {/* Provider workspace */}
      <Route element={<ProtectedRoute allowedRoles={["provider"]} />}>
        <Route path="/provider" element={<DashboardLayout />}>
          <Route index element={<ProviderDashboard />} />
          <Route path="dashboard" element={<ProviderDashboard />} />
          <Route path="resources" element={<ProviderResourcesPage />} />
          <Route path="offers" element={<ProviderOffersPage />} />
          <Route path="deliveries" element={<ProviderDeliveriesPage />} />
        </Route>
      </Route>

      {/* Volunteer workspace */}
      <Route element={<ProtectedRoute allowedRoles={["volunteer"]} />}>
        <Route path="/volunteer" element={<DashboardLayout />}>
          <Route index element={<VolunteerDashboard />} />
          <Route path="dashboard" element={<VolunteerDashboard />} />
          <Route path="deliveries" element={<VolunteerDeliveriesPage />} />
        </Route>
      </Route>

      {/* Shared notifications */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={["requester", "provider", "volunteer", "admin"]}
          />
        }
      >
        <Route path="/notifications" element={<DashboardLayout />}>
          <Route index element={<NotificationHistoryPage />} />
        </Route>
      </Route>

      {/* Admin workspace */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route path="/admin" element={<DashboardLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="monitoring" element={<AdminMonitoring />} />
          <Route path="records" element={<AdminRecords />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>
      </Route>

      {/* Unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
