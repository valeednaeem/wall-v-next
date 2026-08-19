import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import GoogleOAuthToken from "@/models/google-oauth";
import { requirePermission } from "@/lib/api-middleware";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." }, { status: 401 });
    }

    // Convert NextAuth user to JWTPayload for permission check
    const jwtUser = {
      userId: session.user.id,
      email: session.user.email || "",
      role: (session.user as { role?: string }).role || "customer",
      permissions: (session.user as { permissions?: string[] }).permissions || [],
    };

    const permError = await requirePermission(jwtUser, "google:analytics:manage");
    if (permError) return permError;

    await connectToDatabase();
    await GoogleOAuthToken.deleteMany({ userId: session.user.id });

    // Update Google service statuses
    const { default: GoogleServiceConfig } = await import("@/models/google-services");
    await GoogleServiceConfig.updateMany(
      { enabled: true },
      { $set: { status: "config_required" } }
    );

    return NextResponse.json({ success: true, message: "Google account disconnected successfully" });
  } catch (error) {
    console.error("Google disconnect error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}