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
    description: "Full access to all features",
    permissions: ["*"],
    isSystem: true,
  },
  {
    name: "Admin",
    slug: "admin",
    description: "Administrative access",
    permissions: [
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
      "settings:view", "settings:manage",
    ],
    isSystem: true,
  },
  {
    name: "Manager",
    slug: "manager",
    description: "Management access",
    permissions: [
      "products:view", "products:create", "products:edit",
      "blog:view", "blog:create", "blog:edit", "blog:publish",
      "orders:view", "orders:manage",
      "invoices:view", "invoices:create",
      "projects:view", "projects:create", "projects:edit",
      "crm:view", "crm:leads", "crm:clients", "crm:inquiries",
      "support:view", "support:manage",
      "analytics:view",
      "marketing:view",
      "google:analytics:view", "google:search_console:view",
      "seo:view", "tracking:view",
    ],
    isSystem: true,
  },
  {
    name: "Staff",
    slug: "staff",
    description: "Basic staff access",
    permissions: [
      "products:view", "blog:view", "blog:create",
      "orders:view", "projects:view",
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
    name: "Customer",
    slug: "customer",
    description: "Customer access",
    permissions: ["orders:view", "projects:view", "support:view"],
    isSystem: true,
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI_DEFINED);
    console.log("Connected to MongoDB");

    // Seed roles
    for (const roleData of DEFAULT_ROLES) {
      const existing = await Role.findOne({ slug: roleData.slug });
      if (!existing) {
        await Role.create(roleData);
        console.log(`Created role: ${roleData.name}`);
      } else {
        console.log(`Role already exists: ${roleData.name}`);
      }
    }

    // Create default admin user
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
      console.log("Created admin user: admin@wall-v.com / admin123");
    } else {
      console.log("Admin user already exists");
    }

    console.log("Seed completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
