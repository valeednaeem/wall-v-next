import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { CAPABILITY_REGISTRY } from "@/lib/capability-registry";
import { isCapabilityAvailableTo, toPublicCapabilityView, capabilityAudience } from "@/lib/capability-access";

/**
 * GET /api/ai/capabilities
 *
 * Capability discovery for the AI assistant.
 *
 * - Anonymous visitors receive ONLY capabilities whose audience is "public"
 *   (registry entries with `requiresAuth: false`) — projected through a
 *   public-safe view that omits internal routing fields.
 * - Authenticated callers additionally receive the capabilities their role
 *   qualifies for ("client" level for customer-type roles, "staff" level for
 *   internal roles).
 *
 * No secrets, tool names, skill requirements, or other users' data are
 * exposed at any level.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    const role = user?.role || null;

    const capabilities = CAPABILITY_REGISTRY.filter((cap) =>
      isCapabilityAvailableTo(cap, role)
    ).map(toPublicCapabilityView);

    const publicCount = CAPABILITY_REGISTRY.filter(
      (cap) => capabilityAudience(cap) === "public"
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        audience: role ? "authenticated" : "public",
        total: capabilities.length,
        publicCount,
        capabilities,
      },
    });
  } catch (error) {
    console.error("Capability discovery error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
