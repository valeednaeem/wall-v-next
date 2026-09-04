"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  FileText,
  CheckCircle2,
  XCircle,
  Send,
  Eye,
  EyeOff,
  Globe,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ContentItem {
  _id: string;
  title: string;
  content?: string;
  excerpt?: string;
  type: string;
  platform?: string;
  status: string;
  featuredImage?: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    slug?: string;
  };
  qualityScore?: number;
  qualityScores?: {
    overall: number;
    seo: number;
    readability: number;
    engagement: number;
    accuracy: number;
    brandVoice: number;
  };
  socialVariants?: Array<{
    platform: string;
    content: string;
    hashtags?: string[];
  }>;
  videoScript?: {
    intro: string;
    sections: Array<{ title: string; script: string; duration: number }>;
    outro: string;
    totalDuration: number;
  };
  campaign?: { name: string; _id: string };
  topic?: { title: string; _id: string; primaryKeyword?: string };
  plan?: { weekNumber: number; version: number; status: string };
  approvedBy?: { name: string; email: string };
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_WORKFLOW = ["draft", "review", "approved", "published"];
const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-100 text-green-800",
  scheduled: "bg-blue-100 text-blue-800",
  approved: "bg-purple-100 text-purple-800",
  review: "bg-yellow-100 text-yellow-800",
  draft: "bg-gray-100 text-gray-800",
};

