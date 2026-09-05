"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { shouldLoadAdSense } from "@/lib/adsense-page-targeting";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

let scriptLoaded = false;

export default function AdSenseScript() {
  const [publisherId, setPublisherId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/settings/public");
        if (res.ok) {
          const data = await res.json();
          const adsense = data?.data?.adsense;
          if (adsense?.enabled && adsense?.publisherId) {
            setEnabled(true);
            setPublisherId(adsense.publisherId);
          }
        }
      } catch {
        // silent
      }
    }
    fetchConfig();
  }, []);

  useEffect(() => {
    if (enabled && publisherId) {
      window.adsbygoogle = window.adsbygoogle || [];
    }
  }, [enabled, publisherId]);

  if (!enabled || !publisherId) return null;
  if (!shouldLoadAdSense(pathname)) return null;

  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;

  if (scriptLoaded) return null;
  scriptLoaded = true;

  return (
    <Script
      id="google-adsense"
      strategy="lazyOnload"
      src={src}
      onError={() => {
        scriptLoaded = false;
      }}
    />
  );
}
