import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  MapPin,
  Package,
  RefreshCw,
  Truck,
} from "lucide-react";
import api from "../../services/api";
import DeliveryPaymentPanel from "../../components/payments/DeliveryPaymentPanel";
import DamageDisputePanel from "../../components/deliveries/DamageDisputePanel";
import { compressConditionPhoto } from "../../utils/conditionEvidence";
import "./DeliveryTrackingPage.css";

type DeliveryStatus =
  | "arranged"
  | "dispatched"
  | "in_transit"
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
  deliveredAt?: string;
  receivedAt?: string;
  dispatchConditionReport?: { condition: string; notes: string; photos: string[]; reportedAt: string } | null;
  receiptConditionReport?: { condition: string; notes: string; photos: string[]; reportedAt: string } | null;
  damageDispute?: any;
  volunteerLocation?: { latitude?: number | null; longitude?: number | null; updatedAt?: string | null };
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
  "in_transit",
  "delivered",
  "received",
];

const statusLabels: Record<DeliveryStatus, string> = {
  arranged: "Delivery Arranged",
  dispatched: "Resource Dispatched",
  in_transit: "In Transit",
  delivered: "Marked Delivered",
  received: "Received",
  cancelled: "Cancelled",
};

function DeliveryTrackingPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [conditionDrafts, setConditionDrafts] = useState<Record<string, { condition: string; notes: string; photos: string[] }>>({});
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { rating: number; comment: string }>>({});
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [reputationByProvider, setReputationByProvider] = useState<Record<string, { averageRating: number | null; reviewCount: number; completedDeliveries: number }>>({});

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/deliveries/my");
      const data = response.data;

      const loadedDeliveries = Array.isArray(data) ? data : data.deliveries || data.data || [];
      setDeliveries(loadedDeliveries);
      const providerIds = [...new Set(loadedDeliveries.map((item: any) => item.provider?._id).filter(Boolean))] as string[];
      const reputationResults = await Promise.all(providerIds.map(async (providerId) => {
        try {
          const result = await api.get(`/deliveries/reputation/${providerId}`);
          return [providerId, result.data.reputation] as const;
        } catch {
          return [providerId, null] as const;
        }
      }));
      setReputationByProvider(Object.fromEntries(reputationResults.filter((item) => item[1])));
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

  const submitReview = async (deliveryId: string) => {
    const draft = reviewDrafts[deliveryId] || { rating: 5, comment: "" };
    try {
      setProcessingId(deliveryId);
      setError("");
      await api.post(`/deliveries/${deliveryId}/review`, draft);
      setReviewedIds((current) => [...current, deliveryId]);
      setError("Thanks! Your provider review has been submitted.");
    } catch (error: any) {
      setError(error?.response?.data?.message || "Unable to submit your review.");
    } finally {
      setProcessingId(null);
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

  const submitReceiptCondition = async (id: string) => {
    const draft = conditionDrafts[id] || { condition: "good", notes: "", photos: [] };
    try {
      setProcessingId(id); setError("");
      await api.post(`/deliveries/${id}/condition-report`, { stage: "receipt", ...draft });
      await fetchDeliveries();
    } catch (error: any) { setError(error?.response?.data?.message || "Unable to save arrival condition report."); }
    finally { setProcessingId(null); }
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
                ["arranged", "dispatched", "in_transit", "delivered"].includes(d.status)
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
                    {delivery.provider?._id && reputationByProvider[delivery.provider._id] && (
                      <small>
                        {reputationByProvider[delivery.provider._id].averageRating == null
                          ? "No ratings yet"
                          : `${reputationByProvider[delivery.provider._id].averageRating} / 5 from ${reputationByProvider[delivery.provider._id].reviewCount} review(s)`}
                        { ` · ${reputationByProvider[delivery.provider._id].completedDeliveries} completed delivery(s)` }
                      </small>
                    )}
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

                  {delivery.deliveredAt && (
                    <span>Delivered: {formatDate(delivery.deliveredAt)}</span>
                  )}

                  {delivery.receivedAt && (
                    <span>
                      Received: {formatDate(delivery.receivedAt)}
                    </span>
                  )}
                </div>


                {delivery.volunteerLocation?.latitude != null && delivery.volunteerLocation?.longitude != null && (
                  <div className="delivery-live-location">
                    <div>
                      <strong><MapPin size={16} /> Volunteer location</strong>
                      <span>Last updated: {formatDate(delivery.volunteerLocation.updatedAt || undefined)}</span>
                    </div>
                    <a href={`https://www.google.com/maps?q=${delivery.volunteerLocation.latitude},${delivery.volunteerLocation.longitude}`} target="_blank" rel="noreferrer">View latest position</a>
                  </div>
                )}
                <div className="condition-report-comparison">
                  <h4>Handover condition evidence</h4>
                  {delivery.dispatchConditionReport ? (
                    <div className="condition-report-saved"><strong>Before dispatch: {delivery.dispatchConditionReport.condition}</strong><span>{delivery.dispatchConditionReport.notes || "No additional notes"}</span><small>{delivery.dispatchConditionReport.photos.length} photo(s) · {formatDate(delivery.dispatchConditionReport.reportedAt)}</small><div className="condition-report-photos">{delivery.dispatchConditionReport.photos.map((photo, index) => <img key={index} src={photo} alt={`Before-dispatch evidence ${index + 1}`} />)}</div></div>
                  ) : <p>Provider has not submitted pre-dispatch evidence yet.</p>}
                  {delivery.receiptConditionReport ? (
                    <div className="condition-report-saved"><strong>On arrival: {delivery.receiptConditionReport.condition}</strong><span>{delivery.receiptConditionReport.notes || "No additional notes"}</span><small>{delivery.receiptConditionReport.photos.length} photo(s) · {formatDate(delivery.receiptConditionReport.reportedAt)}</small><div className="condition-report-photos">{delivery.receiptConditionReport.photos.map((photo, index) => <img key={index} src={photo} alt={`Arrival evidence ${index + 1}`} />)}</div></div>
                  ) : (
                    <div className="condition-report-panel">
                      <h5>Record condition on arrival</h5>
                      <label>Condition
                        <select value={conditionDrafts[delivery._id]?.condition || "good"} onChange={(event) => updateConditionDraft(delivery._id, { condition: event.target.value })}>
                          <option value="good">Good</option><option value="fair">Fair</option><option value="damaged">Damaged</option><option value="missing">Missing / incomplete</option>
                        </select>
                      </label>
                      <label>Notes
                        <textarea maxLength={1000} value={conditionDrafts[delivery._id]?.notes || ""} onChange={(event) => updateConditionDraft(delivery._id, { notes: event.target.value })} placeholder="Describe the condition or any damage noticed" />
                      </label>
                      <label>Photos (up to 3)
                        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { void addConditionPhotos(delivery._id, event.target.files); event.currentTarget.value = ""; }} />
                      </label>
                      <small>{conditionDrafts[delivery._id]?.photos.length || 0}/3 photos attached. Photos are compressed before upload.</small>
                      <button type="button" className="condition-report-submit" disabled={processingId === delivery._id || !["dispatched", "in_transit", "delivered"].includes(delivery.status)} onClick={() => submitReceiptCondition(delivery._id)}>{processingId === delivery._id ? "Saving..." : "Save arrival condition"}</button>
                    </div>
                  )}
                </div>
                <DamageDisputePanel deliveryId={delivery._id} role="requester" receiptCondition={delivery.receiptConditionReport?.condition} dispute={delivery.damageDispute} onUpdated={fetchDeliveries} />
                {delivery.status === "received" && (
                  <section className="provider-review-panel">
                    <h4>Rate your provider</h4>
                    {reviewedIds.includes(delivery._id) ? (
                      <p>Your feedback has been recorded. Thank you for helping build community trust.</p>
                    ) : (
                      <>
                        <label>Rating
                          <select
                            value={reviewDrafts[delivery._id]?.rating ?? 5}
                            onChange={(event) => setReviewDrafts((current) => ({ ...current, [delivery._id]: { rating: Number(event.target.value), comment: current[delivery._id]?.comment || "" } }))}
                          >
                            <option value={5}>5 - Excellent</option>
                            <option value={4}>4 - Good</option>
                            <option value={3}>3 - Average</option>
                            <option value={2}>2 - Poor</option>
                            <option value={1}>1 - Very poor</option>
                          </select>
                        </label>
                        <label>Feedback (optional)
                          <textarea
                            maxLength={1000}
                            value={reviewDrafts[delivery._id]?.comment || ""}
                            onChange={(event) => setReviewDrafts((current) => ({ ...current, [delivery._id]: { rating: current[delivery._id]?.rating ?? 5, comment: event.target.value } }))}
                            placeholder="Share a helpful note about your experience"
                          />
                        </label>
                        <button type="button" className="condition-report-submit" disabled={processingId === delivery._id} onClick={() => submitReview(delivery._id)}>
                          {processingId === delivery._id ? "Submitting..." : "Submit provider review"}
                        </button>
                      </>
                    )}
                  </section>
                )}
                <DeliveryPaymentPanel
                  deliveryId={delivery._id}
                  method={delivery.method}
                  quotedCost={delivery.quotedCost}
                  providerName={delivery.provider?.name}
                />

                <div className="delivery-card-footer">
                  <span className="delivery-method-label">
                    {delivery.method === "self_pickup"
                      ? "Pickup arrangement"
                      : "Community delivery"}
                  </span>

                  {["dispatched", "delivered"].includes(delivery.status) && (
                    <button
                      className="receipt-btn"
                      disabled={processingId === delivery._id || !delivery.receiptConditionReport}
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
