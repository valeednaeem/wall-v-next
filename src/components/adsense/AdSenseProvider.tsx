"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface AdSenseAdUnit {
  id: string;
  name: string;
  slot: string;
  format: "display" | "in-article" | "in-feed" | "matched-content" | "multiplex";
  size: { width: number; height: number } | "fluid";
  enabled: boolean;
}

interface AdSenseContextValue {
  enabled: boolean;
  publisherId: string;
  autoAdsEnabled: boolean;
  adUnits: AdSenseAdUnit[];
  isLoaded: boolean;
}

const AdSenseContext = createContext<AdSenseContextValue>({
  enabled: false,
  publisherId: "",
  autoAdsEnabled: false,
  adUnits: [],
  isLoaded: false,
});

export function useAdSense() {
  return useContext(AdSenseContext);
}

export function AdSenseProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Omit<AdSenseContextValue, "isLoaded">>({
    enabled: false,
    publisherId: "",
    autoAdsEnabled: false,
    adUnits: [],
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/settings/public");
        if (res.ok) {
          const data = await res.json();
          const adsense = data?.data?.adsense;
          if (adsense) {
            setConfig({
              enabled: adsense.enabled ?? false,
              publisherId: adsense.publisherId ?? "",
              autoAdsEnabled: adsense.autoAdsEnabled ?? false,
              adUnits: adsense.adUnits ?? [],
            });
          }
        }
      } catch {
        // silent
      } finally {
        setIsLoaded(true);
      }
    }
    fetchConfig();
  }, []);

  return (
    <AdSenseContext.Provider value={{ ...config, isLoaded }}>
      {children}
    </AdSenseContext.Provider>
  );
}
