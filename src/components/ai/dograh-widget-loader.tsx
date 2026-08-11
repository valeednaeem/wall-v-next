"use client";

import { useEffect, useState } from "react";

export function DograhWidgetLoader() {
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadWidgetUrl() {
      let url = process.env.NEXT_PUBLIC_DOGRAH_WIDGET_URL;

      try {
        const res = await fetch("/api/settings/public");
        if (res.ok) {
          const data = await res.json();
          const dbUrl = data?.data?.voice?.widgetUrl;
          if (dbUrl) {
            url = dbUrl;
          }
        }
      } catch {
        // Fallback to env var
      }

      setWidgetUrl(url ?? null);
    }

    loadWidgetUrl();
  }, []);

  useEffect(() => {
    if (!widgetUrl) return;

    console.log("[Dograh] Loader running — URL:", widgetUrl);

    const d = document;
    const s = "script";
    const id = "dograh-widget-script";

    if (d.getElementById(id) || window.DograhWidget) {
      console.log("[Dograh] Widget script already loaded");
      return;
    }

    const fjs = d.getElementsByTagName(s)[0];
    const js = d.createElement(s);
    js.id = id;
    js.src = widgetUrl;
    js.async = true;
    js.onload = () => console.log("[Dograh] Widget script DOM loaded");
    js.onerror = () => console.error("[Dograh] Widget script failed to load:", widgetUrl);
    fjs.parentNode?.insertBefore(js, fjs);
    console.log("[Dograh] Widget script tag injected");
  }, [widgetUrl]);

  return null;
}
