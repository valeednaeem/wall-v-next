"use client";

import { useState, useEffect } from "react";
import { X, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
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
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });
  const [geoRegion, setGeoRegion] = useState<string>("");

  useEffect(() => {
    const existing = getConsentCookie();
    if (existing) {
      setPreferences(existing);
      return;
    }

    // Detect region from timezone/language for GDPR relevance
    let isEU = false;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const lang = navigator.language;
      isEU = EU_COUNTRIES.some(c => lang.includes(c) || tz.includes(c));
      if (isEU) {
        setGeoRegion("EU");
      }
    } catch {}

    // Show banner for first-time visitors
    setVisible(true);
  }, []);

  const handleAcceptAll = () => {
    const prefs = { necessary: true, analytics: true, marketing: true };
    setPreferences(prefs);
    setConsentCookie(prefs);
    setVisible(false);
  };

  const handleRejectAll = () => {
    const prefs = { necessary: true, analytics: false, marketing: false };
    setPreferences(prefs);
    setConsentCookie(prefs);
    setVisible(false);
  };

  const handleSavePreferences = () => {
    setConsentCookie(preferences);
    setVisible(false);
    setShowSettings(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-4 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white border shadow-2xl p-5 sm:p-6">
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

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 cursor-not-allowed">
                <input type="checkbox" checked disabled className="mt-0.5 rounded border-gray-300" />
                <div>
                  <p className="text-xs font-medium">Strictly Necessary</p>
                  <p className="text-[11px] text-muted-foreground">Required for the site to function. Cannot be disabled.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences(p => ({ ...p, analytics: e.target.checked }))}
                  className="mt-0.5 rounded border-gray-300"
                />
                <div>
                  <p className="text-xs font-medium">Analytics</p>
                  <p className="text-[11px] text-muted-foreground">Help us understand how visitors interact with our website.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(e) => setPreferences(p => ({ ...p, marketing: e.target.checked }))}
                  className="mt-0.5 rounded border-gray-300"
                />
                <div>
                  <p className="text-xs font-medium">Marketing</p>
                  <p className="text-[11px] text-muted-foreground">Used to deliver personalized ads and track campaign performance.</p>
                </div>
              </label>
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
