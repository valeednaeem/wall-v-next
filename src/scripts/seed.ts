import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcryptjs";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is not set");
}

const MONGODB_URI_DEFINED = MONGODB_URI;

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
  {
    name: "Super Admin",
    slug: "super-admin",
    description: "Full system control — manages all users, roles, permissions, settings, and resources",
    permissions: ["*"],
    isSystem: true,
  },
  {
    name: "Admin",
    slug: "admin",
    description: "Administrative access — manages clients, projects, services, products, agents, CRM, invoicing, and operations",
    permissions: [
      "users:view", "users:create", "users:edit", "users:delete",
      "roles:view", "roles:create", "roles:edit",
      "products:view", "products:create", "products:edit", "products:delete",
      "categories:view", "categories:create", "categories:edit", "categories:delete",
      "blog:view", "blog:create", "blog:edit", "blog:delete", "blog:publish",
      "orders:view", "orders:manage",
      "invoices:view", "invoices:create", "invoices:manage",
      "projects:view", "projects:view_all", "projects:create", "projects:edit", "projects:delete", "projects:assign",
      "tasks:view", "tasks:create", "tasks:edit", "tasks:assign",
      "crm:view", "crm:leads", "crm:clients", "crm:inquiries",
      "hosting:view", "hosting:manage",
      "domains:view", "domains:manage",
      "support:view", "support:manage",
      "analytics:view",
      "marketing:view", "marketing:manage",
      "google:analytics:view", "google:analytics:manage",
      "google:search_console:view", "google:search_console:manage",
      "seo:view", "seo:manage", "seo:sitemap:manage", "seo:robots:manage",
      "tracking:view", "tracking:manage",
      "ai:access", "ai:manage",
      "agents:view", "agents:create", "agents:edit", "agents:delete", "agents:approve", "agents:monitor", "agents:configure",
      "skills:view", "skills:create", "skills:edit", "skills:manage",
      "tools:view", "tools:create", "tools:edit",
      "workflows:view", "workflows:create", "workflows:edit",
      "finance:view", "finance:read", "finance:edit", "finance:create_invoice", "finance:create_quotation", "finance:process_payment", "finance:refund", "finance:reconcile",
      "communications:prepare", "communications:send",
      "settings:view", "settings:manage", "settings:edit",
      "deployment:manage",
    ],
    isSystem: true,
  },
  {
    name: "Project Manager",
    slug: "project-manager",
    description: "Manages assigned projects, tasks, resources, clients, and project workflows",
    permissions: [
      "projects:view", "projects:view_assigned", "projects:create", "projects:edit", "projects:assign",
      "tasks:view", "tasks:create", "tasks:edit", "tasks:assign",
      "crm:view", "crm:clients", "crm:inquiries",
      "invoices:view", "invoices:create",
      "support:view", "support:manage",
      "analytics:view",
      "agents:view", "agents:execute",
      "skills:view", "skills:execute",
      "tools:view", "tools:execute",
      "workflows:view", "workflows:execute",
    ],
    isSystem: true,
  },
  {
    name: "Staff",
    slug: "staff",
    description: "General internal team member with broad view access and limited creation",
    permissions: [
      "products:view", "blog:view", "blog:create",
      "orders:view", "projects:view", "projects:view_assigned",
      "tasks:view",
      "crm:view", "crm:inquiries",
      "support:view",
      "analytics:view",
      "marketing:view",
      "google:analytics:view",
      "seo:view", "tracking:view",
    ],
    isSystem: true,
  },
  {
    name: "Developer",
    slug: "developer",
    description: "Accesses assigned development projects, tasks, and technical tools",
    permissions: [
      "projects:view", "projects:view_assigned",
      "tasks:view", "tasks:edit",
      "agents:view", "agents:execute",
      "skills:view", "skills:execute",
      "tools:view", "tools:execute",
      "support:view",
    ],
    isSystem: true,
  },
  {
    name: "Designer",
    slug: "designer",
    description: "Accesses assigned design and creative tasks",
    permissions: [
      "projects:view", "projects:view_assigned",
      "tasks:view", "tasks:edit",
      "products:view",
      "blog:view",
      "support:view",
    ],
    isSystem: true,
  },
  {
    name: "Marketing",
    slug: "marketing",
    description: "Accesses marketing, SEO, campaign management, and analytics",
    permissions: [
      "projects:view", "projects:view_assigned",
      "tasks:view",
      "blog:view", "blog:create", "blog:edit", "blog:publish",
      "marketing:view", "marketing:manage",
      "google:analytics:view", "google:analytics:manage",
      "google:search_console:view", "google:search_console:manage",
      "seo:view", "seo:manage",
      "tracking:view", "tracking:manage",
      "crm:view", "crm:leads",
      "analytics:view",
    ],
    isSystem: true,
  },
  {
    name: "Sales",
    slug: "sales",
    description: "Accesses leads, inquiries, quotations, orders, and sales-related activities",
    permissions: [
      "projects:view", "projects:view_assigned",
      "crm:view", "crm:leads", "crm:clients", "crm:inquiries",
      "invoices:view", "invoices:create",
      "orders:view",
      "products:view",
      "support:view",
      "analytics:view",
      "marketing:view",
    ],
    isSystem: true,
  },
  {
    name: "Support",
    slug: "support",
    description: "Accesses customer/client support tasks, inquiries, and assigned projects",
    permissions: [
      "projects:view", "projects:view_assigned",
      "tasks:view",
      "crm:view", "crm:inquiries",
      "support:view", "support:manage",
      "orders:view",
      "analytics:view",
    ],
    isSystem: true,
  },
  {
    name: "Customer",
    slug: "customer",
    description: "Registered customer — accesses own projects, invoices, orders, and support",
    permissions: [
      "orders:view",
      "projects:view_own",
      "tasks:view",
      "invoices:view",
      "support:view",
    ],
    isSystem: true,
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI_DEFINED);
    console.log("Connected to MongoDB");

    // ─── Seed Roles ───────────────────────────────────────────────────────
    let createdCount = 0;
    let updatedCount = 0;
    for (const roleData of DEFAULT_ROLES) {
      const existing = await Role.findOne({ slug: roleData.slug });
      if (!existing) {
        await Role.create(roleData);
        console.log(`  Created role: ${roleData.name} (${roleData.slug})`);
        createdCount++;
      } else {
        // Update permissions if role already exists (non-destructive)
        const permsChanged = JSON.stringify([...existing.permissions].sort()) !== JSON.stringify([...roleData.permissions].sort());
        if (permsChanged) {
          await Role.updateOne({ slug: roleData.slug }, { $set: { permissions: roleData.permissions } });
          console.log(`  Updated permissions: ${roleData.name}`);
          updatedCount++;
        } else {
          console.log(`  Role exists: ${roleData.name}`);
        }
      }
    }
    console.log(`Roles: ${createdCount} created, ${updatedCount} updated, ${DEFAULT_ROLES.length} total`);

    // ─── Create Default Admin User ────────────────────────────────────────
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
      console.log("Created admin user: admin@wall-v.com / admin123 (super-admin)");
    } else {
      console.log("Admin user already exists");
      // Ensure admin has super-admin role
      if (existingAdmin.role !== "super-admin") {
        await User.updateOne({ email: "admin@wall-v.com" }, { $set: { role: "super-admin" } });
        console.log("  Promoted admin@wall-v.com to super-admin");
      }
    }

    console.log("\nSeed completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
