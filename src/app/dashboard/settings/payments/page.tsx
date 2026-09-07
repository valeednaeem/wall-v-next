"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings, Loader2, CheckCircle2, XCircle, AlertTriangle,
  Key, ArrowRight, ArrowLeft, TestTube, Rocket, Eye, EyeOff,
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

const WIZARD_STEPS = [
  { label: "Credentials", description: "Enter 2Checkout API credentials" },
  { label: "Configuration", description: "Payment settings and URLs" },
  { label: "Test", description: "Verify gateway connection" },
  { label: "Status", description: "Review and activate" },
];

export default function PaymentSettingsPage() {
  const [gateway, setGateway] = useState<GatewayConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
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
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);

  const fetchGateway = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/payment-gateways", { credentials: "include" });
      const data = await res.json();
      if (data.gateway) {
        setGateway(data.gateway);
        setForm({
          merchantCode: data.gateway.config?.merchantCode || "",
          buyLinkSecret: "",
          ipnSecret: "",
          secretKey: "",
          hashAlgorithm: data.gateway.config?.hashAlgorithm || "SHA256",
          currency: data.gateway.config?.currency || "USD",
          checkoutType: data.gateway.config?.checkoutType || "buy-link",
          returnUrl: data.gateway.config?.returnUrl || "",
          cancelUrl: data.gateway.config?.cancelUrl || "",
          testMode: data.gateway?.testMode !== false,
        });
        const hasCreds = !!data.gateway.config?.merchantCode;
        setHasSavedCredentials(hasCreds);
        if (data.gateway.status === "test-passed") {
          setCurrentStep(3);
        } else if (data.gateway.status === "test-failed") {
          setCurrentStep(2);
        } else if (hasCreds) {
          setCurrentStep(1);
        } else {
          setCurrentStep(0);
        }
      }
    } catch {
      console.error("Failed to fetch gateway");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGateway(); }, [fetchGateway]);

  const validateStep = (step: number): string | null => {
    switch (step) {
      case 0:
        if (!form.merchantCode.trim()) return "Merchant Code is required";
        if (!hasSavedCredentials && !form.buyLinkSecret.trim()) return "Buy Link Secret is required for checkout processing";
        return null;
      case 1:
        if (!form.currency) return "Currency is required";
        if (!form.hashAlgorithm) return "Hash Algorithm is required";
        if (!form.checkoutType) return "Checkout Type is required";
        return null;
      case 2:
        return null;
      case 3:
        return null;
      default:
        return null;
    }
  };

  const handleNext = async () => {
    const error = validateStep(currentStep);
    if (error) {
      setStepErrors((prev) => ({ ...prev, [currentStep]: error }));
      return;
    }
    setStepErrors((prev) => {
      const next = { ...prev };
      delete next[currentStep];
      return next;
    });
    if (currentStep === 0 || currentStep === 1) {
      const saved = await handleSave();
      if (!saved) return;
    }
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setStepErrors((prev) => {
      const next = { ...prev };
      delete next[currentStep];
      return next;
    });
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      hashAlgorithm: form.hashAlgorithm,
      currency: form.currency,
      checkoutType: form.checkoutType,
      returnUrl: form.returnUrl,
      cancelUrl: form.cancelUrl,
      testMode: form.testMode,
    };
    if (form.merchantCode.trim()) payload.merchantCode = form.merchantCode.trim();
    if (form.buyLinkSecret.trim()) payload.buyLinkSecret = form.buyLinkSecret.trim();
    if (form.ipnSecret.trim()) payload.ipnSecret = form.ipnSecret.trim();
    if (form.secretKey.trim()) payload.secretKey = form.secretKey.trim();
    return payload;
  };

  const handleSave = async (): Promise<boolean> => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/settings/payment-gateways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Failed to save configuration");
        return false;
      }
      if (data.gateway) {
        setGateway(data.gateway);
        setHasSavedCredentials(true);
        setForm((prev) => ({
          ...prev,
          merchantCode: data.gateway.config?.merchantCode || prev.merchantCode,
          buyLinkSecret: "",
          ipnSecret: "",
          secretKey: "",
          hashAlgorithm: data.gateway.config?.hashAlgorithm || prev.hashAlgorithm,
          currency: data.gateway.config?.currency || prev.currency,
          checkoutType: data.gateway.config?.checkoutType || prev.checkoutType,
          returnUrl: data.gateway.config?.returnUrl || prev.returnUrl,
          cancelUrl: data.gateway.config?.cancelUrl || prev.cancelUrl,
          testMode: data.gateway?.testMode ?? prev.testMode,
        }));
        return true;
      }
      return false;
    } catch {
      setSaveError("Network error saving configuration");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!gateway?._id) return;
    setTesting(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/settings/payment-gateways/${gateway._id}/test`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Test failed");
        return;
      }
      setGateway((prev) => prev ? { ...prev, status: data.status, lastTestResult: data.result } : null);
    } catch {
      setSaveError("Network error running test");
    } finally {
      setTesting(false);
    }
  };

  const toggleSecret = (field: string) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.wall-v.com";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Payment Gateway Setup</h1>
        <p className="text-sm text-muted-foreground">Configure 2Checkout (Verifone) payment processing</p>
      </div>

      {/* Wizard Steps */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-6">
          {WIZARD_STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center">
              <button
                onClick={() => {
                  if (i < currentStep) {
                    setStepErrors((prev) => { const n = { ...prev }; delete n[currentStep]; return n; });
                    setCurrentStep(i);
                  }
                }}
                disabled={i > currentStep}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                  i < currentStep && "bg-green-500 text-white cursor-pointer hover:bg-green-600",
                  i === currentStep && "bg-primary text-primary-foreground",
                  i > currentStep && "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {i < currentStep ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </button>
              <span className={cn(
                "ml-2 text-xs hidden sm:inline",
                i === currentStep ? "text-primary font-medium" : "text-muted-foreground"
              )}>
                {s.label}
              </span>
              {i < WIZARD_STEPS.length - 1 && (
                <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {/* Status Banner */}
        {gateway && (
          <div className={cn("rounded-lg p-4 mb-6 flex items-center gap-3",
            gateway.status === "production" ? "bg-green-50 border border-green-200" :
            gateway.status === "test-passed" ? "bg-blue-50 border border-blue-200" :
            gateway.status === "test-failed" ? "bg-red-50 border border-red-200" :
            "bg-yellow-50 border border-yellow-200"
          )}>
            {gateway.status === "production" ? <Rocket className="h-5 w-5 text-green-600" /> :
             gateway.status === "test-passed" ? <CheckCircle2 className="h-5 w-5 text-blue-600" /> :
             gateway.status === "test-failed" ? <XCircle className="h-5 w-5 text-red-600" /> :
             <AlertTriangle className="h-5 w-5 text-yellow-600" />}
            <div>
              <p className="text-sm font-medium">
                {gateway.status.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </p>
              {gateway.lastTestResult && (
                <p className="text-xs text-muted-foreground">{gateway.lastTestResult.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Error display */}
        {saveError && (
          <div className="rounded-lg p-4 mb-6 bg-red-50 border border-red-200 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-700">{saveError}</p>
          </div>
        )}

        {/* Step error */}
        {stepErrors[currentStep] && (
          <div className="rounded-lg p-4 mb-6 bg-red-50 border border-red-200 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-700">{stepErrors[currentStep]}</p>
          </div>
        )}

        {/* Step 0: Credentials */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Key className="h-4 w-4" /> 2Checkout Credentials
            </h3>
            <p className="text-xs text-muted-foreground">
              Find your credentials at{" "}
              <a href="https://account.2checkout.com/mcapi" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                2Checkout Merchant API
              </a>. Buy Link Secret is required for checkout processing.
            </p>
            {hasSavedCredentials && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 border border-amber-200">
                Credentials are saved. Leave fields blank to keep existing values, or enter new values to update.
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium">Merchant Code *</label>
                <input
                  type="text"
                  value={form.merchantCode}
                  onChange={(e) => setForm({ ...form, merchantCode: e.target.value })}
                  placeholder="Your 2Checkout merchant code"
                  className="w-full rounded-lg border px-3 py-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Buy Link Secret * <span className="text-muted-foreground font-normal">(required for checkout)</span></label>
                <div className="relative">
                  <input
                    type={showSecrets.buyLinkSecret ? "text" : "password"}
                    value={form.buyLinkSecret}
                    onChange={(e) => setForm({ ...form, buyLinkSecret: e.target.value })}
                    placeholder={hasSavedCredentials ? "Leave blank to keep current" : "Buy link secret key"}
                    className="w-full rounded-lg border px-3 py-2 text-sm mt-1 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret("buyLinkSecret")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecrets.buyLinkSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">IPN Secret</label>
                <div className="relative">
                  <input
                    type={showSecrets.ipnSecret ? "text" : "password"}
                    value={form.ipnSecret}
                    onChange={(e) => setForm({ ...form, ipnSecret: e.target.value })}
                    placeholder={hasSavedCredentials ? "Leave blank to keep current" : "IPN notification secret"}
                    className="w-full rounded-lg border px-3 py-2 text-sm mt-1 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret("ipnSecret")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecrets.ipnSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">API Secret Key</label>
                <div className="relative">
                  <input
                    type={showSecrets.secretKey ? "text" : "password"}
                    value={form.secretKey}
                    onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
                    placeholder={hasSavedCredentials ? "Leave blank to keep current" : "API secret key (optional)"}
                    className="w-full rounded-lg border px-3 py-2 text-sm mt-1 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecret("secretKey")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showSecrets.secretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Configuration */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4" /> Configuration
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium">Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm mt-1"
                >
                  {["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "CNY", "INR", "BRL"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Hash Algorithm</label>
                <select
                  value={form.hashAlgorithm}
                  onChange={(e) => setForm({ ...form, hashAlgorithm: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm mt-1"
                >
                  <option value="SHA256">SHA-256</option>
                  <option value="SHA3">SHA-3 (if supported)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Checkout Type</label>
                <select
                  value={form.checkoutType}
                  onChange={(e) => setForm({ ...form, checkoutType: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm mt-1"
                >
                  <option value="buy-link">Buy Link (Redirect)</option>
                  <option value="hosted-checkout">Hosted Checkout</option>
                  <option value="overlay">Overlay Checkout</option>
                </select>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <input
                  type="checkbox"
                  id="testMode"
                  checked={form.testMode}
                  onChange={(e) => setForm({ ...form, testMode: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                <label htmlFor="testMode" className="text-sm">Test/Sandbox Mode</label>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 mt-4">
              <div>
                <label className="text-xs font-medium">Return URL (after payment)</label>
                <input
                  type="text"
                  value={form.returnUrl || `${appUrl}/checkout/success`}
                  onChange={(e) => setForm({ ...form, returnUrl: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Cancel URL</label>
                <input
                  type="text"
                  value={form.cancelUrl || `${appUrl}/checkout`}
                  onChange={(e) => setForm({ ...form, cancelUrl: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm mt-1"
                />
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground">Webhook/IPN URL (configure in 2Checkout dashboard)</p>
                <p className="text-sm font-mono mt-1">{appUrl}/api/webhooks/2checkout</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Test */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TestTube className="h-4 w-4" /> Test Connection
            </h3>
            <p className="text-xs text-muted-foreground">
              Run a test transaction to verify your 2Checkout credentials and configuration are working correctly.
            </p>
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <p className="text-xs font-medium">Test Details:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Amount: $1.00 USD</li>
                <li>Mode: {form.testMode ? "Sandbox" : "Production"}</li>
                <li>Merchant Code: {gateway?.config?.merchantCode || form.merchantCode || "Not set"}</li>
                <li>Currency: {form.currency}</li>
              </ul>
            </div>
            {gateway?.lastTestResult && (
              <div className={cn(
                "rounded-lg p-4 flex items-center gap-3",
                gateway.lastTestResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
              )}>
                {gateway.lastTestResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <p className="text-sm font-medium">{gateway.lastTestResult.success ? "Test Passed" : "Test Failed"}</p>
                  <p className="text-xs text-muted-foreground">{gateway.lastTestResult.message}</p>
                </div>
              </div>
            )}
            <button
              onClick={handleTest}
              disabled={testing || !gateway?.enabled}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
              {testing ? "Running Test..." : "Run Test Transaction"}
            </button>
            {!gateway?.enabled && (
              <p className="text-xs text-amber-600">Gateway must be configured with valid credentials before testing.</p>
            )}
          </div>
        )}

        {/* Step 3: Status */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Rocket className="h-4 w-4" /> Gateway Status
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <p className="text-sm font-bold mt-1">
                  {gateway?.status?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Not Configured"}
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs font-medium text-muted-foreground">Mode</p>
                <p className="text-sm font-bold mt-1">{gateway?.testMode ? "Sandbox" : "Production"}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs font-medium text-muted-foreground">Merchant Code</p>
                <p className="text-sm font-bold mt-1">{gateway?.config?.merchantCode || "Not set"}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs font-medium text-muted-foreground">Currency</p>
                <p className="text-sm font-bold mt-1">{gateway?.config?.currency || "USD"}</p>
              </div>
            </div>
            {gateway?.status === "test-passed" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Gateway Ready</p>
                  <p className="text-xs text-green-600">
                    Your 2Checkout gateway is configured and tested. {gateway.testMode ? "Switch to Production mode when ready to go live." : "You are in Production mode."}
                  </p>
                </div>
              </div>
            )}
            {gateway?.status === "test-failed" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-800">Test Failed</p>
                  <p className="text-xs text-red-600">
                    {gateway.lastTestResult?.message || "The test transaction failed. Please check your credentials and try again."}
                  </p>
                </div>
              </div>
            )}
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground">Webhook/IPN URL</p>
              <p className="text-sm font-mono mt-1">{appUrl}/api/webhooks/2checkout</p>
              <p className="text-xs text-muted-foreground mt-1">Configure this URL in your 2Checkout merchant dashboard.</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex gap-3">
            {currentStep < 3 && (
              <button
                onClick={handleNext}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {currentStep === 0 || currentStep === 1 ? "Save & Next" : "Next"}
                {currentStep < 3 && <ArrowRight className="h-4 w-4" />}
              </button>
            )}
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
