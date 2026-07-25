"use client";

import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, ArrowUpRight, ArrowDownRight, Download, Filter, CreditCard, Wallet, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentStats {
  totalRevenue: number;
  monthlyRevenue: number;
  pendingPayments: number;
  completedPayments: number;
  failedPayments: number;
  refundedPayments: number;
  onHoldPayments: number;
  averageOrderValue: number;
  revenueGrowth: number;
}

interface Transaction {
  id: string;
  type: "incoming" | "outgoing";
  amount: number;
  currency: string;
  status: "completed" | "pending" | "on-hold" | "failed" | "refunded";
  description: string;
  client?: string;
  method: string;
  date: string;
  reference: string;
}

interface PaymentGateway {
  name: string;
  enabled: boolean;
  testMode: boolean;
  lastSync: string;
  balance: number;
}

export default function PaymentSettingsPage() {
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    completedPayments: 0,
    failedPayments: 0,
    refundedPayments: 0,
    onHoldPayments: 0,
    averageOrderValue: 0,
    revenueGrowth: 0,
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<"all" | "incoming" | "outgoing" | "pending" | "completed" | "on-hold" | "failed">("all");
  const [gateways, setGateways] = useState<PaymentGateway[]>([
    { name: "Stripe", enabled: true, testMode: false, lastSync: new Date().toISOString(), balance: 12450.00 },
    { name: "PayPal", enabled: true, testMode: true, lastSync: new Date().toISOString(), balance: 3200.50 },
    { name: "2Checkout", enabled: false, testMode: true, lastSync: "", balance: 0 },
  ]);

  useEffect(() => {
    fetch("/api/settings/payments")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          if (d.data.stats) setStats(d.data.stats);
          if (d.data.transactions) setTransactions(d.data.transactions);
          if (d.data.gateways) setGateways(d.data.gateways);
        }
      })
      .catch(() => {});
  }, []);

  const filteredTransactions = transactions.filter((t) => {
    if (filter === "all") return true;
    if (filter === "incoming" || filter === "outgoing") return t.type === filter;
    return t.status === filter;
  });

  const statusColors: Record<string, string> = {
    completed: "bg-green-50 text-green-700",
    pending: "bg-yellow-50 text-yellow-700",
    "on-hold": "bg-orange-50 text-orange-700",
    failed: "bg-red-50 text-red-700",
    refunded: "bg-purple-50 text-purple-700",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    completed: <CheckCircle className="h-3 w-3" />,
    pending: <Clock className="h-3 w-3" />,
    "on-hold": <Clock className="h-3 w-3" />,
    failed: <XCircle className="h-3 w-3" />,
    refunded: <ArrowDownRight className="h-3 w-3" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Payment & Financials</h2>
        <button className="inline-flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors">
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Revenue", value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
          { label: "Monthly Revenue", value: `$${stats.monthlyRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50", change: `+${stats.revenueGrowth}%` },
          { label: "Pending", value: `$${stats.pendingPayments.toLocaleString()}`, icon: Clock, color: "text-yellow-600", bg: "bg-yellow-50" },
          { label: "On Hold", value: `$${stats.onHoldPayments.toLocaleString()}`, icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", stat.bg)}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
            </div>
            <div className="flex items-end gap-2 mt-2">
              <p className="text-2xl font-bold">{stat.value}</p>
              {stat.change && <span className="text-xs text-green-600 font-medium mb-1">{stat.change}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="text-xl font-bold text-green-600 mt-1">${stats.completedPayments.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Failed</p>
          <p className="text-xl font-bold text-red-600 mt-1">${stats.failedPayments.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Refunded</p>
          <p className="text-xl font-bold text-purple-600 mt-1">${stats.refundedPayments.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Avg. Order Value</p>
          <p className="text-xl font-bold mt-1">${stats.averageOrderValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Payment Gateways */}
      <div className="rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold">Payment Gateways</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {gateways.map((gw) => (
            <div key={gw.name} className={cn("border rounded-lg p-4", gw.enabled ? "border-green-200 bg-green-50/50" : "border-gray-200")}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold text-sm">{gw.name}</span>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", gw.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                  {gw.enabled ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between"><span>Balance</span><span className="font-medium text-foreground">${gw.balance.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Mode</span><span className="font-medium text-foreground">{gw.testMode ? "Test" : "Live"}</span></div>
                <div className="flex justify-between"><span>Last Sync</span><span className="font-medium text-foreground">{gw.lastSync ? new Date(gw.lastSync).toLocaleDateString() : "Never"}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Transactions</h3>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="text-sm border rounded-lg px-2 py-1">
              <option value="all">All</option>
              <option value="incoming">Incoming</option>
              <option value="outgoing">Outgoing</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="on-hold">On Hold</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 font-medium">Client</th>
                <th className="pb-2 font-medium">Method</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Reference</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((txn) => (
                <tr key={txn.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-3">
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", txn.type === "incoming" ? "bg-green-50" : "bg-red-50")}>
                      {txn.type === "incoming" ? <ArrowUpRight className="h-4 w-4 text-green-600" /> : <ArrowDownRight className="h-4 w-4 text-red-600" />}
                    </div>
                  </td>
                  <td className="py-3 font-medium max-w-[200px] truncate">{txn.description}</td>
                  <td className="py-3 text-muted-foreground">{txn.client || "—"}</td>
                  <td className="py-3 text-muted-foreground">{txn.method}</td>
                  <td className={cn("py-3 font-semibold", txn.type === "incoming" ? "text-green-600" : "text-red-600")}>
                    {txn.type === "incoming" ? "+" : "-"}${txn.amount.toLocaleString()}
                  </td>
                  <td className="py-3">
                    <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium capitalize", statusColors[txn.status])}>
                      {statusIcons[txn.status]}
                      {txn.status.replace("-", " ")}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground text-xs">{txn.date}</td>
                  <td className="py-3 text-xs font-mono text-muted-foreground">{txn.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">No transactions found for this filter.</p>
          )}
        </div>
      </div>
    </div>
  );
}
