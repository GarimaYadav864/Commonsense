
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

interface ExistingDelivery {
  _id: string;
  offer: string | { _id: string };
  method: "self_pickup" | "community_delivery";
  pickupAddress?: string;
  deliveryAddress?: string;
  quotedCost: number;
  distanceKm?: number | null;
  costCurrency?: string;
  status: string;
}

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
  const [deliveryByOffer, setDeliveryByOffer] = useState<Record<string, ExistingDelivery>>({});
  const [arrangingOfferId, setArrangingOfferId] = useState<string | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<"self_pickup" | "community_delivery">("self_pickup");
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [transportDetails, setTransportDetails] = useState("");
  const [deliveryQuote, setDeliveryQuote] = useState<{ distanceKm: number; quotedCost: number; baseFare: number; ratePerKm: number; distanceCharge: number } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [offersResponse, deliveriesResponse] = await Promise.all([
        api.get("/offers/requester/my"),
        api.get("/deliveries/my"),
      ]);
      setOffers(offersResponse.data.offers || []);

      const deliveries: ExistingDelivery[] = deliveriesResponse.data.deliveries || [];
      const byOffer: Record<string, ExistingDelivery> = {};
      deliveries.forEach((delivery) => {
        const offerId =
          typeof delivery.offer === "string" ? delivery.offer : delivery.offer?._id;
        if (offerId) byOffer[offerId] = delivery;
      });
      setDeliveryByOffer(byOffer);
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

  const arrangeDelivery = async (offerId: string) => {
    if (deliveryMethod === "self_pickup" && !pickupAddress.trim()) {
      setError("Please enter the pickup address.");
      return;
    }
    if (deliveryMethod === "community_delivery" && !deliveryAddress.trim()) {
      setError("Please enter the delivery address.");
      return;
    }


    try {
      setProcessingId(offerId);
      setError("");
      await api.post("/deliveries", {
        offerId,
        method: deliveryMethod,
        pickupAddress: deliveryMethod === "self_pickup" ? pickupAddress.trim() : undefined,
        deliveryAddress: deliveryMethod === "community_delivery" ? deliveryAddress.trim() : undefined,
        transportDetails: transportDetails.trim(),
      });
      setArrangingOfferId(null);
      setPickupAddress("");
      setDeliveryAddress("");
      setTransportDetails("");
      setDeliveryQuote(null);
      await fetchOffers();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to create the delivery arrangement.");
    } finally {
      setProcessingId(null);
    }
  };

  const calculateQuote = async (offerId: string) => {
    try {
      setQuoteLoading(true);
      setError("");
      const response = await api.post("/deliveries/quote", { offerId });
      setDeliveryQuote(response.data.quote);
    } catch (err: any) {
      setDeliveryQuote(null);
      setError(err?.response?.data?.message || "Unable to calculate delivery estimate.");
    } finally {
      setQuoteLoading(false);
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

              {offer.status === "accepted" && offer.requesterConfirmed && (
                <div className="delivery-arrangement-panel">
                  {deliveryByOffer[offer._id] ? (
                    <div className="delivery-arranged-summary">
                      <strong>Delivery arranged</strong>
                      <span>
                        {deliveryByOffer[offer._id].method === "self_pickup"
                          ? "Self pickup"
                          : "Community delivery"}
                        {" · "}
                        {deliveryByOffer[offer._id].costCurrency || "INR"}{" "}
                        {deliveryByOffer[offer._id].quotedCost ?? 0}
                      </span>
                      <small>Status: {deliveryByOffer[offer._id].status}</small>
                    </div>
                  ) : arrangingOfferId === offer._id ? (
                    <div className="delivery-arrangement-form">
                      <h4>Arrange collection or delivery</h4>
                      <label>
                        Fulfilment option
                        <select
                          value={deliveryMethod}
                          onChange={(event) => setDeliveryMethod(event.target.value as "self_pickup" | "community_delivery")}
                        >
                          <option value="self_pickup">Self pickup</option>
                          <option value="community_delivery">Community delivery</option>
                        </select>
                      </label>
                      {deliveryMethod === "self_pickup" ? (
                        <label>
                          Pickup address
                          <input value={pickupAddress} onChange={(event) => setPickupAddress(event.target.value)} placeholder="Provider's pickup address" />
                        </label>
                      ) : (
                        <>
                          <label>
                            Delivery address
                            <input value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="Where should the resource be delivered?" />
                          </label>
                          <div className="delivery-quote-preview">
                            <button type="button" onClick={() => calculateQuote(offer._id)} disabled={quoteLoading}>
                              {quoteLoading ? "Calculating..." : "Calculate transport estimate"}
                            </button>
                            {deliveryQuote && (
                              <div>
                                <strong>Estimated charge: ₹{deliveryQuote.quotedCost}</strong>
                                <span>{deliveryQuote.distanceKm} km estimated · ₹{deliveryQuote.baseFare} base + ₹{deliveryQuote.ratePerKm}/km (distance charge ₹{deliveryQuote.distanceCharge.toFixed(2)})</span>
                              </div>
                            )}
                          </div>
                          <label>
                            Transport details
                            <input value={transportDetails} onChange={(event) => setTransportDetails(event.target.value)} placeholder="Optional delivery notes" />
                          </label>
                          <small>Estimate uses saved GPS coordinates, a 1.25 road-detour factor, ₹20 base fare and ₹8 per km. The server calculates and validates the final quote.</small>
                        </>
                      )}
                      <div className="delivery-arrangement-actions">
                        <button type="button" onClick={() => setArrangingOfferId(null)}>Cancel</button>
                        <button type="button" disabled={processingId === offer._id || (deliveryMethod === "community_delivery" && !deliveryQuote)} onClick={() => arrangeDelivery(offer._id)}>
                          {processingId === offer._id ? "Saving..." : "Confirm arrangement"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="confirm-offer-btn"
                      onClick={() => {
                        setDeliveryMethod("self_pickup");
                        setDeliveryQuote(null);
                        setArrangingOfferId(offer._id);
                        setError("");
                      }}
                    >
                      Arrange pickup / delivery
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default RequesterOffersPage;
