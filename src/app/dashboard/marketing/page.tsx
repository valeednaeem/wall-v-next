"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { BarChart3, Globe2, SearchCheck, Store, Target, Share2, LineChart, Zap, AlertCircle, CheckCircle2, Loader2, ExternalLink, Settings, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoogleService {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  status: "not_configured" | "config_required" | "auth_required" | "connected" | "connection_failed" | "token_expired" | "permission_denied" | "syncing" | "sync_completed" | "sync_failed";
  statusLabel: string;
  configUrl: string;
  testUrl?: string;
  lastSynced?: string;
  error?: string;
  details?: Record<string, string>;
}

export default function MarketingPage() {
  const { data: session, status } = useSession();
  const [services, setServices] = useState<GoogleService[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing";
      return;
    }
    fetchServices();
  }, [status]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketing/google/services");
      const data = await res.json();
      if (data.success) {
        setServices(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch Google services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (serviceId: string) => {
    setTesting(serviceId);
    try {
      const res = await fetch(`/api/marketing/google/services/${serviceId}/test`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        fetchServices();
      }
    } catch (error) {
      console.error("Test connection failed:", error);
    } finally {
      setTesting(null);
    }
  };

  const getStatusConfig = (status: GoogleService["status"]) => {
    const configs: Record<GoogleService["status"], { label: string; color: string; icon: React.ReactNode }> = {
      not_configured: { label: "Not configured", color: "bg-gray-100 text-gray-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
      config_required: { label: "Configuration required", color: "bg-amber-100 text-amber-700", icon: <Settings className="h-3.5 w-3.5" /> },
      auth_required: { label: "Authorization required", color: "bg-blue-100 text-blue-700", icon: <Globe2 className="h-3.5 w-3.5" /> },
      connected: { label: "Connected", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
      connection_failed: { label: "Connection failed", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
      token_expired: { label: "Token expired", color: "bg-amber-100 text-amber-700", icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" /> },
      permission_denied: { label: "Permission denied", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
      syncing: { label: "Syncing...", color: "bg-blue-100 text-blue-700", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
      sync_completed: { label: "Sync completed", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
      sync_failed: { label: "Sync failed", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
    };
    return configs[status] || configs.not_configured;
  };

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Marketing Control Center</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-lg border p-6 animate-pulse">
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Marketing Control Center
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Configure, monitor, and manage Google services, SEO, tracking, and social sharing</p>
        </div>
        <button onClick={fetchServices} disabled={loading} className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh Status
        </button>
      </div>

      {/* Google Services Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe2 className="h-5 w-5 text-primary" />
          Google Services Integration
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Connect and manage all Google services from one place. Each service shows real connection status — not simulated.
        </p>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-lg border p-6 animate-pulse">
                <div className="h-10 bg-muted rounded mb-4" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {services.map((service) => {
              const statusConfig = getStatusConfig(service.status);
              return (
                <div key={service.id} className="rounded-lg border p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        {service.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold">{service.name}</h4>
                        <p className="text-sm text-muted-foreground">{service.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", statusConfig.color)}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {service.details && Object.keys(service.details).length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      {Object.entries(service.details).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{key}:</span>
                          <span className="font-medium text-gray-900">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {service.lastSynced && (
                    <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />
                      Last synced: {new Date(service.lastSynced).toLocaleString()}
                    </p>
                  )}

                  {service.error && (
                    <div className="mt-3 p-2 rounded bg-red-50 border border-red-200">
                      <p className="text-xs text-red-700">{service.error}</p>
                    </div>
                  )}

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => handleTestConnection(service.id)}
                      disabled={testing === service.id}
                      className="flex-1 inline-flex items-center justify-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      {testing === service.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                      Test Connection
                    </button>
                    <button
                      onClick={() => window.location.href = service.configUrl}
                      className="flex-1 inline-flex items-center justify-center gap-2 text-sm bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Configure
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Management Centers</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { id: "seo", label: "SEO Management", description: "Global SEO, page metadata, sitemap, robots.txt, structured data", icon: SearchCheck, color: "text-green-500", bg: "bg-green-50", href: "/dashboard/marketing/seo" },
            { id: "tracking", label: "Events & Conversions", description: "Analytics events, conversion tracking, ecommerce, attribution", icon: Target, color: "text-purple-500", bg: "bg-purple-50", href: "/dashboard/marketing/tracking" },
            { id: "social", label: "Social Sharing", description: "Open Graph, Twitter/X cards, social preview, share buttons", icon: Share2, color: "text-blue-500", bg: "bg-blue-50", href: "/dashboard/marketing/social" },
            { id: "analytics", label: "Analytics Overview", description: "Traffic, conversions, revenue, top pages, traffic sources", icon: LineChart, color: "text-orange-500", bg: "bg-orange-50", href: "/dashboard/marketing/overview" },
            { id: "diagnostics", label: "Diagnostics & Errors", description: "API errors, OAuth issues, sync failures, SEO health checks", icon: AlertCircle, color: "text-red-500", bg: "bg-red-50", href: "/dashboard/marketing/diagnostics" },
            { id: "google-ads", label: "Google Ads", description: "Campaign readiness, conversion tracking, attribution setup", icon: Zap, color: "text-amber-500", bg: "bg-amber-50", href: "/dashboard/marketing/google/ads" },
          ].map((card) => (
            <a key={card.id} href={card.href} className="rounded-lg border p-6 hover:shadow-md transition-shadow group">
              <div className="flex items-start gap-4">
                <div className={cn("h-12 w-12 rounded-lg flex items-center justify-center", card.bg)}>
                  <card.icon className={cn("h-6 w-6", card.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold group-hover:text-primary transition-colors">{card.label}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}