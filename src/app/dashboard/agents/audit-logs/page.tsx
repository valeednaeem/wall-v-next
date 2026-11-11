"use client";

import { useState, useEffect } from "react";
import { Clock, Bot, User, Settings, Shield, AlertTriangle } from "lucide-react";

interface AuditLog {
  _id: string;
  agent?: { name: string; slug: string };
  action: string;
  category: string;
  description: string;
  performedBy: { name: string; email: string };
  changes?: { field: string; oldValue: unknown; newValue: unknown }[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  agent: <Bot className="w-4 h-4" />,
  conversation: <Clock className="w-4 h-4" />,
  tool: <Settings className="w-4 h-4" />,
  hook: <AlertTriangle className="w-4 h-4" />,
  approval: <Shield className="w-4 h-4" />,
  config: <Settings className="w-4 h-4" />,
  system: <AlertTriangle className="w-4 h-4" />,
};

const categoryColors: Record<string, string> = {
  agent: "bg-violet-100 text-violet-700",
  conversation: "bg-blue-100 text-blue-700",
  tool: "bg-amber-100 text-amber-700",
  hook: "bg-emerald-100 text-emerald-700",
  approval: "bg-rose-100 text-rose-700",
  config: "bg-gray-100 text-gray-700",
  system: "bg-red-100 text-red-700",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");

  useEffect(() => {
    fetchLogs();
  }, [filterCategory]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const url = filterCategory === "all"
        ? "/api/agents/audit-logs"
        : `/api/agents/audit-logs?category=${filterCategory}`;
      const res = await fetch(url);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      console.error("Failed to fetch logs");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500">Track all agent actions and configuration changes</p>
      </div>

      <div className="flex gap-2">
        {["all", "agent", "conversation", "tool", "hook", "approval", "config", "system"].map((c) => (
          <button
            key={c}
            onClick={() => setFilterCategory(c)}
            className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${
              filterCategory === c ? "bg-violet-100 text-violet-700" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No audit logs found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performed By</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${categoryColors[log.category] || ""}`}>
                      {categoryIcons[log.category]}
                      {log.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900">{log.description}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{log.agent?.name || "-"}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{log.performedBy?.name || "System"}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
