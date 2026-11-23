
import "./StatusBadge.css";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const formatStatus = (status: string): string => {
  if (!status) return "Unknown";

  return status
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getStatusClass = (status: string): string => {
  const normalized = status.toLowerCase().trim().replace(/[\s-]+/g, "_");

  const statusClasses: Record<string, string> = {
    // Requests
    pending: "pending",
    matching: "matching",
    offered: "offered",
    fulfilled: "fulfilled",
    cancelled: "cancelled",

    // Resources
    available: "available",
    unavailable: "unavailable",

    // Offers
    accepted: "accepted",
    rejected: "rejected",
    expired: "expired",

    // Deliveries
    arranged: "arranged",
    dispatched: "dispatched",
    delivered: "delivered",
    received: "received",

    // General
    active: "active",
    inactive: "inactive",
    completed: "completed",
    approved: "approved",
    suspended: "suspended",
  };

  return statusClasses[normalized] || "default";
};

export default function StatusBadge({
  status,
  className = "",
}: StatusBadgeProps) {
  const statusClass = getStatusClass(status);

  return (
    <span
      className={`status-badge status-${statusClass} ${className}`.trim()}
      title={formatStatus(status)}
    >
      <span className="status-badge-dot" />
      {formatStatus(status)}
    </span>
  );
}
