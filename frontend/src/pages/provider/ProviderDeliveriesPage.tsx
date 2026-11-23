
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  HeartHandshake,
  Clock3,
  MapPin,
  Package,
  RefreshCw,
  Truck,
  UserRound,
} from "lucide-react";
import api from "../../services/api";
import { compressConditionPhoto } from "../../utils/conditionEvidence";
import "./ProviderDeliveriesPage.css";

type DeliveryStatus =
  | "arranged"
  | "dispatched"
  | "delivered"
  | "received"
  | "cancelled";

interface ProviderContribution {
  _id: string;
  amount: number;
  paidAt?: string;
  delivery: string | { _id: string };
  payer?: { name?: string };
}

interface Delivery {
  _id: string;
  method: "self_pickup" | "community_delivery";
  pickupAddress?: string;
  deliveryAddress?: string;
  transportDetails?: string;
  quotedCost: number;
  costCurrency?: string;
  status: DeliveryStatus;
  dispatchConditionReport?: { condition: string; notes: string; photos: string[]; reportedAt: string } | null;
  dispatchedAt?: string | null;
  createdAt: string;
  request?: {
    _id?: string;
    title?: string;
    description?: string;
    category?: string;
    quantity?: number;
    unit?: string;
    urgency?: string;
  };
  requester?: {
    _id?: string;
    name?: string;
    location?: string;
  };
  offer?: {
    _id?: string;
  };
}

