
import { useEffect, useState } from "react";
import {
  Download,
  RefreshCw,
  ClipboardList,
  Package,
  Handshake,
  Truck,
  TrendingUp,
} from "lucide-react";
import api from "../../services/api";
import "./AdminReports.css";

interface StatusItem {
  status: string;
  count: number;
}

interface ReportsData {
  generatedAt: string;
  overview: {
    totalRequests: number;
    totalResources: number;
    totalOffers: number;
    totalDeliveries: number;
    fulfilledRequests: number;
    acceptedOffers: number;
    receivedDeliveries: number;
    requestFulfilmentRate: number;
    offerAcceptanceRate: number;
    deliveryCompletionRate: number;
    requestsCreatedLast7Days: number;
    resourcesCreatedLast7Days: number;
  };
  breakdown: {
    requests: StatusItem[];
    resources: StatusItem[];
    offers: StatusItem[];
    deliveries: StatusItem[];
  };
}

export default function AdminReports() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchReports = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/admin/reports");

        if (!cancelled) {
          setData(response.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err.response?.data?.message || "Unable to load reports."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchReports();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const exportCSV = () => {
    if (!data) return;

    const rows = [
      ["Commonsense Operational Report"],
      ["Generated At", new Date(data.generatedAt).toLocaleString()],
      [],
      ["Overview Metric", "Value"],
      ["Total Requests", data.overview.totalRequests],
      ["Total Resources", data.overview.totalResources],
      ["Total Offers", data.overview.totalOffers],
      ["Total Deliveries", data.overview.totalDeliveries],
      ["Fulfilled Requests", data.overview.fulfilledRequests],
      ["Accepted Offers", data.overview.acceptedOffers],
      ["Received Deliveries", data.overview.receivedDeliveries],
      ["Request Fulfilment Rate (%)", data.overview.requestFulfilmentRate],
      ["Offer Acceptance Rate (%)", data.overview.offerAcceptanceRate],
      ["Delivery Completion Rate (%)", data.overview.deliveryCompletionRate],
      ["Requests Created Last 7 Days", data.overview.requestsCreatedLast7Days],
      ["Resources Created Last 7 Days", data.overview.resourcesCreatedLast7Days],
      [],
      ["Record Type", "Status", "Count"],
      ...Object.entries(data.breakdown).flatMap(([type, items]) =>
        items.map((item) => [type, item.status, item.count])
      ),
    ];

    const escapeCell = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = rows
      .map((row) => row.map(escapeCell).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `commonsense-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const cards = data
    ? [
        {
          label: "Total Requests",
          value: data.overview.totalRequests,
          icon: ClipboardList,
        },
        {
          label: "Total Resources",
          value: data.overview.totalResources,
          icon: Package,
        },
        {
          label: "Total Offers",
          value: data.overview.totalOffers,
          icon: Handshake,
        },
        {
          label: "Total Deliveries",
          value: data.overview.totalDeliveries,
          icon: Truck,
        },
      ]
    : [];

  const renderBreakdown = (
    title: string,
    items: StatusItem[]
  ) => {
    const total = items.reduce((sum, item) => sum + item.count, 0);

    return (
      <section className="report-panel">
        <h3>{title}</h3>

        {items.map((item) => {
          const percentage =
            total > 0 ? (item.count / total) * 100 : 0;

          return (
            <div className="report-status-row" key={item.status}>
              <div className="report-status-label">
                <span>{item.status}</span>
                <strong>{item.count}</strong>
              </div>

              <div className="report-progress-track">
                <div
                  className="report-progress-fill"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </section>
    );
  };

  return (
    <section className="admin-reports-page">
      <div className="reports-heading">
        <div>
          <span className="reports-eyebrow">ADMIN WORKSPACE</span>
          <h1>Operational Reports</h1>
          <p>Understand platform activity and community impact.</p>
        </div>

        <div className="reports-actions">
          <button
            className="reports-secondary-button"
            onClick={() => setRefreshKey((value) => value + 1)}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            className="reports-primary-button"
            onClick={exportCSV}
            disabled={!data || loading}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {error && <div className="reports-error">{error}</div>}

      {loading ? (
        <div className="reports-empty">Generating reports...</div>
      ) : data ? (
        <>
          <div className="reports-kpi-grid">
            {cards.map(({ label, value, icon: Icon }) => (
              <article className="reports-kpi-card" key={label}>
                <div className="reports-kpi-icon">
                  <Icon size={21} />
                </div>
                <span>{label}</span>
                <strong>{value.toLocaleString("en-IN")}</strong>
              </article>
            ))}
          </div>

          <section className="reports-performance">
            <div className="reports-section-heading">
              <TrendingUp size={20} />
              <h2>Platform Performance</h2>
            </div>

            <div className="reports-rate-grid">
              <article>
                <span>Request Fulfilment</span>
                <strong>{data.overview.requestFulfilmentRate}%</strong>
                <p>
                  {data.overview.fulfilledRequests} fulfilled requests
                </p>
              </article>

              <article>
                <span>Offer Acceptance</span>
                <strong>{data.overview.offerAcceptanceRate}%</strong>
                <p>
                  {data.overview.acceptedOffers} accepted offers
                </p>
              </article>

              <article>
                <span>Delivery Completion</span>
                <strong>{data.overview.deliveryCompletionRate}%</strong>
                <p>
                  {data.overview.receivedDeliveries} received deliveries
                </p>
              </article>
            </div>
          </section>

          <section className="reports-recent-activity">
            <h2>Recent Platform Activity</h2>

            <div className="reports-activity-grid">
              <article>
                <span>Requests created · Last 7 days</span>
                <strong>{data.overview.requestsCreatedLast7Days}</strong>
              </article>

              <article>
                <span>Resources listed · Last 7 days</span>
                <strong>{data.overview.resourcesCreatedLast7Days}</strong>
              </article>
            </div>
          </section>

          <h2 className="reports-breakdown-heading">
            Status Distribution
          </h2>

          <div className="reports-breakdown-grid">
            {renderBreakdown("Requests", data.breakdown.requests)}
            {renderBreakdown("Resources", data.breakdown.resources)}
            {renderBreakdown("Offers", data.breakdown.offers)}
            {renderBreakdown("Deliveries", data.breakdown.deliveries)}
          </div>

          <p className="reports-generated">
            Generated: {new Date(data.generatedAt).toLocaleString("en-IN")}
          </p>
        </>
      ) : (
        <div className="reports-empty">No report data available.</div>
      )}
    </section>
  );
}
