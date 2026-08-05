"use client";

import { useEffect } from "react";
import { useSiteSettings } from "@/lib/use-site-settings";

export function DynamicFavicon() {
  const { favicon } = useSiteSettings();

  useEffect(() => {
    if (!favicon) return;
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = favicon;
  }, [favicon]);

  return null;
}
