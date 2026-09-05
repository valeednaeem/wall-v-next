"use client";

import { useState, useEffect } from "react";
import {
  Save, Loader2, ExternalLink, CheckCircle2, XCircle,
  AlertTriangle, DollarSign, Plus, Trash2, ToggleLeft, ToggleRight, Shield,
} from "lucide-react";

interface AdUnit {
  id: string;
  name: string;
  format: string;
  slot: string;
  size: string;
  placement: string;
  enabled: boolean;
}

interface AdSenseSettings {
  enabled: boolean;
  publisherId: string;
  autoAds: {
    enabled: boolean;
    googleAdsOptOut: boolean;
    noiseReduction: boolean;
    inArticleAds: boolean;
    inFeedAds: boolean;
    matchedContent: boolean;
    multiplexAds: boolean;
  };
  adUnits: AdUnit[];
  status: "not_configured" | "configured" | "awaiting_approval" | "active" | "error";
  lastVerified: string | null;
  issues: string[];
}

interface VerificationResult {
  checks: { name: string; passed: boolean; message: string }[];
  allPassed: boolean;
  status: string;
  lastVerified: string;
  issues: string[];
}

const DEFAULT_SETTINGS: AdSenseSettings = {
  enabled: false,
  publisherId: "",
  autoAds: {
    enabled: false,
    googleAdsOptOut: false,
    noiseReduction: false,
    inArticleAds: false,
    inFeedAds: false,
    matchedContent: false,
    multiplexAds: false,
  },
  adUnits: [],
  status: "not_configured",
  lastVerified: null,
  issues: [],
};

const AD_FORMATS = [
  { value: "auto", label: "Auto (Responsive)" },
  { value: "rectangle", label: "Rectangle" },
  { value: "vertical", label: "Vertical" },
  { value: "horizontal", label: "Horizontal" },
];

const AD_SIZES = [
  { value: "auto", label: "Auto" },
  { value: "300x250", label: "300x250 (Medium Rectangle)" },
  { value: "728x90", label: "728x90 (Leaderboard)" },
  { value: "160x600", label: "160x600 (Wide Skyscraper)" },
  { value: "300x600", label: "300x600 (Half Page)" },
  { value: "336x280", label: "336x280 (Large Rectangle)" },
];

const AD_PLACEMENTS = [
  { value: "top", label: "Top of Article" },
  { value: "middle", label: "Middle of Article" },
  { value: "bottom", label: "Bottom of Article" },
  { value: "sidebar", label: "Sidebar" },
  { value: "header", label: "Site Header" },
  { value: "footer", label: "Site Footer" },
];

