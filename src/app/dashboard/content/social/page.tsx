"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Share2,
  Loader2,
  Send,
  Circle,
  RefreshCw,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SocialPost {
  _id: string;
  title: string;
  content: string;
  platform: string;
  status: string;
  scheduledAt?: string;
  publishedAt?: string;
  hashtags?: string[];
}

interface ConnectionInfo {
  connected: boolean;
  lastPublish?: string;
  error?: string;
}

interface ContentItem {
  _id: string;
  title: string;
  type: string;
  platform?: string;
  status: string;
  content?: string;
}

interface RepurposeResult {
  sourceItem: { _id: string; title: string };
  generatedItems: Array<{
    _id: string;
    title: string;
    type: string;
    platform?: string;
    status: string;
    content?: string;
    slug?: string;
  }>;
  summary: string;
}

const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "facebook", label: "Facebook" },
  { id: "x", label: "X / Twitter" },
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
];

const REPURPOSE_FORMATS = [
  { id: "twitter_thread", label: "Twitter/X Thread" },
  { id: "linkedin_post", label: "LinkedIn Post" },
  { id: "facebook_post", label: "Facebook Post" },
  { id: "newsletter", label: "Newsletter" },
  { id: "video_script", label: "Video Script" },
  { id: "infographic", label: "Infographic" },
  { id: "email_sequence", label: "Email Sequence" },
  { id: "podcast_script", label: "Podcast Script" },
];

const STATUS_COLORS: Record<string, string> = {
  published: "bg-green-100 text-green-800",
  scheduled: "bg-blue-100 text-blue-800",
  approved: "bg-purple-100 text-purple-800",
  review: "bg-yellow-100 text-yellow-800",
  draft: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
};

