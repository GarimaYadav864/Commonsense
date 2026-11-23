import { useEffect, useState } from "react";
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MapPin,
  User,
  CalendarDays,
  Package,
  ClipboardList,
} from "lucide-react";
import api from "../../services/api";
import "./AdminRecords.css";

type RecordType = "requests" | "resources";

interface AdminRecord {
  _id: string;
  title: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  location: string;
  status: string;
  urgency?: string;
  condition?: string;
  createdAt: string;
  requester?: { name: string; email: string };
  provider?: { name: string; email: string };
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const requestStatuses = [
  "pending",
  "matching",
  "offered",
  "fulfilled",
  "cancelled",
];

const resourceStatuses = ["available", "unavailable", "fulfilled"];

export default function AdminRecords() {
  const [recordType, setRecordType] = useState<RecordType>("requests");
  const [records, setRecords] = useState<AdminRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const statuses =
    recordType === "requests" ? requestStatuses : resourceStatuses;

  useEffect(() => {
    let cancelled = false;

    const fetchRecords = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(
          `/admin/records/${recordType}`,
          {
            params: {
              page,
              limit: 10,
              search: search.trim() || undefined,
              location: location.trim() || undefined,
              category: category || undefined,
              status: status || undefined,
            },
          }
        );

        if (!cancelled) {
          setRecords(response.data.records || []);
          setPagination(response.data.pagination);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load records. Please try again."
          );
          setRecords([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timer = setTimeout(fetchRecords, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [recordType, page, search, location, category, status, refreshKey]);

  const changeType = (type: RecordType) => {
    setRecordType(type);
    setPage(1);
    setStatus("");
    setCategory("");
    setLocation("");
    setSearch("");
    setExpandedId(null);
  };

  const resetFilters = () => {
    setSearch("");
    setLocation("");
    setCategory("");
    setStatus("");
    setPage(1);
    setExpandedId(null);
  };

  const owner = (record: AdminRecord) =>
    recordType === "requests" ? record.requester : record.provider;

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <section className="admin-records-page">
      <div className="records-heading">
        <div>
          <span className="records-eyebrow">ADMIN WORKSPACE</span>
          <h1>Requests & Resources</h1>
          <p>Monitor community needs and shared resources.</p>
        </div>

        <button
          className="records-refresh"
          onClick={() => setRefreshKey((current) => current + 1)}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="records-tabs">
        <button
          className={recordType === "requests" ? "active" : ""}
          onClick={() => changeType("requests")}
        >
          <ClipboardList size={18} />
          Requests
        </button>

        <button
          className={recordType === "resources" ? "active" : ""}
          onClick={() => changeType("resources")}
        >
          <Package size={18} />
          Resources
        </button>
      </div>

      <div className="records-toolbar">
        <div className="records-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search title, description or category..."
          />
        </div>

        <input
          className="records-filter-input"
          value={location}
          onChange={(event) => {
            setLocation(event.target.value);
            setPage(1);
          }}
          placeholder="Filter by location"
        />

        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </option>
          ))}
        </select>

        <input
          className="records-filter-input category-filter"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
          }}
          placeholder="Category (e.g. food)"
        />

        <button className="records-reset" onClick={resetFilters}>
          Reset
        </button>
      </div>

      <div className="records-summary">
        <span>
          {loading
            ? "Loading records..."
            : `${pagination.total} ${recordType} found`}
        </span>
        <span>Page {pagination.page} of {Math.max(1, pagination.pages)}</span>
      </div>

      {error && <div className="records-error">{error}</div>}

      <div className="records-list">
        {!loading && !error && records.length === 0 && (
          <div className="records-empty">
            <Package size={30} />
            <h3>No records found</h3>
            <p>Try changing your search or filters.</p>
          </div>
        )}

        {records.map((record) => {
          const isExpanded = expandedId === record._id;

          return (
            <article className="record-card" key={record._id}>
              <button
                className="record-card-main"
                onClick={() =>
                  setExpandedId(isExpanded ? null : record._id)
                }
              >
                <div className="record-icon">
                  {recordType === "requests" ? (
                    <ClipboardList size={21} />
                  ) : (
                    <Package size={21} />
                  )}
                </div>

                <div className="record-primary">
                  <h3>{record.title}</h3>
                  <span>{record.category}</span>
                </div>

                <div className="record-quantity">
                  <strong>{record.quantity} {record.unit}</strong>
                  <span>Quantity</span>
                </div>

                <span className={`record-status status-${record.status}`}>
                  {record.status}
                </span>

                <ChevronDown
                  className={isExpanded ? "expanded" : ""}
                  size={19}
                />
              </button>

              {isExpanded && (
                <div className="record-details">
                  <p>{record.description}</p>

                  <div className="record-detail-grid">
                    <span>
                      <MapPin size={15} />
                      {record.location}
                    </span>

                    <span>
                      <User size={15} />
                      {owner(record)?.name || "Unknown"}
                    </span>

                    <span>
                      <CalendarDays size={15} />
                      {formatDate(record.createdAt)}
                    </span>

                    {recordType === "requests" && record.urgency && (
                      <span>
                        Urgency: {record.urgency}
                      </span>
                    )}

                    {recordType === "resources" && record.condition && (
                      <span>
                        Condition: {record.condition}
                      </span>
                    )}
                  </div>

                  <small>
                    Owner email: {owner(record)?.email || "Unavailable"}
                  </small>

                  <small>Record ID: {record._id}</small>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="records-pagination">
        <button
          disabled={page <= 1 || loading}
          onClick={() => setPage((current) => current - 1)}
        >
          <ChevronLeft size={17} />
          Previous
        </button>

        <span>{page} / {Math.max(1, pagination.pages)}</span>

        <button
          disabled={page >= pagination.pages || loading}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
          <ChevronRight size={17} />
        </button>
      </div>
    </section>
  );
}
