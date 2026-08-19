"use client";

import { useState, useEffect } from "react";
import { X, Settings, Shield } from "lucide-react";

interface CookieCategory {
  _id: string;
  name: string;
  slug: string;
  description: string;
  isRequired: boolean;
  defaultEnabled: boolean;
  cookies: CookieItem[];
}

interface CookieItem {
  _id: string;
  name: string;
  description: string;
  provider: string;
  duration: string;
  type: string;
  isRequired: boolean;
  purpose: string;
}

interface CookiePreferences {
  [categorySlug: string]: boolean;
}

function getConsentCookie(): CookiePreferences | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/cookie_consent=([^;]+)/);
  if (match) {
    try { return JSON.parse(decodeURIComponent(match[1])); } catch { return null; }
  }
  return null;
}

function setConsentCookie(prefs: CookiePreferences) {
  const value = encodeURIComponent(JSON.stringify(prefs));
  document.cookie = `cookie_consent=${value}; path=/; max-age=${365 * 24 * 60 * 60}; SameSite=Lax`;
}

const EU_COUNTRIES = ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","GB","IS","NO","LI","CH"];

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [categories, setCategories] = useState<CookieCategory[]>([]);
  const [preferences, setPreferences] = useState<CookiePreferences>({});
  const [loading, setLoading] = useState(true);
  const [geoRegion, setGeoRegion] = useState<string>("");

  useEffect(() => {
    const existing = getConsentCookie();
    if (existing) {
      setPreferences(existing);
      return;
    }

    let isEU = false;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const lang = navigator.language;
      isEU = EU_COUNTRIES.some(c => lang.includes(c) || tz.includes(c));
      if (isEU) setGeoRegion("EU");
    } catch {}

    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const res = await fetch("/api/legal/public/cookies");
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setCategories(data.data);
        const defaultPrefs: CookiePreferences = {};
        data.data.forEach((cat: CookieCategory) => {
          defaultPrefs[cat.slug] = cat.isRequired || cat.defaultEnabled;
        });
        setPreferences(defaultPrefs);
        setVisible(true);
      }
    } catch (error) {
      console.error("Failed to load cookie categories:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleAcceptAll = () => {
    const prefs: CookiePreferences = {};
    categories.forEach((cat) => { prefs[cat.slug] = true; });
    setPreferences(prefs);
    setConsentCookie(prefs);
    setVisible(false);
  };

  const handleRejectAll = () => {
    const prefs: CookiePreferences = {};
    categories.forEach((cat) => { prefs[cat.slug] = cat.isRequired; });
    setPreferences(prefs);
    setConsentCookie(prefs);
    setVisible(false);
  };

  const handleSavePreferences = () => {
    setConsentCookie(preferences);
    setVisible(false);
    setShowSettings(false);
    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent("cookie-consent-change", { detail: preferences }));
  };

  if (loading || !visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-4 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white border shadow-2xl p-5 sm:p-6 max-h-[80vh] overflow-y-auto">
        {!showSettings ? (
          <>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Cookie Preferences</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  We use cookies to improve your experience, analyze site traffic, and serve personalized content.
                  You can manage your preferences below.
                  {geoRegion && (
                    <span className="block mt-1 text-primary font-medium">
                      Your region ({geoRegion}) requires cookie consent.
                    </span>
                  )}
                </p>
              </div>
              <button onClick={handleRejectAll} className="p-1 hover:bg-muted rounded-lg transition-colors shrink-0">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleAcceptAll}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Accept All
              </button>
              <button
                onClick={handleRejectAll}
                className="flex-1 rounded-lg border px-4 py-2.5 text-xs font-semibold hover:bg-muted transition-colors"
              >
                Reject Non-Essential
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="flex-1 rounded-lg border px-4 py-2.5 text-xs font-semibold hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
              >
                <Settings className="h-3.5 w-3.5" />
                Customize
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-semibold text-sm mb-4">Cookie Settings</h3>

            <div className="space-y-4">
              {categories.map((cat) => (
                <div key={cat._id} className="rounded-lg bg-muted/50 p-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences[cat.slug] || false}
                      onChange={(e) => {
                        if (!cat.isRequired) {
                          setPreferences((p) => ({ ...p, [cat.slug]: e.target.checked }));
                        }
                      }}
                      disabled={cat.isRequired}
                      className="mt-0.5 rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-medium">{cat.name}</p>
                      <p className="text-[11px] text-muted-foreground">{cat.description}</p>
                      {cat.cookies && cat.cookies.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-[11px] text-primary cursor-pointer hover:underline">
                            View {cat.cookies.length} cookie{cat.cookies.length !== 1 ? "s" : ""}
                          </summary>
                          <div className="mt-2 space-y-1.5">
                            {cat.cookies.map((cookie) => (
                              <div key={cookie._id} className="text-[10px] border rounded p-2 bg-white">
                                <div className="flex justify-between">
                                  <span className="font-medium">{cookie.name}</span>
                                  <span className="text-muted-foreground">{cookie.duration}</span>
                                </div>
                                <p className="text-muted-foreground mt-0.5">{cookie.purpose}</p>
                                <p className="text-muted-foreground">Provider: {cookie.provider}</p>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </label>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSavePreferences}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Save Preferences
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="rounded-lg border px-4 py-2.5 text-xs font-semibold hover:bg-muted transition-colors"
              >
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
