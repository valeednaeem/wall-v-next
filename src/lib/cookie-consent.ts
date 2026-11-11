"use client";

/**
 * Cookie consent utilities
 * Provides a simple way to check consent status across the application
 */

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

export function getCookieConsent(): CookiePreferences {
  if (typeof window === "undefined") return {};
  return getConsentCookie() || {};
}

export function hasConsent(category: string): boolean {
  const prefs = getCookieConsent();
  return prefs[category] === true;
}

export function hasAnalyticsConsent(): boolean {
  const prefs = getCookieConsent();
  return prefs.analytics === true || prefs.marketing === true;
}

export function hasMarketingConsent(): boolean {
  const prefs = getCookieConsent();
  return prefs.marketing === true;
}

export function hasFunctionalConsent(): boolean {
  const prefs = getCookieConsent();
  return prefs.functional === true;
}

export function hasNecessaryConsent(): boolean {
  const prefs = getCookieConsent();
  return prefs.necessary === true;
}