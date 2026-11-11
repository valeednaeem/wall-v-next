"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CheckSquare, Plus, Search, Filter, Loader2, ArrowLeft, Calendar,
  AlertTriangle, Clock, CheckCircle2, XCircle, ChevronDown, ChevronRight,
  GripVertical, MoreHorizontal, Eye, Edit, Trash2, MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface Task {
  _id: string;
  title: string;
  description?: string;
  project: { _id: string; name: string; slug: string };
  assignee?: { _id: string; name: string; email: string; avatar?: string };
  reporter: { _id: string; name: string; email: string };
  status: "todo" | "in-progress" | "review" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: string;
  estimatedHours?: number;
  loggedHours: number;
  dependencies: { _id: string; title: string; status: string }[];
  subtasks: { title: string; completed: boolean }[];
  acceptanceCriteria: string[];
  order: number;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-gray-100 text-gray-600",
  "in-progress": "bg-blue-100 text-blue-700",
  review: "bg-purple-100 text-purple-700",
  done: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [activeTab, setActiveTab] = useState("list");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterPriority !== "all") params.set("priority", filterPriority);
      params.set("limit", "200");

      const res = await fetch(`/api/tasks?${params}`, { credentials: "include" });
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterPriority]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      setTasks(tasks.map((t) => t._id === taskId ? { ...t, status: status as any } : t));
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  const todoTasks = tasks.filter((t) => t.status === "todo");
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress");
  const reviewTasks = tasks.filter((t) => t.status === "review");
  const doneTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-blue-600" />
            Tasks
          </h1>
          <p className="text-sm text-muted-foreground">{tasks.length} tasks total</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTasks}>
            <Loader2 className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: tasks.length, color: "text-gray-600", bg: "bg-gray-50" },
          { label: "To Do", value: todoTasks.length, color: "text-gray-600", bg: "bg-gray-50" },
          { label: "In Progress", value: inProgressTasks.length, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "In Review", value: reviewTasks.length, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Done", value: doneTasks.length, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Status</option>
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="review">Review</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">No tasks found</p>
            <p className="text-xs text-muted-foreground mt-1">Tasks are created when projects are decomposed</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Card
              key={task._id}
              className="hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => { setSelectedTask(task); setShowDetail(true); }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{task.title}</p>
                      <Badge className={cn("text-[10px]", STATUS_COLORS[task.status])}>{task.status}</Badge>
                      <Badge className={cn("text-[10px]", PRIORITY_COLORS[task.priority])}>{task.priority}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {task.project && <span>{task.project.name}</span>}
                      {task.assignee && <span>→ {task.assignee.name}</span>}
                      {task.estimatedHours && <span>{task.estimatedHours}h est</span>}
                      {task.dueDate && (
                        <span className={cn(new Date(task.dueDate) < new Date() && task.status !== "done" ? "text-red-600" : "")}>
                          Due {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {task.subtasks.length > 0 && (
                        <span>{task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} subtasks</span>
                      )}
                      {task.dependencies.length > 0 && (
                        <span className="flex items-center gap-1">
                          <ArrowLeft className="h-3 w-3" />
                          {task.dependencies.length} deps
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {task.status !== "done" && task.status !== "cancelled" && (
                      <select
                        value={task.status}
                        onChange={(e) => updateTaskStatus(task._id, e.target.value)}
                        className="text-xs border rounded px-1 py-0.5"
                      >
                        <option value="todo">To Do</option>
                        <option value="in-progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="done">Done</option>
                      </select>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTask.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge className={cn("text-xs", STATUS_COLORS[selectedTask.status])}>{selectedTask.status}</Badge>
                  <Badge className={cn("text-xs", PRIORITY_COLORS[selectedTask.priority])}>{selectedTask.priority}</Badge>
                </div>

                {selectedTask.description && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedTask.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Project:</span> {selectedTask.project?.name}</div>
                  <div><span className="text-muted-foreground">Assignee:</span> {selectedTask.assignee?.name || "Unassigned"}</div>
                  <div><span className="text-muted-foreground">Estimated:</span> {selectedTask.estimatedHours || "—"}h</div>
                  <div><span className="text-muted-foreground">Logged:</span> {selectedTask.loggedHours}h</div>
                  <div><span className="text-muted-foreground">Due:</span> {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : "—"}</div>
                  <div><span className="text-muted-foreground">Order:</span> {selectedTask.order}</div>
                </div>

                {selectedTask.dependencies.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Dependencies</p>
                    <div className="space-y-1">
                      {selectedTask.dependencies.map((dep) => (
                        <div key={dep._id} className="flex items-center gap-2 text-sm">
                          <ArrowLeft className="h-3 w-3" />
                          <span>{dep.title}</span>
                          <Badge className={cn("text-[10px]", STATUS_COLORS[dep.status])}>{dep.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTask.subtasks.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Subtasks</p>
                    <div className="space-y-1">
                      {selectedTask.subtasks.map((sub, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          {sub.completed ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <XCircle className="h-3 w-3 text-gray-400" />}
                          <span className={cn(sub.completed && "line-through text-muted-foreground")}>{sub.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTask.acceptanceCriteria.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Acceptance Criteria</p>
                    <ul className="space-y-1">
                      {selectedTask.acceptanceCriteria.map((ac, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <CheckCircle2 className="h-3 w-3 mt-0.5 text-emerald-600 shrink-0" />
                          {ac}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
