"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, FolderKanban, Loader2, Eye, Pencil, Trash2,
  Clock, CheckCircle2, AlertCircle, Pause, XCircle, DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  _id: string;
  name: string;
  slug: string;
  title?: string;
  description: string;
  status: string;
  priority: string;
  budget: number;
  spent: number;
  currency: string;
  progress: number;
  startDate?: string;
  deadline?: string;
  milestones: { name: string; status: string }[];
  client: { name?: string; email?: string } | string;
  createdAt: string;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  client?: { name: string; email: string; company?: string };
  project?: { name: string; _id: string };
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: string;
  type: string;
  dueDate: string;
  createdAt: string;
}

interface Quotation {
  _id: string;
  reference: string;
  client?: { name: string; email: string; company?: string };
  project?: { name: string; _id: string };
  total: number;
  currency: string;
  status: string;
  validUntil: string;
  createdAt: string;
}

interface Payment {
  _id: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
  type: string;
  project?: { name: string; _id: string };
  invoice?: { invoiceNumber: string };
  paidAt?: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  planning: { label: "Planning", color: "bg-blue-50 text-blue-700", icon: <Clock className="h-3 w-3" /> },
  "in-progress": { label: "In Progress", color: "bg-yellow-50 text-yellow-700", icon: <Clock className="h-3 w-3" /> },
  review: { label: "Review", color: "bg-purple-50 text-purple-700", icon: <Eye className="h-3 w-3" /> },
  testing: { label: "Testing", color: "bg-orange-50 text-orange-700", icon: <AlertCircle className="h-3 w-3" /> },
  completed: { label: "Completed", color: "bg-green-50 text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
  "on-hold": { label: "On Hold", color: "bg-gray-50 text-gray-700", icon: <Pause className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", color: "bg-red-50 text-red-700", icon: <XCircle className="h-3 w-3" /> },
  demo: { label: "Demo", color: "bg-indigo-50 text-indigo-700", icon: <Eye className="h-3 w-3" /> },
  "pending-payment": { label: "Pending Payment", color: "bg-amber-50 text-amber-700", icon: <AlertCircle className="h-3 w-3" /> },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-600",
  high: "bg-orange-100 text-orange-600",
  urgent: "bg-red-100 text-red-600",
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
  partial: "bg-amber-100 text-amber-700",
};

const QUOTE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-gray-100 text-gray-500",
};

type Tab = "projects" | "financials";

export default function ProjectsDashboardPage() {
  const [tab, setTab] = useState<Tab>("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [total, setTotal] = useState(0);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [financialsLoading, setFinancialsLoading] = useState(true);
  const [financialTab, setFinancialTab] = useState<"invoices" | "quotations" | "payments">("invoices");

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/projects?${params}`);
      const data = await res.json();
      setProjects(data.projects || []);
      setTotal(data.total || 0);
    } catch {
      console.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  const fetchFinancials = useCallback(async () => {
    setFinancialsLoading(true);
    try {
      const [invRes, quoteRes, payRes] = await Promise.all([
        fetch("/api/admin/sales?type=invoices"),
        fetch("/api/admin/sales?type=quotations"),
        fetch("/api/admin/sales?type=payments"),
      ]);
      const [invData, quoteData, payData] = await Promise.all([
        invRes.json(), quoteRes.json(), payRes.json(),
      ]);
      setInvoices(invData.invoices || invData.data || []);
      setQuotations(quoteData.quotations || quoteData.data || []);
      setPayments(payData.payments || payData.data || []);
    } catch {
      console.error("Failed to load financials");
    } finally {
      setFinancialsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === "projects") fetchProjects();
    else fetchFinancials();
  }, [tab, fetchProjects, fetchFinancials]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    await fetchProjects();
  };

  const formatPrice = (amount: number, currency: string = "USD") =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

  const totalRevenue = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.total, 0);
  const totalOutstanding = invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled").reduce((sum, i) => sum + i.amountDue, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects & Financials</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tab === "projects" ? `${total} project${total !== 1 ? "s" : ""}` : `${invoices.length} invoices, ${quotations.length} quotes`}
          </p>
        </div>
        {tab === "projects" && (
          <Link href="/dashboard/projects/new"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New Project
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button onClick={() => setTab("projects")}
          className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors",
            tab === "projects" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}>
          <FolderKanban className="h-4 w-4 inline mr-1.5" />Projects
        </button>
        <button onClick={() => setTab("financials")}
          className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors",
            tab === "financials" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}>
          <DollarSign className="h-4 w-4 inline mr-1.5" />Financials
        </button>
      </div>

      {/* Projects Tab */}
      {tab === "projects" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {["planning", "in-progress", "review", "completed", "demo"].map((s) => {
              const cfg = STATUS_CONFIG[s];
              const count = projects.filter((p) => p.status === s).length;
              return (
                <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                  className={cn("rounded-lg border p-3 text-left transition-colors", statusFilter === s && "ring-2 ring-primary")}>
                  <div className="flex items-center gap-1.5">{cfg.icon}<span className="text-xs font-medium">{cfg.label}</span></div>
                  <p className="text-xl font-bold mt-1">{count}</p>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border bg-muted/50 pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="all">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div className="rounded-lg border overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : projects.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FolderKanban className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No projects found.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Project</th>
                    <th className="text-left p-3 font-medium">Client</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Priority</th>
                    <th className="text-left p-3 font-medium">Progress</th>
                    <th className="text-left p-3 font-medium">Budget</th>
                    <th className="text-left p-3 font-medium">Milestones</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => {
                    const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.planning;
                    const clientName = typeof project.client === "object"
                      ? project.client.name || project.client.email || "—" : project.client || "—";
                    const completedMilestones = project.milestones?.filter((m) => m.status === "completed").length || 0;
                    const totalMilestones = project.milestones?.length || 0;
                    return (
                      <tr key={project._id} className="border-t hover:bg-muted/30">
                        <td className="p-3">
                          <p className="font-medium">{project.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{project.title || project.description}</p>
                        </td>
                        <td className="p-3 text-xs">{clientName}</td>
                        <td className="p-3">
                          <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", statusCfg.color)}>
                            {statusCfg.icon} {statusCfg.label}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-medium", PRIORITY_COLORS[project.priority] || PRIORITY_COLORS.medium)}>
                            {project.priority}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${project.progress}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{project.progress}%</span>
                          </div>
                        </td>
                        <td className="p-3 text-xs font-medium">
                          {project.budget > 0 ? formatPrice(project.budget, project.currency) : "—"}
                        </td>
                        <td className="p-3 text-xs">{totalMilestones > 0 ? `${completedMilestones}/${totalMilestones}` : "—"}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/preview/${project._id}`} target="_blank" className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><Eye className="h-4 w-4" /></Link>
                            <Link href={`/dashboard/projects/${project._id}/edit`} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"><Pencil className="h-4 w-4" /></Link>
                            <button onClick={() => handleDelete(project._id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Financials Tab */}
      {tab === "financials" && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">{formatPrice(totalRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
              <p className="text-2xl font-bold text-amber-600">{formatPrice(totalOutstanding)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Invoices</p>
              <p className="text-2xl font-bold">{invoices.length}</p>
            </div>
          </div>

          {/* Sub-tabs */}
          <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
            {(["invoices", "quotations", "payments"] as const).map((t) => (
              <button key={t} onClick={() => setFinancialTab(t)}
                className={cn("px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors",
                  financialTab === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                {t}
              </button>
            ))}
          </div>

          {financialsLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              {financialTab === "invoices" && (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Invoice</th>
                      <th className="text-left p-3 font-medium">Client</th>
                      <th className="text-left p-3 font-medium">Project</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-right p-3 font-medium">Total</th>
                      <th className="text-right p-3 font-medium">Due</th>
                      <th className="text-left p-3 font-medium">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No invoices</td></tr>
                    ) : invoices.map((inv) => (
                      <tr key={inv._id} className="border-t hover:bg-muted/30">
                        <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                        <td className="p-3 text-xs">{inv.client?.name || "—"}</td>
                        <td className="p-3 text-xs">{inv.project?.name || "—"}</td>
                        <td className="p-3">
                          <span className={cn("px-2 py-0.5 rounded text-xs font-medium", INVOICE_STATUS_COLORS[inv.status] || "bg-gray-100 text-gray-600")}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="p-3 text-right text-xs font-medium">{formatPrice(inv.total, inv.currency)}</td>
                        <td className="p-3 text-right text-xs">{formatPrice(inv.amountDue, inv.currency)}</td>
                        <td className="p-3 text-xs">{new Date(inv.dueDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {financialTab === "quotations" && (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Reference</th>
                      <th className="text-left p-3 font-medium">Client</th>
                      <th className="text-left p-3 font-medium">Project</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-right p-3 font-medium">Total</th>
                      <th className="text-left p-3 font-medium">Valid Until</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotations.length === 0 ? (
                      <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No quotations</td></tr>
                    ) : quotations.map((q) => (
                      <tr key={q._id} className="border-t hover:bg-muted/30">
                        <td className="p-3 font-medium">{q.reference}</td>
                        <td className="p-3 text-xs">{q.client?.name || "—"}</td>
                        <td className="p-3 text-xs">{q.project?.name || "—"}</td>
                        <td className="p-3">
                          <span className={cn("px-2 py-0.5 rounded text-xs font-medium", QUOTE_STATUS_COLORS[q.status] || "bg-gray-100 text-gray-600")}>
                            {q.status}
                          </span>
                        </td>
                        <td className="p-3 text-right text-xs font-medium">{formatPrice(q.total, q.currency)}</td>
                        <td className="p-3 text-xs">{new Date(q.validUntil).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {financialTab === "payments" && (
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-left p-3 font-medium">Project</th>
                      <th className="text-left p-3 font-medium">Invoice</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Method</th>
                      <th className="text-right p-3 font-medium">Amount</th>
                      <th className="text-left p-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No payments</td></tr>
                    ) : payments.map((p) => (
                      <tr key={p._id} className="border-t hover:bg-muted/30">
                        <td className="p-3 text-xs capitalize">{p.type}</td>
                        <td className="p-3 text-xs">{p.project?.name || "—"}</td>
                        <td className="p-3 text-xs">{p.invoice?.invoiceNumber || "—"}</td>
                        <td className="p-3">
                          <span className={cn("px-2 py-0.5 rounded text-xs font-medium",
                            p.status === "completed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                          )}>{p.status}</span>
                        </td>
                        <td className="p-3 text-xs capitalize">{p.method || "—"}</td>
                        <td className="p-3 text-right text-xs font-medium">{formatPrice(p.amount, p.currency)}</td>
                        <td className="p-3 text-xs">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
