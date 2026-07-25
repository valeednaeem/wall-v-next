import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";

const SEED_SECRET = "wall-v-seed-2026";

const RoleSchema = new mongoose.Schema({
  name: String,
  slug: String,
  description: String,
  permissions: [String],
  isSystem: Boolean,
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  slug: String,
  role: String,
  isEmailVerified: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Role = mongoose.models.Role || mongoose.model("Role", RoleSchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);

const DEFAULT_ROLES = [
  { name: "Super Admin", slug: "super-admin", description: "Full access to all features", permissions: ["*"], isSystem: true },
  { name: "Admin", slug: "admin", description: "Administrative access", permissions: ["users:view", "users:create", "users:edit", "products:view", "products:create", "products:edit", "products:delete", "blog:view", "blog:create", "blog:edit", "blog:delete", "blog:publish", "orders:view", "orders:manage", "invoices:view", "invoices:create", "crm:view", "crm:leads", "crm:clients", "hosting:view", "hosting:manage", "domains:view", "domains:manage", "support:view", "support:manage", "analytics:view", "ai:access"], isSystem: true },
  { name: "Manager", slug: "manager", description: "Management access", permissions: ["products:view", "products:create", "blog:view", "blog:create", "blog:publish", "orders:view", "projects:view", "crm:view", "crm:leads", "support:view", "analytics:view"], isSystem: true },
  { name: "Staff", slug: "staff", description: "Basic staff access", permissions: ["products:view", "blog:view", "orders:view", "projects:view", "crm:view", "support:view"], isSystem: true },
  { name: "Customer", slug: "customer", description: "Customer access", permissions: ["orders:view", "projects:view", "support:view"], isSystem: true },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (!SEED_SECRET || secret !== SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const results: string[] = [];

    for (const roleData of DEFAULT_ROLES) {
      const existing = await Role.findOne({ slug: roleData.slug });
      if (!existing) {
        await Role.create(roleData);
        results.push(`Created role: ${roleData.name}`);
      } else {
        results.push(`Role exists: ${roleData.name}`);
      }
    }

    const existingAdmin = await User.findOne({ email: "admin@wall-v.com" });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 12);
      await User.create({
        name: "Admin",
        email: "admin@wall-v.com",
        password: hashedPassword,
        slug: "admin",
        role: "super-admin",
        isEmailVerified: true,
        isActive: true,
      });
      results.push("Created admin user: admin@wall-v.com / admin123");
    } else {
      results.push("Admin user already exists");
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
