"use client";

import { useState, useEffect } from "react";
import { CreditCard, DollarSign, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Payment {
  _id: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  method?: string;
  reference?: string;
  transactionId?: string;
  paidAt?: string;
  notes?: string;
  project?: { name: string };
  invoice?: string;
}

export default function ClientPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/payments", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setPayments(data.payments || []);
        setTotalPaid(data.totalPaid || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const methodIcon: Record<string, string> = {
    stripe: "💳",
    paypal: "🅿️",
    "bank-transfer": "🏦",
    manual: "📝",
    "2checkout": "🛒",
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payment History</h1>
        <p className="text-muted-foreground">View all your payments and transactions.</p>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <DollarSign className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="text-3xl font-bold">${totalPaid.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Payments List */}
      {payments.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground">No payments yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Project</th>
                  <th className="text-left px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Method</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3">{p.project?.name || "-"}</td>
                    <td className="px-4 py-3 font-medium">
                      {p.currency} {p.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">
                        {methodIcon[p.method || ""] || ""} {p.method || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize">{p.type?.replace("-", " ")}</td>
                    <td className="px-4 py-3">
                      <span className={cn("px-2 py-0.5 text-xs rounded-full",
                        p.status === "completed" ? "bg-green-100 text-green-700" :
                        p.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                        p.status === "failed" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      )}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                      {p.transactionId || p.reference || "-"}
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
