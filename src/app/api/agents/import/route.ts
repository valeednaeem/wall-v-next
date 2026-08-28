import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import Agent from "@/models/agent";
import connectToDatabase from "@/lib/mongodb";

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

function inferDivisionFromPath(filePath: string): string {
  const parts = filePath.replace(/\\/g, "/").split("/");
  for (const part of parts) {
    if (DIVISION_ROLE_MAP[part]) return part;
  }
  return "specialized";
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

function parseAgentFile(content: string, filePath: string): ParsedAgent | null {
  const { frontmatter, body } = parseFrontmatter(content);
  if (!frontmatter.name) return null;

  const division = inferDivisionFromPath(filePath);
  const divisionLabels: Record<string, string> = {
    academic: "Academic", design: "Design", engineering: "Engineering",
    finance: "Finance", "game-development": "Game Development", gis: "GIS",
    healthcare: "Healthcare", marketing: "Marketing", "paid-media": "Paid Media",
    product: "Product", "project-management": "Project Management", sales: "Sales",
    security: "Security", "spatial-computing": "Spatial Computing",
    specialized: "Specialized", support: "Support", testing: "Testing",
  };

  return {
    name: frontmatter.name,
    description: frontmatter.description || "",
    color: normalizeColor(frontmatter.color || "indigo"),
    emoji: frontmatter.emoji || "🤖",
    vibe: frontmatter.vibe || "",
    tools: frontmatter.tools,
    division,
    divisionLabel: divisionLabels[division] || division,
    body,
    fileName: filePath.split("/").pop() || filePath.split("\\").pop() || "unknown.md",
  };
}

async function fetchFromGitHub(repoUrl: string): Promise<{ name: string; content: string; path: string }[]> {
  const files: { name: string; content: string; path: string }[] = [];

  let owner = "";
  let repo = "";
  let branch = "main";
  let dirPath = "";

  const sshMatch = repoUrl.match(/github\.com[:/]+([\w.-]+)\/([\w.-]+)(?:\/tree\/([\w.-]+)(?:\/(.+))?)?/);
  const httpsMatch = repoUrl.match(/github\.com\/([\w.-]+)\/([\w.-]+)(?:\/tree\/([\w.-]+)(?:\/(.+))?)?/);
  const match = sshMatch || httpsMatch;

  if (!match) throw new Error("Invalid GitHub URL. Expected format: https://github.com/owner/repo or git@github.com:owner/repo");

  owner = match[1];
  repo = match[2].replace(/\.git$/, "");
  if (match[3]) branch = match[3];
  if (match[4]) dirPath = match[4];

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
  const treeRes = await fetch(apiUrl, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });

  if (!treeRes.ok) {
    throw new Error(`GitHub API error: ${treeRes.status} ${treeRes.statusText}`);
  }

  const treeData = await treeRes.json();
  const mdFiles = (treeData.tree || []).filter((item: { path: string; type: string }) =>
    item.type === "blob" &&
    item.path.endsWith(".md") &&
    !item.path.endsWith("README.md") &&
    (dirPath ? item.path.startsWith(dirPath) : true)
  );

  for (const file of mdFiles.slice(0, 500)) {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;
      const res = await fetch(rawUrl);
      if (res.ok) {
        const content = await res.text();
        files.push({ name: file.path.split("/").pop() || "", content, path: file.path });
      }
    } catch { /* skip failed files */ }
  }

  return files;
}

