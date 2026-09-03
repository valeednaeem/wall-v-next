"use client";

import { useEffect, useState } from "react";

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

      setEnabled(isEnabled);
      setWidgetUrl(isEnabled ? (url ?? null) : null);
    }

    loadConfig();
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

  // Don't render anything if disabled
  if (!enabled) return null;

  return null;
}
