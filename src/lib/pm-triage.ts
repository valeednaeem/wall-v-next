/**
 * PM Triage Engine — automatically classifies incoming projects.
 *
 * Evaluates: completeness, feasibility, priority, complexity, resource availability, risk.
 * Produces a triage decision with reasoning.
 */

import connectToDatabase from "@/lib/mongodb";
import PmIntake from "@/models/pm-intake";
import Agent from "@/models/agent";
import Task from "@/models/task";
import PmAlert from "@/models/pm-alert";

export interface TriageResult {
  decision: "ready" | "needs-information" | "needs-approval" | "resource-conflict" | "over-capacity" | "blocked" | "high-risk" | "rejected" | "on-hold";
  reason: string;
  classification: {
    completeness: number;
    feasibility: "feasible" | "challenging" | "infeasible";
    complexity: "low" | "medium" | "high" | "very-high";
    priority: "low" | "medium" | "high" | "urgent";
    estimatedEffort: number;
    requiredCapabilities: string[];
    resourceAvailability: "available" | "constrained" | "unavailable";
    riskLevel: "low" | "medium" | "high" | "critical";
  };
  recommendations: string[];
}

/**
 * Triage a single intake record.
 */
export async function triageIntake(intakeId: string): Promise<TriageResult> {
  await connectToDatabase();

  const intake = await PmIntake.findById(intakeId).lean();
  if (!intake) {
    return {
      decision: "rejected",
      reason: "Intake record not found",
      classification: {
        completeness: 0,
        feasibility: "infeasible",
        complexity: "low",
        priority: "low",
        estimatedEffort: 0,
        requiredCapabilities: [],
        resourceAvailability: "unavailable",
        riskLevel: "critical",
      },
      recommendations: ["Intake record does not exist"],
    };
  }

  // ── Evaluate completeness ──────────────────────────────────────────
  let completeness = 0;
  const requiredFields = ["title", "description", "clientName"];
  const importantFields = ["requirements", "deliverables", "requiredSkills", "estimatedBudget", "targetDate"];

  for (const field of requiredFields) {
    const val = intake[field as keyof typeof intake];
    if (val && (Array.isArray(val) ? val.length > 0 : true)) completeness += 20;
  }
  for (const field of importantFields) {
    const val = intake[field as keyof typeof intake];
    if (val && (Array.isArray(val) ? val.length > 0 : true)) completeness += 12;
  }
  completeness = Math.min(100, completeness);

  // ── Evaluate complexity ────────────────────────────────────────────
  let complexity: TriageResult["classification"]["complexity"] = "low";
  const skillCount = (intake.requiredSkills || []).length;
  const deliverableCount = (intake.deliverables || []).length;
  const dependencyCount = (intake.dependencies || []).length;

  if (skillCount > 5 || deliverableCount > 10 || dependencyCount > 5) {
    complexity = "very-high";
  } else if (skillCount > 3 || deliverableCount > 5 || dependencyCount > 3) {
    complexity = "high";
  } else if (skillCount > 1 || deliverableCount > 2) {
    complexity = "medium";
  }

  // ── Evaluate resource availability ─────────────────────────────────
  const activeAgents = await Agent.countDocuments({ status: "active" });
  const activeTasks = await Task.countDocuments({ status: { $in: ["in-progress", "review"] } });

  let resourceAvailability: TriageResult["classification"]["resourceAvailability"] = "available";
  if (activeTasks > activeAgents * 5) {
    resourceAvailability = "unavailable";
  } else if (activeTasks > activeAgents * 3) {
    resourceAvailability = "constrained";
  }

  // ── Evaluate risk ──────────────────────────────────────────────────
  let riskLevel: TriageResult["classification"]["riskLevel"] = "low";
  if (completeness < 40) riskLevel = "high";
  if (resourceAvailability === "unavailable") riskLevel = "critical";
  if (complexity === "very-high") riskLevel = "high";
  if (intake.riskIndicators && intake.riskIndicators.length > 3) riskLevel = "high";

  // ── Determine feasibility ──────────────────────────────────────────
  let feasibility: TriageResult["classification"]["feasibility"] = "feasible";
  if (riskLevel === "critical") feasibility = "infeasible";
  else if (riskLevel === "high" || complexity === "very-high") feasibility = "challenging";

  // ── Make triage decision ───────────────────────────────────────────
  let decision: TriageResult["decision"] = "ready";
  let reason = "Project meets intake criteria and resources are available";
  const recommendations: string[] = [];

  if (completeness < 40) {
    decision = "needs-information";
    reason = "Project information is incomplete — missing critical fields";
    recommendations.push("Request missing requirements from client");
    recommendations.push("Clarify deliverables and acceptance criteria");
  } else if (resourceAvailability === "unavailable") {
    decision = "over-capacity";
    reason = "Current workforce is at capacity — cannot accept new work without overflow";
    recommendations.push("Consider deferring lower-priority work");
    recommendations.push("Request additional resources");
  } else if (resourceAvailability === "constrained") {
    decision = "needs-approval";
    reason = "Resources are constrained — accepting this project requires Admin approval";
    recommendations.push("Review current workload before accepting");
    recommendations.push("Consider phased delivery");
  } else if (riskLevel === "critical") {
    decision = "blocked";
    reason = "Critical risk factors identified — cannot proceed without resolution";
    recommendations.push("Resolve identified risks before proceeding");
  } else if (riskLevel === "high") {
    decision = "high-risk";
    reason = "High risk factors identified — proceed with caution";
    recommendations.push("Create risk mitigation plan");
    recommendations.push("Set up monitoring checkpoints");
  } else if (completeness < 70) {
    decision = "needs-information";
    reason = "Project information could be more complete for optimal planning";
    recommendations.push("Gather additional requirements where possible");
  }

  // ── Log triage ─────────────────────────────────────────────────────
  await PmIntake.findByIdAndUpdate(intakeId, {
    triageStatus: decision,
    triageReason: reason,
    triagedByType: "ai",
    triagedAt: new Date(),
    admissionDecision: decision === "ready" ? "accept" : decision === "needs-approval" ? "request-admin-approval" : "queue",
  });

  // ── Create alert if needed ─────────────────────────────────────────
  if (decision === "over-capacity" || decision === "blocked" || decision === "high-risk") {
    await PmAlert.create({
      title: `Project Intake: ${decision.replace(/-/g, " ").toUpperCase()}`,
      message: `${intake.title} — ${reason}`,
      category: "project-intake",
      severity: decision === "blocked" ? "critical" : decision === "high-risk" ? "high" : "warning",
      status: "active",
      source: "pm",
      actionRequired: true,
      approvalRequired: false,
    });
  }

  return {
    decision,
    reason,
    classification: {
      completeness,
      feasibility,
      complexity,
      priority: intake.priority || "medium",
      estimatedEffort: intake.estimatedEffort || 0,
      requiredCapabilities: intake.requiredSkills || [],
      resourceAvailability,
      riskLevel,
    },
    recommendations,
  };
}

/**
 * Triage all pending intakes.
 */
export async function triageAllPending(): Promise<{ triaged: number; results: TriageResult[] }> {
  await connectToDatabase();

  const pending = await PmIntake.find({ triageStatus: "pending" }).lean();
  const results: TriageResult[] = [];

  for (const intake of pending) {
    const result = await triageIntake(intake._id.toString());
    results.push(result);
  }

  return { triaged: results.length, results };
}
