"use client";

import { useEffect } from "react";

interface AdSenseScriptLoaderProps {
  publisherId: string;
  autoAds?: boolean;
}

export function AdSenseScriptLoader({ publisherId, autoAds = false }: AdSenseScriptLoaderProps) {
  useEffect(() => {
    if (!publisherId) return;

    const existing = document.querySelector(`script[src*="adsbygoogle"][data-client="${publisherId}"]`);
    if (existing) return;

    const script = document.createElement("script");
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
    script.async = true;
    script.setAttribute("data-client", publisherId);
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);

    if (autoAds) {
      const autoScript = document.createElement("script");
      autoScript.textContent = `(adsbygoogle = window.adsbygoogle || []).push({ google_ad_client: "${publisherId}", enable_page_level_ads: true });`;
      document.head.appendChild(autoScript);
    }
  }, [publisherId, autoAds]);

  return null;
}
