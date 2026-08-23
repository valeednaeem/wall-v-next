import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is not set");
}

const AgentSchema = new mongoose.Schema({
  name: String,
  slug: String,
  description: String,
  type: String,
  role: String,
  status: String,
  personality: {
    tone: String,
    language: String,
    maxResponseLength: Number,
    responseStyle: String,
  },
  systemPrompt: String,
  instructions: [String],
  aiModel: String,
  temperature: Number,
  maxTokens: Number,
  memory: {
    type: String,
    maxItems: Number,
    ttl: Number,
  },
  guardrails: {
    blockedTopics: [String],
    maxConversationLength: Number,
    requireApproval: Boolean,
    contentFilter: Boolean,
    fallbackMessage: String,
  },
  channels: {
    website: Boolean,
    whatsapp: Boolean,
    email: Boolean,
    api: Boolean,
    dashboard: Boolean,
    voice: Boolean,
  },
  integrations: {
    crm: Boolean,
    projects: Boolean,
    billing: Boolean,
    support: Boolean,
  },
  isClientFacing: Boolean,
  isMasterAgent: Boolean,
  masterConfig: {
    canCreateProjects: Boolean,
    canGenerateQuotes: Boolean,
    canProcessPayments: Boolean,
    canScheduleMeetings: Boolean,
    requirementSteps: [String],
    approvalRequired: Boolean,
  },
  stats: {
    totalConversations: Number,
    totalMessages: Number,
    avgConversationLength: Number,
    satisfactionScore: Number,
    conversionRate: Number,
    avgResponseTime: Number,
    resolutionRate: Number,
  },
  createdBy: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
}, { timestamps: true });

const Agent = mongoose.models.Agent || mongoose.model("Agent", AgentSchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log("Connected to MongoDB");

    // Find admin user
    const adminUser = await User.findOne({ role: "super-admin" }).select("_id");
    if (!adminUser) {
      console.error("No super-admin user found. Run the main seed script first: npx tsx src/scripts/seed.ts");
      process.exit(1);
    }
    console.log("Found admin user:", adminUser._id);

    // Check if Master Agent already exists
    const existing = await Agent.findOne({ slug: "master-client-agent" });
    if (existing) {
      console.log("Master Agent already exists:", existing._id);
      process.exit(0);
    }

    const agent = await Agent.create({
      name: "Wall-V Master Agent",
      slug: "master-client-agent",
      description: "AI-powered project consultant that guides clients through requirements gathering and project scoping.",
      type: "hybrid",
      role: "sales",
      status: "active",
      personality: {
        tone: "professional",
        language: "en",
        maxResponseLength: 500,
        responseStyle: "consultative",
      },
      systemPrompt: `You are the Master Client Agent for Wall-V, a leading digital agency. Your role is to guide clients through the project discovery and requirements gathering process.

## Your Process (Follow these steps in order):
1. **Greeting** - Welcome the client warmly, introduce yourself
2. **Project Type** - Ask what kind of project they need
3. **Objective** - Understand their business goal
4. **Features** - Discuss specific features needed
5. **Design & Brand** - Ask about design preferences
6. **Industry & Audience** - Understand their industry and users
7. **Integrations** - Ask about third-party tools needed
8. **Budget** - Discuss budget range
9. **Timeline** - Understand deadline expectations
10. **Summary & Quote** - Present summary and estimated quote
11. **Confirmation** - Get approval to create the project

## Rules:
- Be professional, warm, and consultative
- Ask ONE question at a time
- If the client provides info unprompted, acknowledge it
- After gathering enough info, summarize what you understand
- Generate an estimated quote based on Wall-V's pricing
- Keep responses concise and helpful`,
      instructions: [
        "Always greet the client warmly",
        "Ask one question at a time",
        "Track conversation progress",
        "Generate quotes based on project scope",
        "Create project requests when confirmed",
      ],
      aiModel: "gpt-4o",
      temperature: 0.7,
      maxTokens: 2048,
      memory: {
        type: "conversation",
        maxItems: 50,
        ttl: 86400,
      },
      guardrails: {
        blockedTopics: ["competitor pricing", "internal salaries", "trade secrets"],
        maxConversationLength: 100,
        requireApproval: false,
        contentFilter: true,
        fallbackMessage: "I'm sorry, I can't help with that. Let me connect you with a human agent.",
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
      isClientFacing: true,
      isMasterAgent: true,
      masterConfig: {
        canCreateProjects: true,
        canGenerateQuotes: true,
        canProcessPayments: false,
        canScheduleMeetings: true,
        requirementSteps: [
          "greeting", "project-type", "objective", "features",
          "design-brand", "industry-audience", "integrations",
          "budget", "timeline", "summary-quote", "confirmation",
        ],
        approvalRequired: true,
      },
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

    console.log("Master Agent created successfully!");
    console.log("  ID:", agent._id);
    console.log("  Name:", agent.name);
    console.log("  Slug:", agent.slug);
    console.log("  Status:", agent.status);
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
