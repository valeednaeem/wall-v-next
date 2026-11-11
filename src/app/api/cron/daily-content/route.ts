import { NextResponse } from "next/server";
import { executeDailyContent } from "@/lib/content-scheduler";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
  // Also allow x-vercel-cron header as fallback
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  const isValidBearer = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !isValidBearer && !(!cronSecret && authHeader)) {
    // In development with no CRON_SECRET configured, allow unauthenticated access
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    console.log("[Cron:daily-content] Execution started at", new Date().toISOString());
    const result = await executeDailyContent();
    console.log("[Cron:daily-content] Execution completed:", JSON.stringify(result));
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution failed";
    console.error("[Cron:daily-content] Execution failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
