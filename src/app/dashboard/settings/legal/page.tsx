"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText, Plus, Search, Filter, MoreHorizontal, Eye, Edit3, Trash2,
  Copy, Clock, CheckCircle, AlertCircle, Globe, Calendar, Tag, ChevronDown,
  Download, Upload, Settings, Cookie, Shield, Map, ArrowLeft,
} from "lucide-react";

interface LegalPage {
  _id: string;
  title: string;
  slug: string;
  type: string;
  version: string;
  status: "draft" | "published" | "scheduled";
  isActive: boolean;
  language: string;
  scheduledAt?: string;
  lastPublishedAt?: string;
  seo?: { metaTitle?: string; metaDescription?: string };
  createdAt: string;
  updatedAt: string;
}

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

const typeColors: Record<string, string> = {
  privacy: "bg-blue-100 text-blue-800",
  terms: "bg-purple-100 text-purple-800",
  refund: "bg-green-100 text-green-800",
  disclaimer: "bg-orange-100 text-orange-800",
  cookie: "bg-yellow-100 text-yellow-800",
  sitemap: "bg-teal-100 text-teal-800",
  accessibility: "bg-indigo-100 text-indigo-800",
  "acceptable-use": "bg-pink-100 text-pink-800",
  "ai-usage": "bg-cyan-100 text-cyan-800",
  "data-processing": "bg-red-100 text-red-800",
  copyright: "bg-violet-100 text-violet-800",
  "contact-legal": "bg-emerald-100 text-emerald-800",
  other: "bg-gray-100 text-gray-800",
};

const statusIcons: Record<string, React.ReactNode> = {
  draft: <AlertCircle className="h-3.5 w-3.5" />,
  published: <CheckCircle className="h-3.5 w-3.5" />,
  scheduled: <Clock className="h-3.5 w-3.5" />,
};

export default function LegalManagementPage() {
  const [pages, setPages] = useState<LegalPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<"pages" | "cookies" | "refund" | "sitemap">("pages");

  useEffect(() => {
    fetchPages();
  }, []);

  async function fetchPages() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ all: "true" });
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/legal?${params}`);
      const data = await res.json();
      if (data.success) setPages(data.data);
    } catch (error) {
      console.error("Failed to fetch legal pages:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(slug: string) {
    if (!confirm("Archive this legal page?")) return;
    try {
      await fetch(`/api/legal/${slug}`, { method: "DELETE" });
      fetchPages();
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  }

  async function handleDuplicate(page: LegalPage) {
    try {
      const fullRes = await fetch(`/api/legal/${page.slug}?dashboard=true`);
      const fullData = await fullRes.json();
      const content = fullData.success ? fullData.data.content : "";

      const res = await fetch("/api/legal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${page.title} (Copy)`,
          content,
          type: page.type,
          seo: page.seo,
          status: "draft",
        }),
      });
      if (res.ok) fetchPages();
    } catch (error) {
      console.error("Failed to duplicate:", error);
    }
  }

  async function exportHtml(page: LegalPage) {
    try {
      const res = await fetch(`/api/legal/${page.slug}?dashboard=true`);
      const data = await res.json();
      const content = data.success ? data.data.content : "";
      const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${page.slug}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredPages = pages.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.slug.includes(search.toLowerCase())) return false;
    if (typeFilter && p.type !== typeFilter) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    return true;
  });

  const tabs = [
    { id: "pages" as const, label: "Legal Pages", icon: <FileText className="h-4 w-4" /> },
    { id: "cookies" as const, label: "Cookie Manager", icon: <Cookie className="h-4 w-4" /> },
    { id: "refund" as const, label: "Refund Rules", icon: <Shield className="h-4 w-4" /> },
    { id: "sitemap" as const, label: "Sitemap Settings", icon: <Map className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Legal & Compliance</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage legal pages, cookies, refund policies, and sitemap configuration.</p>
        </div>
        <Link
          href="/dashboard/settings/legal/editor/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New Legal Page
        </Link>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "pages" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search legal pages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-accent"
            >
              <Filter className="h-4 w-4" /> Filters <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-lg">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm"
              >
                <option value="">All Types</option>
                {Object.entries(typeLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="scheduled">Scheduled</option>
              </select>
              {(typeFilter || statusFilter) && (
                <button
                  onClick={() => { setTypeFilter(""); setStatusFilter(""); }}
                  className="text-sm text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filteredPages.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No legal pages found.</p>
              <Link href="/dashboard/settings/legal/editor/new" className="text-primary text-sm hover:underline mt-2 inline-block">
                Create your first legal page
              </Link>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium">Page</th>
                    <th className="text-left px-4 py-3 text-sm font-medium hidden md:table-cell">Type</th>
                    <th className="text-left px-4 py-3 text-sm font-medium hidden md:table-cell">Version</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium hidden lg:table-cell">Updated</th>
                    <th className="text-right px-4 py-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPages.map((page) => (
                    <tr key={page._id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-sm">{page.title}</p>
                          <p className="text-xs text-muted-foreground">/{page.slug}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[page.type] || "bg-gray-100 text-gray-800"}`}>
                          {typeLabels[page.type] || page.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">v{page.version}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          page.status === "published" ? "bg-green-100 text-green-800" :
                          page.status === "scheduled" ? "bg-yellow-100 text-yellow-800" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {statusIcons[page.status]} {page.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {new Date(page.updatedAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {page.status === "published" && (
                            <a
                              href={`/${page.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                              title="View"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                          )}
                          <Link
                            href={`/dashboard/settings/legal/editor/${page.slug}`}
                            className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDuplicate(page)}
                            className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                            title="Duplicate"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => exportHtml(page)}
                            className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                            title="Export HTML"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(page.slug)}
                            className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                            title="Archive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "cookies" && <CookieManager />}
      {activeTab === "refund" && <RefundRulesManager />}
      {activeTab === "sitemap" && <SitemapManager />}
    </div>
  );
}

