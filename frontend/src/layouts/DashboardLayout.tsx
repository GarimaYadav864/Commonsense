import { useEffect, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Package,
  Truck,
  Bell,
  LogOut,
  Menu,
  X,
  HandHeart,
  Handshake,
  Users,
  ChartNoAxesCombined,
  ShieldCheck,
  History,
  FileBarChart,
  Scale,
} from "lucide-react";

import { useAuth, type UserRole } from "../context/AuthContext";
import NotificationCenter from "../components/common/NotificationCenter";
import "./DashboardLayout.css";

type NavigationLink = {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
};

const requesterLinks: NavigationLink[] = [
  { label: "Overview", path: "/requester/dashboard", icon: LayoutDashboard },
  { label: "My Requests", path: "/requester/requests", icon: ClipboardList },
  { label: "Create Request", path: "/requester/requests/new", icon: PlusCircle },
  { label: "Offers", path: "/requester/offers", icon: Package },
  { label: "Deliveries", path: "/requester/deliveries", icon: Truck },
  { label: "Notifications", path: "/notifications", icon: Bell, end: true },
];

const providerLinks: NavigationLink[] = [
  { label: "Dashboard", path: "/provider/dashboard", icon: LayoutDashboard },
  { label: "My Resources", path: "/provider/resources", icon: Package },
  { label: "Incoming Offers", path: "/provider/offers", icon: Handshake },
  { label: "Deliveries", path: "/provider/deliveries", icon: Truck },
  { label: "Notifications", path: "/notifications", icon: Bell, end: true },
];

const volunteerLinks: NavigationLink[] = [
  { label: "Dashboard", path: "/volunteer/dashboard", icon: LayoutDashboard },
  { label: "Deliveries", path: "/volunteer/deliveries", icon: Truck },
  { label: "Notifications", path: "/notifications", icon: Bell, end: true },
];

const adminLinks: NavigationLink[] = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
  { label: "User Management", path: "/admin/users", icon: Users },
  { label: "Platform Monitoring", path: "/admin/monitoring", icon: ChartNoAxesCombined },
  { label: "Requests & Resources", path: "/admin/records", icon: ClipboardList },
  { label: "Audit Logs", path: "/admin/audit-logs", icon: History },
  { label: "Reports & Analytics", path: "/admin/reports", icon: FileBarChart },
  { label: "Damage Disputes", path: "/admin/disputes", icon: Scale },
  { label: "Notifications", path: "/notifications", icon: Bell, end: true },
];

const roleDashboardPaths: Record<UserRole, string> = {
  requester: "/requester/dashboard",
  provider: "/provider/dashboard",
  volunteer: "/volunteer/dashboard",
  admin: "/admin",
};

const roleNames: Record<UserRole, string> = {
  requester: "Requester",
  provider: "Provider",
  volunteer: "Volunteer",
  admin: "Admin",
};

export default function DashboardLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, setActiveRole } = useAuth();

  const roleKey = (user?.activeRole ?? user?.role ?? "").toLowerCase() as UserRole;
  const assignedRoles = user?.roles ?? (user?.role ? [user.role] : []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const navigationLinks =
    roleKey === "admin"
      ? adminLinks
      : roleKey === "requester"
        ? requesterLinks
        : roleKey === "provider"
          ? providerLinks
          : roleKey === "volunteer"
            ? volunteerLinks
            : [];

  const roleLabel = roleNames[roleKey] ?? "Community Member";

  const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextRole = event.target.value as UserRole;
    if (!assignedRoles.includes(nextRole)) return;

    setActiveRole(nextRole);
    setMenuOpen(false);
    navigate(roleDashboardPaths[nextRole], { replace: true });
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="dashboard-shell">
      <aside
        className={`dashboard-sidebar ${
          menuOpen ? "sidebar-open" : ""
        } ${roleKey === "admin" ? "admin-sidebar" : ""}`}
      >
        <div className="sidebar-brand">
          <img src="/commonsense-logo.png" alt="Commonsense logo" />
          <span>commonsense</span>

          {roleKey === "admin" && (
            <span className="admin-brand-label">ADMIN</span>
          )}

          <button
            type="button"
            className="sidebar-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {assignedRoles.length > 1 && (
          <div className="workspace-role-switcher">
            <label htmlFor="workspace-role">SWITCH WORKSPACE</label>
            <select
              id="workspace-role"
              value={roleKey}
              onChange={handleRoleChange}
              aria-label="Switch workspace"
            >
              {assignedRoles.map((role) => (
                <option key={role} value={role}>
                  {roleNames[role]}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="sidebar-section-label">WORKSPACE</div>

        <nav className="sidebar-navigation" aria-label="Workspace navigation">
          {navigationLinks.map(({ label, path, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end ?? path.endsWith("/dashboard")}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
              onClick={() => setMenuOpen(false)}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-section-label">ACCOUNT</div>

          <button
            type="button"
            className="sidebar-link logout-link"
            onClick={handleLogout}
          >
            <LogOut size={19} />
            <span>Log out</span>
          </button>

          <div className="sidebar-community-card">
            {roleKey === "admin" ? (
              <ShieldCheck size={23} />
            ) : (
              <HandHeart size={23} />
            )}

            <strong>
              {roleKey === "admin"
                ? "Building stronger communities."
                : "Small acts. Big impact."}
            </strong>

            <p>
              {roleKey === "admin"
                ? "Every connection starts with a better system."
                : "Every resource shared makes a difference."}
            </p>
          </div>
        </div>
      </aside>

      {menuOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
            aria-expanded={menuOpen}
          >
            <Menu size={22} />
          </button>

          <div className="topbar-breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{roleLabel}</strong>
          </div>

          <div className="topbar-actions">
            <NotificationCenter />

            <div className="topbar-user">
              <div className="user-avatar">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>

              <div className="user-details">
                <strong>{user?.name || "Community Member"}</strong>
                <span>{roleLabel}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
