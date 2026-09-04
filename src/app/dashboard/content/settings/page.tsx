"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Loader2,
  Save,
  Plus,
  X,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ContentSettings {
  publishingMode: string;
  approvalPolicy: Record<string, string>;
  contentFrequency: {
    articlesPerWeek: number;
    socialPostsPerDay: number;
    videosPerMonth: number;
  };
  brandVoice: string;
  researchFocusAreas: string[];
  excludedTopics: string[];
  productPriorities: string[];
  maxImagesPerArticle: number;
  maxVideosPerArticle: number;
  scheduleTimezone: string;
}

const PUBLISHING_MODES = [
  { value: "auto", label: "Auto", description: "Publish immediately after approval" },
  { value: "review", label: "Review", description: "Require manual review before publishing" },
  { value: "hybrid", label: "Hybrid", description: "Auto-publish for trusted content, review for others" },
];

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export default function ContentSettingsPage() {
  const [settings, setSettings] = useState<ContentSettings>({
    publishingMode: "review",
    approvalPolicy: {},
    contentFrequency: {
      articlesPerWeek: 3,
      socialPostsPerDay: 2,
      videosPerMonth: 4,
    },
    brandVoice: "",
    researchFocusAreas: [],
    excludedTopics: [],
    productPriorities: [],
    maxImagesPerArticle: 5,
    maxVideosPerArticle: 2,
    scheduleTimezone: "UTC",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [focusInput, setFocusInput] = useState("");
  const [excludedInput, setExcludedInput] = useState("");
  const [productInput, setProductInput] = useState("");

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content/settings");
      const data = await res.json();
      if (data.success && data.data) {
        const s = data.data;
        setSettings({
          publishingMode: s.publishingMode || "review",
          approvalPolicy: s.approvalPolicy || {},
          contentFrequency: s.contentFrequency || {
            articlesPerWeek: 3,
            socialPostsPerDay: 2,
            videosPerMonth: 4,
          },
          brandVoice: s.brandVoice || "",
          researchFocusAreas: s.researchFocusAreas || [],
          excludedTopics: s.excludedTopics || [],
          productPriorities: s.productPriorities || [],
          maxImagesPerArticle: s.maxImagesPerArticle ?? 5,
          maxVideosPerArticle: s.maxVideosPerArticle ?? 2,
          scheduleTimezone: s.scheduleTimezone || "UTC",
        });
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: "publishingMode", value: settings.publishingMode, category: "publishing" },
        { key: "approvalPolicy", value: settings.approvalPolicy, category: "publishing" },
        { key: "contentFrequency", value: settings.contentFrequency, category: "frequency" },
        { key: "brandVoice", value: settings.brandVoice, category: "brand" },
        { key: "researchFocusAreas", value: settings.researchFocusAreas, category: "research" },
        { key: "excludedTopics", value: settings.excludedTopics, category: "research" },
        { key: "productPriorities", value: settings.productPriorities, category: "products" },
        { key: "maxImagesPerArticle", value: settings.maxImagesPerArticle, category: "content" },
        { key: "maxVideosPerArticle", value: settings.maxVideosPerArticle, category: "content" },
        { key: "scheduleTimezone", value: settings.scheduleTimezone, category: "schedule" },
      ];

      await Promise.all(
        updates.map((u) =>
          fetch("/api/content/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(u),
          })
        )
      );
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const addToList = (
    input: string,
    setInput: (v: string) => void,
    list: string[],
    setList: (v: string[]) => void
  ) => {
    const trimmed = input.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      setInput("");
    }
  };

  const removeFromList = (
    item: string,
    list: string[],
    setList: (v: string[]) => void
  ) => {
    setList(list.filter((i) => i !== item));
  };

  const moveItem = (
    list: string[],
    setList: (v: string[]) => void,
    from: number,
    to: number
  ) => {
    if (to < 0 || to >= list.length) return;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setList(next);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border p-6 animate-pulse">
            <div className="h-5 bg-muted rounded w-32 mb-4" />
            <div className="space-y-3">
              <div className="h-10 bg-muted rounded" />
              <div className="h-10 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" /> Content Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure publishing behavior and content defaults
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </button>
      </div>

      {/* Publishing Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Publishing Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {PUBLISHING_MODES.map((mode) => (
              <label
                key={mode.value}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  settings.publishingMode === mode.value
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                )}
              >
                <input
                  type="radio"
                  name="publishingMode"
                  value={mode.value}
                  checked={settings.publishingMode === mode.value}
                  onChange={(e) =>
                    setSettings({ ...settings, publishingMode: e.target.value })
                  }
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium">{mode.label}</p>
                  <p className="text-xs text-muted-foreground">{mode.description}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content Frequency */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content Frequency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Articles per Week</label>
              <input
                type="number"
                min={0}
                max={50}
                value={settings.contentFrequency.articlesPerWeek}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contentFrequency: {
                      ...settings.contentFrequency,
                      articlesPerWeek: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Social Posts per Day</label>
              <input
                type="number"
                min={0}
                max={50}
                value={settings.contentFrequency.socialPostsPerDay}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contentFrequency: {
                      ...settings.contentFrequency,
                      socialPostsPerDay: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Videos per Month</label>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.contentFrequency.videosPerMonth}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contentFrequency: {
                      ...settings.contentFrequency,
                      videosPerMonth: parseInt(e.target.value) || 0,
                    },
                  })
                }
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Voice */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brand Voice Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={settings.brandVoice}
            onChange={(e) => setSettings({ ...settings, brandVoice: e.target.value })}
            rows={5}
            placeholder="Describe your brand voice, tone, and style guidelines..."
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm resize-none"
          />
        </CardContent>
      </Card>

      {/* Research Focus Areas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Research Focus Areas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={focusInput}
              onChange={(e) => setFocusInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addToList(focusInput, setFocusInput, settings.researchFocusAreas, (v) =>
                    setSettings({ ...settings, researchFocusAreas: v })
                  );
                }
              }}
              placeholder="Add focus area and press Enter"
              className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm"
            />
            <button
              onClick={() =>
                addToList(focusInput, setFocusInput, settings.researchFocusAreas, (v) =>
                  setSettings({ ...settings, researchFocusAreas: v })
                )
              }
              className="px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {settings.researchFocusAreas.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {settings.researchFocusAreas.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2.5 py-1"
                >
                  {item}
                  <button
                    onClick={() =>
                      removeFromList(item, settings.researchFocusAreas, (v) =>
                        setSettings({ ...settings, researchFocusAreas: v })
                      )
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Excluded Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Excluded Topics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={excludedInput}
              onChange={(e) => setExcludedInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addToList(excludedInput, setExcludedInput, settings.excludedTopics, (v) =>
                    setSettings({ ...settings, excludedTopics: v })
                  );
                }
              }}
              placeholder="Add topic to exclude and press Enter"
              className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm"
            />
            <button
              onClick={() =>
                addToList(excludedInput, setExcludedInput, settings.excludedTopics, (v) =>
                  setSettings({ ...settings, excludedTopics: v })
                )
              }
              className="px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {settings.excludedTopics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {settings.excludedTopics.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 rounded-full px-2.5 py-1"
                >
                  {item}
                  <button
                    onClick={() =>
                      removeFromList(item, settings.excludedTopics, (v) =>
                        setSettings({ ...settings, excludedTopics: v })
                      )
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Priorities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product / Service Priorities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={productInput}
              onChange={(e) => setProductInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addToList(productInput, setProductInput, settings.productPriorities, (v) =>
                    setSettings({ ...settings, productPriorities: v })
                  );
                }
              }}
              placeholder="Add product/service and press Enter"
              className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm"
            />
            <button
              onClick={() =>
                addToList(productInput, setProductInput, settings.productPriorities, (v) =>
                  setSettings({ ...settings, productPriorities: v })
                )
              }
              className="px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {settings.productPriorities.length > 0 && (
            <div className="space-y-1">
              {settings.productPriorities.map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <span className="text-xs font-medium text-muted-foreground w-6">
                    #{index + 1}
                  </span>
                  <span className="text-sm flex-1">{item}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        moveItem(
                          settings.productPriorities,
                          (v) => setSettings({ ...settings, productPriorities: v }),
                          index,
                          index - 1
                        )
                      }
                      disabled={index === 0}
                      className="text-xs px-1.5 py-0.5 rounded hover:bg-muted disabled:opacity-30"
                    >
                      Up
                    </button>
                    <button
                      onClick={() =>
                        moveItem(
                          settings.productPriorities,
                          (v) => setSettings({ ...settings, productPriorities: v }),
                          index,
                          index + 1
                        )
                      }
                      disabled={index === settings.productPriorities.length - 1}
                      className="text-xs px-1.5 py-0.5 rounded hover:bg-muted disabled:opacity-30"
                    >
                      Down
                    </button>
                    <button
                      onClick={() =>
                        removeFromList(item, settings.productPriorities, (v) =>
                          setSettings({ ...settings, productPriorities: v })
                        )
                      }
                      className="text-xs px-1.5 py-0.5 rounded hover:bg-red-100 text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Limits & Timezone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content Limits & Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Images per Article</label>
              <input
                type="number"
                min={0}
                max={20}
                value={settings.maxImagesPerArticle}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxImagesPerArticle: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Videos per Article</label>
              <input
                type="number"
                min={0}
                max={10}
                value={settings.maxVideosPerArticle}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxVideosPerArticle: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Schedule Timezone</label>
              <select
                value={settings.scheduleTimezone}
                onChange={(e) =>
                  setSettings({ ...settings, scheduleTimezone: e.target.value })
                }
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
