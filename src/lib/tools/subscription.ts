import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import AIToolSubscription, { type IAIToolSubscription } from "@/models/ai-tool-subscription";
import AIToolPlan from "@/models/ai-tool-plan";
import AITool from "@/models/ai-tool";
import AIToolDailyStat from "@/models/ai-tool-daily-stat";
import Payment from "@/models/payment";
import { recordFunnelEvent } from "./recorder";

export type SubscriptionDenyReason = "plan_required" | "credits_exhausted";

export interface SubscriptionEntitlement {
  ok: boolean;
  reason?: SubscriptionDenyReason;
  remainingCredits?: number;
}

export type Billing = "monthly" | "yearly";

function addDuration(base: Date, billing: Billing): Date {
  const d = new Date(base);
  if (billing === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

function startOfDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function findEntitlementDoc(userId: string, requiredPlanId?: string) {
  await connectToDatabase();
  return AIToolSubscription.findOne({
    user: userId,
    status: "active",
    currentPeriodEnd: { $gt: new Date() },
    ...(requiredPlanId ? { plan: requiredPlanId } : {}),
  })
    .sort({ currentPeriodEnd: -1 })
    .lean();
}

export async function checkSubscriptionEntitlement(
  userId: string,
  requiredPlanId: string | undefined,
  creditsNeeded: number
): Promise<SubscriptionEntitlement> {
  const sub = await findEntitlementDoc(userId, requiredPlanId);
  if (!sub) return { ok: false, reason: "plan_required" };
  const remaining = sub.creditsRemaining;
  if (creditsNeeded > 0 && remaining >= 0 && remaining < creditsNeeded) {
    return { ok: false, reason: "credits_exhausted", remainingCredits: remaining };
  }
  return { ok: true, remainingCredits: remaining };
}

/**
 * Atomically consumes credits from the user's active entitlement after a
 * successful execution. Returns the remaining balance (−1 = unlimited), or
 * null when no eligible subscription was found. Best-effort: never throws.
 */
export async function deductSubscriptionCredits(
  userId: string,
  creditsPerExecution: number,
  requiredPlanId?: string
): Promise<number | null> {
  try {
    if (creditsPerExecution <= 0) return null;
    const sub = await findEntitlementDoc(userId, requiredPlanId);
    if (!sub) return null;
    if (sub.creditsRemaining < 0) return -1;
    const updated = await AIToolSubscription.findOneAndUpdate(
      { _id: sub._id, creditsRemaining: { $gte: creditsPerExecution } },
      { $inc: { creditsRemaining: -creditsPerExecution } },
      { new: true }
    ).lean();
    return updated ? updated.creditsRemaining : sub.creditsRemaining;
  } catch (error) {
    console.error("[ai-tools] deductSubscriptionCredits failed:", error);
    return null;
  }
}

export interface ActivateSubscriptionParams {
  userId: string;
  planId: string;
  billing: Billing;
  convertedViaTool?: string | null;
  pricePaid?: number;
}

export async function activateSubscription(
  p: ActivateSubscriptionParams
): Promise<IAIToolSubscription> {
  await connectToDatabase();
  const plan = await AIToolPlan.findById(p.planId).lean();
  if (!plan) throw new Error(`AIToolPlan not found: ${p.planId}`);

  const now = new Date();
  const credits = plan.includedCredits > 0 ? plan.includedCredits : -1;
  const price = p.pricePaid ?? 0;

  let sub = await AIToolSubscription.findOne({
    user: p.userId,
    plan: p.planId,
    status: "active",
  });

  if (sub) {
    const base = sub.currentPeriodEnd > now ? sub.currentPeriodEnd : now;
    sub.status = "active";
    sub.billing = p.billing;
    sub.currentPeriodStart = now;
    sub.currentPeriodEnd = addDuration(base, p.billing);
    sub.creditsRemaining = credits;
    sub.pricePaid = price;
    if (p.convertedViaTool) sub.convertedViaTool = new Types.ObjectId(p.convertedViaTool);
    await sub.save();
  } else {
    sub = await AIToolSubscription.create({
      user: p.userId,
      plan: p.planId,
      status: "active",
      billing: p.billing,
      currentPeriodStart: now,
      currentPeriodEnd: addDuration(now, p.billing),
      creditsRemaining: credits,
      convertedViaTool: p.convertedViaTool
        ? new Types.ObjectId(p.convertedViaTool)
        : undefined,
      pricePaid: price,
    });
  }

  if (p.convertedViaTool) {
    await recordFunnelEvent(p.convertedViaTool, "conversions");
    if (price > 0) {
      const toolOid = new Types.ObjectId(p.convertedViaTool);
      await AIToolDailyStat.updateOne(
        { date: startOfDay(), tool: toolOid },
        { $inc: { revenue: price } },
        { upsert: true }
      );
      await AITool.updateOne({ _id: toolOid }, { $inc: { "stats.revenue": price } });
    }
  }

  return sub;
}

interface PaymentLike {
  _id: Types.ObjectId | string;
  amount: number;
  paymentNumber: string;
  metadata?: Record<string, unknown>;
}

/**
 * Idempotently activates the entitlement for a completed subscription
 * payment. Called from the 2Checkout IPN webhook; a payment is activated
 * at most once (flagged via metadata.subscriptionActivatedAt).
 */
export async function ensureSubscriptionActivatedFromPayment(
  payment: PaymentLike
): Promise<boolean> {
  const md = payment.metadata;
  if (!md || md.type !== "subscription") return false;
  if (md.subscriptionActivatedAt) return true;

  const userId = md.userId ? String(md.userId) : "";
  const planId = md.planId ? String(md.planId) : "";
  if (!userId || !planId) {
    throw new Error(`Subscription payment ${payment.paymentNumber} missing userId/planId`);
  }

  await activateSubscription({
    userId,
    planId,
    billing: md.billing === "yearly" ? "yearly" : "monthly",
    convertedViaTool: md.convertedViaTool ? String(md.convertedViaTool) : null,
    pricePaid: payment.amount,
  });

  await Payment.updateOne(
    { _id: payment._id },
    { $set: { "metadata.subscriptionActivatedAt": new Date().toISOString() } }
  );
  return true;
}
