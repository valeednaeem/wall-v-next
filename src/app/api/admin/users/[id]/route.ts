import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { validateRoleAssignment, sanitizeString, validateEmail, validateName, validatePassword, logSecurityEvent, getClientIp } from "@/lib/security";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (!["super-admin", "admin"].includes(role || "")) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();
    const user = await User.findById(id).select("-password").lean();
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("User GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
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

    const { id } = await params;
    const body = await request.json();
    await connectToDatabase();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (body.name) {
      const name = sanitizeString(String(body.name), 100);
      if (!validateName(name)) {
        return NextResponse.json({ success: false, error: "Invalid name format" }, { status: 400 });
      }
      user.name = name;
    }
    if (body.email) {
      const email = sanitizeString(String(body.email), 254).toLowerCase();
      if (!validateEmail(email)) {
        return NextResponse.json({ success: false, error: "Invalid email format" }, { status: 400 });
      }
      user.email = email;
    }
    if (body.role) {
      const targetRole = sanitizeString(String(body.role), 50);
      const roleCheck = validateRoleAssignment(targetRole, role || "");
      if (!roleCheck.allowed) {
        await logSecurityEvent({
          type: "privilege_escalation_attempt",
          severity: "high",
          userId: session.user.id,
          email: session.user.email || undefined,
          ip,
          userAgent,
          path: `/api/admin/users/${id}`,
          method: "PUT",
          details: { requestorRole: role, targetRole, reason: roleCheck.reason },
          blocked: true,
        });
        return NextResponse.json({ success: false, error: roleCheck.reason }, { status: 403 });
      }
      user.role = targetRole;
    }
    if (typeof body.isActive === "boolean") user.isActive = body.isActive;
    if (body.phone !== undefined) user.phone = body.phone;
    if (body.company !== undefined) user.company = body.company;
    if (body.bio !== undefined) user.bio = body.bio;
    if (body.jobTitle !== undefined) user.jobTitle = body.jobTitle;

    if (body.password && body.password.length > 0) {
      const pwCheck = validatePassword(String(body.password));
      if (!pwCheck.valid) {
        return NextResponse.json({ success: false, error: pwCheck.reason }, { status: 400 });
      }
      user.password = await bcrypt.hash(String(body.password), 12);
    }

    await user.save();

    return NextResponse.json({
      success: true,
      data: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("User PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== "super-admin") {
      return NextResponse.json({ success: false, error: "Only super-admin can delete users" }, { status: 403 });
    }

    const { id } = await params;
    await connectToDatabase();

    const currentUser = session.user.id;
    if (id === currentUser) {
      return NextResponse.json({ success: false, error: "Cannot delete your own account" }, { status: 400 });
    }

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (user.role === "super-admin") {
      const superAdminCount = await User.countDocuments({ role: "super-admin" });
      if (superAdminCount <= 1) {
        return NextResponse.json({ success: false, error: "Cannot delete the last super-admin" }, { status: 400 });
      }
    }

    await User.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: "User deleted" });
  } catch (error) {
    console.error("User DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
