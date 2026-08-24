import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/wallvnext";
const AGENTS_DIR = "C:/xampp/htdocs/agency/agency-agents";

// CSS color name → hex mapping for consistency
const COLOR_MAP: Record<string, string> = {
  cyan: "#06B6D4",
  purple: "#A855F7",
  green: "#22C55E",
  red: "#EF4444",
  teal: "#14B8A6",
  orange: "#F97316",
  yellow: "#EAB308",
  blue: "#3B82F6",
  pink: "#EC4899",
  indigo: "#6366F1",
  emerald: "#10B981",
  amber: "#F59E0B",
  rose: "#F43F5E",
  sky: "#0EA5E9",
  violet: "#8B5CF6",
  lime: "#84CC16",
  slate: "#64748B",
  gray: "#6B7280",
  grey: "#6B7280",
  white: "#FFFFFF",
  black: "#000000",
};

// Division → Wall-V role mapping
const DIVISION_ROLE_MAP: Record<string, string> = {
  academic: "custom",
  design: "custom",
  engineering: "technical",
  finance: "operations",
  "game-development": "technical",
  gis: "technical",
  healthcare: "custom",
  marketing: "marketing",
  "paid-media": "marketing",
  product: "custom",
  "project-management": "operations",
  sales: "sales",
  security: "technical",
  "spatial-computing": "technical",
  specialized: "custom",
  support: "support",
  testing: "technical",
};

// Division → type mapping
const DIVISION_TYPE_MAP: Record<string, string> = {
  academic: "conversational",
  design: "hybrid",
  engineering: "task",
  finance: "conversational",
  "game-development": "task",
  gis: "task",
  healthcare: "conversational",
  marketing: "hybrid",
  "paid-media": "hybrid",
  product: "hybrid",
  "project-management": "hybrid",
  sales: "conversational",
  security: "task",
  "spatial-computing": "task",
  specialized: "hybrid",
  support: "conversational",
  testing: "task",
};

interface ParsedAgent {
  name: string;
  description: string;
  color: string;
  emoji: string;
  vibe: string;
  tools?: string;
  author?: string;
  division: string;
  divisionLabel: string;
  body: string;
  fileName: string;
}

