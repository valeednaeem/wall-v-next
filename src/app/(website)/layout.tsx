import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { SalesChatbot } from "@/components/ai/sales-chatbot";
import { FloatingVoiceWidget } from "@/components/ai/voice-widget";
import { DograhWidgetLoader } from "@/components/ai/dograh-widget-loader";
import { CartProvider } from "@/lib/cart-context";
import { DynamicFavicon } from "@/components/dynamic-favicon";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { GoogleTagManager } from "@/components/analytics/GoogleTagManager";
import { Suspense } from "react";

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <DynamicFavicon />
      <Suspense fallback={null}>
        <GoogleTagManager />
        <GoogleAnalytics />
      </Suspense>
      <CartProvider>
        <Navbar />
        <main className="flex-1">
          <Suspense fallback={null}>{children}</Suspense>
        </main>
        <Footer />
      </CartProvider>
      <SalesChatbot />
      <DograhWidgetLoader />
      <FloatingVoiceWidget />
    </div>
  );
}
