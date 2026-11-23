
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
import "./ProviderOffersPage.css";

interface ProviderOffer {
  _id: string;
  quantity: number;
  status: string;
  offeredAt: string;
  expiresAt?: string;
  request?: {
    _id: string;
    title: string;
    description: string;
    category: string;
    quantity: number;
    unit: string;
    location: string;
    urgency: string;
  };
  resource?: {
    _id: string;
    title: string;
    category: string;
    quantity: number;
    unit: string;
    condition: string;
    location: string;
  };
  requester?: {
    name: string;
    location?: string;
  };
}

function ProviderOffersPage() {
  const [offers, setOffers] = useState<ProviderOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/offers/my");
      setOffers(response.data.offers || []);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load incoming offers."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const respondToOffer = async (
    offerId: string,
    response: "accepted" | "rejected"
  ) => {
    const confirmed = window.confirm(
      response === "accepted"
        ? "Accept this offer? The requested quantity will be reserved from your resource."
        : "Reject this offer? Commonsense will attempt to contact the next eligible provider."
    );

    if (!confirmed) return;

    try {
      setProcessingId(offerId);
      setError("");
      setSuccess("");

      const result = await api.patch(
        `/offers/${offerId}/respond`,
        { response }
      );

      setSuccess(
        result.data.message ||
          (response === "accepted"
            ? "Offer accepted successfully."
            : "Offer rejected successfully.")
      );

      await fetchOffers();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to process this offer."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) {
    return (
      <div className="provider-offers-loading">
        <Clock3 size={30} />
        <p>Checking incoming community offers...</p>
      </div>
    );
  }

  return (
    <div className="provider-offers-page">
      <div className="provider-offers-heading">
        <div>
          <span className="section-eyebrow">COMMUNITY CONNECTIONS</span>
          <h1>Incoming Offers</h1>
          <p>
            Review requests matched with your resources and decide how you
            would like to respond.
          </p>
        </div>

        <button className="provider-offers-refresh" onClick={fetchOffers}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="provider-offers-summary">
        <div>
          <span>Pending Offers</span>
          <strong>{offers.length}</strong>
        </div>
        <div>
          <span>Resources Matched</span>
          <strong>
            {new Set(offers.map((offer) => offer.resource?._id).filter(Boolean)).size}
          </strong>
        </div>
        <div>
          <span>Requests Matched</span>
          <strong>
            {new Set(offers.map((offer) => offer.request?._id).filter(Boolean)).size}
          </strong>
        </div>
      </div>

      {error && (
        <div className="provider-offer-message error">
          <XCircle size={17} />
          {error}
        </div>
      )}

      {success && (
        <div className="provider-offer-message success">
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      {offers.length === 0 ? (
        <div className="provider-offers-empty">
          <Package size={40} />
          <h3>No pending offers right now</h3>
          <p>
            When Commonsense matches your available resources with a
            community request, the offer will appear here.
          </p>
          <button onClick={fetchOffers}>Check Again</button>
        </div>
      ) : (
        <div className="provider-offers-list">
          {offers.map((offer) => (
            <article className="provider-offer-card" key={offer._id}>
              <div className="provider-offer-card-heading">
                <div>
                  <span className="matched-label">AI MATCHED REQUEST</span>
                  <h3>{offer.request?.title || "Community request"}</h3>
                </div>

                <span className="incoming-status">Awaiting response</span>
              </div>

              <p className="provider-offer-description">
                {offer.request?.description ||
                  "The requester has submitted a resource requirement."}
              </p>

              <div className="provider-offer-request-info">
                <div>
                  <span>Category</span>
                  <strong>{offer.request?.category || "Not specified"}</strong>
                </div>
                <div>
                  <span>Requested quantity</span>
                  <strong>
                    {offer.quantity} {offer.request?.unit || ""}
                  </strong>
                </div>
                <div>
                  <span>Urgency</span>
                  <strong className={`request-urgency ${offer.request?.urgency}`}>
                    {offer.request?.urgency || "Not specified"}
                  </strong>
                </div>
              </div>

              <div className="provider-offer-resource">
                <div className="offer-resource-icon">
                  <Package size={21} />
                </div>
                <div>
                  <span>Matched resource</span>
                  <strong>{offer.resource?.title || "Your resource"}</strong>
                  <small>
                    Available listing: {offer.resource?.quantity ?? "—"}{" "}
                    {offer.resource?.unit || ""}
                  </small>
                </div>
              </div>

              <div className="provider-offer-requester">
                <div>
                  <span>Requested by</span>
                  <strong>{offer.requester?.name || "Community member"}</strong>
                </div>
                <div className="requester-location">
                  <MapPin size={15} />
                  {offer.request?.location ||
                    offer.requester?.location ||
                    "Location not available"}
                </div>
              </div>

              <div className="provider-offer-footer">
                <span className="provider-offer-date">
                  <Clock3 size={14} />
                  Received {formatDate(offer.offeredAt)}
                </span>

                <div className="provider-offer-actions">
                  <button
                    className="reject-offer-btn"
                    disabled={processingId === offer._id}
                    onClick={() => respondToOffer(offer._id, "rejected")}
                  >
                    <XCircle size={16} />
                    Reject
                  </button>

                  <button
                    className="accept-offer-btn"
                    disabled={processingId === offer._id}
                    onClick={() => respondToOffer(offer._id, "accepted")}
                  >
                    <CheckCircle2 size={16} />
                    {processingId === offer._id
                      ? "Processing..."
                      : "Accept Offer"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProviderOffersPage;