function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const lines = content.split("\n");
  let frontmatterEnd = -1;
  let inFrontmatter = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      if (!inFrontmatter) {
        inFrontmatter = true;
        continue;
      } else {
        frontmatterEnd = i;
        break;
      }
    }
  }

  if (frontmatterEnd === -1) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterLines = lines.slice(1, frontmatterEnd);
  const body = lines.slice(frontmatterEnd + 1).join("\n").trim();

  // Simple YAML parser for frontmatter
  const frontmatter: Record<string, unknown> = {};
  let currentKey = "";
  let currentValue = "";
  let inMultiline = false;

  for (const line of frontmatterLines) {
    if (inMultiline && line.startsWith(" ")) {
      currentValue += " " + line.trim();
      continue;
    }

    if (currentKey) {
      frontmatter[currentKey] = currentValue.trim();
    }

    const match = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (match) {
      currentKey = match[1];
      currentValue = match[2];

      // Check for multiline (line ends with nothing meaningful)
      if (
        currentValue === "" ||
        currentValue === "|" ||
        currentValue === ">"
      ) {
        inMultiline = true;
        currentValue = "";
      } else {
        inMultiline = false;
      }
    } else {
      currentValue += " " + line.trim();
    }
  }

  if (currentKey) {
    frontmatter[currentKey] = currentValue.trim();
  }

  // Clean up values
  for (const key of Object.keys(frontmatter)) {
    let val = String(frontmatter[key]);
    // Remove surrounding quotes
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
  return "#6366F1"; // default indigo
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function collectAgents(): Promise<ParsedAgent[]> {
  const agents: ParsedAgent[] = [];
  const divisionsJson = JSON.parse(
    fs.readFileSync(path.join(AGENTS_DIR, "divisions.json"), "utf-8")
  );
  const divisions = divisionsJson.divisions as Record<string, { label: string }>;

  // Division directories to scan
  const divisionDirs = Object.keys(divisions);

  for (const division of divisionDirs) {
    const divisionPath = path.join(AGENTS_DIR, division);
    if (!fs.existsSync(divisionPath)) continue;

    const divisionLabel = divisions[division]?.label || division;

    // Read all .md files in division directory
    const files = fs.readdirSync(divisionPath).filter((f) => f.endsWith(".md") && f !== "README.md");

    for (const file of files) {
      const filePath = path.join(divisionPath, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const { frontmatter, body } = parseFrontmatter(content);

      if (!frontmatter.name) continue;

      agents.push({
        name: String(frontmatter.name),
        description: String(frontmatter.description || ""),
        color: normalizeColor(String(frontmatter.color || "indigo")),
        emoji: String(frontmatter.emoji || "🤖"),
        vibe: String(frontmatter.vibe || ""),
        tools: frontmatter.tools ? String(frontmatter.tools) : undefined,
        author: frontmatter.author ? String(frontmatter.author) : undefined,
        division,
        divisionLabel,
        body,
        fileName: file,
      });
    }

    // Check subdirectories (game-development has unity/, godot/, etc.)
    const subDirs = fs
      .readdirSync(divisionPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const subDir of subDirs) {
      const subDirPath = path.join(divisionPath, subDir);
      const subFiles = fs.readdirSync(subDirPath).filter((f) => f.endsWith(".md") && f !== "README.md");

      for (const file of subFiles) {
        const filePath = path.join(subDirPath, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const { frontmatter, body } = parseFrontmatter(content);

        if (!frontmatter.name) continue;

        agents.push({
          name: String(frontmatter.name),
          description: String(frontmatter.description || ""),
          color: normalizeColor(String(frontmatter.color || "indigo")),
          emoji: String(frontmatter.emoji || "🤖"),
          vibe: String(frontmatter.vibe || ""),
          tools: frontmatter.tools ? String(frontmatter.tools) : undefined,
          author: frontmatter.author ? String(frontmatter.author) : undefined,
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

async function importAgents() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Dynamic imports
    const Agent = (await import("@/models/agent")).default;
    const User = (await import("@/models/user")).default;

    const adminUser = await User.findOne({ email: "admin@wall-v.com" });
    if (!adminUser) {
      console.error("Admin user not found. Run seed.ts first.");
      process.exit(1);
    }

    console.log("\nCollecting agents from agency-agents...");
    const agents = await collectAgents();
    console.log(`Found ${agents.length} agents\n`);

    let created = 0;
    let skipped = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const agent of agents) {
      try {
        const slug = `agency-${slugify(agent.division)}-${slugify(agent.name)}`;

        // Check if agent already exists
        const existing = await Agent.findOne({
          $or: [{ slug }, { name: agent.name }],
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Map division to Wall-V role
        const role = DIVISION_ROLE_MAP[agent.division] || "custom";
        const type = DIVISION_TYPE_MAP[agent.division] || "conversational";

        // Build system prompt from body + vibe
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
        ]
          .filter(Boolean)
          .join("\n");

        // Parse tools list
        const agentTools = agent.tools
          ? agent.tools.split(",").map((t) => t.trim())
          : [];

        // Create agent record
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
          memory: {
            memoryType: "conversation",
            maxItems: 50,
            ttl: 86400,
          },
          guardrails: {
            blockedTopics: [],
            maxConversationLength: 100,
            requireApproval: false,
            fallbackMessage: "I'm sorry, I can't help with that. Let me connect you with a human agent.",
            contentFilter: true,
          },
          channels: {
            website: true,
            whatsapp: false,
            email: false,
            api: true,
            dashboard: true,
            voice: false,
          },
          integrations: {
            crm: true,
            projects: true,
            billing: false,
            support: false,
          },
          isClientFacing: false,
          isMasterAgent: false,
          stats: {
            totalConversations: 0,
            totalMessages: 0,
            avgConversationLength: 0,
            satisfactionScore: 0,
            conversionRate: 0,
            avgResponseTime: 0,
            resolutionRate: 0,
          },
          createdBy: adminUser._id,
        });

        created++;
        if (created % 50 === 0) {
          console.log(`  Progress: ${created} created, ${skipped} skipped`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${agent.name}: ${msg}`);
      }
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Import complete:`);
    console.log(`  Created: ${created}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors:  ${errors.length}`);

    if (errors.length > 0) {
      console.log(`\nFirst 10 errors:`);
      errors.slice(0, 10).forEach((e) => console.log(`  - ${e}`));
    }

    process.exit(0);
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
}

importAgents();
