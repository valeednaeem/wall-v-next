import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/user";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

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

    // Role assignment security: prevent unauthorized privilege escalation
    const targetRole = userRole || "customer";
    if (role !== "super-admin" && targetRole === "super-admin") {
      return NextResponse.json({ success: false, error: "Only super-admin can assign super-admin role" }, { status: 403 });
    }
    if (!["super-admin", "admin"].includes(role || "") && !["customer"].includes(targetRole)) {
      return NextResponse.json({ success: false, error: "You can only assign the customer role" }, { status: 403 });
    }

    await connectToDatabase();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ success: false, error: "A user with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      slug,
      role: userRole || "customer",
      isActive: isActive !== false,
      isEmailVerified: false,
      provider: "credentials",
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
