"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Eye, Clock, CheckCircle, Send, Globe, ChevronDown } from "lucide-react";
import HtmlEditor from "@/components/editor/html-editor";
import DOMPurify from "isomorphic-dompurify";

const typeLabels: Record<string, string> = {
  privacy: "Privacy Policy",
  terms: "Terms & Conditions",
  refund: "Refund Policy",
  disclaimer: "Disclaimer",
  cookie: "Cookie Policy",
  sitemap: "Sitemap",
  accessibility: "Accessibility Statement",
  "acceptable-use": "Acceptable Use Policy",
  "ai-usage": "AI Usage & Limitations",
  "data-processing": "Data Processing & Security",
  copyright: "Copyright & IP Policy",
  "contact-legal": "Contact & Legal Notices",
  other: "Custom Page",
};

interface Version {
  _id: string;
  version: string;
  title: string;
  changeNote?: string;
  createdAt: string;
  createdBy?: { name: string };
}

export default function LegalEditorPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const isNew = slug === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "seo" | "versions">("content");
  const [versions, setVersions] = useState<Version[]>([]);
  const [showVersionNote, setShowVersionNote] = useState(false);
  const [versionNote, setVersionNote] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    type: "other",
    status: "draft" as "draft" | "published" | "scheduled",
    language: "en",
    changeNote: "",
    seo: {
      metaTitle: "",
      metaDescription: "",
      canonicalUrl: "",
      robots: "index, follow",
      ogImage: "",
      ogTitle: "",
      ogDescription: "",
      twitterCard: "summary_large_image",
      twitterTitle: "",
      twitterDescription: "",
    },
  });

  const loadPage = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/legal/${slug}?dashboard=true`);
      const data = await res.json();
      if (data.success) {
        const page = data.data;
        setForm({
          title: page.title || "",
          slug: page.slug || "",
          content: page.content || "",
          type: page.type || "other",
          status: page.status || "draft",
          language: page.language || "en",
          changeNote: "",
          seo: {
            metaTitle: page.seo?.metaTitle || "",
            metaDescription: page.seo?.metaDescription || "",
            canonicalUrl: page.seo?.canonicalUrl || "",
            robots: page.seo?.robots || "index, follow",
            ogImage: page.seo?.ogImage || "",
            ogTitle: page.seo?.ogTitle || "",
            ogDescription: page.seo?.ogDescription || "",
            twitterCard: page.seo?.twitterCard || "summary_large_image",
            twitterTitle: page.seo?.twitterTitle || "",
            twitterDescription: page.seo?.twitterDescription || "",
          },
        });
      }
    } catch (error) {
      console.error("Failed to load page:", error);
    } finally {
      setLoading(false);
    }
  }, [slug, isNew]);

  const loadVersions = useCallback(async () => {
    if (isNew) return;
    try {
      const res = await fetch(`/api/legal/${slug}/versions`);
      const data = await res.json();
      if (data.success) setVersions(data.data);
    } catch (error) {
      console.error("Failed to load versions:", error);
    }
  }, [slug, isNew]);

  useEffect(() => {
    loadPage();
    loadVersions();
  }, [loadPage, loadVersions]);

  useEffect(() => {
    if (isNew || !form.title) return;
    const timer = setTimeout(() => {
      handleAutoSave();
    }, 30000);
    return () => clearTimeout(timer);
  }, [form.content, form.title]);

  async function handleAutoSave() {
    if (!form.title || !form.content || isNew) return;
    setAutoSaving(true);
    try {
      const res = await fetch(`/api/legal/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, changeNote: "Auto-save" }),
      });
      const data = await res.json();
      if (data.success) {
        setLastSaved(new Date());
        const newSlug = data.data.slug;
        if (newSlug && newSlug !== slug) {
          router.replace(`/dashboard/settings/legal/editor/${newSlug}`);
        }
      }
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      setAutoSaving(false);
    }
  }

  async function handleSave(asDraft = true) {
    setSaving(true);
    try {
      const body = {
        ...form,
        status: asDraft ? "draft" : form.status,
        changeNote: versionNote || undefined,
      };

      const method = isNew ? "POST" : "PUT";
      const url = isNew ? "/api/legal" : `/api/legal/${slug}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setLastSaved(new Date());
        setShowVersionNote(false);
        setVersionNote("");
        const newSlug = data.data.slug;
        if (isNew && newSlug) {
          router.replace(`/dashboard/settings/legal/editor/${newSlug}`);
        } else if (newSlug && newSlug !== slug) {
          router.replace(`/dashboard/settings/legal/editor/${newSlug}`);
        }
        loadVersions();
      }
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      const body = {
        ...form,
        status: "published" as const,
        changeNote: versionNote || "Published",
      };

      const method = isNew ? "POST" : "PUT";
      const url = isNew ? "/api/legal" : `/api/legal/${slug}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setForm((prev) => ({ ...prev, status: "published" }));
        setLastSaved(new Date());
        setShowVersionNote(false);
        setVersionNote("");
        const newSlug = data.data.slug;
        if (isNew && newSlug) {
          router.replace(`/dashboard/settings/legal/editor/${newSlug}`);
        } else if (newSlug && newSlug !== slug) {
          router.replace(`/dashboard/settings/legal/editor/${newSlug}`);
        }
        loadVersions();
      }
    } catch (error) {
      console.error("Publish failed:", error);
    } finally {
      setPublishing(false);
    }
  }

  async function handleRestoreVersion(version: Version) {
    if (!confirm(`Restore to version ${version.version}?`)) return;
    try {
      const res = await fetch(`/api/legal/${slug}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: version._id, restore: true, changeNote: `Restored from v${version.version}` }),
      });
      if (res.ok) {
        loadPage();
        loadVersions();
      }
    } catch (error) {
      console.error("Restore failed:", error);
    }
  }

  function autoGenerateSeo() {
    const plainText = form.content.replace(/<[^>]*>/g, "").substring(0, 160);
    setForm((prev) => ({
      ...prev,
      seo: {
        ...prev.seo,
        metaTitle: prev.seo.metaTitle || prev.title,
        metaDescription: prev.seo.metaDescription || plainText,
        ogTitle: prev.seo.ogTitle || prev.title,
        ogDescription: prev.seo.ogDescription || plainText,
        twitterTitle: prev.seo.twitterTitle || prev.title,
        twitterDescription: prev.seo.twitterDescription || plainText,
        canonicalUrl: prev.seo.canonicalUrl || `${typeof window !== "undefined" ? window.location.origin : ""}/${prev.slug}`,
      },
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/dashboard/settings/legal")} className="p-2 rounded-lg hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{isNew ? "New Legal Page" : `Editing: ${form.title}`}</h1>
            {lastSaved && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Last saved: {lastSaved.toLocaleTimeString()}
                {autoSaving && " (auto-saving...)"}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
            form.status === "published" ? "bg-green-100 text-green-800" :
            form.status === "scheduled" ? "bg-yellow-100 text-yellow-800" :
            "bg-gray-100 text-gray-600"
          }`}>
            {form.status === "published" ? <CheckCircle className="h-3 w-3" /> :
             form.status === "scheduled" ? <Clock className="h-3 w-3" /> :
             <span className="h-2 w-2 rounded-full bg-gray-400" />}
            {form.status}
          </span>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !form.title}
            className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={() => { setShowVersionNote(true); }}
            disabled={!form.title || !form.content}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> Publish
          </button>
        </div>
      </div>

      {showVersionNote && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
          <h4 className="font-medium">Publishing Note</h4>
          <input
            type="text"
            placeholder="What changed? (optional)"
            value={versionNote}
            onChange={(e) => setVersionNote(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
          <div className="flex gap-2">
            <button onClick={handlePublish} disabled={publishing} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50">
              {publishing ? "Publishing..." : "Confirm Publish"}
            </button>
            <button onClick={() => setShowVersionNote(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-accent">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <input
            type="text"
            placeholder="Page Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-4 py-3 border rounded-lg text-lg font-medium"
          />

          <div className="flex gap-1 border-b">
            {[
              { id: "content" as const, label: "Content" },
              { id: "seo" as const, label: "SEO Settings" },
              { id: "versions" as const, label: `Version History (${versions.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "content" && (
            <HtmlEditor
              value={form.content}
              onChange={(content) => setForm((prev) => ({ ...prev, content }))}
              placeholder="Write your legal page content here..."
              minHeight="500px"
            />
          )}

          {activeTab === "seo" && (
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">SEO Settings</h3>
                <button onClick={autoGenerateSeo} className="text-sm text-primary hover:underline">
                  Auto-generate from content
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm text-muted-foreground">SEO Title</label>
                  <input value={form.seo.metaTitle} onChange={(e) => setForm({ ...form, seo: { ...form.seo, metaTitle: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="Page title for search engines" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-muted-foreground">Meta Description</label>
                  <textarea value={form.seo.metaDescription} onChange={(e) => setForm({ ...form, seo: { ...form.seo, metaDescription: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" rows={2} placeholder="Brief description for search results" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Canonical URL</label>
                  <input value={form.seo.canonicalUrl} onChange={(e) => setForm({ ...form, seo: { ...form.seo, canonicalUrl: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="https://..." />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Robots</label>
                  <select value={form.seo.robots} onChange={(e) => setForm({ ...form, seo: { ...form.seo, robots: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                    <option value="index, follow">Index, Follow</option>
                    <option value="noindex, follow">No Index, Follow</option>
                    <option value="index, nofollow">Index, No Follow</option>
                    <option value="noindex, nofollow">No Index, No Follow</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-muted-foreground">OG Image URL</label>
                  <input value={form.seo.ogImage} onChange={(e) => setForm({ ...form, seo: { ...form.seo, ogImage: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" placeholder="https://..." />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">OG Title</label>
                  <input value={form.seo.ogTitle} onChange={(e) => setForm({ ...form, seo: { ...form.seo, ogTitle: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">OG Description</label>
                  <input value={form.seo.ogDescription} onChange={(e) => setForm({ ...form, seo: { ...form.seo, ogDescription: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Twitter Card</label>
                  <select value={form.seo.twitterCard} onChange={(e) => setForm({ ...form, seo: { ...form.seo, twitterCard: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1">
                    <option value="summary">Summary</option>
                    <option value="summary_large_image">Summary Large Image</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Twitter Title</label>
                  <input value={form.seo.twitterTitle} onChange={(e) => setForm({ ...form, seo: { ...form.seo, twitterTitle: e.target.value } })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "versions" && (
            <div className="border rounded-lg overflow-hidden">
              {versions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No versions yet. Publish to create the first version.</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium">Version</th>
                      <th className="text-left px-4 py-3 text-sm font-medium">Note</th>
                      <th className="text-left px-4 py-3 text-sm font-medium hidden md:table-cell">Author</th>
                      <th className="text-left px-4 py-3 text-sm font-medium">Date</th>
                      <th className="text-right px-4 py-3 text-sm font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {versions.map((v) => (
                      <tr key={v._id} className="hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-medium">v{v.version}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{v.changeNote || "—"}</td>
                        <td className="px-4 py-3 hidden md:table-cell text-sm">{v.createdBy?.name || "System"}</td>
                        <td className="px-4 py-3 text-sm">{new Date(v.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleRestoreVersion(v)} className="text-sm text-primary hover:underline">
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Page Settings</h4>
            <div>
              <label className="text-sm text-muted-foreground">Slug</label>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
                disabled={!isNew}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              >
                {Object.entries(typeLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Language</label>
              <select
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ar">Arabic</option>
                <option value="ur">Urdu</option>
              </select>
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Preview</h4>
            {form.slug && form.status === "published" && (
              <a
                href={`/${form.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Globe className="h-4 w-4" /> View live page
              </a>
            )}
            {form.content && (
              <div
                className="prose prose-sm max-w-none text-sm border rounded p-3 max-h-[300px] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(form.content) }}
              />
            )}
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Actions</h4>
            <div className="space-y-2">
              <button onClick={() => handleSave(true)} disabled={saving} className="w-full px-3 py-2 border rounded-lg text-sm hover:bg-accent disabled:opacity-50">
                {saving ? "Saving..." : "Save as Draft"}
              </button>
              <button onClick={() => { setShowVersionNote(true); }} disabled={!form.title || !form.content} className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50">
                Publish Page
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
