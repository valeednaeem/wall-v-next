import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/wallvnext";

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
  role: { type: mongoose.Schema.Types.ObjectId, ref: "Role" },
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
    permissions: ["users:view", "users:create", "users:edit", "products:view", "products:create", "products:edit", "products:delete", "blog:view", "blog:create", "blog:edit", "blog:delete", "blog:publish", "orders:view", "orders:manage", "invoices:view", "invoices:create", "crm:view", "crm:leads", "crm:clients", "hosting:view", "hosting:manage", "domains:view", "domains:manage", "support:view", "support:manage", "analytics:view", "ai:access"],
    isSystem: true,
  },
  {
    name: "Manager",
    slug: "manager",
    description: "Management access",
    permissions: ["products:view", "products:create", "blog:view", "blog:create", "blog:publish", "orders:view", "projects:view", "crm:view", "crm:leads", "support:view", "analytics:view"],
    isSystem: true,
  },
  {
    name: "Staff",
    slug: "staff",
    description: "Basic staff access",
    permissions: ["products:view", "blog:view", "orders:view", "projects:view", "crm:view", "support:view"],
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
    await mongoose.connect(MONGODB_URI);
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
    const adminRole = await Role.findOne({ slug: "super-admin" });
    const existingAdmin = await User.findOne({ email: "admin@wall-v.com" });

    if (!existingAdmin && adminRole) {
      const hashedPassword = await bcrypt.hash("admin123", 12);
      await User.create({
        name: "Admin",
        email: "admin@wall-v.com",
        password: hashedPassword,
        slug: "admin",
        role: adminRole._id,
        isEmailVerified: true,
        isActive: true,
      });
      console.log("Created admin user: admin@wall-v.com / admin123");
    }

    console.log("Seed completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
