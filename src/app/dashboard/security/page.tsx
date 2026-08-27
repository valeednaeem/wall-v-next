"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Shield, AlertTriangle, Ban, Eye, Clock, Search } from "lucide-react";

interface SecurityEvent {
  _id: string;
  type: string;
  severity: string;
  userId?: string;
  email?: string;
  ip: string;
  userAgent?: string;
  path?: string;
  method?: string;
  details?: Record<string, unknown>;
  blocked: boolean;
  createdAt: string;
}

interface SecuritySummary {
  last24h: {
    bySeverity: Record<string, number>;
    byType: { type: string; count: number }[];
    blocked: number;
  };
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function SecurityPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const isSuperAdmin = userRole === "super-admin";

  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [searchIp, setSearchIp] = useState("");

  useEffect(() => {
    fetchEvents();
  }, [severityFilter, typeFilter, searchIp]);

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams();
      if (severityFilter) params.set("severity", severityFilter);
      if (typeFilter) params.set("type", typeFilter);
      if (searchIp) params.set("ip", searchIp);
      params.set("limit", "100");

      const res = await fetch(`/api/admin/security?${params}`);
      const data = await res.json();
      if (data.success) {
        setEvents(data.data.events);
        setTotal(data.data.total);
        setSummary(data.data.summary);
      }
    } catch (error) {
      console.error("Failed to fetch security events:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!["super-admin", "admin"].includes(userRole || "")) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="mt-2 text-sm">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Security Center</h1>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Blocked (24h)</p>
            <p className="text-2xl font-bold text-red-600">{summary.last24h.blocked}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Critical (24h)</p>
            <p className="text-2xl font-bold text-red-600">{summary.last24h.bySeverity.critical || 0}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">High (24h)</p>
            <p className="text-2xl font-bold text-orange-600">{summary.last24h.bySeverity.high || 0}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Events (24h)</p>
            <p className="text-2xl font-bold">{Object.values(summary.last24h.bySeverity).reduce((a, b) => a + b, 0)}</p>
          </div>
        </div>
      )}

      {/* Top Event Types */}
      {summary && summary.last24h.byType.length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Top Event Types (24h)</h3>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {summary.last24h.byType.map((t) => (
              <div key={t.type} className="flex items-center justify-between rounded bg-muted/50 px-3 py-2 text-sm">
                <span className="font-mono text-xs">{t.type}</span>
                <span className="font-bold">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">All Severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          <option value="signup_success">Signup Success</option>
          <option value="signup_blocked">Signup Blocked</option>
          <option value="login_success">Login Success</option>
          <option value="login_failed">Login Failed</option>
          <option value="rate_limit_triggered">Rate Limited</option>
          <option value="honeypot_triggered">Honeypot Triggered</option>
          <option value="privilege_escalation_attempt">Privilege Escalation</option>
          <option value="suspicious_activity">Suspicious Activity</option>
        </select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter by IP..."
            value={searchIp}
            onChange={(e) => setSearchIp(e.target.value)}
            className="w-full rounded-lg border pl-9 pr-4 py-2 text-sm"
          />
        </div>
      </div>

      {/* Events Table */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No security events found</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Time</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Severity</th>
                  <th className="px-4 py-3 text-left font-medium">IP</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Path</th>
                  <th className="px-4 py-3 text-left font-medium">Blocked</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {events.map((event) => (
                  <tr key={event._id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {new Date(event.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">{event.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[event.severity] || "bg-gray-100 text-gray-700"}`}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{event.ip}</td>
                    <td className="px-4 py-3 text-xs">{event.email || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{event.path || "—"}</td>
                    <td className="px-4 py-3">
                      {event.blocked ? (
                        <Ban className="h-4 w-4 text-red-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
