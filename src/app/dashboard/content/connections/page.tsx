"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Link2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ConnectionData {
  connected: boolean;
  lastPublish?: string;
  error?: string;
  envConfigured?: boolean;
  tokenValid?: boolean;
  accountInfo?: {
    email?: string;
    name?: string;
    expiresAt?: string;
    lastSynced?: string;
  };
}

const PLATFORMS = [
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "Professional networking and B2B content",
    supportedTypes: ["article", "social", "video"],
    setupUrl: "/api/auth/linkedin/connect",
    instructions: "Requires LinkedIn OAuth. Connect via business profile for company page publishing.",
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "Social networking and community content",
    supportedTypes: ["article", "social", "video"],
    setupUrl: "/api/auth/facebook/connect",
    instructions: "Requires Facebook App. Connect via Pages Manager for business page publishing.",
  },
  {
    id: "x",
    name: "X / Twitter",
    description: "Microblogging and real-time engagement",
    supportedTypes: ["social"],
    setupUrl: "/api/auth/x/connect",
    instructions: "Requires X API v2 access. Apply for developer account and configure OAuth 2.0.",
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Visual content and stories",
    supportedTypes: ["social", "video"],
    setupUrl: "/api/auth/instagram/connect",
    instructions: "Requires Instagram Graph API via Facebook Business account.",
  },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Short-form video content",
    supportedTypes: ["video", "social"],
    setupUrl: "/api/auth/tiktok/connect",
    instructions: "Requires TikTok for Business API access. Apply for Content Posting API.",
  },
  {
    id: "youtube",
    name: "YouTube",
    description: "Long-form video content and shorts",
    supportedTypes: ["video"],
    setupUrl: "/api/auth/youtube/connect",
    instructions: "Requires YouTube Data API v3 via Google Cloud Console. Enable YouTube Data API.",
  },
];

function getStatusBadge(conn: ConnectionData | undefined): {
  variant: "success" | "warning" | "destructive" | "outline";
  label: string;
  icon: React.ReactNode;
} {
  if (!conn) {
    return {
      variant: "outline",
      label: "Unknown",
      icon: <AlertCircle className="h-3 w-3" />,
    };
  }

  if (conn.connected && conn.tokenValid) {
    return {
      variant: "success",
      label: "Connected",
      icon: <CheckCircle className="h-3 w-3" />,
    };
  }

  if (conn.connected && !conn.tokenValid) {
    return {
      variant: "warning",
      label: "Expiring Soon",
      icon: <Clock className="h-3 w-3" />,
    };
  }

  if (conn.envConfigured === false) {
    return {
      variant: "outline",
      label: "Missing API Keys",
      icon: <AlertCircle className="h-3 w-3" />,
    };
  }

  return {
    variant: "destructive",
    label: "Not Connected",
    icon: <XCircle className="h-3 w-3" />,
  };
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Record<string, ConnectionData>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConnections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content/connections");
      const data = await res.json();
      if (data.success) setConnections(data.connections || {});
    } catch (error) {
      console.error("Failed to fetch connections:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchConnections();
    setRefreshing(false);
  };

  const connectedCount = Object.values(connections).filter((c) => c.connected).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" /> Platform Connections
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {connectedCount} of {PLATFORMS.length} platforms connected
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-accent transition-colors"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${(connectedCount / PLATFORMS.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {Math.round((connectedCount / PLATFORMS.length) * 100)}%
        </span>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border p-6 animate-pulse">
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
          {PLATFORMS.map((platform) => {
            const conn = connections[platform.id];
            const status = getStatusBadge(conn);
            const connected = conn?.connected || false;

            return (
              <Card
                key={platform.id}
                className={cn(
                  "transition-all",
                  connected && "border-green-200 bg-green-50/30"
                )}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold",
                          connected ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                        )}
                      >
                        {platform.name.charAt(0)}
                      </div>
                      {platform.name}
                    </div>
                    <Badge variant={status.variant} className="flex items-center gap-1">
                      {status.icon}
                      {status.label}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {platform.description}
                  </p>

                  {/* Supported Types */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Supported Content
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {platform.supportedTypes.map((type) => (
                        <span
                          key={type}
                          className="text-xs bg-muted px-2 py-0.5 rounded capitalize"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Connection Details */}
                  {connected && conn?.accountInfo && (
                    <div className="p-2.5 rounded-lg bg-white border space-y-1">
                      {conn.accountInfo.name && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Account:</span>
                          <span className="font-medium">{conn.accountInfo.name}</span>
                        </div>
                      )}
                      {conn.accountInfo.email && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Email:</span>
                          <span className="font-medium">{conn.accountInfo.email}</span>
                        </div>
                      )}
                      {conn.accountInfo.expiresAt && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Expires:</span>
                          <span className={cn(
                            "font-medium",
                            new Date(conn.accountInfo.expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                              ? "text-yellow-600"
                              : "text-green-600"
                          )}>
                            {new Date(conn.accountInfo.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {conn.lastPublish && (
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Last Publish:</span>
                          <span className="font-medium">
                            {new Date(conn.lastPublish).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error */}
                  {conn?.error && (
                    <div className="p-2.5 rounded-lg bg-yellow-50 border border-yellow-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-yellow-700">{conn.error}</p>
                      </div>
                    </div>
                  )}

                  {/* Instructions (when not connected) */}
                  {!connected && (
                    <div className="p-2.5 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground">
                        {platform.instructions}
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  <a
                    href={platform.setupUrl}
                    className={cn(
                      "w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                      connected
                        ? "border hover:bg-muted"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    {connected ? (
                      <>
                        <RefreshCw className="h-4 w-4" /> Reconnect
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4" /> Connect
                      </>
                    )}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
