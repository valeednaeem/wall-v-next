"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  X,
  Loader2,
  Megaphone,
} from "lucide-react";

interface ContentPillar {
  name: string;
  description: string;
  keywords: string[];
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [businessObjectives, setBusinessObjectives] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [contentPillars, setContentPillars] = useState<ContentPillar[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [objectiveInput, setObjectiveInput] = useState("");
  const [audienceInput, setAudienceInput] = useState("");
  const [pillarName, setPillarName] = useState("");
  const [pillarDesc, setPillarDesc] = useState("");
  const [pillarKeywords, setPillarKeywords] = useState("");

  const addItem = (
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

  const removeItem = (item: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.filter((i) => i !== item));
  };

  const addPillar = () => {
    if (!pillarName.trim()) return;
    setContentPillars([
      ...contentPillars,
      {
        name: pillarName.trim(),
        description: pillarDesc.trim(),
        keywords: pillarKeywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      },
    ]);
    setPillarName("");
    setPillarDesc("");
    setPillarKeywords("");
  };

  const removePillar = (index: number) => {
    setContentPillars(contentPillars.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Campaign name is required");
      return;
    }
    if (businessObjectives.length === 0) {
      setError("Add at least one business objective");
      return;
    }
    if (targetAudience.length === 0) {
      setError("Add at least one target audience");
      return;
    }
    if (contentPillars.length === 0) {
      setError("Add at least one content pillar");
      return;
    }
    if (!startDate || !endDate) {
      setError("Start and end dates are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/content/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          businessObjectives,
          targetAudience,
          contentPillars,
          dateRange: { start: startDate, end: endDate },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create campaign");
        return;
      }

      router.push(`/dashboard/content/campaigns/${data.data._id}`);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/content/campaigns"
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> New Campaign
          </h2>
          <p className="text-sm text-muted-foreground">
            Create a new content campaign
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Campaign Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Q1 2026 Content Push"
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief description of this campaign..."
            className="w-full rounded-lg border bg-white px-3 py-2 text-sm resize-none"
          />
        </div>

        {/* Business Objectives */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Business Objectives *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={objectiveInput}
              onChange={(e) => setObjectiveInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem(objectiveInput, setObjectiveInput, businessObjectives, setBusinessObjectives);
                }
              }}
              placeholder="Add objective and press Enter"
              className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() =>
                addItem(objectiveInput, setObjectiveInput, businessObjectives, setBusinessObjectives)
              }
              className="px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {businessObjectives.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {businessObjectives.map((obj) => (
                <span
                  key={obj}
                  className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2.5 py-1"
                >
                  {obj}
                  <button
                    type="button"
                    onClick={() =>
                      removeItem(obj, businessObjectives, setBusinessObjectives)
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Target Audience */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Target Audience *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={audienceInput}
              onChange={(e) => setAudienceInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem(audienceInput, setAudienceInput, targetAudience, setTargetAudience);
                }
              }}
              placeholder="Add audience segment and press Enter"
              className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() =>
                addItem(audienceInput, setAudienceInput, targetAudience, setTargetAudience)
              }
              className="px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {targetAudience.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {targetAudience.map((aud) => (
                <span
                  key={aud}
                  className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full px-2.5 py-1"
                >
                  {aud}
                  <button
                    type="button"
                    onClick={() =>
                      removeItem(aud, targetAudience, setTargetAudience)
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Content Pillars */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Content Pillars *</label>
          <div className="rounded-lg border p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={pillarName}
                onChange={(e) => setPillarName(e.target.value)}
                placeholder="Pillar name"
                className="rounded-lg border bg-white px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={pillarDesc}
                onChange={(e) => setPillarDesc(e.target.value)}
                placeholder="Description (optional)"
                className="rounded-lg border bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={pillarKeywords}
                onChange={(e) => setPillarKeywords(e.target.value)}
                placeholder="Keywords (comma-separated)"
                className="flex-1 rounded-lg border bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={addPillar}
                className="px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          {contentPillars.length > 0 && (
            <div className="space-y-2 mt-2">
              {contentPillars.map((pillar, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                >
                  <div>
                    <p className="text-sm font-medium">{pillar.name}</p>
                    {pillar.description && (
                      <p className="text-xs text-muted-foreground">
                        {pillar.description}
                      </p>
                    )}
                    {pillar.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pillar.keywords.map((kw) => (
                          <span
                            key={kw}
                            className="text-xs bg-muted px-1.5 py-0.5 rounded"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removePillar(i)}
                    className="p-1 rounded hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Start Date *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">End Date *</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Megaphone className="h-4 w-4" />
            )}
            Create Campaign
          </button>
          <Link
            href="/dashboard/content/campaigns"
            className="inline-flex items-center gap-2 border rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
