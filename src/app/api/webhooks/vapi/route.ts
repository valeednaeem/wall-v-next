import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Conversation from "@/models/conversation";
import { corsHeaders, handleOPTIONS } from "@/lib/cors";
import { logError } from "@/lib/error-logger";
import { checkRateLimit, getClientIp, logSecurityEvent } from "@/lib/security";
import {
  authenticateVapiWebhook,
  validateVapiWebhookBody,
  extractVapiCallEvent,
  buildVapiEventKey,
  MAX_VAPI_WEBHOOK_BYTES,
} from "@/lib/vapi-webhook";

export async function OPTIONS() {
  return handleOPTIONS();
}

function toValidDate(value?: string): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    const fromNumber = new Date(numeric);
    if (!Number.isNaN(fromNumber.getTime())) return fromNumber;
  }
  return new Date();
}

/**
 * POST /api/webhooks/vapi
 *
 * Vapi server-events endpoint (point the Vapi assistant's server URL here).
 * Security posture mirrors the Dograh webhook: rate limiting, fail-closed
 * secret auth, size limits, and payload validation — all before any DB work.
 *
 * Scope (v1): persists end-of-call transcripts/summaries into the Conversation
 * store, idempotently by Vapi call ID. The Dograh webhook's lead/inquiry/
 * project auto-creation pipeline is intentionally NOT mirrored here yet —
 * that deep automation activates only after Vapi E2E verification approval.
 */
