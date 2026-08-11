"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Save, Loader2, Camera, Plus, Trash2, ExternalLink } from "lucide-react";
import HtmlEditor from "@/components/editor/html-editor";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  avatar: string;
  bio: string;
  jobTitle: string;
  company: string;
  location: string;
  website: string;
  socialLinks: {
    linkedin: string;
    twitter: string;
    github: string;
    dribbble: string;
  };
}

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  projectUrl: string;
  tags: string[];
  featured: boolean;
}

export default function ProfileSettingsPage() {
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "portfolio">("profile");
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    phone: "",
    avatar: "",
    bio: "",
    jobTitle: "",
    company: "Wall-V",
    location: "",
    website: "",
    socialLinks: { linkedin: "", twitter: "", github: "", dribbble: "" },
  });

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (session?.user) {
      setProfile((prev) => ({
        ...prev,
        name: (session.user as { name?: string }).name || "",
        email: (session.user as { email?: string }).email || "",
        avatar: (session.user as { image?: string }).image || "",
      }));
    }
    fetch("/api/settings/profile")
      .then((r) => {
        if (r.status === 401) { window.location.href = "/login?callbackUrl=/dashboard/settings/profile"; return null; }
        return r.json();
      })
      .then((d) => {
        if (d?.success) {
          setProfile(d.data.profile);
          setPortfolio(d.data.portfolio || []);
        }
      })
      .catch(() => {});
  }, [session]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      if (res.status === 401) { window.location.href = "/login?callbackUrl=/dashboard/settings/profile"; return; }
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.data?.profile) setProfile(data.data.profile);
        setSaveMessage({ type: "success", text: "Profile saved successfully" });
      } else {
        setSaveMessage({ type: "error", text: data.error || "Failed to save profile" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error. Please try again." });
    }
    setSaving(false);
  };

  const handleSavePortfolio = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolio }),
      });
      if (res.status === 401) { window.location.href = "/login?callbackUrl=/dashboard/settings/profile"; return; }
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage({ type: "success", text: "Portfolio saved successfully" });
      } else {
        setSaveMessage({ type: "error", text: data.error || "Failed to save portfolio" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error. Please try again." });
    }
    setSaving(false);
  };

  const addPortfolioItem = () => {
    setPortfolio([
      ...portfolio,
      {
        id: `port-${Date.now()}`,
        title: "",
        description: "",
        imageUrl: "",
        projectUrl: "",
        tags: [],
        featured: false,
      },
    ]);
  };

  const updatePortfolioItem = (index: number, field: keyof PortfolioItem, value: unknown) => {
    setPortfolio((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value } as PortfolioItem;
      return updated;
    });
  };

  const removePortfolioItem = (index: number) => {
    setPortfolio(portfolio.filter((_, i) => i !== index));
  };

  const addTag = (index: number) => {
    if (!newTag.trim()) return;
    const item = portfolio[index];
    updatePortfolioItem(index, "tags", [...item.tags, newTag.trim()]);
    setNewTag("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Profile Settings</h2>
        <button
          onClick={activeTab === "profile" ? handleSaveProfile : handleSavePortfolio}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Tabs */}
      {saveMessage && (
        <div className={`p-3 rounded-lg text-sm ${saveMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {saveMessage.text}
        </div>
      )}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "profile" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveTab("portfolio")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "portfolio" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Portfolio ({portfolio.length})
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* Avatar */}
          <div className="rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Profile Photo</h3>
            <div className="flex items-center gap-6">
              <div className="relative">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name} className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                    {profile.name?.charAt(0) || "U"}
                  </div>
                )}
                <button className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90">
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>
              <div>
                <p className="text-sm font-medium">{profile.name || "Upload a photo"}</p>
                <p className="text-xs text-muted-foreground">JPG, PNG or GIF. Max 2MB.</p>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">Basic Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Full Name</label>
                <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <input type="email" value={profile.email} disabled className="mt-1 w-full rounded-lg border px-3 py-2 text-sm bg-muted" />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here</p>
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="+1 (555) 123-4567" />
              </div>
              <div>
                <label className="text-sm font-medium">Job Title</label>
                <input type="text" value={profile.jobTitle} onChange={(e) => setProfile({ ...profile, jobTitle: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="CEO, CTO, Developer..." />
              </div>
              <div>
                <label className="text-sm font-medium">Company</label>
                <input type="text" value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Location</label>
                <input type="text" value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="City, Country" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Bio</label>
              <textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" rows={3} placeholder="Tell us about yourself..." />
              <p className="text-xs text-muted-foreground mt-1">{profile.bio.length}/500 characters</p>
            </div>
            <div>
              <label className="text-sm font-medium">Website</label>
              <input type="url" value={profile.website} onChange={(e) => setProfile({ ...profile, website: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="https://yoursite.com" />
            </div>
          </div>

          {/* Social Links */}
          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">Social Links</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { label: "LinkedIn", key: "linkedin" as const, placeholder: "https://linkedin.com/in/..." },
                { label: "Twitter/X", key: "twitter" as const, placeholder: "https://twitter.com/..." },
                { label: "GitHub", key: "github" as const, placeholder: "https://github.com/..." },
                { label: "Dribbble", key: "dribbble" as const, placeholder: "https://dribbble.com/..." },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-sm font-medium">{field.label}</label>
                  <input type="url" value={profile.socialLinks[field.key]} onChange={(e) => setProfile({ ...profile, socialLinks: { ...profile.socialLinks, [field.key]: e.target.value } })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder={field.placeholder} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Tab */}
      {activeTab === "portfolio" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Showcase your best work to potential clients.</p>
            <button onClick={addPortfolioItem} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Add Project
            </button>
          </div>

          {portfolio.length === 0 && (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground">No portfolio items yet. Add your first project!</p>
            </div>
          )}

          {portfolio.map((item, index) => (
            <div key={item.id} className="rounded-lg border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Project {index + 1}</h3>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={item.featured} onChange={(e) => updatePortfolioItem(index, "featured", e.target.checked)} className="rounded" />
                    Featured
                  </label>
                  <button onClick={() => removePortfolioItem(index)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <input type="text" value={item.title} onChange={(e) => updatePortfolioItem(index, "title", e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Project title" />
                </div>
                <div>
                  <label className="text-sm font-medium">Project URL</label>
                  <input type="url" value={item.projectUrl} onChange={(e) => updatePortfolioItem(index, "projectUrl", e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="https://..." />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <div className="mt-1">
                  <HtmlEditor value={item.description} onChange={(html) => updatePortfolioItem(index, "description", html)} placeholder="Brief description" minHeight="60px" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Image URL</label>
                <input type="url" value={item.imageUrl} onChange={(e) => updatePortfolioItem(index, "imageUrl", e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="https://..." />
              </div>
              <div>
                <label className="text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {item.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {tag}
                      <button onClick={() => updatePortfolioItem(index, "tags", item.tags.filter((t) => t !== tag))} className="hover:text-destructive">×</button>
                    </span>
                  ))}
                  <div className="flex gap-1">
                    <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(index); } }} className="w-24 rounded-lg border px-2 py-1 text-xs" placeholder="Add tag" />
                    <button onClick={() => addTag(index)} className="text-xs text-primary hover:underline">Add</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