export default function SocialPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [connections, setConnections] = useState<Record<string, ConnectionInfo>>({});
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("linkedin");

  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [repurposing, setRepurposing] = useState(false);
  const [repurposeResult, setRepurposeResult] = useState<RepurposeResult | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [postsRes, connRes] = await Promise.allSettled([
        fetch("/api/content/items?type=social&limit=100"),
        fetch("/api/content/connections"),
      ]);

      if (postsRes.status === "fulfilled") {
        const data = await postsRes.value.json();
        setPosts(data.data || []);
      }
      if (connRes.status === "fulfilled") {
        const data = await connRes.value.json();
        setConnections(data.connections || {});
      }
    } catch (error) {
      console.error("Failed to fetch social data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContentItems = useCallback(async () => {
    try {
      const res = await fetch("/api/content/items?status=published&status=approved&limit=50");
      const data = await res.json();
      setContentItems(data.data || []);
    } catch (error) {
      console.error("Failed to fetch content items:", error);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchContentItems();
  }, [fetchData, fetchContentItems]);

  const handlePublish = async (itemId: string) => {
    setPublishing(itemId);
    try {
      await fetch(`/api/content/items/${itemId}/publish`, { method: "POST" });
      fetchData();
    } catch (error) {
      console.error("Publish failed:", error);
    } finally {
      setPublishing(null);
    }
  };

  const handleRepurpose = async () => {
    if (!selectedItemId || selectedFormats.length === 0) return;

    setRepurposing(true);
    setRepurposeResult(null);
    try {
      const res = await fetch("/api/content/repurpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentItemId: selectedItemId,
          formats: selectedFormats,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRepurposeResult(data.data);
        fetchContentItems();
      }
    } catch (error) {
      console.error("Repurpose failed:", error);
    } finally {
      setRepurposing(false);
    }
  };

  const toggleFormat = (format: string) => {
    setSelectedFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
    );
  };

  const getPlatformPosts = (platform: string) =>
    posts.filter((p) => p.platform === platform);

  const readyToPublish = posts.filter(
    (p) => p.status === "approved" && !connections[p.platform]?.connected
  );

  const platformPosts = getPlatformPosts(activeTab);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Share2 className="h-5 w-5 text-primary" /> Social Content
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage and publish content across platforms
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Connection Overview */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {PLATFORMS.map((platform) => {
              const conn = connections[platform.id];
              const connected = conn?.connected || false;
              const count = getPlatformPosts(platform.id).length;
              return (
                <div
                  key={platform.id}
                  className={cn(
                    "rounded-xl border p-3 text-center",
                    connected && "border-green-200 bg-green-50/30"
                  )}
                >
                  <Circle
                    className={cn(
                      "h-3 w-3 fill-current mx-auto mb-1",
                      connected ? "text-green-500" : "text-red-400"
                    )}
                  />
                  <p className="text-xs font-medium">{platform.label}</p>
                  <p className="text-lg font-bold mt-1">{count}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {connected ? "Connected" : "Not Connected"}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Ready to Publish (not connected) */}
          {readyToPublish.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-4 w-4 text-yellow-600" /> Ready to Publish
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {readyToPublish.length} items are approved but their platforms are not
                  connected.
                </p>
                <div className="space-y-2">
                  {readyToPublish.slice(0, 5).map((post) => (
                    <div
                      key={post._id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white border"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{post.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {post.platform}
                        </p>
                      </div>
                      <Badge variant="warning">Needs Connection</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex w-full overflow-x-auto">
              {PLATFORMS.map((platform) => (
                <TabsTrigger
                  key={platform.id}
                  value={platform.id}
                  className="flex items-center gap-1.5 px-3"
                >
                  <Circle
                    className={cn(
                      "h-2 w-2 fill-current",
                      connections[platform.id]?.connected
                        ? "text-green-500"
                        : "text-red-400"
                    )}
                  />
                  {platform.label}
                </TabsTrigger>
              ))}
              <TabsTrigger value="repurpose" className="flex items-center gap-1.5 px-3">
                <RefreshCw className="h-3 w-3" />
                Repurpose
              </TabsTrigger>
            </TabsList>

            {PLATFORMS.map((platform) => (
              <TabsContent key={platform.id} value={platform.id}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span>{platform.label} Posts</span>
                      <div className="flex items-center gap-2">
                        {connections[platform.id]?.connected ? (
                          <Badge variant="success">Connected</Badge>
                        ) : (
                          <Badge variant="warning">Not Connected</Badge>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!connections[platform.id]?.connected ? (
                      <div className="text-center py-8">
                        <Circle className="h-8 w-8 text-red-300 mx-auto mb-3" />
                        <p className="text-sm font-medium">
                          {platform.label} is not connected
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Connect your {platform.label} account in{" "}
                          <a
                            href="/dashboard/content/connections"
                            className="text-primary hover:underline"
                          >
                            Connections
                          </a>{" "}
                          to start publishing.
                        </p>
                      </div>
                    ) : platformPosts.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No posts for {platform.label} yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {platformPosts.map((post) => (
                          <div
                            key={post._id}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {post.title}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {post.content}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span
                                  className={cn(
                                    "text-xs px-2 py-0.5 rounded-full font-medium",
                                    STATUS_COLORS[post.status] || "bg-gray-100 text-gray-800"
                                  )}
                                >
                                  {post.status}
                                </span>
                                {post.scheduledAt && (
                                  <span className="text-xs text-muted-foreground">
                                    Scheduled:{" "}
                                    {new Date(post.scheduledAt).toLocaleDateString()}
                                  </span>
                                )}
                                {post.publishedAt && (
                                  <span className="text-xs text-muted-foreground">
                                    Published:{" "}
                                    {new Date(post.publishedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            {post.status === "approved" && (
                              <button
                                onClick={() => handlePublish(post._id)}
                                disabled={publishing === post._id}
                                className="ml-3 inline-flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
                              >
                                {publishing === post._id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Send className="h-3 w-3" />
                                )}
                                Publish
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}

            {/* Repurpose Tab */}
            <TabsContent value="repurpose">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" /> Content Repurposer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Source Content Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Source Content</label>
                    <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a content item to repurpose" />
                      </SelectTrigger>
                      <SelectContent>
                        {contentItems.map((item) => (
                          <SelectItem key={item._id} value={item._id}>
                            {item.title} ({item.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Format Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Formats</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {REPURPOSE_FORMATS.map((format) => (
                        <button
                          key={format.id}
                          onClick={() => toggleFormat(format.id)}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg border text-sm text-left transition-colors",
                            selectedFormats.includes(format.id)
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <div
                            className={cn(
                              "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                              selectedFormats.includes(format.id)
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-border"
                            )}
                          >
                            {selectedFormats.includes(format.id) && (
                              <Check className="h-3 w-3" />
                            )}
                          </div>
                          {format.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Repurpose Button */}
                  <Button
                    onClick={handleRepurpose}
                    disabled={!selectedItemId || selectedFormats.length === 0 || repurposing}
                    className="w-full"
                  >
                    {repurposing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Repurposing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Repurpose Content
                      </>
                    )}
                  </Button>

                  {/* Results */}
                  {repurposeResult && (
                    <div className="space-y-3 mt-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-green-500" />
                        {repurposeResult.summary}
                      </div>

                      <div className="space-y-2">
                        {repurposeResult.generatedItems.map((item) => (
                          <div
                            key={item._id}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{item.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {item.type}
                                </Badge>
                                {item.platform && (
                                  <Badge variant="secondary" className="text-xs capitalize">
                                    {item.platform}
                                  </Badge>
                                )}
                                <span
                                  className={cn(
                                    "text-xs px-2 py-0.5 rounded-full font-medium",
                                    STATUS_COLORS[item.status] || "bg-gray-100 text-gray-800"
                                  )}
                                >
                                  {item.status}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                window.open(
                                  `/dashboard/content/items/${item._id}`,
                                  "_blank"
                                )
                              }
                            >
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
