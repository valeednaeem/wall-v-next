import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import Agent from "@/models/agent";
import connectToDatabase from "@/lib/mongodb";
import fs from "fs";
import path from "path";

const AGENTS_DIR = process.env.AGENCY_AGENTS_DIR || "C:/Users/Valeed Naeem/.agency-agents";

const COLOR_MAP: Record<string, string> = {
  cyan: "#06B6D4", purple: "#A855F7", green: "#22C55E", red: "#EF4444",
  teal: "#14B8A6", orange: "#F97316", yellow: "#EAB308", blue: "#3B82F6",
  pink: "#EC4899", indigo: "#6366F1", emerald: "#10B981", amber: "#F59E0B",
  rose: "#F43F5E", sky: "#0EA5E9", violet: "#8B5CF6", lime: "#84CC16",
  slate: "#64748B", gray: "#6B7280", grey: "#6B7280",
};

const DIVISION_ROLE_MAP: Record<string, string> = {
  academic: "custom", design: "custom", engineering: "technical",
  finance: "operations", "game-development": "technical", gis: "technical",
  healthcare: "custom", marketing: "marketing", "paid-media": "marketing",
  product: "custom", "project-management": "operations", sales: "sales",
  security: "technical", "spatial-computing": "technical",
  specialized: "custom", support: "support", testing: "technical",
};

const DIVISION_TYPE_MAP: Record<string, string> = {
  academic: "conversational", design: "hybrid", engineering: "task",
  finance: "conversational", "game-development": "task", gis: "task",
  healthcare: "conversational", marketing: "hybrid", "paid-media": "hybrid",
  product: "hybrid", "project-management": "hybrid", sales: "conversational",
  security: "task", "spatial-computing": "task", specialized: "hybrid",
  support: "conversational", testing: "task",
};

function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
  const lines = content.split("\n");
  let frontmatterEnd = -1;
  let inFrontmatter = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      if (!inFrontmatter) { inFrontmatter = true; continue; }
      frontmatterEnd = i;
      break;
    }
  }

  if (frontmatterEnd === -1) return { frontmatter: {}, body: content };

  const frontmatterLines = lines.slice(1, frontmatterEnd);
  const body = lines.slice(frontmatterEnd + 1).join("\n").trim();
  const frontmatter: Record<string, string> = {};
  let currentKey = "";
  let currentValue = "";

  for (const line of frontmatterLines) {
    if (currentKey && line.startsWith(" ")) {
      currentValue += " " + line.trim();
      continue;
    }
    if (currentKey) frontmatter[currentKey] = currentValue.trim();
    const match = line.match(/^([\w-]+):\s*(.*)/);
    if (match) {
      currentKey = match[1];
      currentValue = match[2];
    } else {
      currentValue += " " + line.trim();
    }
  }
  if (currentKey) frontmatter[currentKey] = currentValue.trim();

  for (const key of Object.keys(frontmatter)) {
    let val = frontmatter[key];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    frontmatter[key] = val;
  }

  return { frontmatter, body };
}

