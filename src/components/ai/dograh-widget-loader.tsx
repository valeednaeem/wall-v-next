"use client";

import { useEffect } from "react";

export function DograhWidgetLoader() {
  useEffect(() => {
    const widgetUrl = process.env.NEXT_PUBLIC_DOGRAH_WIDGET_URL;
    if (!widgetUrl) return;

    const d = document;
    const s = "script";
    const id = "dograh-widget";

    if (d.getElementById(id)) return;

    const fjs = d.getElementsByTagName(s)[0];
    const js = d.createElement(s);
    js.id = id;
    js.src = widgetUrl;
    js.async = true;
    fjs.parentNode?.insertBefore(js, fjs);
  }, []);

  return null;
}
