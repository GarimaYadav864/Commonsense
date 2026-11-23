
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Clock3,
  Package,
  Plus,
  RefreshCw,
  Truck,
} from "lucide-react";
import api from "../../services/api";
import "./ProviderDashboard.css";
import CommunityRequestsPanel from "../../components/community/CommunityRequestsPanel";

interface Resource {
  _id: string;
  title: string;
  category: string;
  quantity: number;
  unit: string;
  status: string;
}

interface ProviderOffer {
  _id: string;
  status: string;
  offeredAt: string;
  request?: {
    title: string;
    category?: string;
    location?: string;
    urgency?: string;
  };
  resource?: {
    title: string;
  };
}

function ProviderDashboard() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [offers, setOffers] = useState<ProviderOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [resourceResponse, offerResponse] = await Promise.all([
        api.get("/resources/my"),
        api.get("/offers/provider/my"),
      ]);

      const resourceData = resourceResponse.data;
      const offerData = offerResponse.data;

      setResources(
        Array.isArray(resourceData)
          ? resourceData
          : resourceData.resources || resourceData.data || []
      );

      setOffers(
        Array.isArray(offerData)
          ? offerData
          : offerData.offers || offerData.data || []
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your provider dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const activeResources = resources.filter(
    (resource) => resource.status.toLowerCase() === "available"
  ).length;

  const pendingOffers = offers.filter(
    (offer) => offer.status.toLowerCase() === "pending"
  ).length;

  const acceptedOffers = offers.filter(
    (offer) => offer.status.toLowerCase() === "accepted"
  ).length;

  if (loading) {
    return (
      <div className="provider-loading">
        <Package size={30} />
        <p>Preparing your provider dashboard...</p>
      </div>
    );
  }

  return (
    <div className="provider-dashboard">
      <div className="provider-welcome">
        <div>
          <span className="section-eyebrow">PROVIDER WORKSPACE</span>
          <h1>Make a difference today.</h1>
          <p>
            Manage your resources and connect with people who need them.
          </p>
        </div>

        <Link to="/provider/resources/new" className="provider-primary-btn">
          <Plus size={18} />
          Add Resource
        </Link>
      </div>

      {error && (
        <div className="provider-error">
          {error}
          <button onClick={fetchDashboard}>Try again</button>
        </div>
      )}

      <div className="provider-stats">
        <div className="provider-stat-card">
          <div className="provider-stat-icon">
            <Package size={20} />
          </div>
          <span>Total Resources</span>
          <strong>{resources.length}</strong>
          <small>Resources listed by you</small>
        </div>

        <div className="provider-stat-card">
          <div className="provider-stat-icon">
            <Package size={20} />
          </div>
          <span>Available Resources</span>
          <strong>{activeResources}</strong>
          <small>Ready to be matched</small>
        </div>

        <div className="provider-stat-card">
          <div className="provider-stat-icon">
            <Clock3 size={20} />
          </div>
          <span>Pending Offers</span>
          <strong>{pendingOffers}</strong>
          <small>Waiting for your response</small>
        </div>

        <div className="provider-stat-card">
          <div className="provider-stat-icon">
            <Truck size={20} />
          </div>
          <span>Accepted Offers</span>
          <strong>{acceptedOffers}</strong>
          <small>Ready for fulfilment coordination</small>
        </div>
      </div>

      <CommunityRequestsPanel />

      <div className="provider-content-grid">
        <section className="provider-panel">
          <div className="provider-panel-heading">
            <div>
              <h2>My Resources</h2>
              <p>Resources you've made available to the community.</p>
            </div>

            <Link to="/provider/resources">
              View all <ArrowRight size={15} />
            </Link>
          </div>

          {resources.length === 0 ? (
            <div className="provider-empty">
              <Package size={30} />
              <h3>No resources listed yet</h3>
              <p>Add your first resource to start helping your community.</p>
              <Link to="/provider/resources/new">
                Add a Resource
              </Link>
            </div>
          ) : (
            <div className="provider-resource-list">
              {resources.slice(0, 5).map((resource) => (
                <div className="provider-resource-row" key={resource._id}>
                  <div>
                    <strong>{resource.title}</strong>
                    <span>
                      {resource.category} · {resource.quantity}{" "}
                      {resource.unit}
                    </span>
                  </div>
                  <span
                    className={`resource-status resource-${resource.status.toLowerCase()}`}
                  >
                    {resource.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="provider-panel">
          <div className="provider-panel-heading">
            <div>
              <h2>Recent Offers</h2>
              <p>Requests matched with your resources.</p>
            </div>

            <Link to="/provider/offers">
              View all <ArrowRight size={15} />
            </Link>
          </div>

          {offers.length === 0 ? (
            <div className="provider-empty">
              <Clock3 size={30} />
              <h3>No offers yet</h3>
              <p>Matching requests will appear here when available.</p>
            </div>
          ) : (
            <div className="provider-offer-list">
              {offers.slice(0, 5).map((offer) => (
                <div className="provider-offer-row" key={offer._id}>
                  <div>
                    <strong>
                      {offer.request?.title || "Community request"}
                    </strong>
                    <span>
                      {offer.request?.category || "Resource request"}
                    </span>
                  </div>
                  <span className={`offer-status offer-${offer.status}`}>
                    {offer.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="provider-community-banner">
        <div>
          <span>SMALL ACTS. STRONGER COMMUNITIES.</span>
          <h2>Your resources can make someone's day better.</h2>
          <p>
            Keep your listings updated so Commonsense can find relevant
            community matches.
          </p>
        </div>

        <Link to="/provider/resources/new">
          Share a Resource <ArrowRight size={17} />
        </Link>
      </section>

      <button className="provider-refresh" onClick={fetchDashboard}>
        <RefreshCw size={15} /> Refresh dashboard
      </button>
    </div>
  );
}

export default ProviderDashboard;

