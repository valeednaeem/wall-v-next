import connectToDatabase from "@/lib/mongodb";

export interface HookTriggerResult {
  hookId: string;
  hookName: string;
  hookType: string;
  actionsExecuted: number;
  success: boolean;
  error?: string;
}

/**
 * Evaluate a single condition against data.
 */
function evaluateCondition(
  condition: { field: string; operator: string; value: string },
  data: Record<string, unknown>
): boolean {
  const fieldValue = getNestedValue(data, condition.field);
  const conditionValue = condition.value;

  switch (condition.operator) {
    case "equals":
      return String(fieldValue) === conditionValue;
    case "not-equals":
      return String(fieldValue) !== conditionValue;
    case "contains":
      return String(fieldValue).toLowerCase().includes(conditionValue.toLowerCase());
    case "greater-than":
      return Number(fieldValue) > Number(conditionValue);
    case "less-than":
      return Number(fieldValue) < Number(conditionValue);
    case "regex":
      try {
        return new RegExp(conditionValue, "i").test(String(fieldValue));
      } catch {
        return false;
      }
    default:
      return false;
  }
}

/**
 * Get a nested value from an object using dot notation.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((current: unknown, key: string) => {
    if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Execute a hook action.
 */
async function executeAction(
  action: { type: string; config: Record<string, unknown> },
  context: Record<string, unknown>
): Promise<boolean> {
  try {
    switch (action.type) {
      case "create-record": {
        const { model, fields } = action.config as { model: string; fields: Record<string, unknown> };
        // Dynamic model import
        const Model = (await import(`@/models/${model}`)).default;
        const recordData = { ...fields };
        // Inject context values into fields
        for (const [key, value] of Object.entries(recordData)) {
          if (typeof value === "string" && value.startsWith("{{") && value.endsWith("}}")) {
            const contextKey = value.slice(2, -2).trim();
            recordData[key] = getNestedValue(context, contextKey);
          }
        }
        await Model.create(recordData);
        return true;
      }

      case "send-notification": {
        // Notification is handled by the caller (email, in-app, etc.)
        // Store notification data in context for the caller to process
        if (!context._notifications) {
          (context as Record<string, unknown>)._notifications = [];
        }
        (context._notifications as Array<Record<string, unknown>>).push(action.config);
        return true;
      }

      case "route-to-agent": {
        // Routing is handled by the caller
        if (!context._routingDecision) {
          (context as Record<string, unknown>)._routingDecision = action.config;
        }
        return true;
      }

      case "update-record": {
        const { model, filter, updates } = action.config as {
          model: string;
          filter: Record<string, unknown>;
          updates: Record<string, unknown>;
        };
        const Model = (await import(`@/models/${model}`)).default;
        await Model.updateOne(filter, { $set: updates });
        return true;
      }

      case "call-webhook": {
        const { url, headers, body } = action.config as {
          url: string;
          headers?: Record<string, string>;
          body?: Record<string, unknown>;
        };
        const webhookBody = body || context;
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(webhookBody),
        });
        return true;
      }

      case "run-tool": {
        // Tool execution is handled by the caller
        if (!context._toolCalls) {
          (context as Record<string, unknown>)._toolCalls = [];
        }
        (context._toolCalls as Array<Record<string, unknown>>).push(action.config);
        return true;
      }

      default:
        return false;
    }
  } catch (error) {
    console.error(`[Hook Engine] Action ${action.type} failed:`, error);
    return false;
  }
}

/**
 * Process all active hooks for a given trigger type and context.
 */
export async function processHooks(
  triggerType: string,
  context: Record<string, unknown>,
  agentId?: string
): Promise<HookTriggerResult[]> {
  await connectToDatabase();
  const AgentHook = (await import("@/models/agent-hook")).default;

  // Find active hooks matching the trigger type
  const query: Record<string, unknown> = {
    status: "active",
    type: triggerType,
  };
  if (agentId) {
    query.$or = [{ agent: agentId }, { isGlobal: true }];
  } else {
    query.isGlobal = true;
  }

  const hooks = await AgentHook.find(query).sort({ priority: -1 }).lean();
  const results: HookTriggerResult[] = [];

  for (const hook of hooks) {
    // Evaluate conditions
    const allConditionsMet = hook.conditions.every((condition: { field: string; operator: string; value: string }) =>
      evaluateCondition(condition, context)
    );

    if (!allConditionsMet) continue;

    // Execute actions
    let actionsExecuted = 0;
    let success = true;

    for (const action of hook.actions as { type: string; config: Record<string, unknown> }[]) {
      const actionSuccess = await executeAction(action, context);
      if (actionSuccess) {
        actionsExecuted++;
      } else {
        success = false;
      }
    }

    // Update hook usage stats
    try {
      await AgentHook.updateOne(
        { _id: hook._id },
        {
          $inc: { "usage.totalTriggers": 1 },
          $set: { "usage.lastTriggered": new Date() },
        }
      );
    } catch {
      // Non-critical
    }

    results.push({
      hookId: hook._id.toString(),
      hookName: hook.name,
      hookType: hook.type,
      actionsExecuted,
      success,
    });
  }

  return results;
}

/**
 * Get hook configuration for a specific agent (e.g., widget config).
 */
export async function getAgentHookConfig(
  agentId: string,
  hookType: string
): Promise<Record<string, unknown> | null> {
  await connectToDatabase();
  const AgentHook = (await import("@/models/agent-hook")).default;

  const hook = await AgentHook.findOne({
    agent: agentId,
    type: hookType,
    status: "active",
  }).lean();

  return hook?.config || null;
}
