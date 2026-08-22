import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is not set");
}

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
    await mongoose.connect(MONGODB_URI as string);
    console.log("Connected to MongoDB");

    // 1. Create or update super-admin role with all permissions
    const superAdminRole = await Role.findOne({ slug: "super-admin" });
    if (!superAdminRole) {
      await Role.create({
        name: "Super Admin",
        slug: "super-admin",
        description: "Full access to all features",
        permissions: ["*"],
        isSystem: true,
      });
      console.log("Created super-admin role with wildcard permissions");
    } else {
      await Role.updateOne(
        { slug: "super-admin" },
        { $set: { permissions: ["*"] } }
      );
      console.log("Updated super-admin role with wildcard permissions");
    }

    // 2. Update admin role with all permissions
    const adminRole = await Role.findOne({ slug: "admin" });
    if (!adminRole) {
      await Role.create({
        name: "Admin",
        slug: "admin",
        description: "Administrative access",
        permissions: ALL_PERMISSIONS,
        isSystem: true,
      });
      console.log("Created admin role with all permissions");
    } else {
      await Role.updateOne(
        { slug: "admin" },
        { $set: { permissions: ALL_PERMISSIONS } }
      );
      console.log("Updated admin role with all permissions");
    }

    // 3. Update admin user to super-admin role
    const adminUser = await User.findOne({ email: "admin@wall-v.com" });
    if (adminUser) {
      await User.updateOne(
        { email: "admin@wall-v.com" },
        { $set: { role: "super-admin" } }
      );
      console.log("Updated admin@wall-v.com role to super-admin");
    } else {
      console.log("Admin user not found - run seed script first");
    }

    // 4. Log all roles for verification
    const allRoles = await Role.find({}).select("slug permissions").lean();
    console.log("\nCurrent roles in database:");
    for (const role of allRoles) {
      console.log(`  ${role.slug}: ${role.permissions.length} permissions`);
    }

    console.log("\nRole fix completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error fixing roles:", error);
    process.exit(1);
  }
}

fixRoles();
