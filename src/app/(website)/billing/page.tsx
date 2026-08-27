"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign, FileText, CreditCard, Clock, CheckCircle2, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Invoice {
  _id: string;
  invoiceNumber: string;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  status: string;
  dueDate?: string;
  paidAt?: string;
  project?: { name: string };
  items: { description: string; total: number }[];
}

interface Payment {
  _id: string;
  paymentNumber: string;
  amount: number;
  currency: string;
  status: string;
  invoice?: { invoiceNumber: string };
  project?: { name: string };
  createdAt: string;
}

interface Balance {
  totalPaid: number;
  totalOwed: number;
  balance: number;
  payments: number;
  invoices: number;
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"invoices" | "payments" | "overview">("overview");
  const [paying, setPaying] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, payRes, balRes] = await Promise.all([
        fetch("/api/invoices?limit=50", { credentials: "include" }),
        fetch("/api/payments?limit=50", { credentials: "include" }),
        fetch("/api/payments/balance", { credentials: "include" }),
      ]);
      const invData = await invRes.json();
      const payData = await payRes.json();
      const balData = await balRes.json();
      setInvoices(invData.invoices || []);
      setPayments(payData.payments || []);
      setBalance(balData);
    } catch { console.error("Failed to fetch billing data"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePayNow = async (invoiceId: string) => {
    setPaying(invoiceId);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "invoice", items: [{ invoiceId }], invoiceId }),
      });
      const data = await res.json();
      if (data.success && data.data.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
      }
    } catch { console.error("Checkout failed"); } finally { setPaying(null); }
  };

  const unpaidInvoices = invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled");
  const paidInvoices = invoices.filter((i) => i.status === "paid");

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-12 px-4">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Manage your invoices, payments, and balance</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-green-600" /><span className="text-xs text-muted-foreground">Total Paid</span></div>
          <p className="text-2xl font-bold mt-1">${(balance?.totalPaid || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-yellow-600" /><span className="text-xs text-muted-foreground">Outstanding</span></div>
          <p className="text-2xl font-bold mt-1">${(balance?.totalOwed || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" /><span className="text-xs text-muted-foreground">Invoices</span></div>
          <p className="text-2xl font-bold mt-1">{balance?.invoices || invoices.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-purple-600" /><span className="text-xs text-muted-foreground">Payments</span></div>
          <p className="text-2xl font-bold mt-1">{balance?.payments || payments.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {(["overview", "invoices", "payments"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn("px-4 py-2 text-sm rounded-md capitalize", activeTab === tab ? "bg-white shadow font-medium" : "text-muted-foreground hover:text-foreground")}>
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {unpaidInvoices.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold mb-3">Action Required — Unpaid Invoices</h2>
                  <div className="space-y-2">
                    {unpaidInvoices.map((invoice) => (
                      <div key={invoice._id} className="bg-white rounded-xl border p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center"><Clock className="h-5 w-5 text-yellow-600" /></div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.project?.name || "Invoice"} — Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "N/A"}
                          </p>
                        </div>
                        <p className="font-bold">${invoice.amountDue.toFixed(2)}</p>
                        <button onClick={() => handlePayNow(invoice._id)} disabled={paying === invoice._id}
                          className="flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm">
                          {paying === invoice._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                          Pay Now
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {paidInvoices.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold mb-3">Recent Paid Invoices</h2>
                  <div className="space-y-2">
                    {paidInvoices.slice(0, 5).map((invoice) => (
                      <div key={invoice._id} className="bg-white rounded-xl border p-4 flex items-center gap-4">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <p className="text-sm">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">Paid {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : ""}</p>
                        </div>
                        <p className="font-medium">${invoice.total.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === "invoices" && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Invoice</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Project</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Due</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="p-3"></th>
                </tr></thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                      <td className="p-3 text-muted-foreground">{inv.project?.name || "-"}</td>
                      <td className="p-3 text-right">${inv.total.toFixed(2)}</td>
                      <td className="p-3 text-right text-muted-foreground">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "-"}</td>
                      <td className="p-3"><span className={cn("text-xs px-2 py-0.5 rounded",
                        inv.status === "paid" ? "bg-green-100 text-green-700" :
                        inv.status === "overdue" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      )}>{inv.status}</span></td>
                      <td className="p-3">
                        {inv.status !== "paid" && inv.status !== "cancelled" && (
                          <button onClick={() => handlePayNow(inv._id)} disabled={paying === inv._id}
                            className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                            {paying === inv._id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Pay Now"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {invoices.length === 0 && <p className="text-center py-8 text-muted-foreground">No invoices found</p>}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === "payments" && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground">Payment</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Invoice</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                </tr></thead>
                <tbody>
                  {payments.map((pay) => (
                    <tr key={pay._id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{pay.paymentNumber}</td>
                      <td className="p-3 text-muted-foreground">{pay.invoice?.invoiceNumber || "-"}</td>
                      <td className="p-3 text-right">{pay.amount.toFixed(2)} {pay.currency}</td>
                      <td className="p-3"><span className={cn("text-xs px-2 py-0.5 rounded",
                        pay.status === "completed" ? "bg-green-100 text-green-700" :
                        pay.status === "failed" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      )}>{pay.status}</span></td>
                      <td className="p-3 text-muted-foreground">{new Date(pay.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payments.length === 0 && <p className="text-center py-8 text-muted-foreground">No payments found</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