export default function ArticleDetailPage() {
  const params = useParams();
  const itemId = params.id as string;

  const [item, setItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");
  const [seoSlug, setSeoSlug] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const fetchItem = useCallback(async () => {
    try {
      const res = await fetch(`/api/content/items/${itemId}`);
      const data = await res.json();
      if (data.success) {
        const d = data.data;
        setItem(d);
        setTitle(d.title || "");
        setContent(d.content || "");
        setExcerpt(d.excerpt || "");
        setSeoTitle(d.seo?.metaTitle || "");
        setSeoDesc(d.seo?.metaDescription || "");
        setSeoKeywords(d.seo?.keywords?.join(", ") || "");
        setSeoSlug(d.seo?.slug || "");
      }
    } catch (error) {
      console.error("Failed to fetch item:", error);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/content/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          excerpt,
          seo: {
            metaTitle: seoTitle,
            metaDescription: seoDesc,
            keywords: seoKeywords.split(",").map((k) => k.trim()).filter(Boolean),
            slug: seoSlug,
          },
        }),
      });
      fetchItem();
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      await fetch(`/api/content/items/${itemId}/${action}`, { method: "POST" });
      fetchItem();
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-64 animate-pulse" />
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold">Content item not found</h2>
        <Link
          href="/dashboard/content/articles"
          className="text-sm text-primary hover:underline mt-2 inline-block"
        >
          Back to articles
        </Link>
      </div>
    );
  }

  const currentStatusIndex = STATUS_WORKFLOW.indexOf(item.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard/content/articles"
            className="p-2 rounded-lg hover:bg-muted transition-colors mt-0.5"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold">{item.title}</h2>
              <span
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full font-medium",
                  STATUS_COLORS[item.status] || "bg-gray-100 text-gray-800"
                )}
              >
                {item.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 capitalize">
              {item.type} {item.platform ? `• ${item.platform}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save
          </button>
          {item.status === "draft" && (
            <button
              onClick={() => handleAction("approve")}
              disabled={actionLoading === "approve"}
              className="inline-flex items-center gap-2 bg-purple-600 text-white rounded-lg px-3 py-2 text-sm hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {actionLoading === "approve" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Submit for Review
            </button>
          )}
          {(item.status === "review" || item.status === "approved") && (
            <>
              <button
                onClick={() => handleAction("approve")}
                disabled={actionLoading === "approve"}
                className="inline-flex items-center gap-2 bg-green-600 text-white rounded-lg px-3 py-2 text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {actionLoading === "approve" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Approve
              </button>
              {item.status === "review" && (
                <button
                  onClick={() => {
                    fetch(`/api/content/items/${itemId}`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "draft" }),
                    }).then(() => fetchItem());
                  }}
                  className="inline-flex items-center gap-2 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm hover:bg-red-50 transition-colors"
                >
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              )}
            </>
          )}
          {item.status === "approved" && (
            <button
              onClick={() => handleAction("publish")}
              disabled={actionLoading === "publish"}
              className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {actionLoading === "publish" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Publish
            </button>
          )}
        </div>
      </div>

      {/* Status Workflow */}
      <div className="flex items-center gap-2">
        {STATUS_WORKFLOW.map((status, i) => (
          <div key={status} className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
                i <= currentStatusIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {i < currentStatusIndex && <CheckCircle2 className="h-3 w-3" />}
              {status}
            </div>
            {i < STATUS_WORKFLOW.length - 1 && (
              <div
                className={cn(
                  "w-8 h-px",
                  i < currentStatusIndex ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Content</label>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {showPreview ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    {showPreview ? "Edit" : "Preview"}
                  </button>
                </div>
                {showPreview ? (
                  <div
                    className="rounded-lg border p-4 prose prose-sm max-w-none min-h-[200px]"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                ) : (
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={15}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-sm font-mono resize-none"
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Excerpt</label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Social Variants */}
          {item.socialVariants && item.socialVariants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Social Variants
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {item.socialVariants.map((variant, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="capitalize">
                        {variant.platform}
                      </Badge>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{variant.content}</p>
                    {variant.hashtags && variant.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {variant.hashtags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-muted px-1.5 py-0.5 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Video Script */}
          {item.videoScript && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Video Script
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Intro</p>
                  <p className="text-sm">{item.videoScript.intro}</p>
                </div>
                {item.videoScript.sections.map((section, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Section {i + 1}: {section.title}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {section.duration}s
                      </span>
                    </div>
                    <p className="text-sm">{section.script}</p>
                  </div>
                ))}
                <div className="rounded-lg border p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Outro</p>
                  <p className="text-sm">{item.videoScript.outro}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Total duration: {item.videoScript.totalDuration}s
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4" /> SEO
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Meta Title
                </label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className="w-full rounded-lg border bg-white px-3 py-1.5 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {seoTitle.length}/60 characters
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Meta Description
                </label>
                <textarea
                  value={seoDesc}
                  onChange={(e) => setSeoDesc(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border bg-white px-3 py-1.5 text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {seoDesc.length}/160 characters
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Keywords
                </label>
                <input
                  type="text"
                  value={seoKeywords}
                  onChange={(e) => setSeoKeywords(e.target.value)}
                  placeholder="comma-separated"
                  className="w-full rounded-lg border bg-white px-3 py-1.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Slug
                </label>
                <input
                  type="text"
                  value={seoSlug}
                  onChange={(e) => setSeoSlug(e.target.value)}
                  className="w-full rounded-lg border bg-white px-3 py-1.5 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quality Scores */}
          {item.qualityScores && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quality Scores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(item.qualityScores)
                  .filter(([k]) => k !== "overall")
                  .map(([key, value]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize text-muted-foreground">
                          {key}
                        </span>
                        <span className="font-medium">{value}/10</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${value * 10}%` }}
                        />
                      </div>
                    </div>
                  ))}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Overall</span>
                    <span className="font-bold">
                      {item.qualityScores.overall}/10
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {item.campaign && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Campaign</span>
                  <Link
                    href={`/dashboard/content/campaigns/${item.campaign._id}`}
                    className="text-primary hover:underline"
                  >
                    {item.campaign.name}
                  </Link>
                </div>
              )}
              {item.topic && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Topic</span>
                  <span>{item.topic.title}</span>
                </div>
              )}
              {item.topic?.primaryKeyword && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Keyword</span>
                  <span>{item.topic.primaryKeyword}</span>
                </div>
              )}
              {item.plan && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span>Week {item.plan.weekNumber} v{item.plan.version}</span>
                </div>
              )}
              {item.approvedBy && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approved by</span>
                  <span>{item.approvedBy.name}</span>
                </div>
              )}
              {item.scheduledAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled</span>
                  <span>{new Date(item.scheduledAt).toLocaleString()}</span>
                </div>
              )}
              {item.publishedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Published</span>
                  <span>{new Date(item.publishedAt).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
