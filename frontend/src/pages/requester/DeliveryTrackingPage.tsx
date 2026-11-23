import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  MapPin,
  Package,
  RefreshCw,
  Truck,
} from "lucide-react";
import api from "../../services/api";
import "./DeliveryTrackingPage.css";

type DeliveryStatus =
  | "arranged"
  | "dispatched"
  | "delivered"
  | "received"
  | "cancelled";

interface Delivery {
  _id: string;
  method: "self_pickup" | "community_delivery";
  pickupAddress?: string;
  deliveryAddress?: string;
  transportDetails?: string;
  quotedCost?: number;
  costCurrency?: string;
  status: DeliveryStatus;
  providerConfirmed?: boolean;
  requesterConfirmed?: boolean;
  dispatchedAt?: string;
  receivedAt?: string;
  request?: {
    title: string;
    category?: string;
  };
  provider?: {
    name: string;
    location?: string;
  };
}

const statusSteps: DeliveryStatus[] = [
  "arranged",
  "dispatched",
  "received",
];

const statusLabels: Record<DeliveryStatus, string> = {
  arranged: "Delivery Arranged",
  dispatched: "Resource Dispatched",
  delivered: "Marked Delivered",
  received: "Received",
  cancelled: "Cancelled",
};

function DeliveryTrackingPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/deliveries/my");
      const data = response.data;

      setDeliveries(
        Array.isArray(data)
          ? data
          : data.deliveries || data.data || []
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your deliveries."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const confirmReceipt = async (deliveryId: string) => {
    const confirmed = window.confirm(
      "Confirm that you have received the resource?"
    );

    if (!confirmed) return;

    try {
      setProcessingId(deliveryId);
      setError("");

      await api.patch(
        `/deliveries/${deliveryId}/confirm-receipt`
      );

      await fetchDeliveries();
    } catch {
      setError(
        "Unable to confirm receipt. Please contact the provider or try again."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return "Not yet updated";

    return new Date(date).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStepIndex = (status: DeliveryStatus) =>
    statusSteps.indexOf(status);

  if (loading) {
    return (
      <div className="delivery-loading">
        <Truck size={30} />
        <p>Loading your delivery updates...</p>
      </div>
    );
  }

  return (
    <div className="delivery-page">
      <div className="delivery-heading">
        <div>
          <span className="section-eyebrow">FULFILMENT & HANDOVER</span>
          <h1>Delivery Tracking</h1>
          <p>Follow your community resources from dispatch to receipt.</p>
        </div>

        <button className="delivery-refresh" onClick={fetchDeliveries}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="delivery-summary">
        <div>
          <span>Total Deliveries</span>
          <strong>{deliveries.length}</strong>
        </div>
        <div>
          <span>In Progress</span>
          <strong>
            {
              deliveries.filter((d) =>
                ["arranged", "dispatched", "delivered"].includes(d.status)
              ).length
            }
          </strong>
        </div>
        <div>
          <span>Received</span>
          <strong>
            {deliveries.filter((d) => d.status === "received").length}
          </strong>
        </div>
      </div>

      {error && <div className="delivery-error">{error}</div>}

      {deliveries.length === 0 ? (
        <div className="delivery-empty">
          <Package size={40} />
          <h3>No deliveries yet</h3>
          <p>
            Once a confirmed offer has a delivery arrangement, its tracking
            details will appear here.
          </p>
        </div>
      ) : (
        <div className="delivery-list">
          {deliveries.map((delivery) => {
            const stepIndex = getStepIndex(delivery.status);
            const isCancelled = delivery.status === "cancelled";

            return (
              <article className="delivery-card" key={delivery._id}>
                <div className="delivery-card-heading">
                  <div>
                    <span className="delivery-reference">
                      DELIVERY #{delivery._id.slice(-6).toUpperCase()}
                    </span>
                    <h3>{delivery.request?.title || "Community Request"}</h3>
                  </div>

                  <span
                    className={`delivery-status status-${delivery.status}`}
                  >
                    {statusLabels[delivery.status] || delivery.status}
                  </span>
                </div>

                <div className="delivery-provider">
                  <div className="provider-avatar">
                    {(delivery.provider?.name || "P")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div>
                    <span>Provided by</span>
                    <strong>
                      {delivery.provider?.name || "Community Provider"}
                    </strong>
                  </div>
                </div>

                <div className="delivery-meta">
                  <div>
                    <span>Delivery method</span>
                    <strong>
                      {delivery.method === "self_pickup"
                        ? "Self Pickup"
                        : "Community Delivery"}
                    </strong>
                  </div>

                  <div>
                    <span>Quoted cost</span>
                    <strong>
                      {delivery.quotedCost != null
                        ? `${delivery.costCurrency || "INR"} ${delivery.quotedCost}`
                        : "Not specified"}
                    </strong>
                  </div>
                </div>

                <div className="delivery-addresses">
                  {delivery.pickupAddress && (
                    <div>
                      <MapPin size={16} />
                      <span>
                        <strong>Pickup:</strong> {delivery.pickupAddress}
                      </span>
                    </div>
                  )}

                  {delivery.deliveryAddress && (
                    <div>
                      <MapPin size={16} />
                      <span>
                        <strong>Delivery:</strong> {delivery.deliveryAddress}
                      </span>
                    </div>
                  )}
                </div>

                {delivery.transportDetails && (
                  <p className="transport-details">
                    <strong>Transport details:</strong>{" "}
                    {delivery.transportDetails}
                  </p>
                )}

                {!isCancelled && (
                  <div className="delivery-timeline">
                    <h4>Delivery progress</h4>

                    <div className="timeline-steps">
                      {statusSteps.map((step, index) => (
                        <div
                          key={step}
                          className={`timeline-step ${
                            index <= stepIndex ? "completed" : ""
                          }`}
                        >
                          <div className="timeline-dot">
                            {index < stepIndex ? (
                              <CheckCircle2 size={16} />
                            ) : (
                              <span>{index + 1}</span>
                            )}
                          </div>
                          <span>{statusLabels[step]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="delivery-dates">
                  {delivery.dispatchedAt && (
                    <span>
                      Dispatched: {formatDate(delivery.dispatchedAt)}
                    </span>
                  )}

                  {delivery.receivedAt && (
                    <span>
                      Received: {formatDate(delivery.receivedAt)}
                    </span>
                  )}
                </div>

                <div className="delivery-card-footer">
                  <span className="delivery-method-label">
                    {delivery.method === "self_pickup"
                      ? "Pickup arrangement"
                      : "Community delivery"}
                  </span>

                  {delivery.status === "dispatched" && (
                    <button
                      className="receipt-btn"
                      disabled={processingId === delivery._id}
                      onClick={() => confirmReceipt(delivery._id)}
                    >
                      <CheckCircle2 size={16} />
                      {processingId === delivery._id
                        ? "Confirming..."
                        : "Confirm Receipt"}
                    </button>
                  )}

                  {delivery.status === "received" && (
                    <span className="receipt-confirmed">
                      <CheckCircle2 size={16} />
                      Receipt Confirmed
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DeliveryTrackingPage;
