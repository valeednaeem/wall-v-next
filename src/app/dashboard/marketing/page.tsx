"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  BarChart3, Search, Building2, ShoppingBag, Megaphone,
  SearchCheck, Target, Share2, LineChart, Zap, AlertCircle,
  CheckCircle2, Loader2, ExternalLink, Settings, RefreshCw,
  Link2, Unlink, ChevronRight, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BarChart3, Search, Building2, ShoppingBag, Megaphone,
};

interface GoogleService {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: "not_configured" | "config_required" | "auth_required" | "connected" | "connection_failed" | "token_expired" | "permission_denied" | "syncing" | "sync_completed" | "sync_failed";
  statusLabel: string;
  configUrl: string;
  testUrl?: string;
  lastSynced?: string;
  lastTested?: string;
  error?: string;
  details?: Record<string, string>;
}

export default function MarketingPage() {
  const { data: session, status } = useSession();
  const [services, setServices] = useState<GoogleService[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [connectingGoogle, setConnectingGoogle] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing";
      return;
    }
    fetchServices();
  }, [status]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      setGoogleConnected(true);
      fetchServices();
      window.history.replaceState({}, "", "/dashboard/marketing");
    }
    if (params.get("error")) {
      const error = params.get("error");
      console.error("Google OAuth error:", error);
      window.history.replaceState({}, "", "/dashboard/marketing");
    }
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing/google/services");
      const data = await res.json();
      if (data.success) {
        setServices(data.data);
        const hasConnected = data.data.some((s: GoogleService) => s.status === "connected");
        setGoogleConnected(hasConnected);
      }
    } catch (error) {
      console.error("Failed to fetch Google services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    setConnectingGoogle(true);
    try {
      const res = await fetch("/api/auth/google/connect");
      const data = await res.json();
      if (data.success && data.data.authUrl) {
        window.location.href = data.data.authUrl;
      }
    } catch (error) {
      console.error("Failed to initiate Google connection:", error);
    } finally {
      setConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm("Disconnect Google account? This will reset all service configurations.")) return;
    try {
      await fetch("/api/auth/google/disconnect", { method: "POST" });
      setGoogleConnected(false);
      fetchServices();
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  const handleTestConnection = async (serviceId: string) => {
    setTesting(serviceId);
    try {
      const res = await fetch(`/api/marketing/google/services/${serviceId}/test`, { method: "POST" });
      const data = await res.json();
      fetchServices();
    } catch (error) {
      console.error("Test connection failed:", error);
    } finally {
      setTesting(null);
    }
  };

  const getStatusConfig = (status: GoogleService["status"]) => {
    const configs: Record<GoogleService["status"], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
      not_configured: { label: "Not configured", color: "text-gray-600", bg: "bg-gray-100", icon: <AlertCircle className="h-3.5 w-3.5" /> },
      config_required: { label: "Needs setup", color: "text-amber-600", bg: "bg-amber-100", icon: <Settings className="h-3.5 w-3.5" /> },
      auth_required: { label: "Needs auth", color: "text-blue-600", bg: "bg-blue-100", icon: <Link2 className="h-3.5 w-3.5" /> },
      connected: { label: "Connected", color: "text-green-600", bg: "bg-green-100", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
      connection_failed: { label: "Failed", color: "text-red-600", bg: "bg-red-100", icon: <AlertCircle className="h-3.5 w-3.5" /> },
      token_expired: { label: "Expired", color: "text-amber-600", bg: "bg-amber-100", icon: <RefreshCw className="h-3.5 w-3.5" /> },
      permission_denied: { label: "No access", color: "text-red-600", bg: "bg-red-100", icon: <Unlink className="h-3.5 w-3.5" /> },
      syncing: { label: "Syncing", color: "text-blue-600", bg: "bg-blue-100", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
      sync_completed: { label: "Synced", color: "text-green-600", bg: "bg-green-100", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
      sync_failed: { label: "Sync failed", color: "text-red-600", bg: "bg-red-100", icon: <AlertCircle className="h-3.5 w-3.5" /> },
    };
    return configs[status] || configs.not_configured;
  };

  const connectedCount = services.filter((s) => s.status === "connected").length;
  const totalCount = services.length;

  if (status === "loading") {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="h-8 bg-muted rounded w-64 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border p-6 animate-pulse">
              <div className="h-10 bg-muted rounded mb-4" />
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            Marketing Control Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1 ml-13">
            Configure, monitor, and manage Google services, SEO, tracking, and social sharing
          </p>
        </div>
        <button
          onClick={fetchServices}
          disabled={loading}
          className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Google Account Connection Banner */}
      <div className={cn(
        "rounded-xl border p-5 flex items-center justify-between transition-colors",
        googleConnected ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
      )}>
        <div className="flex items-center gap-4">
          <div className={cn(
            "h-12 w-12 rounded-xl flex items-center justify-center",
            googleConnected ? "bg-green-100" : "bg-amber-100"
          )}>
            {googleConnected ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <Link2 className="h-6 w-6 text-amber-600" />
            )}
          </div>
          <div>
            <h3 className="font-semibold">
              {googleConnected ? "Google Account Connected" : "Connect Google Account"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {googleConnected
                ? `Connected as ${session.user?.email || "your account"}. All Google services can be configured.`
                : "Connect your Google account to enable Analytics, Search Console, Business Profile, Merchant Center, and Ads integrations."
              }
            </p>
          </div>
        </div>
        <div>
          {googleConnected ? (
            <button
              onClick={handleDisconnectGoogle}
              className="flex items-center gap-2 text-sm border border-red-200 text-red-600 rounded-lg px-4 py-2 hover:bg-red-50 transition-colors"
            >
              <Unlink className="h-4 w-4" />
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnectGoogle}
              disabled={connectingGoogle}
              className="flex items-center gap-2 text-sm bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {connectingGoogle ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Connect Google
            </button>
          )}
        </div>
      </div>

      {/* Google Services Status Overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Google Services
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {connectedCount} of {totalCount} services connected
            </p>
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${totalCount > 0 ? (connectedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {totalCount > 0 ? Math.round((connectedCount / totalCount) * 100) : 0}%
            </span>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-xl border p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-muted rounded-lg" />
                  <div className="h-4 bg-muted rounded w-24" />
                </div>
                <div className="h-3 bg-muted rounded w-full mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const statusConfig = getStatusConfig(service.status);
              const IconComponent = ICON_MAP[service.icon] || BarChart3;
              return (
                <div
                  key={service.id}
                  className={cn(
                    "rounded-xl border p-5 hover:shadow-md transition-all group",
                    service.status === "connected" && "border-green-200 bg-green-50/30"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center",
                        service.status === "connected" ? "bg-green-100 text-green-600" : "bg-primary/10 text-primary"
                      )}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">{service.name}</h4>
                        <p className="text-xs text-muted-foreground">{service.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", statusConfig.bg, statusConfig.color)}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </span>
                    {service.lastTested && (
                      <span className="text-xs text-muted-foreground">
                        Tested {new Date(service.lastTested).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {service.details && Object.keys(service.details).length > 0 && (
                    <div className="mb-3 p-2.5 rounded-lg bg-muted/50 space-y-1">
                      {Object.entries(service.details).slice(0, 3).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}:</span>
                          <span className="font-medium truncate ml-2">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {service.error && (
                    <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200">
                      <p className="text-xs text-red-700 line-clamp-2">{service.error}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestConnection(service.id)}
                      disabled={testing === service.id}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs border rounded-lg px-3 py-2 hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      {testing === service.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Activity className="h-3.5 w-3.5" />
                      )}
                      Test
                    </button>
                    <a
                      href={service.configUrl}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Configure
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Management Centers */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Management Centers</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { id: "seo", label: "SEO Management", description: "Global SEO, metadata, sitemap, robots.txt, structured data", icon: SearchCheck, color: "text-emerald-500", bg: "bg-emerald-50", href: "/dashboard/marketing/seo" },
            { id: "tracking", label: "Events & Conversions", description: "Analytics events, conversion tracking, attribution", icon: Target, color: "text-violet-500", bg: "bg-violet-50", href: "/dashboard/marketing/tracking" },
            { id: "social", label: "Social Sharing", description: "Open Graph, Twitter/X cards, social previews", icon: Share2, color: "text-sky-500", bg: "bg-sky-50", href: "/dashboard/marketing/social" },
            { id: "analytics", label: "Analytics Overview", description: "Traffic, conversions, revenue, top pages", icon: LineChart, color: "text-orange-500", bg: "bg-orange-50", href: "/dashboard/marketing/overview" },
            { id: "diagnostics", label: "Diagnostics", description: "API errors, OAuth issues, sync failures", icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-50", href: "/dashboard/marketing/diagnostics" },
            { id: "google-ads", label: "Google Ads", description: "Campaigns, conversion tracking, attribution", icon: Megaphone, color: "text-amber-500", bg: "bg-amber-50", href: "/dashboard/marketing/google/ads" },
          ].map((card) => (
            <a
              key={card.id}
              href={card.href}
              className="rounded-xl border p-5 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", card.bg)}>
                  <card.icon className={cn("h-5 w-5", card.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm group-hover:text-primary transition-colors flex items-center gap-1">
                    {card.label}
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
