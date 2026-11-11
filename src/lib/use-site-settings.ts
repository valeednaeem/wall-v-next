"use client";

import { useState, useEffect } from "react";

interface SiteBranding {
  siteName: string;
  logo: string;
  favicon: string;
}

let cachedSettings: SiteBranding | null = null;
let fetchPromise: Promise<SiteBranding> | null = null;

function fetchSettings(): Promise<SiteBranding> {
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("/api/settings/public")
    .then((r) => r.json())
    .then((d) => {
      const settings: SiteBranding = {
        siteName: d.data?.siteName || "Wall-V",
        logo: d.data?.logo || "",
        favicon: d.data?.favicon || "",
      };
      cachedSettings = settings;
      return settings;
    })
    .catch(() => {
      const fallback: SiteBranding = { siteName: "Wall-V", logo: "/wall-v-logo-lg.png", favicon: "/wall-v-logo-lg.png" };
      cachedSettings = fallback;
      return fallback;
    });
  return fetchPromise;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteBranding>(
    cachedSettings || { siteName: "Wall-V", logo: "/wall-v-logo-lg.png", favicon: "/wall-v-logo-lg.png" }
  );

  useEffect(() => {
    if (cachedSettings) {
      setSettings(cachedSettings);
    } else {
      fetchSettings().then(setSettings);
    }
  }, []);

  return settings;
}
