"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  Share2,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CalendarItem {
  _id: string;
  title: string;
  type: string;
  platform?: string;
  status: string;
  scheduledAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-100 text-green-800 border-green-200",
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  approved: "bg-purple-100 text-purple-800 border-purple-200",
  review: "bg-yellow-100 text-yellow-800 border-yellow-200",
  draft: "bg-gray-100 text-gray-800 border-gray-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  article: FileText,
  social: Share2,
  post: Share2,
  video: Video,
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date(year, month, 1).toISOString();
      const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const res = await fetch(
        `/api/content/items?limit=200&status=published&status=scheduled&status=approved&status=pending&status=review`
      );
      const data = await res.json();

      if (data.success) {
        const filtered = (data.data || []).filter((item: CalendarItem) => {
          if (!item.scheduledAt) return false;
          const d = new Date(item.scheduledAt);
          return d >= new Date(start) && d <= new Date(end);
        });
        setItems(filtered);
      }
    } catch (error) {
      console.error("Failed to fetch calendar:", error);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const getItemsForDay = (day: number) => {
    return items.filter((item) => {
      const d = new Date(item.scheduledAt);
      return d.getDate() === day;
    });
  };

  const selectedItems = selectedDay ? getItemsForDay(selectedDay) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" /> Content Calendar
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} items scheduled this month
          </p>
        </div>
        <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Generate 30-Day Plan
        </button>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-semibold">
          {currentDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {/* Weekday Headers */}
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="bg-muted/50 p-2 text-center text-xs font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}

              {/* Empty Cells */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-white p-2 min-h-[100px]" />
              ))}

              {/* Day Cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayItems = getItemsForDay(day);
                const isToday =
                  new Date().getDate() === day &&
                  new Date().getMonth() === month &&
                  new Date().getFullYear() === year;
                const isSelected = selectedDay === day;

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={cn(
                      "bg-white p-2 min-h-[100px] cursor-pointer hover:bg-muted/30 transition-colors",
                      isToday && "bg-primary/5",
                      isSelected && "ring-2 ring-primary ring-inset"
                    )}
                  >
                    <div
                      className={cn(
                        "text-sm font-medium mb-1",
                        isToday
                          ? "text-primary font-bold"
                          : "text-muted-foreground"
                      )}
                    >
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayItems.slice(0, 3).map((item) => {
                        const Icon = TYPE_ICONS[item.type] || FileText;
                        return (
                          <div
                            key={item._id}
                            className={cn(
                              "text-[10px] leading-tight p-1 rounded border truncate",
                              STATUS_COLORS[item.status] || "bg-gray-100 text-gray-800 border-gray-200"
                            )}
                            title={item.title}
                          >
                            <div className="flex items-center gap-1">
                              <Icon className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{item.title}</span>
                            </div>
                          </div>
                        );
                      })}
                      {dayItems.length > 3 && (
                        <div className="text-[10px] text-muted-foreground text-center">
                          +{dayItems.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Day Detail */}
      {selectedDay && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {new Date(year, month, selectedDay).toLocaleDateString("default", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No content planned for this day
              </p>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((item) => {
                  const Icon = TYPE_ICONS[item.type] || FileText;
                  return (
                    <div
                      key={item._id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {item.type} {item.platform ? `• ${item.platform}` : ""}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          STATUS_COLORS[item.status] || "bg-gray-100 text-gray-800"
                        )}
                      >
                        {item.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
