import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { SalesChatbot } from "@/components/ai/sales-chatbot";
import { FloatingVoiceWidget } from "@/components/ai/voice-widget";
import { DograhWidgetLoader } from "@/components/ai/dograh-widget-loader";

export default function WebsiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <SalesChatbot />
      <DograhWidgetLoader />
      <FloatingVoiceWidget />
    </div>
  );
}
