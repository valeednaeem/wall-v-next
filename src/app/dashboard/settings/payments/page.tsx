"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings, Loader2, CheckCircle2, XCircle, AlertTriangle,
  Key, ArrowRight, TestTube, Rocket
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GatewayConfig {
  _id: string;
  name: string;
  displayName: string;
  enabled: boolean;
  testMode: boolean;
  status: string;
  config: {
    merchantCode?: string;
    secretKey?: string;
    buyLinkSecret?: string;
    ipnSecret?: string;
    hashAlgorithm?: string;
    currency?: string;
    returnUrl?: string;
    cancelUrl?: string;
    webhookUrl?: string;
    checkoutType?: string;
  };
  stats: {
    totalTransactions: number;
    successfulPayments: number;
    failedPayments: number;
    totalRevenue: number;
    totalRefunds: number;
  };
  lastTestedAt?: string;
  lastTestResult?: { success: boolean; message: string; timestamp: string };
}

const STATUS_STEPS: Record<string, number> = {
  "not-configured": 0,
  "configured": 1,
  "testing": 2,
  "test-passed": 3,
  "test-failed": 3,
  "production": 4,
};

export default function PaymentSettingsPage() {
  const [gateway, setGateway] = useState<GatewayConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    merchantCode: "",
    buyLinkSecret: "",
    ipnSecret: "",
    secretKey: "",
    hashAlgorithm: "SHA256",
    currency: "USD",
    checkoutType: "buy-link",
    returnUrl: "",
    cancelUrl: "",
    testMode: true,
  });

  const fetchGateway = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/payment-gateways", { credentials: "include" });
      const data = await res.json();
      if (data.gateway) {
        setGateway(data.gateway);
        setStep(STATUS_STEPS[data.gateway.status] || 0);
        setForm({
          merchantCode: data.gateway.config?.merchantCode || "",
          buyLinkSecret: data.gateway.config?.buyLinkSecret?.includes("••••") ? "" : data.gateway.config?.buyLinkSecret || "",
          ipnSecret: data.gateway.config?.ipnSecret?.includes("••••") ? "" : data.gateway.config?.ipnSecret || "",
          secretKey: data.gateway.config?.secretKey?.includes("••••") ? "" : data.gateway.config?.secretKey || "",
          hashAlgorithm: data.gateway.config?.hashAlgorithm || "SHA256",
          currency: data.gateway.config?.currency || "USD",
          checkoutType: data.gateway.config?.checkoutType || "buy-link",
          returnUrl: data.gateway.config?.returnUrl || "",
          cancelUrl: data.gateway.config?.cancelUrl || "",
          testMode: data.gateway?.testMode !== false,
        });
      }
    } catch { console.error("Failed to fetch gateway"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGateway(); }, [fetchGateway]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/payment-gateways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.gateway) {
        setGateway(data.gateway);
        setStep(STATUS_STEPS[data.gateway.status] || 0);
      }
    } catch { console.error("Failed to save"); } finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!gateway?._id) return;
    setTesting(true);
    try {
      const res = await fetch(`/api/settings/payment-gateways/${gateway._id}/test`, {
        method: "POST",
      });
      const data = await res.json();
      setGateway((prev) => prev ? { ...prev, status: data.status, lastTestResult: data.result } : null);
      setStep(STATUS_STEPS[data.status] || 0);
    } catch { console.error("Test failed"); } finally { setTesting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.wall-v.com";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Payment Gateway Setup</h1>
        <p className="text-sm text-muted-foreground">Configure 2Checkout (Verifone) payment processing</p>
      </div>

      {/* Setup Steps */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-6">
          {["Credentials", "Configured", "Testing", "Verified", "Production"].map((label, i) => (
            <div key={label} className="flex items-center">
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>{i + 1}</div>
              <span className={cn("ml-2 text-xs hidden sm:inline", i <= step ? "text-primary font-medium" : "text-muted-foreground")}>{label}</span>
              {i < 4 && <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Status Banner */}
        <div className={cn("rounded-lg p-4 mb-6 flex items-center gap-3",
          gateway?.status === "production" ? "bg-green-50 border border-green-200" :
          gateway?.status === "test-passed" ? "bg-blue-50 border border-blue-200" :
          gateway?.status === "test-failed" ? "bg-red-50 border border-red-200" :
          "bg-yellow-50 border border-yellow-200"
        )}>
          {gateway?.status === "production" ? <Rocket className="h-5 w-5 text-green-600" /> :
           gateway?.status === "test-passed" ? <CheckCircle2 className="h-5 w-5 text-blue-600" /> :
           gateway?.status === "test-failed" ? <XCircle className="h-5 w-5 text-red-600" /> :
           <AlertTriangle className="h-5 w-5 text-yellow-600" />}
          <div>
            <p className="text-sm font-medium">{gateway?.status?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Not Configured"}</p>
            {gateway?.lastTestResult && <p className="text-xs text-muted-foreground">{gateway.lastTestResult.message}</p>}
          </div>
        </div>

        {/* Credentials Form */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Key className="h-4 w-4" />2Checkout Credentials</h3>
          <p className="text-xs text-muted-foreground">
            Find your credentials at <a href="https://account.2checkout.com/mcapi" target="_blank" rel="noopener noreferrer" className="text-primary underline">2Checkout Merchant API</a>
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium">Merchant Code *</label>
              <input type="text" value={form.merchantCode} onChange={(e) => setForm({ ...form, merchantCode: e.target.value })}
                placeholder="Your 2Checkout merchant code"
                className="w-full rounded-lg border px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Buy Link Secret *</label>
              <input type="password" value={form.buyLinkSecret} onChange={(e) => setForm({ ...form, buyLinkSecret: e.target.value })}
                placeholder="Buy link secret key"
                className="w-full rounded-lg border px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">IPN Secret</label>
              <input type="password" value={form.ipnSecret} onChange={(e) => setForm({ ...form, ipnSecret: e.target.value })}
                placeholder="IPN notification secret"
                className="w-full rounded-lg border px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">API Secret Key</label>
              <input type="password" value={form.secretKey} onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
                placeholder="API secret key (optional)"
                className="w-full rounded-lg border px-3 py-2 text-sm mt-1" />
            </div>
          </div>

          <h3 className="text-sm font-semibold flex items-center gap-2 mt-6"><Settings className="h-4 w-4" />Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium">Currency</label>
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm mt-1">
                {["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "CNY", "INR", "BRL"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Hash Algorithm</label>
              <select value={form.hashAlgorithm} onChange={(e) => setForm({ ...form, hashAlgorithm: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm mt-1">
                <option value="SHA256">SHA-256</option>
                <option value="SHA3">SHA-3 (if supported)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Checkout Type</label>
              <select value={form.checkoutType} onChange={(e) => setForm({ ...form, checkoutType: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm mt-1">
                <option value="buy-link">Buy Link (Redirect)</option>
                <option value="hosted-checkout">Hosted Checkout</option>
                <option value="overlay">Overlay Checkout</option>
              </select>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <input type="checkbox" id="testMode" checked={form.testMode} onChange={(e) => setForm({ ...form, testMode: e.target.checked })}
                className="h-4 w-4 rounded" />
              <label htmlFor="testMode" className="text-sm">Test/Sandbox Mode</label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mt-4">
            <div>
              <label className="text-xs font-medium">Return URL (after payment)</label>
              <input type="text" value={form.returnUrl || `${appUrl}/checkout/success`}
                onChange={(e) => setForm({ ...form, returnUrl: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Cancel URL</label>
              <input type="text" value={form.cancelUrl || `${appUrl}/checkout`}
                onChange={(e) => setForm({ ...form, cancelUrl: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm mt-1" />
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground">Webhook/IPN URL (configure in 2Checkout dashboard)</p>
              <p className="text-sm font-mono mt-1">{appUrl}/api/webhooks/2checkout</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
              Save Configuration
            </button>
            <button onClick={handleTest} disabled={testing || !gateway?.enabled}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
              Run Test Transaction
            </button>
          </div>
        </div>
      </div>

      {/* Gateway Stats */}
      {gateway && gateway.stats.totalTransactions > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-sm font-semibold mb-3">Gateway Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Transactions", value: gateway.stats.totalTransactions },
              { label: "Successful", value: gateway.stats.successfulPayments },
              { label: "Failed", value: gateway.stats.failedPayments },
              { label: "Revenue", value: `$${gateway.stats.totalRevenue.toFixed(2)}` },
              { label: "Refunds", value: `$${gateway.stats.totalRefunds.toFixed(2)}` },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
