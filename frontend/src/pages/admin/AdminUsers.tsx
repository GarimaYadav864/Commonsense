
import { useEffect, useState } from "react";
import {
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MapPin,
  Mail,
} from "lucide-react";
import api from "../../services/api";
import "./AdminUsers.css";

type UserRole = "requester" | "provider" | "volunteer" | "admin";

interface CommunityUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  roles?: UserRole[];
  activeRole?: UserRole;
  location?: string;
  createdAt: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  limit: number;
}

const roleLabels: Record<UserRole, string> = {
  requester: "Requester",
  provider: "Provider",
  volunteer: "Volunteer",
  admin: "Admin",
};

export default function AdminUsers() {
  const [users, setUsers] = useState<CommunityUser[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    limit: 10,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/admin/users", {
          params: {
            page,
            limit: 10,
            role,
            search: search.trim(),
          },
          signal: controller.signal,
        });

        setUsers(response.data.users || []);
        setPagination(response.data.pagination);
      } catch (err: any) {
        if (err.name === "CanceledError") return;

        setError(
          err.response?.data?.message ||
            "Unable to load community members."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    const debounce = setTimeout(fetchUsers, 350);

    return () => {
      clearTimeout(debounce);
      controller.abort();
    };
  }, [page, role, search]);

  const handleRoleChange = (value: string) => {
    setRole(value);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="admin-users-page">
      <div className="admin-users-heading">
        <div>
          <span className="admin-eyebrow">COMMUNITY MANAGEMENT</span>
          <h1>Community Members</h1>
          <p>
            View and manage the people making Commonsense possible.
          </p>
        </div>

        <div className="admin-users-total">
          <Users size={20} />
          <div>
            <strong>{pagination.totalUsers}</strong>
            <span>Total Members</span>
          </div>
        </div>
      </div>

      <div className="admin-users-toolbar">
        <div className="admin-users-search">
          <Search size={19} />
          <input
            type="search"
            placeholder="Search by name, email or location..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <select
          value={role}
          onChange={(e) => handleRoleChange(e.target.value)}
          aria-label="Filter users by role"
        >
          <option value="all">All Roles</option>
          <option value="requester">Requesters</option>
          <option value="provider">Providers</option>
          <option value="volunteer">Volunteers</option>
          <option value="admin">Admins</option>
        </select>

        <button
          className="admin-refresh-button"
          onClick={() => {
            setPage(1);
            setSearch((current) => current);
            setRole((current) => current);
          }}
          title="Refresh member list"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      <div className="admin-users-table-card">
        {error && (
          <div className="admin-users-error">
            {error}
          </div>
        )}

        <div className="admin-users-table-wrap">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>MEMBER</th>
                <th>ROLE</th>
                <th>LOCATION</th>
                <th>JOINED</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="admin-users-state">
                    Loading community members...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="admin-users-state">
                    No community members found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <div className="admin-member-cell">
                        <div className="admin-member-avatar">
                          {user.name?.charAt(0).toUpperCase() || "U"}
                        </div>

                        <div className="admin-member-info">
                          <strong>{user.name}</strong>
                          <span>
                            <Mail size={13} />
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="admin-member-roles">
                        {(user.roles?.length ? user.roles : [user.role]).map((assignedRole) => (
                          <span
                            key={assignedRole}
                            className={`admin-role-badge ${assignedRole}`}
                          >
                            {roleLabels[assignedRole]}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td>
                      <span className="admin-member-location">
                        <MapPin size={14} />
                        {user.location || "Not provided"}
                      </span>
                    </td>

                    <td>{formatDate(user.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-users-pagination">
          <span>
            Showing {users.length ? (page - 1) * 10 + 1 : 0}
            {"–"}
            {(page - 1) * 10 + users.length} of {pagination.totalUsers}
          </span>

          <div>
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>

            <span>
              Page {page} of {Math.max(pagination.totalPages, 1)}
            </span>

            <button
              disabled={page >= pagination.totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
