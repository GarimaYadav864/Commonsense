import { useState } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { useNotifications } from "../../hooks/useNotifications";
import "./NotificationCenter.css";

function NotificationCenter() {
  const [open, setOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    loading,
    connected,
    actionError,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  return (
    <div className="notification-center">
      <button
        className="notification-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-controls="notification-panel"
        aria-haspopup="true"
        title="Notifications"
      >
        <Bell size={20} />

        {unreadCount > 0 && (
          <span className="notification-count">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="notification-panel"
          id="notification-panel"
          role="region"
          aria-label="Notification panel"
        >
          <div className="notification-header">
            <div>
              <h3>Notifications</h3>
              <span className={connected ? "socket-online" : "socket-offline"}>
                {connected ? "Live updates connected" : "Reconnecting..."}
              </span>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                title="Mark all as read"
                aria-label="Mark all as read"
              >
                <CheckCheck size={17} />
              </button>
            )}
          </div>
          {actionError && (
            <div className="notification-error" role="alert">
              {actionError}
            </div>
          )}

          {loading ? (
            <div className="notification-empty">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              <Bell size={25} />
              <p>You're all caught up!</p>
            </div>
          ) : (
            <div
              className="notification-list"
              role="list"
              aria-label="Your notifications"
            >
              {notifications.map((notification) => (
                <div
                  className={`notification-item ${
                    notification.isRead ? "read" : "unread"
                  }`}
                  key={notification._id}
                  role="listitem"
                >
                  <span className="notification-dot" />

                  <div className="notification-content">
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>

                    <small>
                      {new Date(notification.createdAt).toLocaleString()}
                    </small>

                    <div className="notification-actions">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification._id)}
                        >
                          Mark as read
                        </button>
                      )}

                      <button
                        onClick={() =>
                          deleteNotification(notification._id)
                        }
                        aria-label="Delete notification"
                        title="Delete notification"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;