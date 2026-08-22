"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

interface GAConfig {
  measurementId: string;
  debugMode?: boolean;
  enabled: boolean;
}

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export function GoogleAnalytics() {
  const [config, setConfig] = useState<GAConfig | null>(null);
  const [consentGranted, setConsentGranted] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/marketing/google/services/analytics/public");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setConfig({
              measurementId: data.data.measurementId,
              debugMode: data.data.debugMode,
              enabled: data.data.enabled,
            });
          }
        }
      } catch {
        // silent
      }
    }
    fetchConfig();
  }, []);

  useEffect(() => {
    function checkConsent() {
      if (typeof document === "undefined") return;
      try {
        const match = document.cookie.match(/cookie_consent=([^;]+)/);
        if (match) {
          const prefs = JSON.parse(decodeURIComponent(match[1]));
          setConsentGranted(prefs.analytics === true || prefs.marketing === true);
        } else {
          setConsentGranted(false);
        }
      } catch {
        setConsentGranted(false);
      }
    }
    checkConsent();
    const handleConsentChange = (e: CustomEvent) => {
      const prefs = e.detail;
      setConsentGranted(prefs.analytics === true || prefs.marketing === true);
    };
    window.addEventListener("cookie-consent-change", handleConsentChange as EventListener);
    window.addEventListener("storage", checkConsent);
    return () => {
      window.removeEventListener("cookie-consent-change", handleConsentChange as EventListener);
      window.removeEventListener("storage", checkConsent);
    };
  }, []);

  useEffect(() => {
    if (!config || !config.enabled || !config.measurementId) return;
    if (!consentGranted) return;
    if (initialized) return;

    window.dataLayer = window.dataLayer || [];

    // Ensure gtag function exists (GTM may have already created it)
    if (!window.gtag) {
      window.gtag = function gtag() {
        window.dataLayer.push(arguments);
      };
    }

    // Update consent
    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });

    // Configure GA4
    window.gtag("config", config.measurementId, {
      debug_mode: config.debugMode || false,
      send_page_view: false,
    });

    setInitialized(true);
    sendPageView(pathname, searchParams?.toString());
  }, [config, consentGranted, initialized]);

  useEffect(() => {
    if (!config || !config.enabled || !consentGranted || !window.gtag || !initialized) return;
    sendPageView(pathname, searchParams?.toString());
  }, [pathname, searchParams, config, consentGranted, initialized]);

  useEffect(() => {
    if (!config || !config.enabled || !initialized || !window.gtag) return;
    window.gtag("consent", "update", {
      analytics_storage: consentGranted ? "granted" : "denied",
      ad_storage: consentGranted ? "granted" : "denied",
      ad_user_data: consentGranted ? "granted" : "denied",
      ad_personalization: consentGranted ? "granted" : "denied",
    });
  }, [consentGranted, config, initialized]);

  const sendPageView = (path: string, search?: string) => {
    if (!window.gtag || !config?.measurementId) return;
    window.gtag("event", "page_view", {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
    });
  };

  // GTM loads gtag.js — only render fallback script if GTM is NOT present
  const [gtmPresent, setGtmPresent] = useState(false);
  useEffect(() => {
    // Check if GTM already loaded gtag by checking dataLayer for gtm.js event
    const hasGtm = window.dataLayer?.some((item: unknown) => {
      const e = item as Record<string, unknown>;
      return e?.event === "gtm.js";
    });
    setGtmPresent(!!hasGtm);
  }, []);

  if (!config || !config.enabled || !config.measurementId) return null;
  if (gtmPresent) return null;

  return (
    <Script
      id="google-analytics"
      strategy="afterInteractive"
      src={`https://www.googletagmanager.com/gtag/js?id=${config.measurementId}`}
    />
  );
}

export function sendGAEvent(eventName: string, parameters?: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", eventName, parameters);
}

export function sendGAEcommerceEvent(
  eventName: "view_item" | "add_to_cart" | "remove_from_cart" | "begin_checkout" | "purchase" | "view_item_list" | "select_item",
  items: Array<{
    item_id: string;
    item_name: string;
    price: number;
    quantity: number;
    currency?: string;
    item_category?: string;
    item_variant?: string;
    item_brand?: string;
  }>,
  additionalParams?: Record<string, unknown>
) {
  if (typeof window === "undefined" || !window.gtag) return;

  const currency = items[0]?.currency || "USD";
  const value = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  window.gtag("event", eventName, {
    currency,
    value,
    items: items.map(item => ({
      item_id: item.item_id,
      item_name: item.item_name,
      price: item.price,
      quantity: item.quantity,
      item_category: item.item_category,
      item_variant: item.item_variant,
      item_brand: item.item_brand,
      currency,
    })),
    ...additionalParams,
  });
}

export function sendGAConversion(eventName: string, value?: number, currency = "USD") {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", eventName, {
    value,
    currency,
  });
}