async function createAgentsFromFiles(
  files: { content: string; path: string }[],
  userId: string,
  dryRun: boolean
): Promise<{ created: number; skipped: number; errors: string[]; agents: { name: string; slug: string; division: string }[] }> {
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];
  const agents: { name: string; slug: string; division: string }[] = [];

  for (const file of files) {
    try {
      const parsed = parseAgentFile(file.content, file.path);
      if (!parsed) continue;

      const slug = `agency-${slugify(parsed.division)}-${slugify(parsed.name)}`;
      const existing = await Agent.findOne({ $or: [{ slug }, { name: parsed.name }] });

      if (existing) { skipped++; continue; }
      if (dryRun) { created++; agents.push({ name: parsed.name, slug, division: parsed.division }); continue; }

      const role = DIVISION_ROLE_MAP[parsed.division] || "custom";
      const type = DIVISION_TYPE_MAP[parsed.division] || "conversational";

      const systemPrompt = [
        `# ${parsed.name}`, "", parsed.description, "",
        parsed.vibe ? `**Personality:** ${parsed.vibe}` : "",
        "", "---", "", parsed.body,
      ].filter(Boolean).join("\n");

      const agentTools = parsed.tools ? parsed.tools.split(",").map((t) => t.trim()) : [];

      await Agent.create({
        name: parsed.name,
        slug,
        description: parsed.description,
        type,
        role,
        status: "draft",
        avatar: parsed.emoji,
        personality: { tone: "professional", language: "en", responseStyle: parsed.vibe || "Professional and helpful" },
        systemPrompt,
        instructions: agentTools.length > 0 ? [`Tools available: ${agentTools.join(", ")}`] : [],
        aiModel: "gpt-4o",
        temperature: 0.7,
        maxTokens: 2048,
        division: parsed.division,
        divisionLabel: parsed.divisionLabel,
        divisionColor: parsed.color,
        memory: { memoryType: "conversation", maxItems: 50, ttl: 86400 },
        guardrails: {
          blockedTopics: [], maxConversationLength: 100, requireApproval: false,
          fallbackMessage: "I'm sorry, I can't help with that. Let me connect you with a human agent.",
          contentFilter: true,
        },
        channels: { website: true, whatsapp: false, email: false, api: true, dashboard: true, voice: false },
        integrations: { crm: true, projects: true, billing: false, support: false },
        isClientFacing: true,
        isMasterAgent: false,
        stats: { totalConversations: 0, totalMessages: 0, avgConversationLength: 0, satisfactionScore: 0, conversionRate: 0, avgResponseTime: 0, resolutionRate: 0 },
        createdBy: userId,
      });

      created++;
      agents.push({ name: parsed.name, slug, division: parsed.division });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${file.path}: ${msg}`);
    }
  }

  return { created, skipped, errors, agents };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "super-admin" && user.role !== "admin") {
      return NextResponse.json({ error: "Only admins can import agents" }, { status: 403 });
    }

    await connectToDatabase();

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const dryRun = formData.get("dryRun") === "true";
      const files: { content: string; path: string }[] = [];

      for (const [key, value] of formData.entries()) {
        if (key === "files" && value instanceof File) {
          const text = await value.text();
          files.push({ content: text, path: value.name });
        }
      }

      if (files.length === 0) {
        return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
      }

      const result = await createAgentsFromFiles(files, user.userId, dryRun);
      return NextResponse.json({
        success: true,
        source: "upload",
        dryRun,
        summary: { totalFound: files.length, ...result },
        createdAgents: result.agents.slice(0, 50),
        errorDetails: result.errors.slice(0, 10),
      });
    }

    const body = await request.json();
    const { source, repoUrl, dryRun } = body;

    if (source === "github" && repoUrl) {
      const files = await fetchFromGitHub(repoUrl);
      if (files.length === 0) {
        return NextResponse.json({ error: "No .md agent files found in the repository" }, { status: 404 });
      }

      const result = await createAgentsFromFiles(files, user.userId, dryRun === true);
      return NextResponse.json({
        success: true,
        source: "github",
        dryRun: dryRun === true,
        summary: { totalFound: files.length, ...result },
        createdAgents: result.agents.slice(0, 50),
        errorDetails: result.errors.slice(0, 10),
      });
    }

    return NextResponse.json({ error: "Invalid request. Provide source (github/upload) and repoUrl or files." }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
