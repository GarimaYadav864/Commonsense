
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  ArrowUpRight,
  Package,
  Clock3,
  CheckCircle2,
  Truck,
  HeartHandshake,
  RefreshCw,
} from "lucide-react";

import api from "../../services/api";
import "./RequesterDashboard.css";

interface CommunityRequest {
  _id: string;
  title: string;
  category?: string;
  status: string;
  createdAt?: string;
}

interface Offer {
  _id: string;
  status: string;
}

interface Delivery {
  _id: string;
  status: string;
}

function RequesterDashboard() {
  const [requests, setRequests] = useState<CommunityRequest[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [requestRes, offerRes, deliveryRes] = await Promise.all([
        api.get("/requests/my"),
        api.get("/offers/requester/my"),
        api.get("/deliveries/my"),
      ]);

      setRequests(requestRes.data.requests || []);
      setOffers(offerRes.data.offers || []);
      setDeliveries(deliveryRes.data.deliveries || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Unable to load your dashboard. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const awaitingOffers = requests.filter((request) =>
    ["pending", "matching", "offered"].includes(
      request.status?.toLowerCase()
    )
  ).length;

  const fulfilled = requests.filter((request) =>
    ["fulfilled", "completed"].includes(
      request.status?.toLowerCase()
    )
  ).length;

  const stats = [
    {
      label: "Total Requests",
      value: requests.length,
      note: "Your submitted requests",
      icon: Package,
    },
    {
      label: "Awaiting Offers",
      value: awaitingOffers,
      note: "Requests being matched",
      icon: Clock3,
    },
    {
      label: "Fulfilled",
      value: fulfilled,
      note: "Successfully completed",
      icon: CheckCircle2,
    },
    {
      label: "Deliveries",
      value: deliveries.length,
      note: "Delivery updates",
      icon: Truck,
    },
  ];

  return (
    <div className="requester-dashboard">
      <section className="dashboard-welcome">
        <div>
          <span className="dashboard-eyebrow">
            YOUR COMMUNITY WORKSPACE
          </span>
          <h1>Welcome back!</h1>
          <p>
            Find the resources you need. Connect with people who can help.
          </p>
        </div>

        <Link
          to="/requester/requests/new"
          className="create-request-button"
        >
          <Plus size={18} />
          Create a request
        </Link>
      </section>

      {error && (
        <div className="dashboard-error">
          {error}
          <button onClick={fetchDashboard}>Try again</button>
        </div>
      )}

      <section className="dashboard-stats">
        {stats.map(({ label, value, note, icon: Icon }) => (
          <article className="dashboard-stat-card" key={label}>
            <div className="stat-card-top">
              <span>{label}</span>
              <div className="stat-icon">
                <Icon size={19} />
              </div>
            </div>

            <strong className="stat-value">
              {loading ? "—" : value}
            </strong>

            <p>{note}</p>
          </article>
        ))}
      </section>

      <section className="dashboard-main-grid">
        <article className="dashboard-panel recent-requests-panel">
          <div className="panel-heading">
            <div>
              <h2>Recent requests</h2>
              <p>Keep track of the resources you've requested.</p>
            </div>

            <Link to="/requester/requests" className="panel-link">
              View all <ArrowUpRight size={16} />
            </Link>
          </div>

          {loading ? (
            <div className="dashboard-empty-state">
              Loading your requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="dashboard-empty-state">
              <div className="empty-state-icon">
                <Package size={27} />
              </div>
              <h3>Your requests will appear here</h3>
              <p>
                Once you create a request, you can follow its matching
                and fulfillment progress from this space.
              </p>
              <Link
                to="/requester/requests/new"
                className="empty-state-link"
              >
                Create your first request <ArrowUpRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="requester-recent-list">
              {requests.slice(0, 5).map((request) => (
                <div className="requester-recent-row" key={request._id}>
                  <div>
                    <strong>{request.title}</strong>
                    <span>{request.category || "Community request"}</span>
                  </div>
                  <span className={`request-status status-${request.status}`}>
                    {request.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="dashboard-panel quick-actions-panel">
          <div className="panel-heading">
            <div>
              <h2>Quick actions</h2>
              <p>Get started with Commonsense.</p>
            </div>
          </div>

          <Link to="/requester/requests/new" className="quick-action">
            <div className="quick-action-icon">
              <Plus size={20} />
            </div>
            <div>
              <strong>Request a resource</strong>
              <span>Tell the community what you need.</span>
            </div>
            <ArrowUpRight size={17} />
          </Link>

          <Link to="/requester/offers" className="quick-action">
            <div className="quick-action-icon">
              <HeartHandshake size={20} />
            </div>
            <div>
              <strong>Check your offers</strong>
              <span>
                Review offers from resource providers ({loading ? "—" : offers.length}).
              </span>
            </div>
            <ArrowUpRight size={17} />
          </Link>

          <Link to="/requester/deliveries" className="quick-action">
            <div className="quick-action-icon">
              <Truck size={20} />
            </div>
            <div>
              <strong>Track deliveries</strong>
              <span>Stay updated on fulfillment.</span>
            </div>
            <ArrowUpRight size={17} />
          </Link>
        </article>
      </section>

      <section className="dashboard-community-banner">
        <div className="community-banner-icon">
          <HeartHandshake size={27} />
        </div>
        <div>
          <h2>Stronger communities start with sharing.</h2>
          <p>
            Commonsense brings people and resources together, one meaningful
            connection at a time.
          </p>
        </div>
      </section>

      <button
        className="requester-refresh"
        onClick={fetchDashboard}
        disabled={loading}
      >
        <RefreshCw size={15} />
        Refresh dashboard
      </button>
    </div>
  );
}

export default RequesterDashboard;
