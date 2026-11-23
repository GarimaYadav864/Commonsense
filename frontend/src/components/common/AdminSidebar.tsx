
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ChartNoAxesCombined,
  ClipboardList,
  Settings,
  LogOut,
  Leaf,
} from "lucide-react";

import "./AdminSidebar.css";

const navigation = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
  { label: "User Management", path: "/admin/users", icon: Users },
  { label: "Monitoring", path: "/admin/monitoring", icon: ChartNoAxesCombined },
  { label: "Requests & Resources", path: "/admin/records", icon: ClipboardList },
  { label: "Settings", path: "/admin/settings", icon: Settings },
];

export default function AdminSidebar({
  onLogout,
}: {
  onLogout: () => void;
}) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <Leaf size={25} />
        <div>
          <h2>Commonsense</h2>
          <span>ADMIN PANEL</span>
        </div>
      </div>

      <nav className="admin-navigation">
        <p className="admin-nav-label">WORKSPACE</p>

        {navigation.map(({ label, path, icon: Icon, end }) => (
          <NavLink
            key={path}
            to={path}
            end={end}
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? "active" : ""}`
            }
          >
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <button className="admin-logout" onClick={onLogout}>
        <LogOut size={19} />
        <span>Logout</span>
      </button>
    </aside>
  );
}
