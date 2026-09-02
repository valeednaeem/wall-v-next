"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Calendar, Send, RefreshCw, FileText, Clock,
  AlertTriangle, CheckCircle2, Loader2, Mail, Bell, Eye,
  ChevronLeft, ChevronRight, FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: string;
  projectId: string;
  projectName: string;
  color: string;
}

interface ProjectUpdate {
  projectId: string;
  projectName: string;
  clientName: string;
  subject: string;
  message: string;
  progress: number;
  tasksCompleted: number;
  tasksTotal: number;
  issues: string[];
}

interface ProgressReport {
  projectId: string;
  projectName: string;
  period: string;
  summary: string;
  progress: number;
  tasksCompleted: number;
  tasksTotal: number;
  milestonesReached: string[];
  upcomingMilestones: string[];
  risks: string[];
  issues: string[];
  nextSteps: string[];
}

const EVENT_COLORS: Record<string, string> = {
  deadline: "border-l-blue-500 bg-blue-50",
  milestone: "border-l-emerald-500 bg-emerald-50",
  meeting: "border-l-purple-500 bg-purple-50",
  review: "border-l-amber-500 bg-amber-50",
  deployment: "border-l-green-500 bg-green-50",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  deadline: "bg-blue-100 text-blue-700",
  milestone: "bg-emerald-100 text-emerald-700",
  meeting: "bg-purple-100 text-purple-700",
  review: "bg-amber-100 text-amber-700",
  deployment: "bg-green-100 text-green-700",
};

export default function CommunicationsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedUpdate, setSelectedUpdate] = useState<ProjectUpdate | null>(null);
  const [selectedReport, setSelectedReport] = useState<ProgressReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("calendar");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [reportPeriod, setReportPeriod] = useState<"weekly" | "monthly">("weekly");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pm/communications?action=calendar&days=60", { credentials: "include" });
      const data = await res.json();
      if (data.events) setEvents(data.events);
    } catch (err) {
      console.error("Failed to fetch calendar events:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const generateUpdate = async () => {
    if (!selectedProjectId) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/pm/communications?action=update&projectId=${selectedProjectId}`, { credentials: "include" });
      const data = await res.json();
      if (data.update) setSelectedUpdate(data.update);
    } finally {
      setGenerating(false);
    }
  };

  const generateReport = async () => {
    if (!selectedProjectId) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/pm/communications?action=report&projectId=${selectedProjectId}&period=${reportPeriod}`, { credentials: "include" });
      const data = await res.json();
      if (data.report) setSelectedReport(data.report);
    } finally {
      setGenerating(false);
    }
  };

  const sendUpdate = async () => {
    if (!selectedProjectId) return;
    setGenerating(true);
    try {
      await fetch("/api/pm/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-update", projectId: selectedProjectId }),
        credentials: "include",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Calendar grid
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();
    return { daysInMonth, startDay, year, month };
  };

  const { daysInMonth, startDay, year, month } = getDaysInMonth(calendarMonth);
  const monthName = calendarMonth.toLocaleString("default", { month: "long", year: "numeric" });

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.date.startsWith(dateStr));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            Client Communications
          </h1>
          <p className="text-sm text-muted-foreground">Updates, reports, and calendar</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="updates">Status Updates</TabsTrigger>
          <TabsTrigger value="reports">Progress Reports</TabsTrigger>
        </TabsList>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>{monthName}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setCalendarMonth(new Date(year, month - 1, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCalendarMonth(new Date(year, month + 1, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="font-medium text-muted-foreground py-1">{d}</div>
                ))}
                {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayEvents = getEventsForDay(day);
                  const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                  return (
                    <div key={day} className={cn("p-1 rounded min-h-[40px]", isToday && "bg-blue-100 font-bold")}>
                      <span className="text-xs">{day}</span>
                      {dayEvents.length > 0 && (
                        <div className="mt-0.5">
                          {dayEvents.slice(0, 2).map((e) => (
                            <div key={e.id} className="text-[8px] truncate rounded px-0.5" style={{ backgroundColor: e.color + "20", color: e.color }}>
                              {e.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && <div className="text-[8px] text-muted-foreground">+{dayEvents.length - 2}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader><CardTitle className="text-base">Upcoming Events</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {events.slice(0, 10).map((event) => (
                <div key={event.id} className={cn("flex items-center gap-3 p-2 rounded-lg border-l-4", EVENT_COLORS[event.type] || "border-l-gray-500 bg-gray-50")}>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{event.projectName}</p>
                  </div>
                  <Badge className={cn("text-[10px]", EVENT_TYPE_COLORS[event.type])}>{event.type}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString()}</span>
                </div>
              ))}
              {events.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No upcoming events</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Updates Tab */}
        <TabsContent value="updates" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Generate Status Update</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <input
                  placeholder="Project ID"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm"
                />
                <Button onClick={generateUpdate} disabled={generating || !selectedProjectId}>
                  {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Eye className="h-4 w-4 mr-1" />}
                  Preview
                </Button>
                <Button variant="outline" onClick={sendUpdate} disabled={generating || !selectedProjectId}>
                  <Send className="h-4 w-4 mr-1" />
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>

          {selectedUpdate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{selectedUpdate.subject}</span>
                  <Badge variant="outline">{selectedUpdate.progress}%</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-4 text-sm">
                  <span className="text-muted-foreground">Client: <strong>{selectedUpdate.clientName}</strong></span>
                  <span className="text-muted-foreground">Tasks: <strong>{selectedUpdate.tasksCompleted}/{selectedUpdate.tasksTotal}</strong></span>
                </div>
                <p className="text-sm">{selectedUpdate.message}</p>
                {selectedUpdate.issues.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Issues:</p>
                    {selectedUpdate.issues.map((issue, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangle className="h-3 w-3" /> {issue}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Generate Progress Report</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <input
                  placeholder="Project ID"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm"
                />
                <Select value={reportPeriod} onValueChange={(v: any) => setReportPeriod(v)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={generateReport} disabled={generating || !selectedProjectId}>
                  {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
                  Generate
                </Button>
              </div>
            </CardContent>
          </Card>

          {selectedReport && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{selectedReport.projectName} — {selectedReport.period} Report</span>
                  <Badge variant="outline">{selectedReport.progress}%</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{selectedReport.summary}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Milestones Reached</p>
                    {selectedReport.milestonesReached.map((m, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> {m}
                      </div>
                    ))}
                    {selectedReport.milestonesReached.length === 0 && <p className="text-xs text-muted-foreground">None</p>}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Upcoming Milestones</p>
                    {selectedReport.upcomingMilestones.map((m, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs text-blue-600">
                        <Clock className="h-3 w-3" /> {m}
                      </div>
                    ))}
                  </div>
                </div>
                {selectedReport.issues.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Issues</p>
                    {selectedReport.issues.map((issue, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangle className="h-3 w-3" /> {issue}
                      </div>
                    ))}
                  </div>
                )}
                {selectedReport.nextSteps.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Next Steps</p>
                    {selectedReport.nextSteps.map((step, i) => (
                      <div key={i} className="text-xs text-muted-foreground">{i + 1}. {step}</div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
