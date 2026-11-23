
import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  RefreshCw,
  XCircle,
} from "lucide-react";
import api from "../../services/api";
import "./RequesterOffersPage.css";

interface Offer {
  _id: string;
  status: "pending" | "accepted" | "rejected" | "expired" | "cancelled";
  quantity: number;
  offeredAt: string;
  requesterConfirmed: boolean;
  request?: {
    title: string;
    category: string;
    location: string;
    urgency: string;
  };
  resource?: {
    title: string;
    description: string;
    category: string;
    quantity: number;
    unit: string;
    location: string;
    condition: string;
  };
  provider?: {
    name: string;
    location: string;
  };
}

function RequesterOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/offers/requester/my");
      setOffers(response.data.offers || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Unable to load your offers."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const confirmOffer = async (offerId: string) => {
    if (!window.confirm("Confirm this provider's offer?")) return;

    try {
      setProcessingId(offerId);
      await api.patch(`/offers/${offerId}/confirm`);
      await fetchOffers();
    } catch {
      setError("Unable to confirm this offer. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const cancelOffer = async (offerId: string) => {
    if (!window.confirm("Are you sure you want to cancel this offer?")) return;

    try {
      setProcessingId(offerId);
      await api.patch(`/offers/${offerId}/cancel`);
      await fetchOffers();
    } catch {
      setError("Unable to cancel this offer. Please try again.");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredOffers = offers.filter(
    (offer) => filter === "all" || offer.status === filter
  );

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  if (loading) {
    return (
      <div className="offers-loading">
        <Clock3 size={28} />
        <p>Loading your offers...</p>
      </div>
    );
  }

  return (
    <div className="requester-offers-page">
      <div className="offers-heading">
        <div>
          <span className="section-eyebrow">COMMUNITY MATCHES</span>
          <h1>Offers Received</h1>
          <p>Review the resources your community has offered you.</p>
        </div>

        <button className="offers-refresh" onClick={fetchOffers}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="offers-stats">
        <div>
          <span>Total Offers</span>
          <strong>{offers.length}</strong>
        </div>
        <div>
          <span>Awaiting Confirmation</span>
          <strong>
            {
              offers.filter(
                (offer) =>
                  offer.status === "accepted" && !offer.requesterConfirmed
              ).length
            }
          </strong>
        </div>
        <div>
          <span>Confirmed</span>
          <strong>
            {
              offers.filter(
                (offer) =>
                  offer.status === "accepted" && offer.requesterConfirmed
              ).length
            }
          </strong>
        </div>
      </div>

      <div className="offers-filter">
        {["all", "pending", "accepted", "rejected", "expired", "cancelled"].map(
          (status) => (
            <button
              key={status}
              className={filter === status ? "active" : ""}
              onClick={() => setFilter(status)}
            >
              {status === "all"
                ? "All Offers"
                : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          )
        )}
      </div>

      {error && (
        <div className="offers-error">
          <XCircle size={18} />
          {error}
        </div>
      )}

      {filteredOffers.length === 0 ? (
        <div className="offers-empty">
          <Package size={38} />
          <h3>No offers found</h3>
          <p>
            When a provider responds to your request, their offer will appear
            here.
          </p>
        </div>
      ) : (
        <div className="offers-list">
          {filteredOffers.map((offer) => (
            <article className="offer-card" key={offer._id}>
              <div className="offer-card-heading">
                <div>
                  <span className="offer-category">
                    {offer.resource?.category || "Community resource"}
                  </span>
                  <h3>{offer.resource?.title || "Resource offer"}</h3>
                </div>

                <span className={`offer-status status-${offer.status}`}>
                  {offer.status}
                </span>
              </div>

              <p className="offer-description">
                {offer.resource?.description || "No description provided."}
              </p>

              <div className="offer-information">
                <div>
                  <span>Offered by</span>
                  <strong>{offer.provider?.name || "Community provider"}</strong>
                </div>
                <div>
                  <span>Quantity offered</span>
                  <strong>
                    {offer.quantity} {offer.resource?.unit || ""}
                  </strong>
                </div>
                <div>
                  <span>Your request</span>
                  <strong>{offer.request?.title || "Request"}</strong>
                </div>
              </div>

              <div className="offer-location">
                <MapPin size={15} />
                {offer.resource?.location || offer.provider?.location || "Location not available"}
              </div>

              <div className="offer-footer">
                <span className="offer-date">
                  Offered on {formatDate(offer.offeredAt)}
                </span>

                <div className="offer-actions">
                  {offer.status === "accepted" &&
                    !offer.requesterConfirmed && (
                      <button
                        className="confirm-offer-btn"
                        disabled={processingId === offer._id}
                        onClick={() => confirmOffer(offer._id)}
                      >
                        <CheckCircle2 size={16} />
                        {processingId === offer._id
                          ? "Processing..."
                          : "Confirm Offer"}
                      </button>
                    )}

                  {["pending", "accepted"].includes(offer.status) && (
                    <button
                      className="cancel-offer-btn"
                      disabled={processingId === offer._id}
                      onClick={() => cancelOffer(offer._id)}
                    >
                      Cancel
                    </button>
                  )}

                  {offer.status === "accepted" &&
                    offer.requesterConfirmed && (
                      <span className="confirmed-label">
                        <CheckCircle2 size={16} />
                        Confirmed by you
                      </span>
                    )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default RequesterOffersPage;
