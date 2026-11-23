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
  "https://commonsense-api-d843.onrender.com";

function getNotificationErrorMessage(error: unknown): string {
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error
    ) {
      const response = (
        error as {
          response?: { data?: { message?: string } };
        }
      ).response;

      if (response?.data?.message) {
        return response.data.message;
      }
    }

    return "Something went wrong. Please try again.";
  }  

export function useNotifications() {
  import { useAuth } from "../context/AuthContext";
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [actionError, setActionError] = useState("");
  const knownNotificationIds = useRef<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get("/notifications");

      const fetchedNotifications: AppNotification[] =
        response.data.notifications || [];

      fetchedNotifications.forEach((notification) => {
        knownNotificationIds.current.add(notification._id);
      });

      setNotifications(fetchedNotifications);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error("Fetch notifications error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  
  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      setConnected(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);

    const loadNotifications = async () => {
      try {
        const response = await api.get("/notifications");

        if (cancelled) return;

        setNotifications(response.data.notifications || []);
        setUnreadCount(response.data.unreadCount || 0);
      } catch (error) {
        if (!cancelled) {
          console.error("Fetch notifications error:", error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadNotifications();

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socket.on("connect", () => {
      if (!cancelled) {
        setConnected(true);
      }
    });

    socket.on("disconnect", () => {
      if (!cancelled) {
        setConnected(false);
      }
    });

    socket.on("connect_error", (error) => {
      if (!cancelled) {
        setConnected(false);
        console.error("Socket connection error:", error.message);
      }
    });

    socket.on("notification", (notification: AppNotification) => {
      if (cancelled) return;

      setNotifications((previous) => {
        if (previous.some((item) => item._id === notification._id)) {
          return previous;
        }

        return [notification, ...previous].slice(0, 50);
      });

      setUnreadCount((previous) => {
        // The functional update alone doesn't prevent duplicate events.
        return previous + (notification.isRead ? 0 : 1);
      });
    });

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, [token]);

  const markAsRead = async (id: string) => {
    setActionError("");

    try {
      await api.patch(`/notifications/${id}/read`);

      const notification = notifications.find(
        (item) => item._id === id
      );

      setNotifications((previous) =>
        previous.map((item) =>
          item._id === id ? { ...item, isRead: true } : item
        )
      );

      if (notification && !notification.isRead) {
        setUnreadCount((previous) => Math.max(0, previous - 1));
      }
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      setActionError(getNotificationErrorMessage(error));
      console.error("Mark all notifications read error:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    setActionError("");

    try {
      await api.delete(`/notifications/${id}`);

      const deleted = notifications.find(
        (item) => item._id === id
      );

      setNotifications((previous) =>
        previous.filter((item) => item._id !== id)
      );

      if (deleted && !deleted.isRead) {
        setUnreadCount((previous) => Math.max(0, previous - 1));
      }
    } catch (error: unknown) {
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