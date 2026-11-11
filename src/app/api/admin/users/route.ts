import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { validateRoleAssignment, sanitizeString, validateEmail, validateName, validatePassword, logSecurityEvent, getClientIp } from "@/lib/security";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (!["super-admin", "admin"].includes(role || "")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();
    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const usersWithRole = users.map((u) => {
      const roleObj = typeof u.role === "string" ? null : u.role;
      return {
        ...u,
        roleName: typeof u.role === "string" ? u.role : roleObj?.name || u.role,
      };
    });

    return NextResponse.json({ success: true, data: usersWithRole });
  } catch (error) {
    console.error("Users GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (!["super-admin", "admin"].includes(role || "")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role: userRole, isActive } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: "Name, email, and password are required" }, { status: 400 });
    }

    // ─── Input Validation ──────────────────────────────────────────────
    const sanitizedName = sanitizeString(String(name), 100);
    const sanitizedEmail = sanitizeString(String(email), 254).toLowerCase();
    const targetRole = sanitizeString(String(userRole || "customer"), 50);

    if (!validateName(sanitizedName)) {
      return NextResponse.json({ success: false, error: "Invalid name format" }, { status: 400 });
    }
    if (!validateEmail(sanitizedEmail)) {
      return NextResponse.json({ success: false, error: "Invalid email format" }, { status: 400 });
    }
    const pwCheck = validatePassword(String(password));
    if (!pwCheck.valid) {
      return NextResponse.json({ success: false, error: pwCheck.reason }, { status: 400 });
    }

    // ─── Role Assignment Security ──────────────────────────────────────
    const roleCheck = validateRoleAssignment(targetRole, role || "");
    if (!roleCheck.allowed) {
      await logSecurityEvent({
        type: "privilege_escalation_attempt",
        severity: "high",
        userId: session.user.id,
        email: session.user.email || undefined,
        ip,
        userAgent,
        path: "/api/admin/users",
        method: "POST",
        details: { requestorRole: role, targetRole, reason: roleCheck.reason },
        blocked: true,
      });
      return NextResponse.json({ success: false, error: roleCheck.reason }, { status: 403 });
    }

    await connectToDatabase();

    const existing = await User.findOne({ email: sanitizedEmail });
    if (existing) {
      return NextResponse.json({ success: false, error: "A user with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(String(password), 12);
    const slug = sanitizedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();

    const user = await User.create({
      name: sanitizedName,
      email: sanitizedEmail,
      password: hashedPassword,
      slug,
      role: targetRole,
      isActive: isActive !== false,
      isEmailVerified: false,
      provider: "credentials",
    });

    await logSecurityEvent({
      type: "signup_success",
      severity: "low",
      userId: user._id.toString(),
      email: sanitizedEmail,
      ip,
      userAgent,
      path: "/api/admin/users",
      method: "POST",
      details: { createdBy: session.user.id, role: targetRole },
    });

    return NextResponse.json({
      success: true,
      data: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Users POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
