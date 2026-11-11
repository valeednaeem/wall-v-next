"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "wallv:ai-tools-settings";

interface SettingsFlags {
  enableRateLimitEnforcement: boolean;
  enableCreditsAccounting: boolean;
  enableAutoRollup: boolean;
  enableToolExecutionLogging: boolean;
}

interface SettingsData {
  defaultDailyLimit: number;
  defaultMonthlyLimit: number;
  defaultRateLimitPerMinute: number;
  executionLogRetentionDays: number;
  flags: SettingsFlags;
}

const DEFAULTS: SettingsData = {
  defaultDailyLimit: 0,
  defaultMonthlyLimit: 0,
  defaultRateLimitPerMinute: 5,
  executionLogRetentionDays: 180,
  flags: {
    enableRateLimitEnforcement: true,
    enableCreditsAccounting: true,
    enableAutoRollup: true,
    enableToolExecutionLogging: true,
  },
};

const inputCls = "w-full rounded-lg border bg-background px-3 py-2 text-sm";

export default function AiToolsSettingsPage() {
  const [settings, setSettings] = useState<SettingsData>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      // ignore corrupt storage
    }
    setLoaded(true);
  }, []);

  const save = () => {
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      toast.success("Settings saved locally");
    } catch {
      toast.error("Failed to save to local storage");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return <div className="h-64 bg-muted rounded-xl animate-pulse" />;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Defaults and informational settings for the AI Tools platform
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        These preferences are stored in this browser only (localStorage). A persisted
        server-side settings model is intentionally not part of this phase.
      </div>

      <section className="rounded-lg border bg-background">
        <h3 className="px-4 py-3 border-b text-sm font-semibold">Default usage limits</h3>
        <div className="p-4 space-y-4">
          <div className="grid gap-1.5 sm:grid-cols-[240px,1fr] sm:items-center">
            <label className="text-sm font-medium">Default daily limit</label>
            <input type="number" min={0} className={inputCls} value={settings.defaultDailyLimit}
              onChange={(e) => setSettings({ ...settings, defaultDailyLimit: Number(e.target.value) })} />
          </div>
          <div className="grid gap-1.5 sm:grid-cols-[240px,1fr] sm:items-center">
            <label className="text-sm font-medium">Default monthly limit</label>
            <input type="number" min={0} className={inputCls} value={settings.defaultMonthlyLimit}
              onChange={(e) => setSettings({ ...settings, defaultMonthlyLimit: Number(e.target.value) })} />
          </div>
          <div className="grid gap-1.5 sm:grid-cols-[240px,1fr] sm:items-center">
            <label className="text-sm font-medium">Default rate limit (req/min)</label>
            <input type="number" min={0} className={inputCls} value={settings.defaultRateLimitPerMinute}
              onChange={(e) => setSettings({ ...settings, defaultRateLimitPerMinute: Number(e.target.value) })} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-background">
        <h3 className="px-4 py-3 border-b text-sm font-semibold">Data retention</h3>
        <div className="p-4 space-y-4">
          <div className="grid gap-1.5 sm:grid-cols-[240px,1fr] sm:items-center">
            <label className="text-sm font-medium">Execution log retention (days)</label>
            <input type="number" min={1} className={inputCls} value={settings.executionLogRetentionDays}
              onChange={(e) => setSettings({ ...settings, executionLogRetentionDays: Number(e.target.value) })} />
          </div>
          <p className="text-xs text-muted-foreground">
            AIToolExecution documents carry a 180-day TTL index; older raw logs are dropped
            automatically. Daily rollups in AIToolDailyStat are kept indefinitely.
          </p>
        </div>
      </section>

      <section className="rounded-lg border bg-background">
        <h3 className="px-4 py-3 border-b text-sm font-semibold">Feature flags</h3>
        <div className="p-4 space-y-3">
          {(Object.keys(settings.flags) as (keyof SettingsFlags)[]).map((flag) => (
            <label key={flag} className="flex items-center justify-between gap-4 text-sm">
              <span>
                <span className="font-medium">{flag}</span>
                <span className="block text-xs text-muted-foreground">
                  {flag === "enableRateLimitEnforcement" && "Enforce per-tool rate limits at execution time"}
                  {flag === "enableCreditsAccounting" && "Deduct credits per execution from user balances"}
                  {flag === "enableAutoRollup" && "Aggregate raw executions into daily stats"}
                  {flag === "enableToolExecutionLogging" && "Persist raw AIToolExecution records"}
                </span>
              </span>
              <input type="checkbox" checked={settings.flags[flag]}
                onChange={(e) => setSettings({ ...settings, flags: { ...settings.flags, [flag]: e.target.checked } })} />
            </label>
          ))}
        </div>
      </section>

      <div>
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save settings
        </button>
      </div>
    </div>
  );
}
