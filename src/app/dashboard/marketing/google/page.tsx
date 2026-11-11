"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { BarChart3, Globe2, SearchCheck, AlertCircle, CheckCircle2, Loader2, RefreshCw, ArrowRight, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

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

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  analytics: <BarChart3 className="h-5 w-5" />,
  search_console: <SearchCheck className="h-5 w-5" />,
};

export default function GoogleServicesPage() {
  const { data: session, status } = useSession();
  const [services, setServices] = useState<GoogleService[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      window.location.href = "/login?callbackUrl=/dashboard/marketing/google";
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
    } catch {
      console.error("Test failed");
    } finally {
      setTesting(null);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      not_configured: { label: "Not configured", color: "bg-gray-100 text-gray-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
      config_required: { label: "Configuration required", color: "bg-amber-100 text-amber-700", icon: <Settings className="h-3.5 w-3.5" /> },
      auth_required: { label: "Authorization required", color: "bg-blue-100 text-blue-700", icon: <Globe2 className="h-3.5 w-3.5" /> },
      connected: { label: "Connected", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
      connection_failed: { label: "Connection failed", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
      token_expired: { label: "Token expired", color: "bg-amber-100 text-amber-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
      permission_denied: { label: "Permission denied", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
      syncing: { label: "Testing...", color: "bg-blue-100 text-blue-700", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
      sync_completed: { label: "Test passed", color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
      sync_failed: { label: "Test failed", color: "bg-red-100 text-red-700", icon: <AlertCircle className="h-3.5 w-3.5" /> },
    };
    return configs[status] || configs.not_configured;
  };

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Globe2 className="h-6 w-6 text-primary" />
              Google Services
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Connect and manage all Google services from one place</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
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
            <Globe2 className="h-6 w-6 text-primary" />
            Google Services
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Connect and manage Google services. Each service shows real connection status.</p>
        </div>
        <button onClick={fetchServices} disabled={loading} className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh Status
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
          [1, 2].map((i) => (
            <div key={i} className="rounded-lg border p-6 animate-pulse">
              <div className="h-10 bg-muted rounded mb-4" />
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ))
        ) : services.map((service) => {
          const statusConfig = getStatusConfig(service.status);
          const IconComponent = SERVICE_ICONS[service.id] || <Settings className="h-5 w-5" />;
          return (
            <Link key={service.id} href={service.configUrl} className="rounded-lg border p-6 hover:shadow-md transition-shadow hover:border-primary/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {IconComponent}
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

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Click to configure</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border p-6 bg-gray-50">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/dashboard/marketing/google/search-console" className="p-4 rounded-lg bg-white border hover:border-primary/50 transition-colors">
            <h4 className="font-medium flex items-center gap-2"><SearchCheck className="h-5 w-5" /> Search Console</h4>
            <p className="text-sm text-muted-foreground mt-1">Verify ownership, submit sitemaps, inspect URLs</p>
          </Link>
          <Link href="/dashboard/marketing/google/analytics" className="p-4 rounded-lg bg-white border hover:border-primary/50 transition-colors">
            <h4 className="font-medium flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Analytics (GA4)</h4>
            <p className="text-sm text-muted-foreground mt-1">Measurement ID, events, conversions, consent mode</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
