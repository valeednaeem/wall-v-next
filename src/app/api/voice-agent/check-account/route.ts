import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Client from "@/models/client";
import User from "@/models/user";
import Project from "@/models/project";
import { corsHeaders, handleOPTIONS } from "@/lib/cors";

export async function OPTIONS() {
  return handleOPTIONS();
}

async function findOrCreateClient(data: {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
}) {
  const email = data.email?.toLowerCase().trim();
  const phone = data.phone?.trim();

  // Try to find existing client
  let client = null;
  if (email) {
    client = await Client.findOne({ email });
  }
  if (!client && phone) {
    client = await Client.findOne({ phone });
  }

  let created = false;

  // Create if not found
  if (!client && (email || phone)) {
    client = await Client.create({
      name: data.name || email?.split("@")[0] || "Voice Caller",
      email: email || `${phone?.replace(/[^a-z0-9]/g, "")}@pending.wall-v.com`,
      phone: phone || undefined,
      company: data.company || undefined,
      type: data.company ? "business" : "individual",
      status: "prospect",
      source: data.source || "voice-agent",
      tags: ["voice-agent", "auto-created"],
      totalProjects: 0,
      totalSpent: 0,
      lastContact: new Date(),
    });
    created = true;
  }

  return { client, created };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.toLowerCase().trim();
    const phone = searchParams.get("phone")?.trim();

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Provide email or phone query param" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const { client, created } = await findOrCreateClient({
      email,
      phone,
      source: "voice-agent-check",
    });

    // Check User account (login account)
    let userAccount = null;
    if (email) {
      userAccount = await User.findOne({ email }).select("name email isActive lastLogin loginCount createdAt").lean();
    }
    if (!userAccount && phone) {
      userAccount = await User.findOne({ phone }).select("name email isActive lastLogin loginCount createdAt").lean();
    }

    // Recent projects
    let projects: { name: string; status: string; createdAt: Date }[] = [];
    if (client) {
      projects = await Project.find({ client: { name: client.name, email: client.email } })
        .select("name status createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    }

    return NextResponse.json({
      success: true,
      created,
      hasAccount: true,
      client: client
        ? {
            id: client._id?.toString(),
            name: client.name,
            email: client.email,
            phone: client.phone,
            company: client.company,
            status: client.status,
            totalProjects: client.totalProjects,
            totalSpent: client.totalSpent,
            lastContact: client.lastContact,
          }
        : null,
      userAccount: userAccount
        ? {
            name: userAccount.name,
            email: userAccount.email,
            isActive: userAccount.isActive,
            lastLogin: userAccount.lastLogin,
            loginCount: userAccount.loginCount,
            memberSince: userAccount.createdAt,
          }
        : null,
      recentProjects: projects.map((p) => ({
        name: p.name,
        status: p.status,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error("[Voice Agent] Check account error:", error);
    return NextResponse.json({ error: "Failed to check account" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, company, source } = body;

    const normalizedEmail = email?.toLowerCase().trim();
    const normalizedPhone = phone?.trim();

    if (!normalizedEmail && !normalizedPhone) {
      return NextResponse.json(
        { error: "Provide email or phone in body" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const { client, created } = await findOrCreateClient({
      name,
      email: normalizedEmail,
      phone: normalizedPhone,
      company,
      source: source || "voice-agent",
    });

    // Check User account (login account)
    let userAccount = null;
    if (normalizedEmail) {
      userAccount = await User.findOne({ email: normalizedEmail }).select("name email isActive lastLogin loginCount createdAt").lean();
    }
    if (!userAccount && normalizedPhone) {
      userAccount = await User.findOne({ phone: normalizedPhone }).select("name email isActive lastLogin loginCount createdAt").lean();
    }

    // Recent projects
    let projects: { name: string; status: string; createdAt: Date }[] = [];
    if (client) {
      projects = await Project.find({ client: { name: client.name, email: client.email } })
        .select("name status createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    }

    // Update lastContact if existing client
    if (!created && client) {
      await Client.updateOne({ _id: client._id }, { lastContact: new Date() });
    }

    return NextResponse.json({
      success: true,
      created,
      hasAccount: true,
      client: client
        ? {
            id: client._id?.toString(),
            name: client.name,
            email: client.email,
            phone: client.phone,
            company: client.company,
            status: client.status,
            totalProjects: client.totalProjects,
            totalSpent: client.totalSpent,
            lastContact: client.lastContact,
          }
        : null,
      userAccount: userAccount
        ? {
            name: userAccount.name,
            email: userAccount.email,
            isActive: userAccount.isActive,
            lastLogin: userAccount.lastLogin,
            loginCount: userAccount.loginCount,
            memberSince: userAccount.createdAt,
          }
        : null,
      recentProjects: projects.map((p) => ({
        name: p.name,
        status: p.status,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error("[Voice Agent] Check account error:", error);
    return NextResponse.json({ error: "Failed to check account" }, { status: 500 });
  }
}
