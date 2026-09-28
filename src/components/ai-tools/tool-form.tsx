"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/utils";

interface Option { _id: string; name: string; slug?: string }
interface ProviderOption extends Option { type: string; configured?: boolean; models?: { name: string; label?: string; enabled: boolean }[] }
type TagOption = Option;

export interface ToolFormData {
  _id?: string;
  name: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  icon?: string;
  featuredImage?: string;
  category: string;
  tags: string[];
  accessModel: "free" | "freemium" | "subscription";
  status: string;
  features: string[];
  flags: Record<string, boolean>;
  displayOrder: number;
  visibility: { homepage: boolean; toolsPage: boolean; categoryPage: boolean };
  usagePolicy: Record<string, number>;
  aiConfig: { provider?: string; model?: string; routing: string; fallbackModel?: string };
  requiredPlan?: string;
  seo?: { metaTitle?: string; metaDescription?: string; keywords?: string[]; canonicalUrl?: string };
  social?: { ogImage?: string; twitterHandle?: string };
}

function toId(value?: string | { _id?: string } | null): string {
  if (!value) return "";
  return typeof value === "string" ? value : value._id || "";
}

const EMPTY: ToolFormData = {
  name: "",
  slug: "",
  shortDescription: "",
  description: "",
  icon: "",
  featuredImage: "",
  category: "",
  tags: [],
  accessModel: "free",
  status: "draft",
  features: [],
  flags: { isFeatured: false, isNew: false, isPopular: false, isRecommended: false, isComingSoon: false },
  displayOrder: 0,
  visibility: { homepage: true, toolsPage: true, categoryPage: true },
  usagePolicy: { dailyLimit: 0, monthlyLimit: 0, lifetimeFreeExecutions: 0, creditsPerExecution: 1, rateLimitPerMinute: 5, maxInputLength: 0, maxOutputLength: 0 },
  aiConfig: { provider: "", model: "", routing: "global-default", fallbackModel: "" },
  requiredPlan: "",
  seo: { metaTitle: "", metaDescription: "", keywords: [], canonicalUrl: "" },
  social: { ogImage: "", twitterHandle: "" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-background">
      <h3 className="px-4 py-3 border-b text-sm font-semibold">{title}</h3>
      <div className="p-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[200px,1fr] sm:items-start">
      <label className="text-sm font-medium pt-2">{label}</label>
      <div className="space-y-1">
        {children}
        {help && <p className="text-xs text-muted-foreground">{help}</p>}
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border bg-background px-3 py-2 text-sm";

export default function ToolForm({ tool, onSaved }: { tool?: ToolFormData; onSaved?: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState<ToolFormData>(EMPTY);
  const [categories, setCategories] = useState<Option[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [plans, setPlans] = useState<Option[]>([]);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadingMeta, setLoadingMeta] = useState(!tool);

  useEffect(() => {
    Promise.all([
      fetch("/api/ai-tools/categories").then((r) => r.json()),
      fetch("/api/ai-tools/tags").then((r) => r.json()),
      fetch("/api/ai-tools/plans").then((r) => r.json()),
      fetch("/api/ai-tools/providers").then((r) => r.json()),
    ])
      .then(([c, t, p, pr]) => {
        if (c.success) setCategories(c.data);
        if (t.success) setTags(t.data);
        if (p.success) setPlans(p.data);
        if (pr.success) setProviders(pr.data);
      })
      .catch(console.error)
      .finally(() => setLoadingMeta(false));
  }, []);

  useEffect(() => {
    if (tool) {
      setForm({
        ...EMPTY,
        ...tool,
        category: toId(tool.category as unknown as string | Option),
        tags: (tool.tags || []).map((t) => toId(t as unknown as string | Option)),
        requiredPlan: toId(tool.requiredPlan as unknown as string | Option),
        aiConfig: {
          ...EMPTY.aiConfig,
          ...tool.aiConfig,
          provider: toId(tool.aiConfig?.provider as unknown as string | Option),
        },
        usagePolicy: { ...EMPTY.usagePolicy, ...(tool.usagePolicy || {}) },
        flags: { ...EMPTY.flags, ...(tool.flags || {}) },
        visibility: { ...EMPTY.visibility, ...(tool.visibility || {}) },
        seo: { ...EMPTY.seo, ...(tool.seo || {}) },
        social: { ...EMPTY.social, ...(tool.social || {}) },
      });
    }
  }, [tool]);

  const set = <K extends keyof ToolFormData>(key: K, value: ToolFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const selectedProvider = providers.find((p) => p._id === form.aiConfig.provider);
  const providerModels = selectedProvider?.models?.filter((m) => m.enabled) || [];

  const addTag = () => {
    const name = newTag.trim();
    if (!name) return;
    const existing = tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setForm((f) => (f.tags.includes(existing._id) ? f : { ...f, tags: [...f.tags, existing._id] }));
    } else {
      setTags((t) => [...t, { _id: `local:${name}`, name }]);
      setForm((f) => ({ ...f, tags: [...f.tags, `local:${name}`] }));
    }
    setNewTag("");
  };

  const toggleTag = (id: string) =>
    setForm((f) => ({ ...f, tags: f.tags.includes(id) ? f.tags.filter((x) => x !== id) : [...f.tags, id] }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Name is required");
    if (!form.category) return setError("Category is required");

    const realTags = form.tags.filter((t) => !t.startsWith("local:"));
    const payload = {
      ...form,
      slug: form.slug?.trim() || slugify(form.name),
      tags: realTags,
      requiredPlan: form.requiredPlan || undefined,
      aiConfig: {
        ...form.aiConfig,
        provider: form.aiConfig.provider || undefined,
        model: form.aiConfig.model || undefined,
        fallbackModel: form.aiConfig.fallbackModel || undefined,
      },
      seo: form.seo,
      social: form.social,
    };

    setSaving(true);
    try {
      const isEdit = Boolean(form._id);
      const res = await fetch(isEdit ? `/api/ai-tools/${form._id}` : "/api/ai-tools", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to save tool");
      toast.success(isEdit ? "Tool updated" : "Tool created");
      if (onSaved) onSaved();
      else router.push("/dashboard/ai-tools/tools");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save tool");
    } finally {
      setSaving(false);
    }
  };

  if (loadingMeta) {
    return <div className="space-y-4"><div className="h-40 bg-muted rounded-xl animate-pulse" /><div className="h-40 bg-muted rounded-xl animate-pulse" /></div>;
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      <Section title="General">
        <Field label="Name">
          <input className={inputCls} value={form.name} required
            onChange={(e) => {
              const name = e.target.value;
              setForm((f) => ({ ...f, name, slug: f._id ? f.slug : slugify(name) }));
            }} />
        </Field>
        <Field label="Slug" help={`Public URL: /tools/${form.slug || slugify(form.name || "your-tool")}`}>
          <input className={inputCls} value={form.slug || ""} onChange={(e) => set("slug", slugify(e.target.value))} />
        </Field>
        <Field label="Short description" help="Max 300 chars â€” shown on cards">
          <textarea className={inputCls} maxLength={300} rows={2} value={form.shortDescription || ""} onChange={(e) => set("shortDescription", e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea className={inputCls} rows={5} value={form.description || ""} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label="Icon (lucide name)">
          <input className={inputCls} placeholder="e.g. Wand2" value={form.icon || ""} onChange={(e) => set("icon", e.target.value)} />
        </Field>
        <Field label="Featured image URL">
          <input className={inputCls} value={form.featuredImage || ""} onChange={(e) => set("featuredImage", e.target.value)} />
        </Field>
        <Field label="Category">
          <select className={inputCls} value={form.category} required onChange={(e) => set("category", e.target.value)}>
            <option value="">Select category...</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Tags">
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((t) => (
              <button type="button" key={t._id} onClick={() => toggleTag(t._id)}
                className={`px-2.5 py-1 text-xs rounded-full border ${form.tags.includes(t._id) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
                {t.name}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input className={inputCls} placeholder="Add tag..." value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
            <button type="button" onClick={addTag} className="px-3 rounded-lg border text-sm hover:bg-muted"><Plus className="h-4 w-4" /></button>
          </div>
        </Field>
        <Field label="Status">
          <select className={inputCls} value={form.status} onChange={(e) => set("status", e.target.value)}>
            {["draft", "testing", "published", "unpublished", "archived"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </Section>

      <Section title="Access & Usage Policy">
        <Field label="Access model">
          <div className="flex gap-4">
            {(["free", "freemium", "subscription"] as const).map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input type="radio" name="accessModel" checked={form.accessModel === m} onChange={() => set("accessModel", m)} />
                {m}
              </label>
            ))}
          </div>
        </Field>
        {form.accessModel === "subscription" && (
          <Field label="Required plan" help="Only subscribers on this plan can run the tool (entitlement checkout ships in Phase 8)">
            <select className={inputCls} value={form.requiredPlan || ""} onChange={(e) => set("requiredPlan", e.target.value)}>
              <option value="">No plan required</option>
              {plans.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Daily limit" help="0 = unlimited">
          <input type="number" min={0} className={inputCls} value={form.usagePolicy.dailyLimit ?? 0}
            onChange={(e) => set("usagePolicy", { ...form.usagePolicy, dailyLimit: Number(e.target.value) })} />
        </Field>
        <Field label="Monthly limit" help="0 = unlimited">
          <input type="number" min={0} className={inputCls} value={form.usagePolicy.monthlyLimit ?? 0}
            onChange={(e) => set("usagePolicy", { ...form.usagePolicy, monthlyLimit: Number(e.target.value) })} />
        </Field>
        <Field label="Lifetime free executions" help="For freemium tools before a plan is required">
          <input type="number" min={0} className={inputCls} value={form.usagePolicy.lifetimeFreeExecutions ?? 0}
            onChange={(e) => set("usagePolicy", { ...form.usagePolicy, lifetimeFreeExecutions: Number(e.target.value) })} />
        </Field>
        <Field label="Credits per execution">
          <input type="number" min={0} className={inputCls} value={form.usagePolicy.creditsPerExecution ?? 1}
            onChange={(e) => set("usagePolicy", { ...form.usagePolicy, creditsPerExecution: Number(e.target.value) })} />
        </Field>
        <Field label="Rate limit (req/min)">
          <input type="number" min={0} className={inputCls} value={form.usagePolicy.rateLimitPerMinute ?? 5}
            onChange={(e) => set("usagePolicy", { ...form.usagePolicy, rateLimitPerMinute: Number(e.target.value) })} />
        </Field>
        <Field label="Max input length (chars)" help="0 = no limit">
          <input type="number" min={0} className={inputCls} value={form.usagePolicy.maxInputLength ?? 0}
            onChange={(e) => set("usagePolicy", { ...form.usagePolicy, maxInputLength: Number(e.target.value) })} />
        </Field>
        <Field label="Max output length (chars)" help="0 = no limit">
          <input type="number" min={0} className={inputCls} value={form.usagePolicy.maxOutputLength ?? 0}
            onChange={(e) => set("usagePolicy", { ...form.usagePolicy, maxOutputLength: Number(e.target.value) })} />
        </Field>
      </Section>

      <Section title="AI Configuration">
        <Field label="Provider">
          <select className={inputCls} value={form.aiConfig.provider || ""}
            onChange={(e) => set("aiConfig", { ...form.aiConfig, provider: e.target.value, model: "" })}>
            <option value="">Global default</option>
            {providers.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} {p.configured ? "✓ configured" : "✗ not configured"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Model">
          {providerModels.length > 0 ? (
            <select className={inputCls} value={form.aiConfig.model || ""}
              onChange={(e) => set("aiConfig", { ...form.aiConfig, model: e.target.value })}>
              <option value="">Provider default</option>
              {providerModels.map((m) => <option key={m.name} value={m.name}>{m.label || m.name}</option>)}
            </select>
          ) : (
            <input className={inputCls} placeholder="e.g. gpt-4o-mini" value={form.aiConfig.model || ""}
              onChange={(e) => set("aiConfig", { ...form.aiConfig, model: e.target.value })} />
          )}
        </Field>
        <Field label="Routing">
          <select className={inputCls} value={form.aiConfig.routing}
            onChange={(e) => set("aiConfig", { ...form.aiConfig, routing: e.target.value })}>
            <option value="global-default">Global default</option>
            <option value="provider">Use tool provider</option>
          </select>
        </Field>
        <Field label="Fallback model">
          <input className={inputCls} placeholder="e.g. gpt-4o-mini" value={form.aiConfig.fallbackModel || ""}
            onChange={(e) => set("aiConfig", { ...form.aiConfig, fallbackModel: e.target.value })} />
        </Field>
      </Section>

      <Section title="SEO">
        <Field label="Meta title"><input className={inputCls} value={form.seo?.metaTitle || ""} onChange={(e) => set("seo", { ...form.seo, metaTitle: e.target.value })} /></Field>
        <Field label="Meta description"><textarea className={inputCls} rows={2} value={form.seo?.metaDescription || ""} onChange={(e) => set("seo", { ...form.seo, metaDescription: e.target.value })} /></Field>
        <Field label="Keywords" help="Comma separated">
          <input className={inputCls} value={(form.seo?.keywords || []).join(", ")}
            onChange={(e) => set("seo", { ...form.seo, keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })} />
        </Field>
        <Field label="Canonical URL"><input className={inputCls} value={form.seo?.canonicalUrl || ""} onChange={(e) => set("seo", { ...form.seo, canonicalUrl: e.target.value })} /></Field>
      </Section>

      <Section title="Social">
        <Field label="OG image URL"><input className={inputCls} value={form.social?.ogImage || ""} onChange={(e) => set("social", { ...form.social, ogImage: e.target.value })} /></Field>
        <Field label="Twitter handle"><input className={inputCls} placeholder="@wallv" value={form.social?.twitterHandle || ""} onChange={(e) => set("social", { ...form.social, twitterHandle: e.target.value })} /></Field>
      </Section>

      <Section title="Discovery">
        <Field label="Flags">
          <div className="flex flex-wrap gap-4">
            {Object.keys(form.flags).map((flag) => (
              <label key={flag} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={Boolean(form.flags[flag])}
                  onChange={(e) => set("flags", { ...form.flags, [flag]: e.target.checked })} />
                {flag.replace(/^is/, "")}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Display order" help="Lower numbers appear first">
          <input type="number" className={inputCls} value={form.displayOrder} onChange={(e) => set("displayOrder", Number(e.target.value))} />
        </Field>
        <Field label="Visibility">
          <div className="flex flex-wrap gap-4">
            {(Object.keys(form.visibility) as (keyof typeof form.visibility)[]).map((v) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.visibility[v]}
                  onChange={(e) => set("visibility", { ...form.visibility, [v]: e.target.checked })} />
                {v}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Features">
          <div className="space-y-2">
            {form.features.map((f, i) => (
              <div key={i} className="flex gap-2">
                <input className={inputCls} value={f}
                  onChange={(e) => set("features", form.features.map((x, idx) => (idx === i ? e.target.value : x)))} />
                <button type="button" onClick={() => set("features", form.features.filter((_, idx) => idx !== i))}
                  className="px-3 rounded-lg border text-sm hover:bg-muted"><X className="h-4 w-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => set("features", [...form.features, ""])}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <Plus className="h-3 w-3" /> Add feature
            </button>
          </div>
        </Field>
      </Section>

      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {form._id ? "Save changes" : "Create tool"}
        </button>
        <button type="button" onClick={() => router.push("/dashboard/ai-tools/tools")}
          className="rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-muted">
          Cancel
        </button>
      </div>
    </form>
  );
}
