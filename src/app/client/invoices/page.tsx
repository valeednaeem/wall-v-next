"use client";

import { useState, useEffect } from "react";
import { FileText, Download, Eye, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: string;
  type: string;
  dueDate: string;
  paidAt?: string;
  paymentMethod?: string;
  project?: { name: string };
  notes?: string;
  createdAt: string;
}

const statusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  "partially-paid": "bg-yellow-100 text-yellow-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-purple-100 text-purple-700",
};

export default function ClientInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const url = filter === "all" ? "/api/client/invoices" : `/api/client/invoices?status=${filter}`;
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { setInvoices(data.invoices || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  const filtered = invoices.filter((inv) =>
    !search || inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || inv.project?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-muted-foreground">View and manage your invoices.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices..."
            className="w-full rounded-lg border bg-white pl-9 pr-4 py-2 text-sm" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {["all", "sent", "viewed", "paid", "partially-paid", "overdue"].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={cn("px-3 py-1.5 text-xs rounded-full border whitespace-nowrap",
                filter === s ? "bg-primary text-primary-foreground" : "bg-white hover:bg-muted")}>
              {s === "all" ? "All" : s.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground">No invoices found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Invoice</th>
                  <th className="text-left px-4 py-3 font-medium">Project</th>
                  <th className="text-left px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Due Date</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((inv) => (
                  <tr key={inv._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground capitalize">{inv.type?.replace("-", " ")}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.project?.name || "-"}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{inv.currency} {inv.total?.toLocaleString()}</p>
                      {inv.amountPaid > 0 && (
                        <p className="text-xs text-green-600">Paid: {inv.currency} {inv.amountPaid.toLocaleString()}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 text-xs rounded-full", statusColor[inv.status] || "bg-gray-100")}>
                        {inv.status?.replace("-", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button className="p-1.5 hover:bg-gray-100 rounded" title="View">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
