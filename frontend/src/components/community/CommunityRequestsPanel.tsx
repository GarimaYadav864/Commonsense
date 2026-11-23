import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, RefreshCw, Users } from "lucide-react";
import api from "../../services/api";
import "./CommunityRequestsPanel.css";

interface CommunityRequest {
  _id: string;
  title: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  urgency: string;
  status: string;
  createdAt: string;
  requester?: { name?: string };
}

export default function CommunityRequestsPanel() {
  const [requests, setRequests] = useState<CommunityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/requests");
      setRequests((response.data.requests || []).slice(0, 6));
    } catch (err: any) {
      setError(err.response?.data?.message || "Unable to load community requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return (
    <section className="community-requests-panel">
      <div className="community-requests-heading">
        <div>
          <span className="community-requests-eyebrow">COMMUNITY NEEDS</span>
          <h2>Requests from the community</h2>
          <p>See what people nearby are looking for and find a way to help.</p>
        </div>
        <button type="button" onClick={fetchRequests} disabled={loading} aria-label="Refresh community requests">
          <RefreshCw size={16} />
        </button>
      </div>

      {error ? (
        <p className="community-requests-message">{error}</p>
      ) : loading ? (
        <p className="community-requests-message">Loading community requests...</p>
      ) : requests.length === 0 ? (
        <div className="community-requests-empty">
          <Users size={25} />
          <strong>No active community requests yet</strong>
          <span>New requests will appear here when someone asks the community for help.</span>
        </div>
      ) : (
        <div className="community-requests-list">
          {requests.map((request) => (
            <article className="community-request-card" key={request._id}>
              <div className="community-request-card-top">
                <span className="community-request-category">{request.category}</span>
                <span className={`community-request-urgency urgency-${request.urgency}`}>{request.urgency} urgency</span>
              </div>
              <h3>{request.title}</h3>
              <p>{request.description}</p>
              <div className="community-request-meta">
                <span><Users size={14} /> {request.quantity} {request.unit}</span>
                <span><MapPin size={14} /> {request.location}</span>
              </div>
              <small>Posted by {request.requester?.name || "Community member"}</small>
            </article>
          ))}
        </div>
      )}
      <div className="community-requests-footer">
        <span>Showing up to 6 active requests</span>
        <Link to="/provider/resources">Share a resource</Link>
      </div>
    </section>
  );
}
