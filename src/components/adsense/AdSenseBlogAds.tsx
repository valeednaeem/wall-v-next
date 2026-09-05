"use client";

import { useState, useEffect, useRef } from "react";

interface AdSenseSettings {
  enabled: boolean;
  publisherId: string;
  autoAdsEnabled: boolean;
  adUnits: {
    id: string;
    name: string;
    format: string;
    slot: string;
    size: string | { width: number; height: number };
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
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.adsense) {
          setSettings(d.data.adsense);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded || !settings?.enabled || !settings.publisherId) return;
    if (pushed.current) return;
    if (!adRef.current) return;

    const matchingUnit = settings.adUnits.find(
      (u) => u.enabled && u.placement === position
    );

    if (!matchingUnit && !settings.autoAdsEnabled) return;

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      (window.adsbygoogle as unknown[]).push({});
      pushed.current = true;
    } catch {
      // AdSense not ready yet
    }
  }, [loaded, settings, position]);

  if (!loaded || !settings?.enabled || !settings.publisherId) return null;

  const matchingUnit = settings.adUnits.find(
    (u) => u.enabled && u.placement === position
  );

  if (!matchingUnit && !settings.autoAdsEnabled) return null;

  const adSlot = matchingUnit?.slot || "";
  const adFormat = matchingUnit?.format || "auto";
  const adSize = matchingUnit?.size || "auto";

  return (
    <div className="my-6 flex justify-center" data-ad-position={position}>
      <ins
        ref={adRef}
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
