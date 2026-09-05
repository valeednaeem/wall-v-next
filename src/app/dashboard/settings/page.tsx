"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Globe, Search, Eye, EyeOff, Loader2, Upload, X, Image, MapPin, DollarSign } from "lucide-react";
import Link from "next/link";
import HtmlEditor from "@/components/editor/html-editor";

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  logo: string;
  favicon: string;
}

interface SEOSettings {
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  googleSearchConsole: string;
}

interface VoiceAgentSettings {
  enabled: boolean;
  widgetUrl: string;
  agentId: string;
  position: "bottom-left" | "bottom-right";
  buttonColor: string;
  buttonText: string;
  allowedDomains: string[];
  systemPrompt: string;
}

interface LocationSettings {
  email: string;
  phone: string;
  businessHours: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: string;
  longitude: string;
}

export default function GeneralSettingsPage() {
  const [activeTab, setActiveTab] = useState<"site" | "seo" | "voice" | "contact">("site");
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [site, setSite] = useState<SiteSettings>({
    siteName: "Wall-V",
    siteDescription: "AI-Powered Digital Agency — Web Development, AI Automation, ERP/CRM, Hosting & More",
    siteUrl: "https://wall-v.com",
    logo: "",
    favicon: "",
  });

  const [seo, setSeo] = useState<SEOSettings>({
    metaTitle: "Wall-V | AI-Powered Digital Agency",
    metaDescription: "Transform your business with AI-powered web development, mobile apps, ERP/CRM solutions, and cloud hosting.",
    ogImage: "",
    googleSearchConsole: "",
  });

  const [voice, setVoice] = useState<VoiceAgentSettings>({
    enabled: true,
    widgetUrl: "https://cdn.dograh.com/widget.js",
    agentId: "",
    position: "bottom-left",
    buttonColor: "#7c3aed",
    buttonText: "Talk to AI",
    allowedDomains: [],
    systemPrompt: `You are Wall-V's AI voice assistant. Your job is to welcome every visitor, help them, and collect their details so we can create their account and follow up.

GREETING:
When a visitor starts a call, greet them warmly: "Welcome to Wall-V! I'm your AI assistant. How can I help you today?"

INFORMATION COLLECTION (do this naturally, not all at once):
Early in the conversation, collect the following details. Weave them into the conversation naturally — don't interrogate them. Aim to collect all of these by the end of the call:

1. FULL NAME — "By the way, what's your name?" (ask early)
2. EMAIL ADDRESS — "What's the best email to reach you at?" (ask after understanding their need)
3. PHONE NUMBER — "And a phone number, just in case we need to follow up?" (ask naturally)
4. COMPANY NAME — "Are you working with a company, or is this a personal project?" (if relevant)
5. PROJECT TYPE — What do they need? (website, mobile app, AI chatbot, CRM, hosting, etc.)
6. BUDGET RANGE — "Just so I can point you in the right direction, what's your budget looking like for this?" (e.g. under $1k, $1k-$5k, $5k-$10k, $10k+)
7. TIMELINE — "When are you looking to get this done?" (ASAP, 1-2 weeks, 1 month, 2-3 months, flexible)

PERSONALIZATION:
Once you learn the caller's name, use it naturally 1-2 times during the conversation — for example when making a recommendation or summarizing. Example: "That sounds great, John — let me put together some options for you." Don't overuse it — just enough to feel personal and build rapport.

YOUR CAPABILITIES:
- Guide visitors to pages: /services, /hosting-domain, /products, /portfolio, /blog, /contact, /voice-agent
- Explain our services: AI Automation, Web Development, Mobile Apps, Hosting, ERP/CRM, Digital Marketing
- Share pricing: Hosting plans start at $6.99/mo, projects from $499
- Help start a project: collect requirements and create an account
- Answer FAQs about the company

NAVIGATION HELPERS:
When a visitor wants to see something, tell them the URL and what they'll find:
- "Visit /services to see all our offerings"
- "Check out /hosting-domain for hosting plans starting at $6.99/month"
- "Our portfolio is at /portfolio — see our recent work"
- "Go to /blog for the latest articles and updates"
- "Visit /contact to reach our team"

SUMMARY:
Before ending the call, confirm what you collected:
- "Just to confirm, [Name] at [Email], [Phone] — you're looking for a [project type] with a [budget] budget, ready by [timeline]. Is that right?"
This summary helps ensure accuracy for account creation.

BEHAVIOR:
- Be friendly, warm, and professional
- Keep responses short (2-3 sentences max for voice)
- Speak naturally, like a helpful colleague
- If unsure, offer to connect them with the team via /contact
- Always be enthusiastic about helping
- Never make up information — if they don't provide something, note it as unknown`,
  });

  const [location, setLocation] = useState<LocationSettings>({
    email: "info@wall-v.com",
    phone: "+92 300 1234567",
    businessHours: "Monday - Friday: 9:00 AM - 6:00 PM\nSaturday: 10:00 AM - 2:00 PM",
    addressLine1: "1692, B Block, Master City Housing Society",
    addressLine2: "Near Peoples Colony",
    city: "Gujranwala",
    state: "Punjab",
    postalCode: "52250",
    country: "Pakistan",
    latitude: "32.1878",
    longitude: "74.1945",
  });

  useEffect(() => {
    fetch("/api/settings/general")
      .then((r) => {
        if (r.status === 401) { window.location.href = "/login?callbackUrl=/dashboard/settings"; return null; }
        return r.json();
      })
      .then((d) => {
        if (d?.success && d.data) {
          if (d.data.site) setSite((prev) => ({ ...prev, ...d.data.site }));
          if (d.data.seo) setSeo((prev) => ({ ...prev, ...d.data.seo }));
          if (d.data.voice) setVoice((prev) => ({ ...prev, ...d.data.voice }));
          if (d.data.contact) setLocation((prev) => ({ ...prev, ...d.data.contact }));
        }
      })
      .catch(() => {});
  }, []);

  const toggleSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/settings/general", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site, seo, voice, contact: location }),
      });
      if (res.status === 401) { window.location.href = "/login?callbackUrl=/dashboard/settings"; return; }
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage({ type: "success", text: "Settings saved successfully" });
      } else {
        setSaveMessage({ type: "error", text: data.error || "Failed to save settings" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "Network error. Please try again." });
    }
    setSaving(false);
  };

  const tabs = [
    { id: "site" as const, label: "Site", icon: Globe },
    { id: "seo" as const, label: "SEO", icon: Search },
    { id: "voice" as const, label: "Voice Agent", icon: Globe },
    { id: "contact" as const, label: "Contact & Map", icon: MapPin },
  ];

  const ImageUpload = ({ label, value, onChange, accept = "image/*", description }: { label: string; value: string; onChange: (v: string) => void; accept?: string; description?: string }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        if (data.success && data.data.url) {
          onChange(data.data.url);
        }
      } catch (err) {
        console.error("Upload failed:", err);
      }
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
      <div>
        <label className="text-sm font-medium">{label}</label>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        <div className="mt-2 flex items-start gap-4">
          {value ? (
            <div className="relative group">
              <img src={value} alt={label} className="h-20 w-20 rounded-lg border object-contain bg-white" />
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed hover:border-primary/50 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground mt-1">Upload</span>
                </>
              )}
            </button>
          )}
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
            >
              <Image className="h-4 w-4" />
              {value ? "Change Image" : "Choose Image"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const SecretInput = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => {
    const fieldKey = label.replace(/\s/g, "");
    return (
      <div>
        <label className="text-sm font-medium">{label}</label>
        <div className="relative mt-1">
          <input
            type={showSecrets[fieldKey] ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm pr-10"
            placeholder={placeholder}
          />
          <button type="button" onClick={() => toggleSecret(fieldKey)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded">
            {showSecrets[fieldKey] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">General Settings</h2>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/monetization"
            className="inline-flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
          >
            <DollarSign className="h-4 w-4" />
            Monetization
          </Link>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      {saveMessage && (
        <div className={`p-3 rounded-lg text-sm ${saveMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {saveMessage.text}
        </div>
      )}
      <div className="flex gap-1 border-b overflow-x-auto">
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
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Site Settings */}
      {activeTab === "site" && (
        <div className="space-y-6">
          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">Site Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Site Name</label>
                <input type="text" value={site.siteName} onChange={(e) => setSite({ ...site, siteName: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Site URL</label>
                <input type="url" value={site.siteUrl} onChange={(e) => setSite({ ...site, siteUrl: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Site Description</label>
              <div className="mt-1">
                <HtmlEditor value={site.siteDescription} onChange={(html) => setSite({ ...site, siteDescription: html })} placeholder="About your site..." minHeight="100px" />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">Branding</h3>
            <p className="text-sm text-muted-foreground">
              Manage your site favicon (shown in browser tabs) and logo (shown in header and footer).
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <ImageUpload
                label="Favicon"
                value={site.favicon}
                onChange={(v) => setSite({ ...site, favicon: v })}
                accept="image/png,image/svg+xml,image/x-icon"
                description="Recommended: 32x32 or 64x64 PNG/SVG. This appears in browser tabs."
              />
              <ImageUpload
                label="Site Logo"
                value={site.logo}
                onChange={(v) => setSite({ ...site, logo: v })}
                accept="image/png,image/svg+xml,image/webp,image/jpeg"
                description="Shown in the header and footer. SVG or PNG recommended."
              />
            </div>
          </div>
        </div>
      )}

      {/* SEO Settings */}
      {activeTab === "seo" && (
        <div className="space-y-6">
          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">Meta Tags</h3>
            <div>
              <label className="text-sm font-medium">Default Meta Title</label>
              <input type="text" value={seo.metaTitle} onChange={(e) => setSeo({ ...seo, metaTitle: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              <p className="text-xs text-muted-foreground mt-1">{seo.metaTitle.length}/60 characters</p>
            </div>
            <div>
              <label className="text-sm font-medium">Default Meta Description</label>
              <textarea value={seo.metaDescription} onChange={(e) => setSeo({ ...seo, metaDescription: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" rows={3} />
              <p className="text-xs text-muted-foreground mt-1">{seo.metaDescription.length}/160 characters</p>
            </div>
            <div>
              <label className="text-sm font-medium">OG Image URL</label>
              <input type="url" value={seo.ogImage} onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="https://wall-v.com/og-image.png" />
            </div>
          </div>

          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">Verification</h3>
            <div>
              <SecretInput label="Google Search Console" value={seo.googleSearchConsole} onChange={(v) => setSeo({ ...seo, googleSearchConsole: v })} placeholder="Verification code" />
            </div>
          </div>
        </div>
      )}

      {/* Voice Agent */}
      {activeTab === "voice" && (
        <div className="space-y-6">
          <div className="rounded-lg border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Dograh AI Voice Agent</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add a voice AI agent to your website. Visitors can speak naturally to get answers about your services.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={voice.enabled} onChange={(e) => setVoice({ ...voice, enabled: e.target.checked })} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {voice.enabled && (
              <div className="space-y-4 pt-4 border-t">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <p className="font-medium">Setup Instructions</p>
                  <ol className="mt-2 space-y-1 list-decimal list-inside text-xs">
                    <li>Deploy Dograh via Docker: <code className="bg-blue-100 px-1 rounded">docker compose -f docker-compose.sip.yaml up -d</code></li>
                    <li>Create an agent at <code className="bg-blue-100 px-1 rounded">your-dograh-instance.com/workflow</code></li>
                    <li>Configure the widget in Agent Settings → Add to Website</li>
                    <li>Paste the widget script URL below</li>
                  </ol>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Widget Script URL</label>
                    <input type="url" value={voice.widgetUrl} onChange={(e) => setVoice({ ...voice, widgetUrl: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="https://your-dograh-instance.com/widget.js" />
                    <p className="text-xs text-muted-foreground mt-1">The script URL from your Dograh dashboard → Agent Settings → Add to Website</p>
                  </div>
                  <SecretInput label="Agent ID" value={voice.agentId} onChange={(v) => setVoice({ ...voice, agentId: v })} placeholder="Optional — for API management" />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Button Position</label>
                    <select value={voice.position} onChange={(e) => setVoice({ ...voice, position: e.target.value as "bottom-left" | "bottom-right" })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Button Text</label>
                    <input type="text" value={voice.buttonText} onChange={(e) => setVoice({ ...voice, buttonText: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Talk to AI" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Button Color</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="color" value={voice.buttonColor} onChange={(e) => setVoice({ ...voice, buttonColor: e.target.value })} className="h-10 w-10 rounded border cursor-pointer" />
                      <input type="text" value={voice.buttonColor} onChange={(e) => setVoice({ ...voice, buttonColor: e.target.value })} className="flex-1 rounded-lg border px-3 py-2 text-sm font-mono" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Agent System Prompt</label>
                  <textarea
                    value={voice.systemPrompt}
                    onChange={(e) => setVoice({ ...voice, systemPrompt: e.target.value })}
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono min-h-[200px]"
                    placeholder="You are Wall-V's AI voice assistant..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This prompt is automatically passed to the voice agent as instructions when a call starts. The agent will follow these instructions — it will NOT read them aloud. Include navigation helpers, service descriptions, tone, and information collection goals.
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                  <p className="font-medium">How the prompt works</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
                    <li>The prompt is sent to the agent as <code className="bg-green-100 px-1 rounded">system_prompt</code> context when a call connects</li>
                    <li>The agent follows it as instructions — it does NOT read it aloud to the caller</li>
                    <li>Edit the prompt above and click Save — changes take effect on the next call</li>
                    <li>You can test by calling from the <code className="bg-green-100 px-1 rounded">/voice-agent</code> page</li>
                  </ul>
                </div>

                <div>
                  <label className="text-sm font-medium">Allowed Domains</label>
                  <input type="text" value={voice.allowedDomains.join(", ")} onChange={(e) => setVoice({ ...voice, allowedDomains: e.target.value.split(",").map((d) => d.trim()).filter(Boolean) })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="wall-v.com, your-domain.com" />
                  <p className="text-xs text-muted-foreground mt-1">Comma-separated. Leave empty to allow all domains.</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <p className="font-medium">Voice Agent Page</p>
                  <p className="mt-1">
                    A dedicated voice agent page is available at <code className="bg-blue-100 px-1 rounded">/voice-agent</code> with an inline voice panel.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact & Map */}
      {activeTab === "contact" && (
        <div className="space-y-6">
          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">Contact Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <input type="email" value={location.email} onChange={(e) => setLocation({ ...location, email: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Phone</label>
                <input type="text" value={location.phone} onChange={(e) => setLocation({ ...location, phone: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Business Hours</label>
              <textarea value={location.businessHours} onChange={(e) => setLocation({ ...location, businessHours: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" rows={2} />
            </div>
          </div>

          <div className="rounded-lg border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Business Location</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              This is the single source of truth for Wall-V&apos;s location. The Contact page map updates automatically when you save changes here.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Address Line 1</label>
                <input type="text" value={location.addressLine1} onChange={(e) => setLocation({ ...location, addressLine1: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Street address, building, suite" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Address Line 2</label>
                <input type="text" value={location.addressLine2} onChange={(e) => setLocation({ ...location, addressLine2: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Landmark, area (optional)" />
              </div>
              <div>
                <label className="text-sm font-medium">City</label>
                <input type="text" value={location.city} onChange={(e) => setLocation({ ...location, city: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">State / Province</label>
                <input type="text" value={location.state} onChange={(e) => setLocation({ ...location, state: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Postal / ZIP Code</label>
                <input type="text" value={location.postalCode} onChange={(e) => setLocation({ ...location, postalCode: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium">Country</label>
                <input type="text" value={location.country} onChange={(e) => setLocation({ ...location, country: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-sm font-medium">Latitude</label>
                <input type="text" value={location.latitude} onChange={(e) => setLocation({ ...location, latitude: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono" placeholder="e.g. 32.1878" />
                <p className="text-xs text-muted-foreground mt-1">Range: -90 to 90</p>
              </div>
              <div>
                <label className="text-sm font-medium">Longitude</label>
                <input type="text" value={location.longitude} onChange={(e) => setLocation({ ...location, longitude: e.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono" placeholder="e.g. 74.1945" />
                <p className="text-xs text-muted-foreground mt-1">Range: -180 to 180</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium">How to find coordinates</p>
              <p className="mt-1 text-xs">
                Open <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Google Maps</a>, right-click the location, and select &quot;What&apos;s here?&quot; to copy latitude and longitude.
              </p>
            </div>
          </div>

          {/* Map Preview */}
          <div className="rounded-lg border p-6 space-y-4">
            <h3 className="font-semibold">Location Preview</h3>
            <p className="text-sm text-muted-foreground">This is how your location appears on the Contact page.</p>
            <div className="rounded-lg overflow-hidden border">
              <iframe
                src={(() => {
                  const lat = parseFloat(location.latitude);
                  const lng = parseFloat(location.longitude);
                  if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    return `https://maps.google.com/maps?q=${lat},${lng}&z=15&ie=UTF8&iwloc=&output=embed`;
                  }
                  const fullAddress = [location.addressLine1, location.addressLine2, location.city, location.state, location.postalCode, location.country].filter(Boolean).join(", ");
                  return `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress || "Gujranwala, Pakistan")}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
                })()}
                width="100%"
                height="300"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Business Location Preview"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium">Full address: {[location.addressLine1, location.addressLine2, location.city, location.state, location.postalCode, location.country].filter(Boolean).join(", ")}</p>
              <p>Coordinates: {location.latitude || "—"}, {location.longitude || "—"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
