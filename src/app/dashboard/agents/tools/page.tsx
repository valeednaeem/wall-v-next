"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wrench, Search, Loader2, ChevronRight, Shield, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Tool {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  type: string;
  status: string;
  isWriteOperation: boolean;
  riskLevel: string;
  permissions: string[];
  parameters: { name: string; type: string; required: boolean; description: string }[];
  usage: { totalCalls: number; lastUsed?: string; avgResponseTime: number; errorRate: number };
  createdAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  system: "bg-gray-100 text-gray-700",
  custom: "bg-blue-100 text-blue-700",
  integration: "bg-purple-100 text-purple-700",
  crm: "bg-green-100 text-green-700",
  project: "bg-orange-100 text-orange-700",
  finance: "bg-yellow-100 text-yellow-700",
  content: "bg-cyan-100 text-cyan-700",
  notification: "bg-pink-100 text-pink-700",
  agent: "bg-indigo-100 text-indigo-700",
};

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchTools = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agents/tools", { credentials: "include" });
      const data = await res.json();
      setTools(data.tools || []);
    } catch {
      console.error("Failed to fetch tools");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTools(); }, [fetchTools]);

  const filtered = tools.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    return true;
  });

  const categories = [...new Set(tools.map((t) => t.category))].sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tools</h1>
          <p className="text-sm text-muted-foreground mt-1">Controlled mechanisms for agent operations</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Tools</p>
          <p className="text-2xl font-bold">{tools.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Read-Only</p>
          <p className="text-2xl font-bold text-blue-600">{tools.filter((t) => !t.isWriteOperation).length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Write Operations</p>
          <p className="text-2xl font-bold text-orange-600">{tools.filter((t) => t.isWriteOperation).length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">High/Critical Risk</p>
          <p className="text-2xl font-bold text-red-600">{tools.filter((t) => t.riskLevel === "high" || t.riskLevel === "critical").length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search tools..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-muted/50 pl-9 pr-4 py-2 text-sm" />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Tools List */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No tools found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((tool) => {
            const isExpanded = expandedId === tool._id;
            return (
              <div key={tool._id} className="bg-white rounded-xl border overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : tool._id)}
                  className="w-full text-left p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                  <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                    tool.isWriteOperation ? "bg-orange-100" : "bg-blue-100"
                  )}>
                    {tool.isWriteOperation ? <AlertTriangle className="h-5 w-5 text-orange-600" /> : <Wrench className="h-5 w-5 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{tool.name}</p>
                      <span className={cn("text-xs px-2 py-0.5 rounded font-medium", CATEGORY_COLORS[tool.category] || "bg-gray-100 text-gray-600")}>
                        {tool.category}
                      </span>
                      <span className={cn("text-xs px-2 py-0.5 rounded", RISK_COLORS[tool.riskLevel])}>
                        {tool.riskLevel}
                      </span>
                      {tool.isWriteOperation && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">WRITE</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{tool.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{tool.usage.totalCalls} calls</span>
                      <span>{tool.type}</span>
                      <span>{tool.parameters.length} params</span>
                      {tool.usage.lastUsed && <span>Last used {new Date(tool.usage.lastUsed).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                </button>

                {isExpanded && (
                  <div className="border-t p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">DESCRIPTION</p>
                        <p className="text-sm">{tool.description}</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">PERMISSIONS REQUIRED</p>
                        {tool.permissions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {tool.permissions.map((p, i) => (
                              <span key={i} className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Shield className="h-3 w-3" />{p}
                              </span>
                            ))}
                          </div>
                        ) : <p className="text-xs text-muted-foreground">No special permissions</p>}
                      </div>
                    </div>
                    {tool.parameters.length > 0 && (
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">PARAMETERS</p>
                        <div className="space-y-1">
                          {tool.parameters.map((p, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="font-medium">{p.name}</span>
                              <span className="text-muted-foreground">({p.type})</span>
                              {p.required && <span className="text-red-500">*</span>}
                              <span className="text-muted-foreground">{p.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                      <span>Created {new Date(tool.createdAt).toLocaleDateString()}</span>
                      <span>Type: {tool.type}</span>
                      <span className="ml-auto">Slug: {tool.slug}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
