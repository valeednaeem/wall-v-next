import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import SiteSettings from "@/models/site-settings";
import { resolveDograhWidgetUrl } from "@/lib/dograh-widget";
import { getVapiPublicKey, getVapiAssistantId, getVapiWebhookSecret, getVapiServerUrl } from "@/lib/vapi-config";

const ALLOWED_ROLES = ["super-admin", "admin", "manager"];

/**
 * GET /api/voice/status
 *
 * Admin-only, non-secret configuration health for the active voice provider
 * (Dograh and Vapi). Never returns API keys, secrets, or credentials — only
 * whether each required value is configured, plus the public webhook URL.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    await connectToDatabase();
    const voiceDocs = await SiteSettings.find({ category: "voice" }).lean();
    const voice: Record<string, unknown> = {};
    voiceDocs.forEach((s) => {
      voice[String(s.key).replace("voice.", "")] = s.value;
    });

    const dograhWidget = resolveDograhWidgetUrl(
      voice.widgetUrl as string | undefined,
      process.env.NEXT_PUBLIC_DOGRAH_WIDGET_URL,
      { production: process.env.NODE_ENV === "production" }
    );

    const serverUrl = getVapiServerUrl();
    const vapiAssistantId = (voice.vapiAssistantId as string | undefined) || getVapiAssistantId();
    // Public key is browser-visible by design: dashboard-saved value wins, env is the fallback.
    const dbPublicKey =
      typeof voice.vapiPublicKey === "string" && voice.vapiPublicKey.trim() ? voice.vapiPublicKey.trim() : "";
    const vapiPublicKeyConfigured = Boolean(dbPublicKey || getVapiPublicKey());

    return NextResponse.json({
      success: true,
      data: {
        provider: voice.provider === "vapi" ? "vapi" : "dograh",
        enabled: voice.enabled ?? true,
        dograh: {
          widgetUrlConfigured: Boolean(dograhWidget.url),
          widgetUrlError: dograhWidget.error || "",
          apiUrlConfigured: Boolean(voice.apiUrl || process.env.DOGRAH_API_URL),
          webhookSecretConfigured: Boolean(process.env.DOGRAH_WEBHOOK_SECRET),
        },
        vapi: {
          publicKeyConfigured: vapiPublicKeyConfigured,
          assistantIdConfigured: Boolean(vapiAssistantId),
          webhookSecretConfigured: Boolean(getVapiWebhookSecret()),
          serverUrl: serverUrl || "",
          webhookUrl: serverUrl ? `${serverUrl.replace(/\/+$/, "")}/api/webhooks/vapi` : "",
          configured: vapiPublicKeyConfigured && Boolean(vapiAssistantId),
        },
      },
    });
  } catch (error) {
    console.error("Voice status GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
