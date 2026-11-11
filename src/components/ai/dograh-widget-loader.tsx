"use client";

import { useEffect, useState } from "react";
import { DOGRAH_WIDGET_READY_EVENT, validateDograhWidgetUrl } from "@/lib/dograh-widget";

export function DograhWidgetLoader() {
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean>(true);

  useEffect(() => {
    async function loadConfig() {
      let url = process.env.NEXT_PUBLIC_DOGRAH_WIDGET_URL;
      let isEnabled = true;

      try {
        const res = await fetch("/api/settings/public");
        if (res.ok) {
          const data = await res.json();
          const voice = data?.data?.voice;
          if (voice) {
            isEnabled = voice.enabled ?? true;
            if (voice.widgetUrl) {
              url = voice.widgetUrl;
            }
          }
        }
      } catch {
        // Fallback to env var
      }

      const isProduction = window.location.protocol === "https:" && !["localhost", "127.0.0.1"].includes(window.location.hostname);
      const validation = validateDograhWidgetUrl(url, { production: isProduction });
      if (!validation.valid) {
        console.error("[Dograh] Widget configuration unavailable:", validation.reason);
      }

      setEnabled(isEnabled);
      setWidgetUrl(isEnabled && validation.valid ? (url || "").trim() : null);
    }

    loadConfig();
  }, []);

  useEffect(() => {
    if (!widgetUrl) return;

    const d = document;
    const s = "script";
    const id = "dograh-widget";

    if (d.getElementById(id) || window.DograhWidget) {
      console.log("[Dograh] Widget script already loaded");
      return;
    }

    const fjs = d.getElementsByTagName(s)[0];
    const js = d.createElement(s);
    js.id = id;
    js.src = widgetUrl;
    js.setAttribute("data-dograh-context", JSON.stringify({
      page_url: window.location.href,
      today: new Date().toISOString().slice(0, 10),
    }));
    js.async = true;
    js.onload = () => {
      console.log("[Dograh] Widget script DOM loaded");
      const startedAt = Date.now();
      const readyCheck = window.setInterval(() => {
        if (window.DograhWidget || Date.now() - startedAt >= 8000) {
          window.clearInterval(readyCheck);
          if (window.DograhWidget) {
            window.dispatchEvent(new Event(DOGRAH_WIDGET_READY_EVENT));
          }
        }
      }, 50);
    };
    js.onerror = () => console.error("[Dograh] Widget script failed to load. Verify the generated Dograh URL and Allowed Domains.");
    fjs.parentNode?.insertBefore(js, fjs);
    console.log("[Dograh] Widget script tag injected");
  }, [widgetUrl]);

  // Don't render anything if disabled
  if (!enabled) return null;

  return null;
}
