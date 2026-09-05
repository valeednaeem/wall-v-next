"use client";

import { useState, useEffect } from "react";

interface AdSenseSettings {
  enabled: boolean;
  publisherId: string;
  autoAds: {
    enabled: boolean;
    inArticleAds: boolean;
  };
  adUnits: {
    id: string;
    name: string;
    format: string;
    slot: string;
    size: string;
    placement: string;
    enabled: boolean;
  }[];
}

interface AdSenseBlogAdsProps {
  position: "top" | "middle" | "bottom" | "sidebar";
}

export function AdSenseBlogAds({ position }: AdSenseBlogAdsProps) {
  const [settings, setSettings] = useState<AdSenseSettings | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings/public?category=adsense")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.adsense) {
          setSettings(d.data.adsense);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || !settings?.enabled || !settings.publisherId) return null;

  const matchingUnit = settings.adUnits.find(
    (u) => u.enabled && u.placement === position
  );

  if (!matchingUnit && !settings.autoAds.enabled) return null;

  const adSlot = matchingUnit?.slot || "";
  const adFormat = matchingUnit?.format || "auto";
  const adSize = matchingUnit?.size || "auto";

  if (typeof window !== "undefined" && (window as { adsbygoogle?: unknown[] }).adsbygoogle) {
    try {
      (window as { adsbygoogle: unknown[] }).adsbygoogle.push({});
    } catch {
      // AdSense not ready yet
    }
  }

  return (
    <div className="my-6 flex justify-center" data-ad-position={position}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={settings.publisherId}
        data-ad-slot={adSlot || undefined}
        data-ad-format={adFormat === "auto" ? "auto" : undefined}
        data-full-width-responsive={adSize === "auto" ? "true" : "false"}
      />
    </div>
  );
}