function CookieManager() {
  const [categories, setCategories] = useState<any[]>([]);
  const [cookies, setCookies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCookie, setEditingCookie] = useState<any>(null);
  const [cookieSearch, setCookieSearch] = useState("");
  const [form, setForm] = useState({
    name: "", description: "", category: "", provider: "", purpose: "",
    duration: "", type: "first-party" as "first-party" | "third-party",
    isRequired: false, isActive: true, sortOrder: 0,
  });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [catRes, cookieRes] = await Promise.all([
        fetch("/api/legal/cookies/categories"),
        fetch("/api/legal/cookies?active=true"),
      ]);
      const catData = await catRes.json();
      const cookieData = await cookieRes.json();
      if (catData.success) setCategories(catData.data);
      if (cookieData.success) setCookies(cookieData.data);
    } catch (error) {
      console.error("Failed to fetch cookies:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCookie() {
    try {
      const method = editingCookie ? "PUT" : "POST";
      const url = editingCookie ? `/api/legal/cookies/${editingCookie._id}` : "/api/legal/cookies";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setEditingCookie(null);
      setForm({ name: "", description: "", category: "", provider: "", purpose: "", duration: "", type: "first-party", isRequired: false, isActive: true, sortOrder: 0 });
      fetchData();
    } catch (error) {
      console.error("Failed to save cookie:", error);
    }
  }

  async function handleDeleteCookie(id: string) {
    if (!confirm("Delete this cookie definition?")) return;
    await fetch(`/api/legal/cookies/${id}`, { method: "DELETE" });
    fetchData();
  }

  const filteredCookies = cookies.filter((c) =>
    !cookieSearch || c.name.toLowerCase().includes(cookieSearch.toLowerCase()) ||
    c.description.toLowerCase().includes(cookieSearch.toLowerCase())
  );

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading cookies...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Cookie Definitions</h3>
          <p className="text-sm text-muted-foreground">Manage cookies used across your website.</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingCookie(null); setForm({ name: "", description: "", category: categories[0]?._id || "", provider: "", purpose: "", duration: "", type: "first-party", isRequired: false, isActive: true, sortOrder: 0 }); }}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Cookie
        </button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
          <h4 className="font-medium">{editingCookie ? "Edit Cookie" : "Add Cookie"}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input placeholder="Cookie Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="Provider (e.g., Google Analytics)" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="px-3 py-2 border rounded-lg text-sm">
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
            <input placeholder="Duration (e.g., 1 year)" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="Purpose" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className="px-3 py-2 border rounded-lg text-sm md:col-span-2" />
            <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="px-3 py-2 border rounded-lg text-sm md:col-span-2" rows={2} />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "first-party" | "third-party" })} className="px-3 py-2 border rounded-lg text-sm">
              <option value="first-party">First-party</option>
              <option value="third-party">Third-party</option>
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isRequired} onChange={(e) => setForm({ ...form, isRequired: e.target.checked })} className="rounded" />
              Required (cannot be disabled)
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveCookie} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90">
              {editingCookie ? "Update" : "Save"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingCookie(null); }} className="px-4 py-2 border rounded-lg text-sm hover:bg-accent">
              Cancel
            </button>
          </div>
        </div>
      )}

      <input
        type="text"
        placeholder="Search cookies..."
        value={cookieSearch}
        onChange={(e) => setCookieSearch(e.target.value)}
        className="w-full px-4 py-2 border rounded-lg text-sm"
      />

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium">Name</th>
              <th className="text-left px-4 py-3 text-sm font-medium hidden md:table-cell">Category</th>
              <th className="text-left px-4 py-3 text-sm font-medium hidden md:table-cell">Provider</th>
              <th className="text-left px-4 py-3 text-sm font-medium hidden lg:table-cell">Duration</th>
              <th className="text-left px-4 py-3 text-sm font-medium">Type</th>
              <th className="text-left px-4 py-3 text-sm font-medium">Required</th>
              <th className="text-right px-4 py-3 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredCookies.map((cookie) => (
              <tr key={cookie._id} className="hover:bg-muted/20">
                <td className="px-4 py-3">
                  <p className="font-medium text-sm">{cookie.name}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{cookie.description}</p>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-sm">{cookie.category?.name || "—"}</span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-sm">{cookie.provider}</span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-sm">{cookie.duration}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cookie.type === "third-party" ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"}`}>
                    {cookie.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {cookie.isRequired ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <span className="text-muted-foreground text-xs">Optional</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => { setEditingCookie(cookie); setForm({ name: cookie.name, description: cookie.description, category: cookie.category?._id || "", provider: cookie.provider, purpose: cookie.purpose, duration: cookie.duration, type: cookie.type, isRequired: cookie.isRequired, isActive: cookie.isActive, sortOrder: cookie.sortOrder }); setShowForm(true); }}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDeleteCookie(cookie._id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RefundRulesManager() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", description: "", serviceType: "", refundWindowDays: 14,
    refundPercentage: 100, conditions: [""], isEligible: true,
    requiresApproval: false, refundMethod: "original-payment" as const,
    processingDays: 14, excludedItems: [""], notes: "", isActive: true, sortOrder: 0,
  });

  useEffect(() => { fetchRules(); }, []);

  async function fetchRules() {
    try {
      const res = await fetch("/api/legal/refund-rules?active=true");
      const data = await res.json();
      if (data.success) setRules(data.data);
    } catch (error) {
      console.error("Failed to fetch rules:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRule() {
    try {
      const method = editingRule ? "PUT" : "POST";
      const url = editingRule ? `/api/legal/refund-rules/${editingRule._id}` : "/api/legal/refund-rules";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, conditions: form.conditions.filter(Boolean), excludedItems: form.excludedItems.filter(Boolean) }),
      });
      setShowForm(false);
      setEditingRule(null);
      fetchRules();
    } catch (error) {
      console.error("Failed to save rule:", error);
    }
  }

  async function handleDeleteRule(id: string) {
    if (!confirm("Delete this refund rule?")) return;
    await fetch(`/api/legal/refund-rules/${id}`, { method: "DELETE" });
    fetchRules();
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading refund rules...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Refund Rules</h3>
          <p className="text-sm text-muted-foreground">Configure refund policies per service type.</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingRule(null); setForm({ name: "", description: "", serviceType: "", refundWindowDays: 14, refundPercentage: 100, conditions: [""], isEligible: true, requiresApproval: false, refundMethod: "original-payment", processingDays: 14, excludedItems: [""], notes: "", isActive: true, sortOrder: 0 }); }}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Rule
        </button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
          <h4 className="font-medium">{editingRule ? "Edit Rule" : "Add Rule"}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input placeholder="Rule Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
            <input placeholder="Service Type (e.g., AI Agents)" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
            <div>
              <label className="text-sm text-muted-foreground">Refund Window (days)</label>
              <input type="number" value={form.refundWindowDays} onChange={(e) => setForm({ ...form, refundWindowDays: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Refund %</label>
              <input type="number" min={0} max={100} value={form.refundPercentage} onChange={(e) => setForm({ ...form, refundPercentage: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
            </div>
            <select value={form.refundMethod} onChange={(e) => setForm({ ...form, refundMethod: e.target.value as any })} className="px-3 py-2 border rounded-lg text-sm">
              <option value="original-payment">Original Payment</option>
              <option value="store-credit">Store Credit</option>
              <option value="bank-transfer">Bank Transfer</option>
              <option value="none">No Refund</option>
            </select>
            <div>
              <label className="text-sm text-muted-foreground">Processing Days</label>
              <input type="number" value={form.processingDays} onChange={(e) => setForm({ ...form, processingDays: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
            </div>
            <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="px-3 py-2 border rounded-lg text-sm md:col-span-2" rows={2} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isEligible} onChange={(e) => setForm({ ...form, isEligible: e.target.checked })} className="rounded" />
              Refund Eligible
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.requiresApproval} onChange={(e) => setForm({ ...form, requiresApproval: e.target.checked })} className="rounded" />
              Requires Approval
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveRule} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90">
              {editingRule ? "Update" : "Save"}
            </button>
            <button onClick={() => { setShowForm(false); setEditingRule(null); }} className="px-4 py-2 border rounded-lg text-sm hover:bg-accent">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium">Rule</th>
              <th className="text-left px-4 py-3 text-sm font-medium hidden md:table-cell">Service Type</th>
              <th className="text-left px-4 py-3 text-sm font-medium">Window</th>
              <th className="text-left px-4 py-3 text-sm font-medium">Refund %</th>
              <th className="text-left px-4 py-3 text-sm font-medium hidden md:table-cell">Method</th>
              <th className="text-right px-4 py-3 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rules.map((rule) => (
              <tr key={rule._id} className="hover:bg-muted/20">
                <td className="px-4 py-3">
                  <p className="font-medium text-sm">{rule.name}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{rule.description}</p>
                </td>
                <td className="px-4 py-3 hidden md:table-cell"><span className="text-sm">{rule.serviceType}</span></td>
                <td className="px-4 py-3"><span className="text-sm">{rule.refundWindowDays} days</span></td>
                <td className="px-4 py-3"><span className="text-sm">{rule.refundPercentage}%</span></td>
                <td className="px-4 py-3 hidden md:table-cell"><span className="text-sm capitalize">{rule.refundMethod.replace("-", " ")}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setEditingRule(rule); setForm({ name: rule.name, description: rule.description, serviceType: rule.serviceType, refundWindowDays: rule.refundWindowDays, refundPercentage: rule.refundPercentage, conditions: rule.conditions?.length ? rule.conditions : [""], isEligible: rule.isEligible, requiresApproval: rule.requiresApproval, refundMethod: rule.refundMethod, processingDays: rule.processingDays, excludedItems: rule.excludedItems?.length ? rule.excludedItems : [""], notes: rule.notes || "", isActive: rule.isActive, sortOrder: rule.sortOrder }); setShowForm(true); }} className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDeleteRule(rule._id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SitemapManager() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  async function fetchSettings() {
    try {
      const res = await fetch("/api/legal/sitemap-settings");
      const data = await res.json();
      if (data.success) setSettings(data.data);
    } catch (error) {
      console.error("Failed to fetch sitemap settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/legal/sitemap-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  if (!settings) return <div className="text-center py-12 text-muted-foreground">No settings found.</div>;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Sitemap Configuration</h3>
        <p className="text-sm text-muted-foreground">Control what appears in your XML and HTML sitemaps.</p>
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-medium">Content Inclusion</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: "includePages", label: "Pages" },
            { key: "includePosts", label: "Blog Posts" },
            { key: "includeProducts", label: "Products" },
            { key: "includeServices", label: "Services" },
            { key: "includeCategories", label: "Categories" },
            { key: "includeTags", label: "Tags" },
            { key: "includeLegal", label: "Legal Pages" },
            { key: "includePortfolio", label: "Portfolio" },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings[item.key]}
                onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                className="rounded"
              />
              {item.label}
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted-foreground">Default Priority</label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={settings.defaultPriority}
              onChange={(e) => setSettings({ ...settings, defaultPriority: Number(e.target.value) })}
              className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Default Change Frequency</label>
            <select
              value={settings.defaultChangeFreq}
              onChange={(e) => setSettings({ ...settings, defaultChangeFreq: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm mt-1"
            >
              {["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50">
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-2">XML Sitemap</h4>
        <p className="text-sm text-muted-foreground mb-3">Your XML sitemap is auto-generated at:</p>
        <a href="/sitemap.xml" target="_blank" className="text-primary text-sm hover:underline">/sitemap.xml</a>
      </div>
    </div>
  );
}
