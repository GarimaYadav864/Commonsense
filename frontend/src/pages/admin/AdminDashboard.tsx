import { useEffect, useState } from "react";
import {
  Users,
  ClipboardList,
  Package,
  Handshake,
  Truck,
  RefreshCw,
} from "lucide-react";

import api from "../../services/api";
import "./AdminDashboard.css";

interface Stats {
  users: {
    total: number;
    requesters: number;
    providers: number;
    volunteers: number;
  };
  requests: {
    total: number;
    active: number;
  };
  resources: {
    total: number;
    available: number;
  };
  offers: {
    total: number;
    accepted: number;
  };
  deliveries: {
    total: number;
    completed: number;
  };
}

function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/admin/dashboard");

      setStats(response.data.stats);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Unable to load admin statistics."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const cards = stats
    ? [
        {
          title: "Total Users",
          value: stats.users.total,
          detail: `${stats.users.requesters} requesters`,
          icon: Users,
        },
        {
          title: "Community Requests",
          value: stats.requests.total,
          detail: `${stats.requests.active} active`,
          icon: ClipboardList,
        },
        {
          title: "Available Resources",
          value: stats.resources.available,
          detail: `${stats.resources.total} total`,
          icon: Package,
        },
        {
          title: "Accepted Offers",
          value: stats.offers.accepted,
          detail: `${stats.offers.total} total`,
          icon: Handshake,
        },
        {
          title: "Completed Deliveries",
          value: stats.deliveries.completed,
          detail: `${stats.deliveries.total} total`,
          icon: Truck,
        },
      ]
    : [];

  return (
    <div className="admin-dashboard">
      <div className="admin-heading">
        <div>
          <span className="admin-eyebrow">
            COMMONSENSE ADMINISTRATION
          </span>
          <h1>Platform Overview</h1>
          <p>
            Monitor community activity and platform performance.
          </p>
        </div>

        <button
          className="admin-refresh"
          onClick={fetchStats}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      {loading ? (
        <div className="admin-loading">
          Loading platform statistics...
        </div>
      ) : stats ? (
        <>
          <div className="admin-stats-grid">
            {cards.map((card) => {
              const Icon = card.icon;

              return (
                <div className="admin-stat-card" key={card.title}>
                  <div className="admin-stat-top">
                    <span>{card.title}</span>
                    <Icon size={21} />
                  </div>

                  <h2>{card.value}</h2>
                  <p>{card.detail}</p>
                </div>
              );
            })}
          </div>

          <section className="admin-role-section">
            <h2>Community composition</h2>

            <div className="admin-role-grid">
              <div>
                <span>Requesters</span>
                <strong>{stats.users.requesters}</strong>
              </div>

              <div>
                <span>Providers</span>
                <strong>{stats.users.providers}</strong>
              </div>

              <div>
                <span>Volunteers</span>
                <strong>{stats.users.volunteers}</strong>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

export default AdminDashboard;