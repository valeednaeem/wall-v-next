"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAdSense } from "./AdSenseProvider";
import { shouldLoadAdSense } from "@/lib/adsense-page-targeting";

interface AdSenseUnitProps {
  slot: string;
  format?: "display" | "in-article" | "in-feed" | "matched-content" | "multiplex";
  size?: { width: number; height: number } | "fluid";
  className?: string;
  style?: React.CSSProperties;
  responsive?: boolean;
}

export default function AdSenseUnit({
  slot,
  format = "display",
  size = "fluid",
  className = "",
  style,
  responsive = true,
}: AdSenseUnitProps) {
  const { enabled, publisherId } = useAdSense();
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);
  const pathname = usePathname();
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    setIsDev(process.env.NODE_ENV === "development");
  }, []);

  useEffect(() => {
    if (!enabled || !publisherId) return;
    if (!shouldLoadAdSense(pathname)) return;
    if (pushed.current) return;
    if (!adRef.current) return;

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      (window.adsbygoogle as unknown[]).push({});
      pushed.current = true;
    } catch {
      // AdSense not ready yet
    }
  }, [enabled, publisherId, pathname]);

  if (!enabled || !publisherId) return null;
  if (!shouldLoadAdSense(pathname)) return null;

  const insStyle: React.CSSProperties = {
    display: "block",
    ...style,
  };

  if (size === "fluid") {
    insStyle.width = "100%";
    insStyle.height = "auto";
  } else {
    insStyle.width = size.width;
    insStyle.height = size.height;
  }

  if (isDev) {
    return (
      <div
        className={`flex items-center justify-center border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400 ${className}`}
        style={{
          width: size === "fluid" ? "100%" : size.width,
          height: size === "fluid" ? 100 : size.height,
          ...style,
        }}
      >
        AdSense [{format}] slot={slot}
      </div>
    );
  }

  return (
    <ins
      ref={adRef}
      className={`adsbygoogle ${className}`}
      style={insStyle}
      data-ad-client={publisherId}
      data-ad-slot={slot}
      data-ad-format={format !== "display" ? format : undefined}
      data-full-width-responsive={responsive ? "true" : undefined}
    />
  );
}
