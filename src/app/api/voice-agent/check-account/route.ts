import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Client from "@/models/client";
import User from "@/models/user";
import Project from "@/models/project";

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

    // Check Client record
    let client = null;
    if (email) {
      client = await Client.findOne({ email }).select("name email phone company status totalProjects totalSpent lastContact tags").lean();
    }
    if (!client && phone) {
      client = await Client.findOne({ phone }).select("name email phone company status totalProjects totalSpent lastContact tags").lean();
    }

    // Check User account (login account)
    let userAccount = null;
    if (email) {
      userAccount = await User.findOne({ email }).select("name email isActive lastLogin loginCount createdAt").lean();
    }
    if (!userAccount && phone) {
      userAccount = await User.findOne({ phone }).select("name email isActive lastLogin loginCount createdAt").lean();
    }

    // Check recent projects
    let projects: { name: string; status: string; createdAt: Date }[] = [];
    if (client) {
      projects = await Project.find({ client: { name: client.name, email: client.email } })
        .select("name status createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    }

    const hasAccount = !!(client || userAccount);

    return NextResponse.json({
      success: true,
      hasAccount,
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
    const email = body.email?.toLowerCase().trim();
    const phone = body.phone?.trim();

    if (!email && !phone) {
      return NextResponse.json(
        { error: "Provide email or phone in body" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let client = null;
    if (email) {
      client = await Client.findOne({ email }).select("name email phone company status totalProjects totalSpent lastContact tags").lean();
    }
    if (!client && phone) {
      client = await Client.findOne({ phone }).select("name email phone company status totalProjects totalSpent lastContact tags").lean();
    }

    let userAccount = null;
    if (email) {
      userAccount = await User.findOne({ email }).select("name email isActive lastLogin loginCount createdAt").lean();
    }
    if (!userAccount && phone) {
      userAccount = await User.findOne({ phone }).select("name email isActive lastLogin loginCount createdAt").lean();
    }

    let projects: { name: string; status: string; createdAt: Date }[] = [];
    if (client) {
      projects = await Project.find({ client: { name: client.name, email: client.email } })
        .select("name status createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
    }

    const hasAccount = !!(client || userAccount);

    return NextResponse.json({
      success: true,
      hasAccount,
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
