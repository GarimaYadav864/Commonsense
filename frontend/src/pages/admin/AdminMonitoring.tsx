
import { useEffect, useState } from "react";
import {
  ClipboardList,
  Package,
  Handshake,
  Truck,
  RefreshCw,
} from "lucide-react";
import api from "../../services/api";
import "./AdminMonitoring.css";

interface StatusCount {
  _id: string;
  count: number;
}

interface MonitoringData {
  summary: Record<string, number>;
  breakdown: {
    requests: StatusCount[];
    resources: StatusCount[];
    offers: StatusCount[];
    deliveries: StatusCount[];
  };
  recentRequests: any[];
  recentResources: any[];
}

const formatStatus = (status: string) =>
  status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function StatusBreakdown({
  title,
  items,
}: {
  title: string;
  items: StatusCount[];
}) {
  return (
    <section className="monitor-panel">
      <h3>{title}</h3>

      {items.length === 0 ? (
        <p className="monitor-empty">No records available.</p>
      ) : (
        <div className="monitor-status-list">
          {items.map((item) => (
            <div className="monitor-status-row" key={item._id}>
              <span>{formatStatus(item._id || "unknown")}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function AdminMonitoring() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverview = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/admin/monitoring/overview");
      setData(response.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Unable to load monitoring data."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const stats = data?.summary;

  const cards = [
    {
      label: "Total Requests",
      value: stats?.totalRequests ?? 0,
      icon: ClipboardList,
    },
    {
      label: "Total Resources",
      value: stats?.totalResources ?? 0,
      icon: Package,
    },
    {
      label: "Total Offers",
      value: stats?.totalOffers ?? 0,
      icon: Handshake,
    },
    {
      label: "Deliveries",
      value: stats?.totalDeliveries ?? 0,
      icon: Truck,
    },
  ];

  if (loading && !data) {
    return (
      <div className="admin-monitor-page">
        <p>Loading community activity...</p>
      </div>
    );
  }

  return (
    <div className="admin-monitor-page">
      <header className="monitor-heading">
        <div>
          <span className="admin-eyebrow">PLATFORM OPERATIONS</span>
          <h1>Request & Resource Monitoring</h1>
          <p>
            Track community needs, resource availability, and fulfilment.
          </p>
        </div>

        <button
          className="monitor-refresh"
          onClick={loadOverview}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </header>

      {error && <div className="monitor-error">{error}</div>}

      <div className="monitor-stat-grid">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <article className="monitor-stat-card" key={card.label}>
              <div className="monitor-stat-icon">
                <Icon size={21} />
              </div>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          );
        })}
      </div>

      {data && (
        <>
          <div className="monitor-breakdown-grid">
            <StatusBreakdown
              title="Request Status"
              items={data.breakdown.requests}
            />
            <StatusBreakdown
              title="Resource Status"
              items={data.breakdown.resources}
            />
            <StatusBreakdown
              title="Offer Status"
              items={data.breakdown.offers}
            />
            <StatusBreakdown
              title="Delivery Status"
              items={data.breakdown.deliveries}
            />
          </div>

          <section className="monitor-panel monitor-table-panel">
            <h3>Recently Created Requests</h3>

            <div className="monitor-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>REQUEST</th>
                    <th>REQUESTER</th>
                    <th>QUANTITY</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentRequests.length ? (
                    data.recentRequests.map((request) => (
                      <tr key={request._id}>
                        <td>{request.title}</td>
                        <td>{request.requester?.name || "Unknown"}</td>
                        <td>{request.quantity}</td>
                        <td>
                          <span className="monitor-status-badge">
                            {formatStatus(request.status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>No requests yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="monitor-panel monitor-table-panel">
            <h3>Recently Added Resources</h3>

            <div className="monitor-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>RESOURCE</th>
                    <th>PROVIDER</th>
                    <th>QUANTITY</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentResources.length ? (
                    data.recentResources.map((resource) => (
                      <tr key={resource._id}>
                        <td>{resource.title}</td>
                        <td>{resource.provider?.name || "Unknown"}</td>
                        <td>{resource.quantity}</td>
                        <td>
                          <span className="monitor-status-badge">
                            {formatStatus(resource.status)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>No resources yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
