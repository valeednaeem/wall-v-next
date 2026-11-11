import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Role from "@/models/role";
import { auth } from "@/lib/auth";

const DEFAULT_ROLES = [
  { name: "Super Admin", slug: "super-admin", description: "Full system control", permissions: ["*"], isSystem: true },
  { name: "Admin", slug: "admin", description: "Administrative access — manages clients, projects, services, products, agents, CRM, invoicing, and operations", permissions: ["users:view","users:create","users:edit","users:delete","roles:view","roles:create","roles:edit","products:view","products:create","products:edit","products:delete","blog:view","blog:create","blog:edit","blog:delete","blog:publish","orders:view","orders:manage","invoices:view","invoices:create","invoices:manage","projects:view","projects:view_all","projects:create","projects:edit","projects:delete","projects:assign","tasks:view","tasks:create","tasks:edit","tasks:assign","crm:view","crm:leads","crm:clients","crm:inquiries","hosting:view","hosting:manage","domains:view","domains:manage","support:view","support:manage","analytics:view","marketing:view","marketing:manage","seo:view","seo:manage","tracking:view","tracking:manage","ai:access","ai:manage","agents:view","agents:create","agents:edit","agents:delete","agents:approve","agents:monitor","agents:configure","skills:view","skills:create","skills:edit","skills:manage","tools:view","tools:create","tools:edit","workflows:view","workflows:create","workflows:edit","finance:view","finance:read","finance:edit","finance:create_invoice","finance:create_quotation","finance:process_payment","finance:refund","finance:reconcile","communications:prepare","communications:send","settings:view","settings:manage","settings:edit","deployment:manage"], isSystem: true },
  { name: "Project Manager", slug: "project-manager", description: "Manages assigned projects, tasks, resources, clients, and project workflows", permissions: ["projects:view","projects:view_assigned","projects:create","projects:edit","projects:assign","tasks:view","tasks:create","tasks:edit","tasks:assign","crm:view","crm:clients","crm:inquiries","invoices:view","invoices:create","support:view","support:manage","analytics:view","agents:view","agents:execute","skills:view","skills:execute","tools:view","tools:execute","workflows:view","workflows:execute"], isSystem: true },
  { name: "Staff", slug: "staff", description: "General internal team member with broad view access and limited creation", permissions: ["products:view","blog:view","blog:create","orders:view","projects:view","projects:view_assigned","tasks:view","crm:view","crm:inquiries","support:view","analytics:view","marketing:view","seo:view","tracking:view"], isSystem: true },
  { name: "Developer", slug: "developer", description: "Accesses assigned development projects, tasks, and technical tools", permissions: ["projects:view","projects:view_assigned","tasks:view","tasks:edit","agents:view","agents:execute","skills:view","skills:execute","tools:view","tools:execute","support:view"], isSystem: true },
  { name: "Designer", slug: "designer", description: "Accesses assigned design and creative tasks", permissions: ["projects:view","projects:view_assigned","tasks:view","tasks:edit","products:view","blog:view","support:view"], isSystem: true },
  { name: "Marketing", slug: "marketing", description: "Accesses marketing, SEO, campaign management, and analytics", permissions: ["projects:view","projects:view_assigned","tasks:view","blog:view","blog:create","blog:edit","blog:publish","marketing:view","marketing:manage","seo:view","seo:manage","tracking:view","tracking:manage","crm:view","crm:leads","analytics:view"], isSystem: true },
  { name: "Sales", slug: "sales", description: "Accesses leads, inquiries, quotations, orders, and sales-related activities", permissions: ["projects:view","projects:view_assigned","crm:view","crm:leads","crm:clients","crm:inquiries","invoices:view","invoices:create","orders:view","products:view","support:view","analytics:view","marketing:view"], isSystem: true },
  { name: "Support", slug: "support", description: "Accesses customer/client support tasks, inquiries, and assigned projects", permissions: ["projects:view","projects:view_assigned","tasks:view","crm:view","crm:inquiries","support:view","support:manage","orders:view","analytics:view"], isSystem: true },
  { name: "Customer", slug: "customer", description: "Registered customer — accesses own projects, invoices, orders, and support", permissions: ["orders:view","projects:view_own","tasks:view","invoices:view","support:view"], isSystem: true },
];

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

    // Auto-seed missing roles
    for (const roleData of DEFAULT_ROLES) {
      const existing = await Role.findOne({ slug: roleData.slug }).lean();
      if (!existing) {
        await Role.create(roleData);
      }
    }

    const roles = await Role.find({}).sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, data: roles });
  } catch (error) {
    console.error("Roles GET error:", error);
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
    if (role !== "super-admin") {
      return NextResponse.json({ success: false, error: "Only super-admin can create roles" }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, description, permissions } = body;

    if (!name || !slug) {
      return NextResponse.json({ success: false, error: "Name and slug are required" }, { status: 400 });
    }

    await connectToDatabase();

    const existing = await Role.findOne({ slug });
    if (existing) {
      return NextResponse.json({ success: false, error: "A role with this slug already exists" }, { status: 409 });
    }

    const roleDoc = await Role.create({
      name,
      slug,
      description: description || "",
      permissions: permissions || [],
      isSystem: false,
    });

    return NextResponse.json({ success: true, data: roleDoc });
  } catch (error) {
    console.error("Roles POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
