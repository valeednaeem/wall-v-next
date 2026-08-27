"use client";

import { useEffect, useState, useCallback } from "react";
import { FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  client?: { name?: string; email?: string };
  project?: { name?: string };
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: string;
  type: string;
  dueDate?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  partially_paid: "bg-orange-100 text-orange-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
  refunded: "bg-purple-100 text-purple-700",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  paid: <CheckCircle className="h-4 w-4 text-green-500" />,
  overdue: <AlertCircle className="h-4 w-4 text-red-500" />,
  sent: <Clock className="h-4 w-4 text-blue-500" />,
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/invoices?${params}`);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.data);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Invoices</h1>
        </div>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </div>

      <div className="flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No invoices found</div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Invoice</th>
                <th className="px-4 py-3 text-left font-medium">Client</th>
                <th className="px-4 py-3 text-left font-medium">Project</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-right font-medium">Paid</th>
                <th className="px-4 py-3 text-right font-medium">Due</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">{inv.client?.name || "—"}</td>
                  <td className="px-4 py-3">{inv.project?.name || "—"}</td>
                  <td className="px-4 py-3 text-right">{inv.currency} {inv.total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-green-600">{inv.amountPaid.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-red-600">{inv.amountDue.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[inv.status] || "bg-gray-100"}`}>
                      {STATUS_ICONS[inv.status]}
                      {inv.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs capitalize">{inv.type.replace(/-/g, " ")}</td>
                  <td className="px-4 py-3 text-xs">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
