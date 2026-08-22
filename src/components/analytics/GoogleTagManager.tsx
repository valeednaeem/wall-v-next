"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

export function GoogleTagManager() {
  const [gtmId, setGtmId] = useState("");

  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.seo?.googleTagManagerId) {
          setGtmId(d.data.seo.googleTagManagerId);
        }
      })
      .catch(() => {});
  }, []);

  if (!gtmId) return null;

  return (
    <>
      <Script
        id="gtm-head"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `,
        }}
      />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        />
      </noscript>
    </>
  );
}
