"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

interface GAConfig {
  measurementId: string;
  debugMode?: boolean;
  consentMode?: "default" | "advanced";
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

  // Fetch GA configuration from API
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
              consentMode: data.data.consentMode,
              enabled: data.data.enabled,
            });
          }
        }
      } catch (error) {
        console.warn("Failed to fetch GA config:", error);
      }
    }
    fetchConfig();
  }, []);

  // Check cookie consent for analytics
  useEffect(() => {
    function checkConsent() {
      if (typeof document === "undefined") return;
      try {
        const match = document.cookie.match(/cookie_consent=([^;]+)/);
        if (match) {
          const prefs = JSON.parse(decodeURIComponent(match[1]));
          // Check if analytics consent is granted
          const granted = prefs.analytics === true || prefs.marketing === true;
          setConsentGranted(granted);
        } else {
          setConsentGranted(false);
        }
      } catch {
        setConsentGranted(false);
      }
    }
    checkConsent();
    // Listen for consent changes from cookie consent component
    const handleConsentChange = (e: CustomEvent) => {
      const prefs = e.detail;
      const granted = prefs.analytics === true || prefs.marketing === true;
      setConsentGranted(granted);
    };
    window.addEventListener("cookie-consent-change", handleConsentChange as EventListener);
    // Also listen for storage changes (cross-tab)
    window.addEventListener("storage", checkConsent);
    return () => {
      window.removeEventListener("cookie-consent-change", handleConsentChange as EventListener);
      window.removeEventListener("storage", checkConsent);
    };
  }, []);

  // Initialize gtag when config is loaded and consent is granted
  useEffect(() => {
    if (!config || !config.enabled || !config.measurementId) return;
    if (!consentGranted) return;
    if (initialized) return;

    // Initialize dataLayer and gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());

    // Update consent based on user preference
    window.gtag("consent", "update", {
      analytics_storage: consentGranted ? "granted" : "denied",
      ad_storage: consentGranted ? "granted" : "denied",
      ad_user_data: consentGranted ? "granted" : "denied",
      ad_personalization: consentGranted ? "granted" : "denied",
    });

    // Configure GA4
    window.gtag("config", config.measurementId, {
      debug_mode: config.debugMode || false,
      send_page_view: false, // We'll send page views manually for SPA navigation
    });

    setInitialized(true);
    // Send initial page view
    sendPageView(pathname, searchParams?.toString());
  }, [config, consentGranted, initialized]);

  // Track page views on navigation
  useEffect(() => {
    if (!config || !config.enabled || !consentGranted || !window.gtag || !initialized) return;
    sendPageView(pathname, searchParams?.toString());
  }, [pathname, searchParams, config, consentGranted, initialized]);

  // Update consent mode when consent changes after initialization
  useEffect(() => {
    if (!config || !config.enabled || !config.measurementId || !initialized || !window.gtag) return;
    window.gtag("consent", "update", {
      analytics_storage: consentGranted ? "granted" : "denied",
      ad_storage: consentGranted ? "granted" : "denied",
      ad_user_data: consentGranted ? "granted" : "denied",
      ad_personalization: consentGranted ? "granted" : "denied",
    });
  }, [consentGranted, config, initialized]);

  const sendPageView = (path: string, search?: string) => {
    if (!window.gtag || !config?.measurementId) return;
    const url = search ? `${path}?${search}` : path;
    window.gtag("event", "page_view", {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
    });
  };

  // Only render the script if we have config and it's enabled
  if (!config || !config.enabled || !config.measurementId) {
    return null;
  }

  return (
    <>
      {/* Google tag (gtag.js) - loads async */}
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${config.measurementId}`}
      />
      {/* Inline initialization script */}
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              analytics_storage: 'denied',
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              wait_for_update: 500,
            });
            gtag('js', new Date());
          `,
        }}
      />
    </>
  );
}

// Client-side function to send custom events to GA4
export function sendGAEvent(eventName: string, parameters?: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", eventName, parameters);
}

// Client-side function to send e-commerce events
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

// Client-side function to send conversion events
export function sendGAConversion(eventName: string, value?: number, currency = "USD") {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", eventName, {
    value,
    currency,
  });
}