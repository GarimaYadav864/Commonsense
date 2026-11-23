
import { useEffect, useState } from "react";
import { History, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import api from "../../services/api";
import "./AdminAuditLogs.css";

interface AuditLog {
  _id: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  previousStatus: string;
  newStatus: string;
  createdAt: string;
  admin?: {
    name: string;
    email: string;
  };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 20,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchLogs = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/admin/moderation/audit-logs", {
          params: { page, limit: 20 },
        });

        if (!cancelled) {
          setLogs(response.data.logs || []);
          setPagination(response.data.pagination);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err.response?.data?.message || "Unable to load audit history."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLogs();

    return () => {
      cancelled = true;
    };
  }, [page, refreshKey]);

  const formatDate = (value: string) =>
    new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <section className="admin-audit-page">
      <div className="audit-heading">
        <div>
          <span className="audit-eyebrow">ADMIN WORKSPACE</span>
          <h1>Audit History</h1>
          <p>Review moderation actions performed on the platform.</p>
        </div>

        <button
          className="audit-refresh"
          onClick={() => setRefreshKey((value) => value + 1)}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="audit-summary">
        <History size={21} />
        <div>
          <strong>{pagination.total}</strong>
          <span>Total recorded actions</span>
        </div>
      </div>

      {error && <div className="audit-error">{error}</div>}

      {loading ? (
        <div className="audit-empty">Loading audit history...</div>
      ) : logs.length === 0 ? (
        <div className="audit-empty">
          <History size={30} />
          <h3>No audit records yet</h3>
          <p>Admin moderation actions will appear here.</p>
        </div>
      ) : (
        <div className="audit-list">
          {logs.map((log) => (
            <article className="audit-card" key={log._id}>
              <div className="audit-card-top">
                <div>
                  <span className="audit-action">
                    {log.action.replaceAll("_", " ")}
                  </span>
                  <h3>{log.targetType} moderation</h3>
                </div>
                <span className="audit-date">{formatDate(log.createdAt)}</span>
              </div>

              <div className="audit-status-change">
                <span>{log.previousStatus}</span>
                <span className="audit-arrow">→</span>
                <span>{log.newStatus}</span>
              </div>

              <p className="audit-reason">
                <strong>Reason:</strong> {log.reason}
              </p>

              <div className="audit-meta">
                <span>Admin: {log.admin?.name || "Unknown admin"}</span>
                <span>Target ID: {log.targetId}</span>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="audit-pagination">
        <button
          disabled={page <= 1 || loading}
          onClick={() => setPage((value) => value - 1)}
        >
          <ChevronLeft size={17} />
          Previous
        </button>

        <span>
          {page} / {Math.max(1, pagination.pages)}
        </span>

        <button
          disabled={page >= pagination.pages || loading}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
          <ChevronRight size={17} />
        </button>
      </div>
    </section>
  );
}
