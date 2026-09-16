"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCheck, Check, ExternalLink, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  link?: string;
  read: boolean;
  createdAt: string;
}

export default function DashboardNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      const data = await res.json();
      setNotifications(data.data?.notifications || data.notifications || []);
      setUnreadCount(data.data?.unreadCount || 0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PUT", credentials: "include" });
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PUT", credentials: "include" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "All caught up!"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchNotifications} className="p-2 rounded-lg hover:bg-accent transition-colors" title="Refresh">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 rounded-lg border bg-muted/50 p-1 w-fit">
        {(["all", "unread", "read"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors capitalize",
              filter === f ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f}
            {f === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 text-xs bg-primary text-primary-foreground rounded-full px-1.5">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Bell className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground">
            {filter === "unread" ? "No unread notifications." : filter === "read" ? "No read notifications." : "No notifications yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <div
              key={n._id}
              className={cn(
                "bg-white rounded-xl border p-4 flex items-start gap-3 transition-colors",
                !n.read && "border-l-4 border-l-primary"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 h-2 w-2 rounded-full shrink-0",
                  n.type === "success" ? "bg-green-500" :
                  n.type === "warning" ? "bg-amber-500" :
                  n.type === "error" ? "bg-red-500" : "bg-blue-500"
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <div className="flex items-center gap-3 mt-2">
                  {n.link && (
                    <Link href={n.link} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                      View Details <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
              <div className="shrink-0">
                {!n.read && (
                  <button onClick={() => markAsRead(n._id)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Mark as read">
                    <Check className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
