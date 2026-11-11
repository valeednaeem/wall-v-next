import { processHooks } from "@/lib/agent-hooks";

type EventPayload = Record<string, unknown>;

/**
 * Emit an event that triggers matching hooks.
 * Use this throughout the application to trigger automation.
 *
 * @example
 * await emitEvent("project.created", { projectId: project._id, name: project.name });
 * await emitEvent("payment.received", { projectId: project._id, amount: 5000 });
 * await emitEvent("lead.qualified", { leadId: lead._id, score: 85 });
 */
export async function emitEvent(
  eventType: string,
  payload: EventPayload
): Promise<void> {
  try {
    // Map event types to hook event listener types
    const hookType = "event-listener";

    await processHooks(hookType, {
      event: {
        type: eventType,
        payload,
        timestamp: new Date().toISOString(),
      },
      ...payload,
    });
  } catch (error) {
    // Event processing is non-critical — log but don't fail
    console.error(`[EventEmitter] Failed to process event ${eventType}:`, error);
  }
}
