
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

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  }

  return <Outlet />;
}
