import { useCallback, useEffect, useState } from "react";
import { MapPin, Package, RefreshCw, Truck, User, CheckCircle } from "lucide-react";
import api from "../../services/api";
import "./VolunteerDeliveriesPage.css";

interface Delivery {
  _id: string;
  method: "self_pickup" | "community_delivery";
  status: string;
  deliveredAt?: string;
  deliveryAddress?: string;
  pickupAddress?: string;
  transportDetails?: string;
  quotedCost?: number;
  costCurrency?: string;
  request?: {
    title?: string;
    description?: string;
    category?: string;
    quantity?: number;
    unit?: string;
    location?: string;
  };
  provider?: {
    name?: string;
    location?: string;
  };
  requester?: {
    name?: string;
    location?: string;
  };
  volunteer?: {
    name?: string;
  };
}

function VolunteerDeliveriesPage() {
  const [available, setAvailable] = useState<Delivery[]>([]);
  const [assigned, setAssigned] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"available" | "assigned">(
    "available"
  );
  const [message, setMessage] = useState("");

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      const [availableRes, assignedRes] = await Promise.all([
        api.get("/deliveries/available"),
        api.get("/deliveries/my"),
      ]);

      setAvailable(availableRes.data.deliveries || []);
      setAssigned(assignedRes.data.deliveries || []);
    } catch (error: any) {
      console.error("Fetch volunteer deliveries error:", error);
      setMessage(
        error.response?.data?.message || "Unable to load deliveries."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const handleClaim = async (deliveryId: string) => {
    try {
      setClaimingId(deliveryId);
      setMessage("");

      const response = await api.patch(
        `/deliveries/${deliveryId}/claim`
      );

      setMessage(response.data.message || "Delivery claimed successfully.");
      await fetchDeliveries();
      setActiveTab("assigned");
    } catch (error: any) {
      console.error("Claim delivery error:", error);
      setMessage(
        error.response?.data?.message ||
          "Unable to claim this delivery. It may have already been claimed."
      );
      await fetchDeliveries();
    } finally {
      setClaimingId(null);
    }
  };

 
  const handleStatusUpdate = async (
    deliveryId: string,
    status: "in_transit" | "delivered"
  ) => {
    try {
      setUpdatingId(deliveryId);
      setMessage("");
      const response = await api.patch(`/deliveries/${deliveryId}/status`, { status });
      setMessage(response.data.message || "Delivery status updated.");
      await fetchDeliveries();
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Unable to update delivery status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const renderDeliveryCard = (
    delivery: Delivery,
    isAssigned: boolean
  ) => (
    <article className="volunteer-delivery-card" key={delivery._id}>
      <div className="volunteer-delivery-top">
        <div className="volunteer-delivery-icon">
          <Package size={21} />
        </div>

        <span className={`delivery-status ${isAssigned ? "claimed" : "open"}`}>
          {isAssigned ? "Assigned to you" : "Available"}
        </span>
      </div>

      <h3>{delivery.request?.title || "Community delivery"}</h3>

      <p className="volunteer-delivery-description">
        {delivery.request?.description || "No description provided."}
      </p>

      <div className="volunteer-delivery-details">
        <div>
          <Package size={16} />
          <span>
            {delivery.request?.quantity ?? "—"}{" "}
            {delivery.request?.unit || "items"}
          </span>
        </div>

        <div>
          <MapPin size={16} />
          <span>
            {delivery.request?.location ||
              delivery.requester?.location ||
              "Location not specified"}
          </span>
        </div>

        <div>
          <Truck size={16} />
          <span>
            {delivery.method === "community_delivery"
              ? "Community delivery"
              : "Self pickup"}
          </span>
        </div>
      </div>

      {isAssigned && (
        <div className="volunteer-assigned-info">
          <h4>Coordination details</h4>

          <p>
            <User size={15} />
            Requester: {delivery.requester?.name || "Not available"}
          </p>

          <p>
            <User size={15} />
            Provider: {delivery.provider?.name || "Not available"}
          </p>

          {delivery.deliveryAddress && (
            <p>
              <MapPin size={15} />
              Delivery address: {delivery.deliveryAddress}
            </p>
          )}

          {delivery.pickupAddress && (
            <p>
              <MapPin size={15} />
              Pickup address: {delivery.pickupAddress}
            </p>
          )}

          {delivery.transportDetails && (
            <p className="transport-notes">
              Notes: {delivery.transportDetails}
            </p>
          )}

          {typeof delivery.quotedCost === "number" && (
            <p>
              Cost quote: {delivery.costCurrency || "INR"}{" "}
              {delivery.quotedCost}
            </p>
          )}


          <div className="volunteer-status-actions">
            {delivery.status === "dispatched" && (
              <button
                className="volunteer-progress-btn"
                onClick={() => handleStatusUpdate(delivery._id, "in_transit")}
                disabled={updatingId === delivery._id}
              >
                {updatingId === delivery._id ? "Updating..." : "Mark in transit"}
              </button>
            )}
            {delivery.status === "in_transit" && (
              <button
                className="volunteer-progress-btn"
                onClick={() => handleStatusUpdate(delivery._id, "delivered")}
                disabled={updatingId === delivery._id}
              >
                {updatingId === delivery._id ? "Updating..." : "Mark delivered"}
              </button>
            )}
            {delivery.status === "delivered" && (
              <p className="volunteer-delivered-note">
                <CheckCircle size={16} /> Awaiting requester receipt confirmation
              </p>
            )}
          </div>
          <div className="volunteer-flow-note">
            <CheckCircle size={16} />
            The provider dispatches the resource. You update its journey, and the requester confirms receipt.
          </div>
        </div>
      )}

      {!isAssigned && (
        <button
          className="claim-delivery-btn"
          onClick={() => handleClaim(delivery._id)}
          disabled={claimingId === delivery._id}
        >
          {claimingId === delivery._id ? "Claiming..." : "Claim delivery"}
        </button>
      )}
    </article>
  );

  return (
    <div className="volunteer-deliveries-page">
      <div className="volunteer-page-heading">
        <div>
          <span className="volunteer-eyebrow">VOLUNTEER CENTRE</span>
          <h1>Delivery coordination</h1>
          <p>Find deliveries that need help or manage your assignments.</p>
        </div>

        <button
          className="volunteer-refresh-btn"
          onClick={fetchDeliveries}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="volunteer-tabs">
        <button
          className={activeTab === "available" ? "active" : ""}
          onClick={() => setActiveTab("available")}
        >
          Available ({available.length})
        </button>

        <button
          className={activeTab === "assigned" ? "active" : ""}
          onClick={() => setActiveTab("assigned")}
        >
          My assignments ({assigned.length})
        </button>
      </div>

      {message && (
        <div className="volunteer-message" role="status">
          {message}
        </div>
      )}

      {loading ? (
        <div className="volunteer-empty-state">Loading deliveries...</div>
      ) : activeTab === "available" ? (
        available.length > 0 ? (
          <div className="volunteer-delivery-grid">
            {available.map((delivery) =>
              renderDeliveryCard(delivery, false)
            )}
          </div>
        ) : (
          <div className="volunteer-empty-state">
            <Truck size={34} />
            <h3>No deliveries available right now</h3>
            <p>Check back later for new community delivery opportunities.</p>
          </div>
        )
      ) : assigned.length > 0 ? (
        <div className="volunteer-delivery-grid">
          {assigned.map((delivery) => renderDeliveryCard(delivery, true))}
        </div>
      ) : (
        <div className="volunteer-empty-state">
          <Package size={34} />
          <h3>You have no assigned deliveries yet</h3>
          <p>Claim an available delivery to see it here.</p>
        </div>
      )}
    </div>
  );
}

export default VolunteerDeliveriesPage;