import ProjectActivity from "@/models/project-activity";

interface LogActivityParams {
  project: string;
  actor?: string;
  actorType: "user" | "ai" | "system" | "client";
  action: string;
  category: "project" | "stage" | "task" | "requirement" | "change-request" | "quotation" | "invoice" | "payment" | "communication" | "deliverable" | "approval" | "system";
  description: string;
  entity?: { model: string; id: string };
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logProjectActivity(params: LogActivityParams): Promise<void> {
  try {
    await ProjectActivity.create({
      project: params.project,
      actor: params.actor,
      actorType: params.actorType,
      action: params.action,
      category: params.category,
      description: params.description,
      entity: params.entity,
      before: params.before,
      after: params.after,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  } catch (error) {
    console.error("Failed to log project activity:", error);
  }
}
