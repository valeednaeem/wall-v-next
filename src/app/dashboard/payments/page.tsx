"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign, Search, Loader2, CheckCircle2, XCircle, Clock,
  ArrowDownRight, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Payment {
  _id: string;
  paymentNumber: string;
  gateway: string;
  customerEmail: string;
  customerName: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  invoice?: { invoiceNumber: string; total: number };
  order?: { orderNumber: string; total: number };
  project?: { name: string };
  completedAt?: string;
  failedAt?: string;
  refundedAt?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  processing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
  refunded: "bg-orange-100 text-orange-700",
  "partially-refunded": "bg-orange-100 text-orange-700",
  disputed: "bg-purple-100 text-purple-700",
  chargeback: "bg-red-100 text-red-700",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<Record<string, { count: number; totalAmount: number }>>({});
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: "50" });
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/payments?${params}`, { credentials: "include" });
      const data = await res.json();
      setPayments(data.payments || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setStats(data.stats || {});
    } catch { console.error("Failed to fetch payments"); } finally { setLoading(false); }
  }, [page, filterStatus]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const filtered = payments.filter((p) => {
    if (search && !p.paymentNumber.toLowerCase().includes(search.toLowerCase()) && !p.customerEmail.toLowerCase().includes(search.toLowerCase()) && !p.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalCompleted = stats.completed?.totalAmount || 0;
  const totalRefunded = stats.refunded?.totalAmount || 0;
  const totalPending = stats.pending?.totalAmount || 0;
  const totalFailed = stats.failed?.totalAmount || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-muted-foreground">Transaction history and payment management</p>
        </div>
        <div className="flex gap-2">
          <a href="/dashboard/payments/reconciliation" className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg hover:bg-muted">
            <RefreshCw className="h-4 w-4" />Reconciliation
          </a>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Completed", value: `$${totalCompleted.toFixed(2)}`, icon: CheckCircle2, color: "text-green-600" },
          { label: "Pending", value: `$${totalPending.toFixed(2)}`, icon: Clock, color: "text-yellow-600" },
          { label: "Failed", value: `$${totalFailed.toFixed(2)}`, icon: XCircle, color: "text-red-600" },
          { label: "Refunded", value: `$${totalRefunded.toFixed(2)}`, icon: ArrowDownRight, color: "text-orange-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-2"><s.icon className={cn("h-4 w-4", s.color)} /><span className="text-xs text-muted-foreground">{s.label}</span></div>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search payments..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-muted/50 pl-9 pr-4 py-2 text-sm" />
        </div>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm">
          <option value="">All Status</option>
          {["pending", "processing", "completed", "failed", "cancelled", "refunded", "partially-refunded", "disputed", "chargeback"].map((s) => (
            <option key={s} value={s}>{s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
          ))}
        </select>
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No payments found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Payment</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
              <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Gateway</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Reference</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
            </tr></thead>
            <tbody>
              {filtered.map((payment) => (
                <tr key={payment._id} className="border-b hover:bg-muted/30">
                  <td className="p-3"><p className="font-medium text-xs">{payment.paymentNumber}</p></td>
                  <td className="p-3"><div><p className="text-xs">{payment.customerName}</p><p className="text-xs text-muted-foreground">{payment.customerEmail}</p></div></td>
                  <td className="p-3 text-right"><p className="font-medium">{payment.amount.toFixed(2)} {payment.currency}</p></td>
                  <td className="p-3"><span className={cn("text-xs px-2 py-0.5 rounded", STATUS_COLORS[payment.status])}>{payment.status}</span></td>
                  <td className="p-3 text-xs capitalize">{payment.gateway}</td>
                  <td className="p-3 text-xs">
                    {payment.invoice && <span>INV: {payment.invoice.invoiceNumber}</span>}
                    {payment.order && <span>ORD: {payment.order.orderNumber}</span>}
                    {payment.project && <span>PRJ: {payment.project.name}</span>}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(payment.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between p-3 border-t">
            <span className="text-xs text-muted-foreground">{total} payments — Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-xs border rounded-lg hover:bg-muted disabled:opacity-50">Previous</button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-xs border rounded-lg hover:bg-muted disabled:opacity-50">Next</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
