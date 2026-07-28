"use client";

import { useEffect } from "react";

export function DograhWidgetLoader() {
  useEffect(() => {
    const widgetUrl = process.env.NEXT_PUBLIC_DOGRAH_WIDGET_URL;
    console.log("[Dograh] Loader running — URL:", widgetUrl);
    if (!widgetUrl) {
      console.warn("[Dograh] NEXT_PUBLIC_DOGRAH_WIDGET_URL not set");
      return;
    }

    const d = document;
    const s = "script";
    const id = "dograh-widget";

    if (d.getElementById(id)) {
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
  }, []);

  return null;
}