const formatDate = (date?: string) => {
  if (!date) return "Not available";

  return new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getErrorMessage = (error: any) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

export default function ProviderDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [contributions, setContributions] = useState<ProviderContribution[]>([]);
  const [conditionDrafts, setConditionDrafts] = useState<Record<string, { condition: string; notes: string; photos: string[] }>>({});
  const [reportingId, setReportingId] = useState<string | null>(null);

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [response, contributionResponse] = await Promise.all([
        api.get("/deliveries/my"),
        api.get("/payments/provider/contributions"),
      ]);
      const data = response.data?.deliveries;

      setDeliveries(Array.isArray(data) ? data : []);
      setContributions(contributionResponse.data?.contributions || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleDispatch = async (deliveryId: string) => {
    const confirmed = window.confirm(
      "Are you sure this resource is ready and has been dispatched?"
    );

    if (!confirmed) return;

    try {
      setDispatchingId(deliveryId);
      setError("");
      setSuccess("");

      const response = await api.patch(
        `/deliveries/${deliveryId}/dispatch`
      );

      setSuccess(
        response.data?.message || "Delivery marked as dispatched."
      );

      await fetchDeliveries();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDispatchingId(null);
    }
  };

  const updateConditionDraft = (id: string, patch: Partial<{ condition: string; notes: string; photos: string[] }>) => {
    setConditionDrafts((current) => ({ ...current, [id]: { condition: "good", notes: "", photos: [], ...current[id], ...patch } }));
  };

  const addConditionPhotos = async (id: string, files: FileList | null) => {
    if (!files?.length) return;
    try {
      const current = conditionDrafts[id]?.photos || [];
      if (current.length + files.length > 3) throw new Error("You can attach up to 3 photos.");
      const photos = await Promise.all(Array.from(files).map(compressConditionPhoto));
      updateConditionDraft(id, { photos: [...current, ...photos] });
    } catch (error: any) { setError(error.message || "Unable to process photos."); }
  };

  const submitDispatchCondition = async (id: string) => {
    const draft = conditionDrafts[id] || { condition: "good", notes: "", photos: [] };
    try {
      setReportingId(id); setError("");
      await api.post(`/deliveries/${id}/condition-report`, { stage: "dispatch", ...draft });
      setSuccess("Pre-dispatch condition report saved.");
      await fetchDeliveries();
    } catch (error) { setError(getErrorMessage(error)); }
    finally { setReportingId(null); }
  };
  const pendingCount = deliveries.filter(
    (item) => item.status === "arranged"
  ).length;

  const dispatchedCount = deliveries.filter(
    (item) => item.status === "dispatched"
  ).length;

  const completedCount = deliveries.filter(
    (item) => item.status === "received"
  ).length;

  return (
    <div className="provider-deliveries">
      <div className="provider-deliveries-header">
        <div>
          <span className="provider-deliveries-eyebrow">
            LOGISTICS & FULFILMENT
          </span>
          <h1>Delivery Management</h1>
          <p>
            Track your accepted requests and keep the community updated
            as resources are dispatched.
          </p>
        </div>

        <button
          className="delivery-refresh-btn"
          onClick={fetchDeliveries}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "spinning" : ""} />
          Refresh
        </button>
      </div>

      <div className="delivery-stats">
        <div className="delivery-stat-card">
          <span className="delivery-stat-icon pending">
            <Clock3 size={20} />
          </span>
          <div>
            <strong>{pendingCount}</strong>
            <span>Awaiting dispatch</span>
          </div>
        </div>

        <div className="delivery-stat-card">
          <span className="delivery-stat-icon dispatched">
            <Truck size={20} />
          </span>
          <div>
            <strong>{dispatchedCount}</strong>
            <span>In transit</span>
          </div>
        </div>

        <div className="delivery-stat-card">
          <span className="delivery-stat-icon completed">
            <CheckCircle2 size={20} />
          </span>
          <div>
            <strong>{completedCount}</strong>
            <span>Received</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="delivery-alert error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {success && (
        <div className="delivery-alert success">
          <CheckCircle2 size={18} />
          {success}
        </div>
      )}

      <div className="delivery-section-heading">
        <div>
          <h2>Your deliveries</h2>
          <p>All delivery arrangements associated with your resources.</p>
        </div>
        <span className="delivery-total">
          {deliveries.length} total
        </span>
      </div>

      {loading ? (
        <div className="delivery-empty-state">
          <RefreshCw size={24} className="spinning" />
          <p>Loading your deliveries...</p>
        </div>
      ) : deliveries.length === 0 ? (
        <div className="delivery-empty-state">
          <span className="delivery-empty-icon">
            <Package size={30} />
          </span>
          <h3>No deliveries yet</h3>
          <p>
            When a requester confirms an accepted offer and creates a
            delivery arrangement, it will appear here.
          </p>
        </div>
      ) : (
        <div className="delivery-list">
          {deliveries.map((delivery) => {
            const request = delivery.request || {};
            const requester = delivery.requester || {};
            const isSelfPickup = delivery.method === "self_pickup";
            const isArranged = delivery.status === "arranged";
            const isDispatching = dispatchingId === delivery._id;

            return (
              <article className="provider-delivery-card" key={delivery._id}>
                <div className="provider-delivery-card-top">
                  <div className="provider-delivery-title">
                    <span className="provider-delivery-package-icon">
                      <Package size={20} />
                    </span>
                    <div>
                      <h3>{request.title || "Resource request"}</h3>
                      <span>
                        Created {formatDate(delivery.createdAt)}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`delivery-status-badge ${delivery.status}`}
                  >
                    {delivery.status.replace("_", " ")}
                  </span>
                </div>

                {request.description && (
                  <p className="provider-delivery-description">
                    {request.description}
                  </p>
                )}

                <div className="provider-delivery-details">
                  <div className="provider-delivery-detail">
                    <span>Category</span>
                    <strong>{request.category || "—"}</strong>
                  </div>

                  <div className="provider-delivery-detail">
                    <span>Quantity</span>
                    <strong>
                      {request.quantity ?? "—"} {request.unit || ""}
                    </strong>
                  </div>

                  <div className="provider-delivery-detail">
                    <span>Urgency</span>
                    <strong className="capitalize">
                      {request.urgency || "—"}
                    </strong>
                  </div>
                </div>

                <div className="provider-delivery-info-grid">
                  <div className="provider-delivery-info">
                    <UserRound size={17} />
                    <div>
                      <span>Requester</span>
                      <strong>{requester.name || "Community member"}</strong>
                      <small>{requester.location || "Location not provided"}</small>
                    </div>
                  </div>

                  <div className="provider-delivery-info">
                    <MapPin size={17} />
                    <div>
                      <span>
                        {isSelfPickup ? "Pickup address" : "Delivery address"}
                      </span>
                      <strong>
                        {isSelfPickup
                          ? delivery.pickupAddress || "Not provided"
                          : delivery.deliveryAddress || "Not provided"}
                      </strong>
                    </div>
                  </div>

                  <div className="provider-delivery-info">
                    <Truck size={17} />
                    <div>
                      <span>Fulfilment method</span>
                      <strong>
                        {isSelfPickup ? "Self pickup" : "Community delivery"}
                      </strong>
                      {delivery.transportDetails && (
                        <small>{delivery.transportDetails}</small>
                      )}
                    </div>
                  </div>

                  <div className="provider-delivery-info">
                    <Package size={17} />
                    <div>
                      <span>Quoted transportation cost</span>
                      <strong>
                        {delivery.costCurrency === "INR" || !delivery.costCurrency
                          ? "₹"
                          : `${delivery.costCurrency} `}
                        {Number(delivery.quotedCost || 0).toLocaleString("en-IN")}
                      </strong>
                    </div>
                  </div>
                </div>

                {delivery.dispatchedAt && (
                  <div className="delivery-dispatched-date">
                    <CheckCircle2 size={15} />
                    Dispatched on {formatDate(delivery.dispatchedAt)}
                  </div>
                )}

                {(() => {
                  const deliveryContributions = contributions.filter((item) => {
                    const id = typeof item.delivery === "string" ? item.delivery : item.delivery?._id;
                    return id === delivery._id;
                  });
                  const totalPaise = deliveryContributions.reduce((sum, item) => sum + item.amount, 0);
                  return totalPaise > 0 ? (
                    <div className="provider-contribution-summary">
                      <HeartHandshake size={17} />
                      <div>
                        <strong>₹{(totalPaise / 100).toLocaleString("en-IN")} in test-mode contributions</strong>
                        <span>{deliveryContributions.length} contribution payment(s) recorded for this delivery</span>
                      </div>
                    </div>
                  ) : null;
                })()}

                {isArranged && !delivery.dispatchConditionReport && (
                  <div className="condition-report-panel">
                    <h4>Before-dispatch condition check</h4>
                    <p>Record the resource condition and attach up to 3 photos before handing it over.</p>
                    <label>Condition
                      <select value={conditionDrafts[delivery._id]?.condition || "good"} onChange={(event) => updateConditionDraft(delivery._id, { condition: event.target.value })}>
                        <option value="good">Good</option><option value="fair">Fair</option><option value="damaged">Damaged</option><option value="missing">Missing / incomplete</option>
                      </select>
                    </label>
                    <label>Notes
                      <textarea maxLength={1000} value={conditionDrafts[delivery._id]?.notes || ""} onChange={(event) => updateConditionDraft(delivery._id, { notes: event.target.value })} placeholder="Describe visible condition, defects or included items" />
                    </label>
                    <label>Photos (up to 3, compressed before upload)
                      <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { void addConditionPhotos(delivery._id, event.target.files); event.currentTarget.value = ""; }} />
                    </label>
                    <small>{conditionDrafts[delivery._id]?.photos.length || 0}/3 photos attached</small>
                    <button type="button" className="condition-report-submit" disabled={reportingId === delivery._id} onClick={() => submitDispatchCondition(delivery._id)}>{reportingId === delivery._id ? "Saving report..." : "Save condition & photos"}</button>
                  </div>
                )}
                {delivery.dispatchConditionReport && (
                  <div className="condition-report-saved"><strong>Pre-dispatch condition: {delivery.dispatchConditionReport.condition}</strong><span>{delivery.dispatchConditionReport.notes || "No additional notes"}</span><small>Recorded {formatDate(delivery.dispatchConditionReport.reportedAt)} · {delivery.dispatchConditionReport.photos.length} photo(s)</small><div className="condition-report-photos">{delivery.dispatchConditionReport.photos.map((photo, index) => <img key={index} src={photo} alt={`Pre-dispatch evidence ${index + 1}`} />)}</div></div>
                )}
                <div className="provider-delivery-card-footer">
                  <span>
                    {isArranged
                      ? "This arrangement is ready for dispatch."
                      : delivery.status === "dispatched"
                      ? "The resource has been dispatched. Awaiting requester confirmation."
                      : delivery.status === "received"
                      ? "The requester has confirmed receipt."
                      : delivery.status === "cancelled"
                      ? "This delivery arrangement was cancelled."
                      : `Current status: ${delivery.status}`}
                  </span>

                  {isArranged && (
                    <button
                      className="delivery-dispatch-btn"
                      onClick={() => handleDispatch(delivery._id)}
                      disabled={isDispatching}
                    >
                      <Truck size={17} />
                      {isDispatching ? "Updating..." : "Mark as dispatched"}
                    </button>
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

