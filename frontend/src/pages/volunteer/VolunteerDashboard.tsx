
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Truck,
  PackageCheck,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import api from "../../services/api";
import "./VolunteerDashboard.css";

interface Delivery {
  _id: string;
  status: string;
  method: string;
  request?: {
    title?: string;
    category?: string;
  };
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (error as {
      response?: { data?: { message?: string } };
    }).response;

    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to load your dashboard. Please try again.";
}

function VolunteerDashboard() {
  const [available, setAvailable] = useState(0);
  const [assigned, setAssigned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [availableRes, myRes] = await Promise.all([
        api.get("/deliveries/available"),
        api.get("/deliveries/my"),
      ]);

      const availableDeliveries: Delivery[] =
        availableRes.data.deliveries || [];

      const myDeliveries: Delivery[] =
        myRes.data.deliveries || [];

      setAvailable(availableDeliveries.length);
      setAssigned(myDeliveries.length);
    } catch (err: unknown) {
      console.error("Volunteer dashboard error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return (
    <div className="volunteer-dashboard">
      <div className="volunteer-welcome">
        <div>
          <span className="volunteer-eyebrow">
            COMMUNITY VOLUNTEER
          </span>

          <h1>Make a difference, one delivery at a time.</h1>

          <p>
            Help connect community resources with the people who need them.
          </p>
        </div>

        <div className="volunteer-welcome-icon">
          <Truck size={46} />
        </div>
      </div>

      {error && (
        <div className="volunteer-dashboard-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>

          <button
            type="button"
            onClick={fetchDashboard}
            disabled={loading}
          >
            Retry
          </button>
        </div>
      )}

      <div className="volunteer-stats">
        <div className="volunteer-stat-card">
          <div className="volunteer-stat-icon available">
            <Truck size={22} />
          </div>

          <div>
            <span>Available deliveries</span>
            <h2>{loading ? "—" : available}</h2>
          </div>
        </div>

        <div className="volunteer-stat-card">
          <div className="volunteer-stat-icon assigned">
            <PackageCheck size={22} />
          </div>

          <div>
            <span>My assigned deliveries</span>
            <h2>{loading ? "—" : assigned}</h2>
          </div>
        </div>
      </div>

      <section className="volunteer-action-card">
        <div>
          <span className="volunteer-eyebrow">TAKE ACTION</span>

          <h2>Ready to help someone today?</h2>

          <p>
            Browse community delivery requests and claim one that you can
            coordinate.
          </p>

          <Link
            to="/volunteer/deliveries"
            className="volunteer-action-link"
          >
            Explore deliveries <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <button
        type="button"
        className="volunteer-refresh"
        onClick={fetchDashboard}
        disabled={loading}
      >
        <RefreshCw
          size={16}
          className={loading ? "refresh-spinning" : ""}
        />

        {loading ? "Refreshing..." : "Refresh dashboard"}
      </button>
    </div>
  );
}

export default VolunteerDashboard;
