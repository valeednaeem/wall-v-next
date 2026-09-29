"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  FileBarChart,
  Download,
  Eye,
  History,
  Users,
  DollarSign,
  Coins,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangeFilter, type RangeValue } from "@/components/ai-tools/date-range-filter";
import { REPORT_META, REPORT_TYPES, type ReportType } from "@/lib/tools/report-csv";

const TYPE_ICONS: Partial<Record<ReportType, typeof FileBarChart>> = {
  usage: FileBarChart,
  adoption: Users,
  revenue: DollarSign,
  credits: Coins,
  cost: DollarSign,
  conversion: TrendingUp,
};

interface ToolOption {
  _id: string;
  name: string;
}

function ReportsContent() {
  const [range, setRange] = useState<RangeValue>({ range: "30d" });
  const [selected, setSelected] = useState<ReportType>("usage");
  const [toolId, setToolId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [accessModel, setAccessModel] = useState("all");
  const [userType, setUserType] = useState("all");
  const [toolOptions, setToolOptions] = useState<ToolOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<ToolOption[]>([]);
  const [preview, setPreview] = useState<{ type: ReportType; text: string } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/ai-tools?limit=100&allStatuses=true`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          setToolOptions(d.data.map((t: { _id: string; name: string }) => ({ _id: t._id, name: t.name })));
        }
      })
      .catch(() => {});
    fetch(`/api/ai-tools/categories`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          setCategoryOptions(d.data.map((c: { _id: string; name: string }) => ({ _id: c._id, name: c.name })));
        }
      })
      .catch(() => {});
  }, []);

  const params = useMemo(() => {
    const p = new URLSearchParams({ type: selected, range: range.range });
    if (range.start) p.set("start", range.start);
    if (range.end) p.set("end", range.end);
    if (toolId !== "all") p.set("toolId", toolId);
    if (categoryId !== "all") p.set("category", categoryId);
    if (accessModel !== "all") p.set("accessModel", accessModel);
    if (userType !== "all") p.set("userType", userType);
    return p;
  }, [selected, range, toolId, categoryId, accessModel, userType]);

  const doPreview = useCallback(async () => {
    setPreviewing(true);
    setError("");
    setPreview(null);
    try {
      const res = await fetch(`/api/ai-tools/reports?${params}`);
      if (res.status === 401) {
        window.location.href = "/login?callbackUrl=/dashboard/ai-tools/reports";
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Failed to generate report.");
        return;
      }
      const text = await res.text();
      setPreview({ type: selected, text });
    } catch {
      setError("Failed to generate report. Please try again.");
    } finally {
      setPreviewing(false);
    }
  }, [params, selected]);

  const doDownload = useCallback(() => {
    window.open(`/api/ai-tools/reports?${params}`, "_blank");
  }, [params]);

  const previewLines = useMemo(() => {
    if (!preview) return [];
    return preview.text.split(/\r?\n/).filter((l) => l.length > 0).slice(0, 201);
  }, [preview]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reports</h2>
          <p className="text-sm text-muted-foreground">
            CSV exports built from live rollups — RFC-4180, spreadsheet-ready
          </p>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      <Card className="border-dashed">
        <CardContent className="flex items-start gap-2 p-4 text-sm text-muted-foreground">
          <History className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Every generated report is written to the audit log (<code>ActivityLog</code> —{" "}
            <code>report.generated</code>) with its filters, so exports are traceable.
          </span>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {REPORT_TYPES.map((t) => {
          const Icon = TYPE_ICONS[t] || FileBarChart;
          const active = selected === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setSelected(t)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                active
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "bg-card hover:border-primary/40"
              }`}
            >
              <span className="flex items-center gap-2 font-medium">
                <Icon className="h-4 w-4" />
                {REPORT_META[t].title}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {REPORT_META[t].description}
              </span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Select value={toolId} onValueChange={setToolId}>
            <SelectTrigger className="w-[200px]" aria-label="Filter by tool">
              <SelectValue placeholder="All tools" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tools</SelectItem>
              {toolOptions.map((t) => (
                <SelectItem key={t._id} value={t._id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-[180px]" aria-label="Filter by category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={accessModel} onValueChange={setAccessModel}>
            <SelectTrigger className="w-[170px]" aria-label="Filter by access model">
              <SelectValue placeholder="All access" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All access models</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="freemium">Freemium</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
            </SelectContent>
          </Select>
          <Select value={userType} onValueChange={setUserType}>
            <SelectTrigger className="w-[170px]" aria-label="Filter by user type">
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              <SelectItem value="authenticated">Authenticated</SelectItem>
              <SelectItem value="anonymous">Anonymous</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={doPreview} disabled={previewing}>
              <Eye className="mr-1.5 h-4 w-4" />
              {previewing ? "Generating…" : "Preview"}
            </Button>
            <Button onClick={doDownload}>
              <Download className="mr-1.5 h-4 w-4" />
              Download CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">{error}</CardContent>
        </Card>
      )}

      {previewing && <Skeleton className="h-48 w-full rounded-lg" />}

      {preview && !previewing && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              Preview — {REPORT_META[preview.type].title}
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {previewLines.length >= 201 ? "first 200 rows shown" : `${previewLines.length - 1} rows`}
            </span>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[480px] overflow-auto rounded-md bg-muted/50 p-4 text-xs leading-relaxed">
              {previewLines.join("\n")}
              {previewLines.length >= 201 ? "\n… (download for full report)" : ""}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AiToolsReportsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <ReportsContent />
    </Suspense>
  );
}
