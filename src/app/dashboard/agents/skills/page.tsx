"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Zap, Search, Loader2, ChevronRight, Wrench, Users
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Skill {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  status: string;
  version: number;
  instructions: string;
  capabilities: string[];
  requiredTools: { _id: string; name: string }[];
  requiredPermissions: string[];
  supportedAgents: { _id: string; name: string }[];
  supportedContexts: string[];
  supportedChannels: string[];
  triggers: { type: string; value: string }[];
  usage: { totalInvocations: number; lastUsed?: string; successRate: number };
  createdAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "client-communication": "bg-blue-100 text-blue-700",
  "crm": "bg-green-100 text-green-700",
  "project-management": "bg-purple-100 text-purple-700",
  "design": "bg-pink-100 text-pink-700",
  "development": "bg-orange-100 text-orange-700",
  "seo": "bg-emerald-100 text-emerald-700",
  "content": "bg-cyan-100 text-cyan-700",
  "marketing": "bg-amber-100 text-amber-700",
  "sales": "bg-red-100 text-red-700",
  "finance": "bg-yellow-100 text-yellow-700",
  "support": "bg-indigo-100 text-indigo-700",
  "conversation": "bg-gray-100 text-gray-700",
  "task": "bg-teal-100 text-teal-700",
  "integration": "bg-violet-100 text-violet-700",
  "analysis": "bg-rose-100 text-rose-700",
  "generation": "bg-sky-100 text-sky-700",
};

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agents/skills", { credentials: "include" });
      const data = await res.json();
      setSkills(data.skills || []);
    } catch {
      console.error("Failed to fetch skills");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  const filtered = skills.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory !== "all" && s.category !== filterCategory) return false;
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    return true;
  });

  const categories = [...new Set(skills.map((s) => s.category))].sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Skills</h1>
          <p className="text-sm text-muted-foreground mt-1">Reusable capabilities assigned to agents</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Skills</p>
          <p className="text-2xl font-bold">{skills.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Active</p>
          <p className="text-2xl font-bold text-green-600">{skills.filter((s) => s.status === "active").length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Categories</p>
          <p className="text-2xl font-bold">{categories.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Invocations</p>
          <p className="text-2xl font-bold">{skills.reduce((sum, s) => sum + s.usage.totalInvocations, 0)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search skills..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-muted/50 pl-9 pr-4 py-2 text-sm" />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Skills List */}
      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No skills found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((skill) => {
            const isExpanded = expandedId === skill._id;
            return (
              <div key={skill._id} className="bg-white rounded-xl border overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : skill._id)}
                  className="w-full text-left p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{skill.name}</p>
                      <span className={cn("text-xs px-2 py-0.5 rounded font-medium", CATEGORY_COLORS[skill.category] || "bg-gray-100 text-gray-600")}>
                        {skill.category}
                      </span>
                      <span className={cn("text-xs px-2 py-0.5 rounded",
                        skill.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      )}>{skill.status}</span>
                      <span className="text-xs text-muted-foreground">v{skill.version}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{skill.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{skill.usage.totalInvocations} invocations</span>
                      <span>{skill.supportedAgents.length} agents</span>
                      <span>{skill.requiredTools.length} tools</span>
                      {skill.usage.lastUsed && <span>Last used {new Date(skill.usage.lastUsed).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                </button>

                {isExpanded && (
                  <div className="border-t p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">INSTRUCTIONS</p>
                        <p className="text-sm whitespace-pre-wrap">{skill.instructions}</p>
                      </div>
                      <div className="space-y-3">
                        {skill.capabilities.length > 0 && (
                          <div className="bg-muted/30 rounded-lg p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">CAPABILITIES</p>
                            <div className="flex flex-wrap gap-1">
                              {skill.capabilities.map((c, i) => (
                                <span key={i} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{c}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {skill.requiredTools.length > 0 && (
                          <div className="bg-muted/30 rounded-lg p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">REQUIRED TOOLS</p>
                            <div className="flex flex-wrap gap-1">
                              {skill.requiredTools.map((t) => (
                                <span key={t._id} className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Wrench className="h-3 w-3" />{t.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {skill.supportedAgents.length > 0 && (
                          <div className="bg-muted/30 rounded-lg p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">ASSIGNED AGENTS</p>
                            <div className="flex flex-wrap gap-1">
                              {skill.supportedAgents.map((a) => (
                                <span key={a._id} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Users className="h-3 w-3" />{a.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {skill.supportedContexts.length > 0 && (
                          <div className="bg-muted/30 rounded-lg p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">CONTEXTS</p>
                            <div className="flex flex-wrap gap-1">
                              {skill.supportedContexts.map((c, i) => (
                                <span key={i} className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{c}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                      <span>Created {new Date(skill.createdAt).toLocaleDateString()}</span>
                      <span>Version {skill.version}</span>
                      <span className="ml-auto">Slug: {skill.slug}</span>
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
