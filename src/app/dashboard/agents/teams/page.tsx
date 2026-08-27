"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Search, Loader2, Crown, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamMember {
  _id: string;
  agent: { _id: string; name: string; slug: string; role: string; division?: string; status: string };
  role: string;
  joinedAt: string;
}

interface Team {
  _id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  members: TeamMember[];
  leadAgent?: { _id: string; name: string; slug: string; role: string };
  tags: string[];
  maxMembers: number;
  usage: { totalTasks: number; completedTasks: number; avgCompletionTime: number };
  createdBy: { name: string; email: string };
  createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  lead: "bg-purple-100 text-purple-700",
  contributor: "bg-blue-100 text-blue-700",
  reviewer: "bg-green-100 text-green-700",
  specialist: "bg-amber-100 text-amber-700",
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agents/teams", { credentials: "include" });
      const data = await res.json();
      setTeams(data.teams || []);
    } catch { console.error("Failed to fetch teams"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const filtered = teams.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this team?")) return;
    try {
      await fetch(`/api/agents/teams/${id}`, { method: "DELETE" });
      setTeams(teams.filter((t) => t._id !== id));
    } catch { console.error("Failed to delete team"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Teams</h1>
          <p className="text-sm text-muted-foreground">Virtual agent teams for collaborative project work</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Teams", value: teams.length },
          { label: "Active Teams", value: teams.filter((t) => t.status === "active").length },
          { label: "Total Members", value: teams.reduce((sum, t) => sum + (t.members?.length || 0), 0) },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-lg font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input type="text" placeholder="Search teams..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border bg-muted/50 pl-9 pr-4 py-2 text-sm" />
      </div>

      {/* Teams List */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No teams found</p>
          <p className="text-xs text-muted-foreground mt-1">Create a team to organize agents for collaborative work</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((team) => {
            const isExpanded = expandedId === team._id;
            return (
              <div key={team._id} className="bg-white rounded-xl border overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : team._id)}
                  className="w-full text-left p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{team.name}</p>
                      <span className={cn("text-xs px-2 py-0.5 rounded", team.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>{team.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{team.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{team.members?.length || 0} members</span>
                      <span>{team.usage?.completedTasks || 0} tasks done</span>
                      {team.leadAgent && <span>Lead: {team.leadAgent.name}</span>}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t p-4 space-y-4">
                    {/* Members */}
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Members</h4>
                      {team.members?.length ? (
                        <div className="space-y-2">
                          {team.members.map((member) => (
                            <div key={member._id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                {member.role === "lead" ? <Crown className="h-4 w-4 text-purple-600" /> : <Users className="h-4 w-4 text-primary" />}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{member.agent?.name || "Unknown"}</p>
                                <p className="text-xs text-muted-foreground">{member.agent?.role} {member.agent?.division && `- ${member.agent.division}`}</p>
                              </div>
                              <span className={cn("text-xs px-2 py-0.5 rounded", ROLE_COLORS[member.role])}>{member.role}</span>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-sm text-muted-foreground">No members yet</p>}
                    </div>

                    {/* Tags */}
                    {team.tags?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {team.tags.map((tag) => (
                            <span key={tag} className="text-xs px-2 py-1 bg-muted rounded-lg">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <button onClick={() => handleDelete(team._id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/10">
                        <Trash2 className="h-3 w-3" />Delete
                      </button>
                      <span className="text-xs text-muted-foreground ml-auto">Created by {team.createdBy?.name || "Unknown"}</span>
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