export async function POST(request: Request) {
  const headers = corsHeaders(request);
  const ip = getClientIp(request);

  try {
    const rl = checkRateLimit("webhook:vapi:" + ip, 30, 60 * 1000);
    if (!rl.allowed) {
      await logSecurityEvent({
        type: "webhook_rate_limit",
        severity: "medium",
        ip,
        path: "/api/webhooks/vapi",
        method: "POST",
        blocked: true,
      });
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers });
    }

    const auth = authenticateVapiWebhook(request);
    if (!auth.ok) {
      await logSecurityEvent({
        type: "webhook_signature_invalid",
        severity: auth.status === 503 ? "high" : "critical",
        ip,
        path: "/api/webhooks/vapi",
        method: "POST",
        blocked: true,
        details: { reason: auth.reason },
      });
      return NextResponse.json({ error: auth.reason }, { status: auth.status, headers });
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_VAPI_WEBHOOK_BYTES) {
      return NextResponse.json({ error: "Webhook payload is too large" }, { status: 413, headers });
    }

    let rawBody: unknown;
    try {
      const rawText = await request.text();
      if (new TextEncoder().encode(rawText).byteLength > MAX_VAPI_WEBHOOK_BYTES) {
        return NextResponse.json({ error: "Webhook payload is too large" }, { status: 413, headers });
      }
      rawBody = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400, headers });
    }

    const bodyValidation = validateVapiWebhookBody(rawBody);
    if (!bodyValidation.valid) {
      return NextResponse.json({ error: bodyValidation.reason }, { status: 400, headers });
    }

    const { event, error: extractionError } = extractVapiCallEvent(rawBody);
    if (!event || extractionError) {
      return NextResponse.json(
        { error: extractionError || "Unable to extract Vapi event" },
        { status: 400, headers }
      );
    }

    const eventKey = buildVapiEventKey(event.callId, event.type);

    // Transient events (assistant-request, status-update, ...) are acknowledged
    // without persistence — only the end-of-call report carries durable content.
    if (event.type !== "end-of-call-report") {
      console.log(`[Vapi Webhook] Acknowledged ${event.type} (${eventKey})`);
      return NextResponse.json(
        { success: true, acknowledged: true, type: event.type, key: eventKey },
        { headers }
      );
    }

    if (!event.callId) {
      return NextResponse.json(
        { error: "end-of-call-report is missing a call id" },
        { status: 400, headers }
      );
    }
    if ((event.transcript || "").length > 200_000 || (event.summary || "").length > 20_000) {
      return NextResponse.json({ error: "Webhook payload contains oversized fields" }, { status: 413, headers });
    }
    if (
      (event.messages?.length || 0) > 500 ||
      (event.messages || []).some((m) => (m.content || "").length > 20_000)
    ) {
      return NextResponse.json(
        { error: "Webhook payload contains too many or oversized messages" },
        { status: 413, headers }
      );
    }

    await connectToDatabase();

    const sessionId = `vapi_${event.callId}`;

    // Idempotency: Vapi retries deliveries. A retry after the conversation has
    // durable content is a no-op (never overwrite content with empties).
    const existing = await Conversation.findOne({ sessionId }).catch(() => null);
    if (existing && ((existing.messages?.length || 0) > 0 || existing.voiceAgent?.transcript)) {
      return NextResponse.json(
        { success: true, duplicate: true, conversationId: existing._id, key: eventKey },
        { headers }
      );
    }

    const messages = (event.messages || []).map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
      timestamp: toValidDate(m.timestamp),
    }));

    // Content check: a transcript is expected on every end-of-call-report.
    // Derive one from the message list when the artifact string is absent.
    const derivedTranscript = messages
      .map((m) => `${m.role === "user" ? "USER" : "AGENT"}: ${m.content}`)
      .join("\n\n");
    const transcriptText =
      (event.transcript || "").trim().length > 0 ? (event.transcript as string) : derivedTranscript;
    const transcriptPersisted = transcriptText.trim().length > 0;

    const conversationData: Record<string, unknown> = {
      sessionId,
      agentType: "voice-agent",
      channel: "voice",
      endedAt: new Date(),
      voiceAgent: {
        vapiCallId: event.callId,
        vapiAssistantId: existing?.voiceAgent?.vapiAssistantId || "",
        workflowRunId: event.callId,
        durationSeconds: event.durationSeconds || 0,
        callStatus: event.endedReason || "completed",
        transcript: transcriptText,
        summary: event.summary || "",
        transcriptPersisted,
      },
    };

    if (messages.length > 0) {
      conversationData.messages = messages;
      conversationData.messageCount = messages.length;
    } else if (existing && (existing.messages?.length || 0) > 0) {
      conversationData.messages = existing.messages;
      conversationData.messageCount = existing.messageCount || existing.messages.length;
    }

    const conversation = await Conversation.findOneAndUpdate(
      { sessionId },
      { $set: conversationData },
      { upsert: true, new: true }
    );

    if (!conversation) {
      throw new Error("Unable to persist Vapi conversation");
    }

    // Incomplete delivery: an end-of-call-report is expected to carry a
    // transcript artifact, but none was found. Persist the call metadata so
    // the call is not lost, record a SANITIZED diagnostic (event key and
    // artifact presence only — no secrets, no conversation content), and do
    // NOT report success. A later retry can still fill in the content because
    // the idempotency check only skips conversations that already have any.
    if (!transcriptPersisted) {
      console.warn(
        `[Vapi Webhook] Incomplete end-of-call-report (${eventKey}) — no transcript/messages ` +
          `(artifactPresent=${Boolean(event.artifactPresent)}); call metadata persisted only`
      );
      await logSecurityEvent({
        type: "input_validation_failed",
        severity: "low",
        ip,
        path: "/api/webhooks/vapi",
        method: "POST",
        blocked: false,
        details: {
          source: "vapi-webhook",
          reason: "missing_transcript_artifact",
          key: eventKey,
          artifactPresent: Boolean(event.artifactPresent),
        },
      });
      return NextResponse.json(
        {
          success: false,
          incomplete: true,
          diagnostic: "missing_transcript_artifact",
          conversationId: conversation._id,
          key: eventKey,
        },
        { headers }
      );
    }

    console.log(
      `[Vapi Webhook] Persisted conversation (${eventKey}) id=${conversation._id} messages=${messages.length}`
    );

    return NextResponse.json(
      { success: true, conversationId: conversation._id, key: eventKey },
      { headers }
    );
  } catch (error) {
    await logError({
      level: "error",
      message: "Error processing vapi webhook",
      source: "api/webhooks/vapi",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500, headers });
  }
}
