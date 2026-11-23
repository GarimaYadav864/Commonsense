
import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
  Edit3,
  LoaderCircle,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import api from "../../services/api";
import "./ProviderResourcesPage.css";

interface Resource {
  _id: string;
  title: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  condition: string;
  location: string;
  status: string;
}

interface ResourceForm {
  title: string;
  description: string;
  category: string;
  quantity: string;
  unit: string;
  condition: string;
  location: string;
}

const initialForm: ResourceForm = {
  title: "",
  description: "",
  category: "food",
  quantity: "1",
  unit: "pieces",
  condition: "good",
  location: "",
};

function ProviderResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [form, setForm] = useState<ResourceForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/resources/my");
      const data = response.data;

      setResources(
        Array.isArray(data)
          ? data
          : data.resources || data.data || []
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Unable to load resources."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const updateField = (field: keyof ResourceForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEditForm = (resource: Resource) => {
    setEditingId(resource._id);
    setForm({
      title: resource.title,
      description: resource.description,
      category: resource.category,
      quantity: String(resource.quantity),
      unit: resource.unit,
      condition: resource.condition,
      location: resource.location,
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const quantity = Number(form.quantity);

    if (!form.title.trim() || !form.description.trim()) {
      setError("Please enter a resource title and description.");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    if (!form.location.trim()) {
      setError("Please enter the resource location.");
      return;
    }

    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      quantity,
      location: form.location.trim(),
    };

    try {
      setSaving(true);

      if (editingId) {
        await api.patch(`/resources/${editingId}`, payload);
        setSuccess("Resource updated successfully.");
      } else {
        await api.post("/resources", payload);
        setSuccess("Resource added successfully.");
      }

      closeForm();
      await fetchResources();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save this resource. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (resourceId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this resource listing?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");
      await api.delete(`/resources/${resourceId}`);
      setSuccess("Resource deleted successfully.");
      await fetchResources();
    } catch {
      setError("Unable to delete this resource. Please try again.");
    }
  };

  const handleAvailability = async (resource: Resource) => {
    const nextStatus =
      resource.status.toLowerCase() === "available"
        ? "unavailable"
        : "available";

    try {
      setError("");
      await api.patch(`/resources/${resource._id}`, {
        status: nextStatus,
      });
      await fetchResources();
      setSuccess(`Resource marked ${nextStatus}.`);
    } catch {
      setError("Unable to update resource availability.");
    }
  };

  return (
    <div className="provider-resources-page">
      <div className="resources-page-heading">
        <div>
          <span className="section-eyebrow">YOUR CONTRIBUTIONS</span>
          <h1>My Resources</h1>
          <p>Manage the resources you make available to your community.</p>
        </div>

        <button className="resource-add-btn" onClick={openAddForm}>
          <Plus size={18} />
          Add Resource
        </button>
      </div>

      <div className="resource-overview">
        <div>
          <span>Total Listings</span>
          <strong>{resources.length}</strong>
        </div>
        <div>
          <span>Available</span>
          <strong>
            {
              resources.filter(
                (r) => r.status.toLowerCase() === "available"
              ).length
            }
          </strong>
        </div>
        <div>
          <span>Unavailable</span>
          <strong>
            {
              resources.filter(
                (r) => r.status.toLowerCase() === "unavailable"
              ).length
            }
          </strong>
        </div>
      </div>

      {error && <div className="resource-message error">{error}</div>}
      {success && <div className="resource-message success">{success}</div>}

      {showForm && (
        <section className="resource-form-panel">
          <div className="resource-form-heading">
            <div>
              <h2>{editingId ? "Edit Resource" : "Add a Resource"}</h2>
              <p>Provide accurate details so the right people can find it.</p>
            </div>
            <button
              type="button"
              className="resource-close-btn"
              onClick={closeForm}
              aria-label="Close form"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="resource-form-grid">
              <label>
                Resource title *
                <input
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g. Grocery kit"
                  required
                />
              </label>

              <label>
                Category *
                <select
                  value={form.category}
                  onChange={(e) => updateField("category", e.target.value)}
                >
                  <option value="food">Food</option>
                  <option value="clothing">Clothing</option>
                  <option value="education">Education</option>
                  <option value="medical">Medical</option>
                  <option value="shelter">Shelter</option>
                  <option value="household">Household</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label className="resource-full-width">
                Description *
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    updateField("description", e.target.value)
                  }
                  placeholder="Describe the resource and what is included..."
                  rows={3}
                  required
                />
              </label>

              <label>
                Quantity *
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => updateField("quantity", e.target.value)}
                  required
                />
              </label>

              <label>
                Unit *
                <select
                  value={form.unit}
                  onChange={(e) => updateField("unit", e.target.value)}
                >
                  <option value="pieces">Pieces</option>
                  <option value="kg">Kilograms</option>
                  <option value="litres">Litres</option>
                  <option value="packets">Packets</option>
                  <option value="sets">Sets</option>
                  <option value="boxes">Boxes</option>
                  <option value="other">Other</option>
                </select>
              </label>

              <label>
                Condition *
                <select
                  value={form.condition}
                  onChange={(e) => updateField("condition", e.target.value)}
                >
                  <option value="new">New</option>
                  <option value="good">Good</option>
                  <option value="used">Used</option>
                  <option value="refurbished">Refurbished</option>
                </select>
              </label>

              <label>
                Location *
                <input
                  value={form.location}
                  onChange={(e) => updateField("location", e.target.value)}
                  placeholder="Area, city"
                  required
                />
              </label>
            </div>

            <div className="resource-form-actions">
              <button
                type="button"
                className="resource-secondary-btn"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="resource-add-btn"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Publish Resource"}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="resource-list-heading">
        <div>
          <h2>Resource Listings</h2>
          <p>{resources.length} resource(s) in your inventory</p>
        </div>
        <button
          className="resource-refresh-btn"
          onClick={fetchResources}
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {loading ? (
        <div className="resource-empty-state">
          <LoaderCircle className="resource-spin" size={28} />
          <p>Loading your resources...</p>
        </div>
      ) : resources.length === 0 ? (
        <div className="resource-empty-state">
          <Package size={38} />
          <h3>No resources listed yet</h3>
          <p>Add your first resource to start contributing to your community.</p>
          <button className="resource-add-btn" onClick={openAddForm}>
            <Plus size={17} /> Add Your First Resource
          </button>
        </div>
      ) : (
        <div className="resource-management-grid">
          {resources.map((resource) => (
            <article className="managed-resource-card" key={resource._id}>
              <div className="managed-resource-top">
                <span className="managed-resource-category">
                  {resource.category}
                </span>
                <span
                  className={`managed-resource-status ${resource.status.toLowerCase()}`}
                >
                  {resource.status}
                </span>
              </div>

              <h3>{resource.title}</h3>
              <p className="managed-resource-description">
                {resource.description}
              </p>

              <div className="managed-resource-details">
                <span>
                  <strong>Quantity:</strong> {resource.quantity} {resource.unit}
                </span>
                <span>
                  <strong>Condition:</strong> {resource.condition}
                </span>
              </div>

              <div className="managed-resource-location">
                <MapPin size={15} />
                {resource.location}
              </div>

              <div className="managed-resource-actions">
                <button onClick={() => openEditForm(resource)}>
                  <Edit3 size={15} /> Edit
                </button>
                <button
                  onClick={() => handleAvailability(resource)}
                  disabled={
                    !["available", "unavailable"].includes(
                      resource.status.toLowerCase()
                    )
                  }
                >
                  {resource.status.toLowerCase() === "available"
                    ? "Mark Unavailable"
                    : "Mark Available"}
                </button>
                <button
                  className="resource-delete-btn"
                  onClick={() => handleDelete(resource._id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProviderResourcesPage;

