
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import api from "../../services/api";
import "./MyRequestsPage.css";

interface CommunityRequest {
  _id: string;
  title: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  urgency: "low" | "medium" | "high" | "critical";
  status: string;
  createdAt: string;
}

const statusLabels: Record<string, string> = {
  pending: "Pending",
  matched: "Matched",
  fulfilled: "Fulfilled",
  completed: "Completed",
  cancelled: "Cancelled",
  open: "Open",
};

function MyRequestsPage() {
  const [requests, setRequests] = useState<CommunityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/requests/my");
      const data = response.data;

      const requestList = Array.isArray(data)
        ? data
        : data.requests || data.data || [];

      setRequests(requestList);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unable to load your requests.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleCancel = async (requestId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this request?"
    );

    if (!confirmed) return;

    try {
      setCancellingId(requestId);
      await api.patch(`/requests/${requestId}/cancel`);
      await fetchRequests();
    } catch {
      setError("Could not cancel this request. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.title.toLowerCase().includes(search.toLowerCase()) ||
      request.category.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" || request.status.toLowerCase() === filter;

    return matchesSearch && matchesFilter;
  });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (loading) {
    return (
      <div className="requests-loading">
        <LoaderCircle className="spin" size={30} />
        <p>Loading your community requests...</p>
      </div>
    );
  }

  return (
    <div className="my-requests-page">
      <div className="requests-heading">
        <div>
          <span className="section-eyebrow">YOUR ACTIVITY</span>
          <h1>My Requests</h1>
          <p>Keep track of the help you've requested from your community.</p>
        </div>

        <Link to="/requester/requests/new" className="create-request-btn">
          <Plus size={18} />
          Create Request
        </Link>
      </div>

      <div className="request-summary">
        <div>
          <span>Total Requests</span>
          <strong>{requests.length}</strong>
        </div>
        <div>
          <span>Active</span>
          <strong>
            {
              requests.filter((r) =>
                ["pending", "open", "matched"].includes(r.status.toLowerCase())
              ).length
            }
          </strong>
        </div>
        <div>
          <span>Fulfilled</span>
          <strong>
            {
              requests.filter((r) =>
                ["fulfilled", "completed"].includes(r.status.toLowerCase())
              ).length
            }
          </strong>
        </div>
      </div>

      <div className="requests-toolbar">
        <div className="requests-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by title or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Requests</option>
          <option value="pending">Pending</option>
          <option value="open">Open</option>
          <option value="matched">Matched</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <button
          className="refresh-btn"
          onClick={fetchRequests}
          title="Refresh requests"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {error && (
        <div className="requests-error">
          <AlertCircle size={18} />
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <XCircle size={17} />
          </button>
        </div>
      )}

      {filteredRequests.length === 0 ? (
        <div className="requests-empty">
          <div className="empty-icon">
            <AlertCircle size={30} />
          </div>
          <h3>
            {requests.length === 0
              ? "You haven't created any requests yet"
              : "No matching requests found"}
          </h3>
          <p>
            {requests.length === 0
              ? "Create your first request and let your community help."
              : "Try changing your search or filter."}
          </p>
          {requests.length === 0 && (
            <Link to="/requester/requests/new" className="create-request-btn">
              <Plus size={18} />
              Create Your First Request
            </Link>
          )}
        </div>
      ) : (
        <div className="requests-list">
          {filteredRequests.map((request) => (
            <article className="request-card" key={request._id}>
              <div className="request-card-top">
                <div>
                  <span className="request-category">
                    {request.category}
                  </span>
                  <h3>{request.title}</h3>
                </div>

                <span
                  className={`request-status status-${request.status.toLowerCase()}`}
                >
                  {statusLabels[request.status.toLowerCase()] ||
                    request.status}
                </span>
              </div>

              <p className="request-description">{request.description}</p>

              <div className="request-details">
                <span>
                  <strong>Quantity:</strong> {request.quantity} {request.unit}
                </span>
                <span>
                  <strong>Location:</strong> {request.location}
                </span>
                <span>
                  <strong>Urgency:</strong>{" "}
                  <span className={`urgency-${request.urgency}`}>
                    {request.urgency}
                  </span>
                </span>
              </div>

              <div className="request-card-footer">
                <span className="request-date">
                  <CalendarDays size={15} />
                  {formatDate(request.createdAt)}
                </span>

                {["pending", "open"].includes(
                  request.status.toLowerCase()
                ) && (
                  <button
                    className="cancel-request-btn"
                    onClick={() => handleCancel(request._id)}
                    disabled={cancellingId === request._id}
                  >
                    {cancellingId === request._id
                      ? "Cancelling..."
                      : "Cancel Request"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyRequestsPage;

