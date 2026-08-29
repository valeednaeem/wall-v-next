"use client";

import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export default function ClientNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notifications", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { setNotifications(data.notifications || data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PUT", credentials: "include" });
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/mark-all-read", { method: "PUT", credentials: "include" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">{unread > 0 ? `${unread} unread` : "All caught up!"}</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1 text-sm text-primary hover:underline">
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Bell className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div key={n._id}
              className={cn("bg-white rounded-xl border p-4 flex items-start gap-3 transition-colors",
                !n.read && "border-l-4 border-l-primary"
              )}>
              <div className={cn("mt-0.5 h-2 w-2 rounded-full shrink-0",
                n.type === "success" ? "bg-green-500" :
                n.type === "warning" ? "bg-amber-500" :
                n.type === "error" ? "bg-red-500" : "bg-blue-500"
              )} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                {n.link && (
                  <a href={n.link} className="text-xs text-primary hover:underline mt-1 inline-block">View Details</a>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</span>
                {!n.read && (
                  <button onClick={() => markAsRead(n._id)} className="p-1 hover:bg-gray-100 rounded" title="Mark as read">
                    <Check className="h-3 w-3 text-muted-foreground" />
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
