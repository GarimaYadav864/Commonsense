import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export interface AppNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedId?: string | null;
  relatedModel?: string | null;
}

const SOCKET_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? "http://localhost:5000"
    : "https://commonsense-api-d843.onrender.com");

function getNotificationErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as { response?: { data?: { message?: string } } }
    ).response;

    if (response?.data?.message) return response.data.message;
  }

  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

export function useNotifications() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(Boolean(token));
  const [connected, setConnected] = useState(false);
  const [actionError, setActionError] = useState("");
  const knownNotificationIds = useRef<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/notifications");
      const fetched: AppNotification[] = response.data.notifications || [];

      knownNotificationIds.current = new Set(
        fetched.map((notification) => notification._id)
      );

      setNotifications(fetched);
      setUnreadCount(response.data.unreadCount ?? fetched.filter((item) => !item.isRead).length);
    } catch (error) {
      console.error("Fetch notifications error:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    let socket: ReturnType<typeof io> | null = null;

    knownNotificationIds.current.clear();
    setNotifications([]);
    setUnreadCount(0);
    setConnected(false);
    setActionError("");

    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const initializeNotifications = async () => {
      try {
        const response = await api.get("/notifications");
        if (cancelled) return;

        const fetched: AppNotification[] = response.data.notifications || [];
        knownNotificationIds.current = new Set(
          fetched.map((notification) => notification._id)
        );
        setNotifications(fetched);
        setUnreadCount(
          response.data.unreadCount ?? fetched.filter((item) => !item.isRead).length
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Fetch notifications error:", error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }

      if (cancelled) return;

      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
      });

      socket.on("connect", () => {
        if (!cancelled) setConnected(true);
      });

      socket.on("disconnect", () => {
        if (!cancelled) setConnected(false);
      });

      socket.on("connect_error", (error) => {
        if (!cancelled) {
          setConnected(false);
          console.error("Socket connection error:", error.message);
        }
      });

      socket.on("notification", (notification: AppNotification) => {
        if (cancelled || knownNotificationIds.current.has(notification._id)) {
          return;
        }

        knownNotificationIds.current.add(notification._id);
        setNotifications((previous) => [notification, ...previous].slice(0, 50));

        if (!notification.isRead) {
          setUnreadCount((previous) => previous + 1);
        }
      });
    };

    void initializeNotifications();

    return () => {
      cancelled = true;
      socket?.disconnect();
    };
  }, [token]);

  const markAsRead = async (id: string) => {
    setActionError("");
    try {
      await api.patch(`/notifications/${id}/read`);
      const wasUnread = notifications.some(
        (item) => item._id === id && !item.isRead
      );

      setNotifications((previous) =>
        previous.map((item) =>
          item._id === id ? { ...item, isRead: true } : item
        )
      );

      if (wasUnread) {
        setUnreadCount((previous) => Math.max(0, previous - 1));
      }
    } catch (error) {
      setActionError(getNotificationErrorMessage(error));
      console.error("Mark notification read error:", error);
    }
  };

  const markAllAsRead = async () => {
    setActionError("");
    try {
      await api.patch("/notifications/read-all");
      setNotifications((previous) =>
        previous.map((item) => ({ ...item, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      setActionError(getNotificationErrorMessage(error));
      console.error("Mark all notifications read error:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    setActionError("");
    try {
      await api.delete(`/notifications/${id}`);
      const wasUnread = notifications.some(
        (item) => item._id === id && !item.isRead
      );

      setNotifications((previous) =>
        previous.filter((item) => item._id !== id)
      );

      knownNotificationIds.current.delete(id);
      if (wasUnread) {
        setUnreadCount((previous) => Math.max(0, previous - 1));
      }
    } catch (error) {
      setActionError(getNotificationErrorMessage(error));
      console.error("Delete notification error:", error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    connected,
    actionError,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications: fetchNotifications,
  };
}
