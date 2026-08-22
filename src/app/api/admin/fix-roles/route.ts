import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getAuthUser } from "@/lib/auth";
import Role from "@/models/role";
import User from "@/models/user";

const ALL_PERMISSIONS = [
  "users:view", "users:create", "users:edit", "users:delete",
  "roles:view", "roles:create", "roles:edit", "roles:delete",
  "products:view", "products:create", "products:edit", "products:delete",
  "categories:view", "categories:create", "categories:edit", "categories:delete",
  "blog:view", "blog:create", "blog:edit", "blog:delete", "blog:publish",
  "orders:view", "orders:manage",
  "invoices:view", "invoices:create", "invoices:manage",
  "projects:view", "projects:create", "projects:edit", "projects:delete",
  "crm:view", "crm:leads", "crm:clients", "crm:inquiries",
  "hosting:view", "hosting:manage",
  "domains:view", "domains:manage",
  "support:view", "support:manage",
  "settings:view", "settings:manage",
  "analytics:view",
  "marketing:view", "marketing:manage",
  "google:analytics:view", "google:analytics:manage",
  "google:search_console:view", "google:search_console:manage",
  "google:business_profile:view", "google:business_profile:manage",
  "google:merchant:view", "google:merchant:manage",
  "google:ads:view", "google:ads:manage",
  "seo:view", "seo:manage", "seo:sitemap:manage", "seo:robots:manage",
  "tracking:view", "tracking:manage",
  "ai:access", "ai:manage",
];

async function fixRoles() {
  try {
    let user;
    try {
      user = await getAuthUser();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // 1. Create or update super-admin role
    const superAdminExists = await Role.findOne({ slug: "super-admin" });
    if (!superAdminExists) {
      await Role.create({
        name: "Super Admin",
        slug: "super-admin",
        description: "Full access to all features - superior to admin",
        permissions: ["*"],
        isSystem: true,
      });
    } else {
      await Role.updateOne(
        { slug: "super-admin" },
        { $set: { permissions: ["*"] } }
      );
    }

    // 2. Update admin role with ALL permissions
    const adminExists = await Role.findOne({ slug: "admin" });
    if (!adminExists) {
      await Role.create({
        name: "Admin",
        slug: "admin",
        description: "Administrative access",
        permissions: ALL_PERMISSIONS,
        isSystem: true,
      });
    } else {
      await Role.updateOne(
        { slug: "admin" },
        { $set: { permissions: ALL_PERMISSIONS } }
      );
    }

    // 3. Update the current user to super-admin
    await User.updateOne(
      { email: user.email },
      { $set: { role: "super-admin" } }
    );

    // 4. Verify
    const updatedRole = await Role.findOne({ slug: "super-admin" }).lean();
    const adminRole = await Role.findOne({ slug: "admin" }).lean();

    return NextResponse.json({
      success: true,
      message: "Roles fixed successfully",
      superAdmin: {
        slug: "super-admin",
        permissionCount: updatedRole?.permissions?.length || 0,
        hasWildcard: updatedRole?.permissions?.includes("*") || false,
      },
      admin: {
        slug: "admin",
        permissionCount: adminRole?.permissions?.length || 0,
      },
      yourRole: "super-admin",
    });
  } catch (error) {
    console.error("Fix roles error:", error);
    return NextResponse.json({ error: "Failed to fix roles" }, { status: 500 });
  }
}

export async function GET() {
  return fixRoles();
}

export async function POST() {
  return fixRoles();
}
