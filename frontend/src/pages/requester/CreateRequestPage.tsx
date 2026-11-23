
import { useState, type FormEvent } from "react";

import {
  ArrowLeft,
  PackagePlus,
  MapPin,
  Send,
  Info,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "./CreateRequestPage.css";

type RequestForm = {
  title: string;
  description: string;
  category: string;
  quantity: string;
  unit: string;
  location: string;
  urgency: string;
};

const initialForm: RequestForm = {
  title: "",
  description: "",
  category: "",
  quantity: "1",
  unit: "",
  location: "",
  urgency: "medium",
};

export default function CreateRequestPage() {
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [form, setForm] = useState<RequestForm>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  const updateField = (field: keyof RequestForm, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
    setSuccess("");

    if (field === "location") {
      setCoordinates(null);
      setLocationError("");
    }
  };

  const captureCurrentLocation = () => {
    setLocationError("");
    setCoordinates(null);

    if (!window.isSecureContext) {
      setLocationError("Location requires a secure HTTPS connection. Please open the deployed Commonsense website.");
      return;
    }

    if (!("geolocation" in navigator)) {
      setLocationError("This browser does not support location access. Please enter your area manually.");
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          setLocationError("Your device returned invalid coordinates. Please try again.");
          setLocationLoading(false);
          return;
        }

        setCoordinates({ latitude, longitude });
        setLocationLoading(false);
      },
      (error) => {
        const messages: Record<number, string> = {
          1: "Location permission was denied. Allow location access for this site in your browser settings, then try again.",
          2: "Your device could not determine a location. Turn on Windows Location Services or connect to Wi-Fi, then try again.",
          3: "Location lookup timed out. Try again with Wi-Fi enabled, or enter your area manually.",
        };

        setLocationError(
          messages[error.code] ||
            `Unable to fetch location (browser error ${error.code}): ${error.message || "Unknown error"}`
        );
        setLocationLoading(false);
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 300000 }
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.title.trim()) newErrors.title = "Please enter a request title.";
    if (!form.description.trim())
      newErrors.description = "Please describe what you need.";
    if (!form.category) newErrors.category = "Please select a category.";
    if (!form.quantity || Number(form.quantity) <= 0)
      newErrors.quantity = "Quantity must be greater than zero.";
    if (!form.unit) newErrors.unit = "Please select a unit.";
    if (!form.location.trim())
      newErrors.location = "Please enter your location.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess("");
    setApiError("");

    if (!createdRequestId && !validateForm()) return;

    setSubmitting(true);

    try {
      let requestId = createdRequestId;

      if (!requestId) {
        const response = await api.post("/requests", {
          ...form,
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category,
          quantity: Number(form.quantity),
          location: form.location.trim(),
          ...(coordinates
            ? {
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
              }
            : {}),
          urgency: form.urgency,
        });

        requestId = response.data.request?._id;

        if (!requestId) {
          throw new Error("The server did not return the created request.");
        }

        setCreatedRequestId(requestId);
      }

      const matchingResponse = await api.post(`/offers/start/${requestId}`);
      setSuccess(
        matchingResponse.data.offer
          ? "Your request was created and a provider has been notified."
          : matchingResponse.data.message || "Your request was created."
      );
    } catch (error: unknown) {
      const responseMessage = (
        error as { response?: { data?: { message?: string } } }
      ).response?.data?.message;

      setApiError(
        responseMessage ||
          (error instanceof Error
            ? error.message
            : "Unable to submit your request. Please try again.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-request-page">
      <Link to="/requester/dashboard" className="request-back-link">
        <ArrowLeft size={17} />
        Back to dashboard
      </Link>

      <div className="request-page-heading">
        <div className="request-heading-icon">
          <PackagePlus size={25} />
        </div>
        <div>
          <span className="request-eyebrow">COMMUNITY SUPPORT</span>
          <h1>Create a request</h1>
          <p>
            Tell us what you need. Commonsense will help connect you with
            available resources.
          </p>
        </div>
      </div>

      <div className="request-form-layout">
        <form className="request-form-card" onSubmit={handleSubmit} noValidate>
          <div className="request-form-section-heading">
            <h2>Request details</h2>
            <span>Required fields *</span>
          </div>

          <div className="request-field">
            <label htmlFor="request-title">What do you need? *</label>
            <input
              id="request-title"
              type="text"
              placeholder="e.g. Need 10 blankets for a family"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
            />
            {errors.title && <small className="field-error">{errors.title}</small>}
          </div>

          <div className="request-field">
            <label htmlFor="request-description">Description *</label>
            <textarea
              id="request-description"
              rows={5}
              placeholder="Explain your requirement, intended use and any important details..."
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
            />
            {errors.description && (
              <small className="field-error">{errors.description}</small>
            )}
          </div>

          <div className="request-field">
            <label htmlFor="request-category">Resource category *</label>
            <select
              id="request-category"
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
            >
              <option value="">Select a category</option>
              <option value="food">Food</option>
              <option value="clothing">Clothing</option>
              <option value="education">Education</option>
              <option value="medical">Medical</option>
              <option value="shelter">Shelter</option>
              <option value="household">Household essentials</option>
              <option value="other">Other</option>
            </select>
            {errors.category && (
              <small className="field-error">{errors.category}</small>
            )}
          </div>

          <div className="request-form-two-columns">
            <div className="request-field">
              <label htmlFor="request-quantity">Quantity *</label>
              <input
                id="request-quantity"
                type="number"
                min="0.01"
                step="any"
                value={form.quantity}
                onChange={(e) => updateField("quantity", e.target.value)}
              />
              {errors.quantity && (
                <small className="field-error">{errors.quantity}</small>
              )}
            </div>

            <div className="request-field">
              <label htmlFor="request-unit">Unit *</label>
              <select
                id="request-unit"
                value={form.unit}
                onChange={(e) => updateField("unit", e.target.value)}
              >
                <option value="">Select unit</option>
                <option value="pieces">Pieces</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="litres">Litres</option>
                <option value="packets">Packets</option>
                <option value="sets">Sets</option>
                <option value="boxes">Boxes</option>
                <option value="other">Other</option>
              </select>
              {errors.unit && (
                <small className="field-error">{errors.unit}</small>
              )}
            </div>
          </div>

          <div className="request-field">
            <label htmlFor="request-location">
              <MapPin size={15} /> Location *
            </label>
            <input
              id="request-location"
              type="text"
              placeholder="Enter your area, city or locality"
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
            />
            <button
              type="button"
              className="request-cancel-button"
              onClick={captureCurrentLocation}
              disabled={locationLoading || submitting}
            >
              <MapPin size={15} />
              {locationLoading ? "Getting location..." : "Use my current location"}
            </button>
            {coordinates && (
              <small className="field-hint" role="status">
                Location captured: {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}. Distance-based matching is enabled.
              </small>
            )}
            {locationError && (
              <small className="field-error" role="status">{locationError}</small>
            )}
            {errors.location && (
              <small className="field-error">{errors.location}</small>
            )}
            <small className="field-hint">
              This helps us identify relevant nearby resource providers.
            </small>
          </div>

          <div className="request-field">
            <label>Urgency level</label>
            <div className="urgency-options">
              {[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
                { value: "critical", label: "Critical" },
              ].map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`urgency-option ${
                    form.urgency === option.value ? "selected" : ""
                  } urgency-${option.value}`}
                  onClick={() => updateField("urgency", option.value)}
                  aria-pressed={form.urgency === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {apiError && (
            <div className="request-error" role="alert">
              {createdRequestId
                ? `Your request was created, but matching did not start: ${apiError}`
                : apiError}
            </div>
          )}

          {success && (
            <div className="request-success" role="status">
              {success} <Link to="/requester/requests">View my requests</Link>
            </div>
          )}

          <div className="request-form-footer">
            <Link to="/requester/dashboard" className="request-cancel-button">
              Cancel
            </Link>
            <button
              type="submit"
              className="request-submit-button"
              disabled={submitting}
            >
              <Send size={16} />
              {submitting
                ? "Submitting..."
                : createdRequestId
                  ? "Retry matching"
                  : "Submit request"}
            </button>
          </div>
        </form>

        <aside className="request-guidance-card">
          <div className="guidance-icon">
            <Info size={21} />
          </div>
          <h3>A helpful request gets matched faster.</h3>
          <p>Here are a few things to keep in mind:</p>
          <ul>
            <li>Use a clear and specific title.</li>
            <li>Mention the quantity you actually need.</li>
            <li>Provide an accurate location.</li>
            <li>Choose the urgency that best describes your situation.</li>
          </ul>
          <div className="guidance-note">
            <strong>Our promise</strong>
            <p>
              Your request helps connect community members with resources
              through a transparent matching process.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