export default function MonetizationPage() {
  const [settings, setSettings] = useState<AdSenseSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnit, setNewUnit] = useState({ name: "", format: "auto", slot: "", size: "auto", placement: "middle" });

  useEffect(() => {
    fetch("/api/settings/adsense")
      .then((r) => {
        if (r.status === 401) { window.location.href = "/login?callbackUrl=/dashboard/monetization"; return null; }
        return r.json();
      })
      .then((d) => {
        if (d?.success && d.data) {
          setSettings((prev) => ({ ...prev, ...d.data }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/settings/adsense", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.status === 401) { window.location.href = "/login?callbackUrl=/dashboard/monetization"; return; }
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage({ type: "success", text: "AdSense settings saved successfully" });
        setSettings(data.data);
      } else {
        setSaveMessage({ type: "error", text: data.error || "Failed to save settings" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error. Please try again." });
    }
    setSaving(false);
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerificationResult(null);
    try {
      const res = await fetch("/api/settings/adsense/verify", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setVerificationResult(data.data);
        setSettings((prev) => ({ ...prev, status: data.data.status, lastVerified: data.data.lastVerified, issues: data.data.issues }));
      }
    } catch {
      // ignore
    }
    setVerifying(false);
  };

  const handleAddUnit = async () => {
    if (!newUnit.name || !newUnit.slot) return;
    try {
      const res = await fetch("/api/settings/adsense/ad-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUnit),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings((prev) => ({ ...prev, adUnits: [...prev.adUnits, data.data] }));
        setNewUnit({ name: "", format: "auto", slot: "", size: "auto", placement: "middle" });
        setShowAddUnit(false);
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteUnit = async (id: string) => {
    try {
      const res = await fetch(`/api/settings/adsense/ad-units/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, adUnits: prev.adUnits.filter((u) => u.id !== id) }));
      }
    } catch {
      // ignore
    }
  };

  const handleToggleUnit = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/settings/adsense/ad-units/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings((prev) => ({
          ...prev,
          adUnits: prev.adUnits.map((u) => (u.id === id ? { ...u, enabled } : u)),
        }));
      }
    } catch {
      // ignore
    }
  };

  const statusConfig = {
    not_configured: { label: "Not Configured", color: "bg-gray-100 text-gray-700", icon: AlertTriangle },
    configured: { label: "Configured", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
    awaiting_approval: { label: "Awaiting Approval", color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle },
    active: { label: "Active", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
    error: { label: "Error", color: "bg-red-100 text-red-700", icon: XCircle },
  };

  const currentStatus = statusConfig[settings.status] || statusConfig.not_configured;
  const StatusIcon = currentStatus.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Monetization
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage Google AdSense integration and ad placements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://www.google.com/adsense"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Open AdSense
          </a>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="inline-flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            {verifying ? "Verifying..." : "Verify Integration"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`p-3 rounded-lg text-sm ${saveMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {saveMessage.text}
        </div>
      )}

      {/* Verification Result */}
      {verificationResult && (
        <div className={`rounded-lg border p-4 ${verificationResult.allPassed ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
          <div className="flex items-center gap-2 mb-2">
            {verificationResult.allPassed ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            )}
            <h3 className="font-semibold text-sm">
              {verificationResult.allPassed ? "All checks passed" : "Some checks failed"}
            </h3>
          </div>
          <div className="space-y-1">
            {verificationResult.checks.map((check) => (
              <div key={check.name} className="flex items-center gap-2 text-xs">
                {check.passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                )}
                <span className="font-medium">{check.name}:</span>
                <span className="text-muted-foreground">{check.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Google AdSense Card */}
      <div className="rounded-lg border p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Google AdSense</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Display ads on your website through Google AdSense.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${currentStatus.color}`}>
              <StatusIcon className="h-3.5 w-3.5" />
              {currentStatus.label}
            </span>
          </div>
        </div>

        {/* Integration Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Integration</h4>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable AdSense</p>
              <p className="text-xs text-muted-foreground">Turn on Google AdSense for your website.</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
              className="p-1"
            >
              {settings.enabled ? (
                <ToggleRight className="h-8 w-8 text-primary" />
              ) : (
                <ToggleLeft className="h-8 w-8 text-muted-foreground" />
              )}
            </button>
          </div>

          <div>
            <label className="text-sm font-medium">Publisher ID</label>
            <input
              type="text"
              value={settings.publisherId}
              onChange={(e) => setSettings((prev) => ({ ...prev, publisherId: e.target.value }))}
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
              placeholder="ca-pub-XXXXXXXXXXXXXXXX"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Format: ca-pub- followed by 16 digits. Find this in your AdSense dashboard.
            </p>
            {settings.publisherId && !/^ca-pub-\d{16}$/.test(settings.publisherId) && (
              <p className="text-xs text-red-600 mt-1">Invalid format. Expected: ca-pub-XXXXXXXXXXXXXXXX</p>
            )}
          </div>
        </div>

        <hr />

        {/* Auto Ads Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Auto Ads</h4>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable Auto Ads</p>
              <p className="text-xs text-muted-foreground">Let Google automatically place ads on your site.</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings((prev) => ({ ...prev, autoAds: { ...prev.autoAds, enabled: !prev.autoAds.enabled } }))}
              className="p-1"
            >
              {settings.autoAds.enabled ? (
                <ToggleRight className="h-8 w-8 text-primary" />
              ) : (
                <ToggleLeft className="h-8 w-8 text-muted-foreground" />
              )}
            </button>
          </div>

          {settings.autoAds.enabled && (
            <div className="ml-4 space-y-3 border-l-2 border-primary/20 pl-4">
              {[
                { key: "googleAdsOptOut" as const, label: "Google Ads opt-out", desc: "Allow Google to opt out of certain ad categories" },
                { key: "noiseReduction" as const, label: "Noise reduction", desc: "Reduce the number of ads on pages with little content" },
                { key: "inArticleAds" as const, label: "In-article ads", desc: "Place ads within article content" },
                { key: "inFeedAds" as const, label: "In-feed ads", desc: "Place ads in feed/list layouts" },
                { key: "matchedContent" as const, label: "Matched content", desc: "Promote your content to visitors" },
                { key: "multiplexAds" as const, label: "Multiplex ads", desc: "Show a grid of similar content from your site" },
              ].map((opt) => (
                <div key={opt.key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings((prev) => ({ ...prev, autoAds: { ...prev.autoAds, [opt.key]: !prev.autoAds[opt.key] } }))}
                    className="p-1"
                  >
                    {settings.autoAds[opt.key] ? (
                      <ToggleRight className="h-7 w-7 text-primary" />
                    ) : (
                      <ToggleLeft className="h-7 w-7 text-muted-foreground" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr />

        {/* Manual Ad Units Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Manual Ad Units</h4>
            <button
              onClick={() => setShowAddUnit(!showAddUnit)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80"
            >
              <Plus className="h-4 w-4" />
              Add Ad Unit
            </button>
          </div>

          {/* Add Unit Form */}
          {showAddUnit && (
            <div className="rounded-lg border border-dashed p-4 space-y-3 bg-muted/30">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Name</label>
                  <input
                    type="text"
                    value={newUnit.name}
                    onChange={(e) => setNewUnit((prev) => ({ ...prev, name: e.target.value }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="e.g., Blog Top Ad"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Ad Slot ID</label>
                  <input
                    type="text"
                    value={newUnit.slot}
                    onChange={(e) => setNewUnit((prev) => ({ ...prev, slot: e.target.value }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
                    placeholder="e.g., 1234567890"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Format</label>
                  <select
                    value={newUnit.format}
                    onChange={(e) => setNewUnit((prev) => ({ ...prev, format: e.target.value }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    {AD_FORMATS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium">Size</label>
                  <select
                    value={newUnit.size}
                    onChange={(e) => setNewUnit((prev) => ({ ...prev, size: e.target.value }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    {AD_SIZES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium">Placement</label>
                  <select
                    value={newUnit.placement}
                    onChange={(e) => setNewUnit((prev) => ({ ...prev, placement: e.target.value }))}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    {AD_PLACEMENTS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddUnit(false)}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUnit}
                  disabled={!newUnit.name || !newUnit.slot}
                  className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  Add Unit
                </button>
              </div>
            </div>
          )}

          {/* Ad Units List */}
          {settings.adUnits.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
              No ad units configured. Click &quot;Add Ad Unit&quot; to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {settings.adUnits.map((unit) => (
                <div key={unit.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{unit.name}</p>
                      <span className="text-xs text-muted-foreground font-mono">{unit.slot}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>{unit.format}</span>
                      <span>{unit.size}</span>
                      <span>{unit.placement}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleUnit(unit.id, !unit.enabled)}
                      className="p-1"
                    >
                      {unit.enabled ? (
                        <ToggleRight className="h-6 w-6 text-primary" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteUnit(unit.id)}
                      className="p-1 text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr />

        {/* Status Section */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">Status</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              {settings.publisherId ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
              <span>Publisher ID: {settings.publisherId ? "Present" : "Missing"}</span>
            </div>
            <div className="flex items-center gap-2">
              {settings.enabled ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
              <span>Script: {settings.enabled ? "Configured" : "Not configured"}</span>
            </div>
            <div className="flex items-center gap-2">
              {settings.autoAds.enabled ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
              <span>Auto Ads: {settings.autoAds.enabled ? "Enabled" : "Disabled"}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <span>Active ad units: {settings.adUnits.filter((u) => u.enabled).length}</span>
            </div>
            {settings.lastVerified && (
              <div className="col-span-2 text-xs text-muted-foreground">
                Last verified: {new Date(settings.lastVerified).toLocaleString()}
              </div>
            )}
          </div>

          {settings.issues.length > 0 && (
            <div className="mt-2 space-y-1">
              {settings.issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-red-600">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {issue}
                </div>
              ))}
            </div>
          )}
        </div>

        <hr />

        {/* Important Notes */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 space-y-1">
          <p className="font-medium">Important Notes</p>
          <ul className="text-xs space-y-1 list-disc list-inside">
            <li>Site approval is managed through your Google AdSense account.</li>
            <li>Wall-V manages the website-side integration only.</li>
            <li>Ads will only appear after Google approves your site.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
