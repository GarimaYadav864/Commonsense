
import { Navigate, Outlet } from "react-router-dom";
import { useAuth, type UserRole } from "../context/AuthContext";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="route-loading" role="status">
        Verifying your Commonsense session...
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const userRoles = user.roles?.length ? user.roles : [user.role];
  const hasAccess =
    !allowedRoles || allowedRoles.some((role) => userRoles.includes(role));

  if (!hasAccess) {
    const fallbackRole = user.activeRole || userRoles[0] || "requester";
    return <Navigate to={`/${fallbackRole}/dashboard`} replace />;
  }

  return <Outlet />;
}