function normalizeColor(color: string): string {
  const lower = color.toLowerCase().trim();
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  if (lower.startsWith("#")) return lower;
  return "#6366F1";
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface ParsedAgent {
  name: string;
  description: string;
  color: string;
  emoji: string;
  vibe: string;
  tools?: string;
  division: string;
  divisionLabel: string;
  body: string;
  fileName: string;
}

function collectAgents(): ParsedAgent[] {
  const agents: ParsedAgent[] = [];
  if (!fs.existsSync(AGENTS_DIR)) return agents;

  const divisionsJson = JSON.parse(fs.readFileSync(path.join(AGENTS_DIR, "divisions.json"), "utf-8"));
  const divisions = divisionsJson.divisions as Record<string, { label: string }>;
  const divisionDirs = Object.keys(divisions);

  for (const division of divisionDirs) {
    const divisionPath = path.join(AGENTS_DIR, division);
    if (!fs.existsSync(divisionPath)) continue;
    const divisionLabel = divisions[division]?.label || division;

    const files = fs.readdirSync(divisionPath).filter((f) => f.endsWith(".md") && f !== "README.md");
    for (const file of files) {
      const content = fs.readFileSync(path.join(divisionPath, file), "utf-8");
      const { frontmatter, body } = parseFrontmatter(content);
      if (!frontmatter.name) continue;
      agents.push({
        name: frontmatter.name,
        description: frontmatter.description || "",
        color: normalizeColor(frontmatter.color || "indigo"),
        emoji: frontmatter.emoji || "🤖",
        vibe: frontmatter.vibe || "",
        tools: frontmatter.tools,
        division,
        divisionLabel,
        body,
        fileName: file,
      });
    }

    const subDirs = fs.readdirSync(divisionPath, { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name);

    for (const subDir of subDirs) {
      const subFiles = fs.readdirSync(path.join(divisionPath, subDir))
        .filter((f) => f.endsWith(".md") && f !== "README.md");
      for (const file of subFiles) {
        const content = fs.readFileSync(path.join(divisionPath, subDir, file), "utf-8");
        const { frontmatter, body } = parseFrontmatter(content);
        if (!frontmatter.name) continue;
        agents.push({
          name: frontmatter.name,
          description: frontmatter.description || "",
          color: normalizeColor(frontmatter.color || "indigo"),
          emoji: frontmatter.emoji || "🤖",
          vibe: frontmatter.vibe || "",
          tools: frontmatter.tools,
          division,
          divisionLabel,
          body,
          fileName: file,
        });
      }
    }
  }

  return agents;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (user.role !== "super-admin" && user.role !== "admin") {
      return NextResponse.json({ error: "Only admins can import agents" }, { status: 403 });
    }

    await connectToDatabase();

    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun === true;

    const parsedAgents = collectAgents();
    if (parsedAgents.length === 0) {
      return NextResponse.json({ error: "No agents found in agency-agents directory" }, { status: 404 });
    }

    let created = 0;
    let skipped = 0;
    let updated = 0;
    const errors: string[] = [];
    const createdAgents: { name: string; slug: string; division: string }[] = [];

    for (const agent of parsedAgents) {
      try {
        const slug = `agency-${slugify(agent.division)}-${slugify(agent.name)}`;
        const existing = await Agent.findOne({ $or: [{ slug }, { name: agent.name }] });

        if (existing) {
          skipped++;
          continue;
        }

        if (dryRun) {
          created++;
          createdAgents.push({ name: agent.name, slug, division: agent.division });
          continue;
        }

        const role = DIVISION_ROLE_MAP[agent.division] || "custom";
        const type = DIVISION_TYPE_MAP[agent.division] || "conversational";

        const systemPrompt = [
          `# ${agent.name}`,
          "",
          agent.description,
          "",
          agent.vibe ? `**Personality:** ${agent.vibe}` : "",
          "",
          "---",
          "",
          agent.body,
        ].filter(Boolean).join("\n");

        const agentTools = agent.tools ? agent.tools.split(",").map((t) => t.trim()) : [];

        await Agent.create({
          name: agent.name,
          slug,
          description: agent.description,
          type,
          role,
          status: "draft",
          avatar: agent.emoji,
          personality: {
            tone: "professional",
            language: "en",
            responseStyle: agent.vibe || "Professional and helpful",
          },
          systemPrompt,
          instructions: agentTools.length > 0 ? [`Tools available: ${agentTools.join(", ")}`] : [],
          aiModel: "gpt-4o",
          temperature: 0.7,
          maxTokens: 2048,
          division: agent.division,
          divisionLabel: agent.divisionLabel,
          divisionColor: agent.color,
          memory: { memoryType: "conversation", maxItems: 50, ttl: 86400 },
          guardrails: {
            blockedTopics: [],
            maxConversationLength: 100,
            requireApproval: false,
            fallbackMessage: "I'm sorry, I can't help with that. Let me connect you with a human agent.",
            contentFilter: true,
          },
          channels: { website: true, whatsapp: false, email: false, api: true, dashboard: true, voice: false },
          integrations: { crm: true, projects: true, billing: false, support: false },
          isClientFacing: false,
          isMasterAgent: false,
          stats: {
            totalConversations: 0, totalMessages: 0, avgConversationLength: 0,
            satisfactionScore: 0, conversionRate: 0, avgResponseTime: 0, resolutionRate: 0,
          },
          createdBy: user.userId,
        });

        created++;
        createdAgents.push({ name: agent.name, slug, division: agent.division });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${agent.name}: ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      summary: {
        totalFound: parsedAgents.length,
        created,
        skipped,
        errors: errors.length,
      },
      createdAgents: createdAgents.slice(0, 50),
      errorDetails: errors.slice(0, 10),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
