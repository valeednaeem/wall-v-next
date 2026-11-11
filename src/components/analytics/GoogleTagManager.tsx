import { connectToDatabase } from "@/lib/mongodb";
import SiteSettings from "@/models/site-settings";

async function getGtmId(): Promise<string> {
  try {
    await connectToDatabase();
    const setting = await SiteSettings.findOne({ key: "seo.googleTagManagerId" }).lean();
    return (setting?.value as string) || "";
  } catch {
    return "";
  }
}

export async function GoogleTagManager() {
  const gtmId = await getGtmId();
  if (!gtmId) return null;

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              analytics_storage: 'denied',
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              wait_for_update: 500,
            });
          `,
        }}
      />
      <script
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
