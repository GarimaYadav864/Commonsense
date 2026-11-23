
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Trash2,
  RefreshCw,
  Package,
  Truck,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./NotificationHistoryPage.css";

interface AppNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: string | null;
  relatedModel?: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

type FilterType = "all" | "unread";

function NotificationHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchNotifications = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/notifications", {
        params: {
            page,
            limit: 20,
            unreadOnly: filter === "unread",
        },
      });

      setNotifications(response.data.notifications || []);
      setPagination(response.data.pagination);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  const getNotificationPath = (notification: AppNotification) => {
    switch (notification.type) {
      case "offer_received":
        return "/provider/offers";

      case "offer_accepted":
      case "offer_rejected":
      case "request_matched":
      case "request_update":
        return "/requester/offers";

      case "delivery_claimed":
      case "delivery_dispatched":
      case "delivery_received":
        if (user?.role === "volunteer") {
          return "/volunteer/deliveries";
        }

        if (user?.role === "provider") {
          return "/provider/deliveries";
        }

        return "/requester/deliveries";

      default:
        return null;
    }
  };

  const handleOpen = async (notification: AppNotification) => {
    if (!notification.isRead) {
      try {
        await api.patch(`/notifications/${notification._id}/read`);

        setNotifications((previous) =>
          previous.map((item) =>
            item._id === notification._id
              ? { ...item, isRead: true }
              : item
          )
        );

        setUnreadCount((count) => Math.max(0, count - 1));
      } catch (err) {
        console.error("Unable to mark notification as read:", err);
      }
    }

    const destination = getNotificationPath(notification);

    if (destination) {
      navigate(destination);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");

      setNotifications((previous) =>
        previous.map((item) => ({ ...item, isRead: true }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error("Unable to mark all as read:", err);
    }
  };

  const handleDelete = async (id: string) => {
    const notification = notifications.find(
      (item) => item._id === id
    );

    try {
      await api.delete(`/notifications/${id}`);

      setNotifications((previous) =>
        previous.filter((item) => item._id !== id)
      );

      setPagination((previous) => ({
        ...previous,
        total: Math.max(0, previous.total - 1),
      }));

      if (notification && !notification.isRead) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
    } catch (err) {
      console.error("Unable to delete notification:", err);
    }
  };

  const filteredNotifications = notifications;

  const getIcon = (type: string) => {
    if (type.startsWith("offer")) return Package;
    if (type.startsWith("delivery")) return Truck;
    if (type.startsWith("request")) return ClipboardList;
    return Bell;
  };

  return (
    <div className="notification-history">
      <div className="notification-history-heading">
        <div>
          <span className="notification-eyebrow">
            YOUR ACTIVITY
          </span>
          <h1>Notifications</h1>
          <p>
            Stay updated on requests, offers and community deliveries.
          </p>
        </div>

        <button
          className="notification-refresh"
          onClick={() => fetchNotifications(pagination.page)}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="notification-summary">
        <div>
          <span>Total notifications</span>
          <strong>{pagination.total}</strong>
        </div>

        <div>
          <span>Unread notifications</span>
          <strong>{unreadCount}</strong>
        </div>
      </div>

      <div className="notification-history-toolbar">
        <div className="notification-filters">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All
          </button>

          <button
            className={filter === "unread" ? "active" : ""}
            onClick={() => setFilter("unread")}
          >
            Unread ({unreadCount})
          </button>
        </div>

        <button
          className="mark-all-button"
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck size={16} />
          Mark all as read
        </button>
      </div>

      {error && (
        <div className="notification-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="notification-history-empty">
          Loading notifications...
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="notification-history-empty">
          <Bell size={36} />
          <h3>
            {filter === "unread"
              ? "No unread notifications"
              : "You're all caught up!"}
          </h3>
          <p>New community updates will appear here.</p>
        </div>
      ) : (
        <div className="notification-history-list">
          {filteredNotifications.map((notification) => {
            const Icon = getIcon(notification.type);

            return (
              <article
                key={notification._id}
                className={`notification-history-card ${
                  notification.isRead ? "read" : "unread"
                }`}
              >
                <button
                  className="notification-history-main"
                  onClick={() => handleOpen(notification)}
                >
                  <div className="notification-history-icon">
                    <Icon size={21} />
                  </div>

                  <div className="notification-history-content">
                    <div className="notification-history-title">
                      <strong>{notification.title}</strong>
                      {!notification.isRead && (
                        <span className="unread-indicator">
                          New
                        </span>
                      )}
                    </div>

                    <p>{notification.message}</p>

                    <small>
                      {new Date(
                        notification.createdAt
                      ).toLocaleString()}
                    </small>
                  </div>
                </button>

                <button
                  className="notification-delete"
                  onClick={() => handleDelete(notification._id)}
                  aria-label="Delete notification"
                  title="Delete notification"
                >
                  <Trash2 size={17} />
                </button>
              </article>
            );
          })}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="notification-pagination">
          <button
            disabled={pagination.page <= 1 || loading}
            onClick={() => fetchNotifications(pagination.page - 1)}
          >
            <ChevronLeft size={17} />
            Previous
          </button>

          <span>
            Page {pagination.page} of {pagination.pages}
          </span>

          <button
            disabled={
              pagination.page >= pagination.pages || loading
            }
            onClick={() => fetchNotifications(pagination.page + 1)}
          >
            Next
            <ChevronRight size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationHistoryPage;
