import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;

  const agents = await db.collection("agents").find({}, { projection: { name: 1, slug: 1, status: 1, skills: 1, permissions: 1, isMasterAgent: 1, isClientFacing: 1 } }).toArray();
  console.log("=== ALL AGENTS ===");
  for (const a of agents as any[]) {
    console.log(`  ${a.slug} | ${a.name} | skills=${(a.skills?.length || 0)} | perms=${(a.permissions?.length || 0)} | master=${a.isMasterAgent} | client=${a.isClientFacing} | ${a.status}`);
  }

  // Check old agents for references
  const oldSlugs = ["admin-agent", "staff-agent", "developer-agent", "designer-agent", "customer-agent"];
  console.log("\n=== OLD AGENTS CHECK ===");
  for (const slug of oldSlugs) {
    const agent = await db.collection("agents").findOne({ slug });
    if (agent) {
      const convCount = await db.collection("agentconversations").countDocuments({ agent: agent._id });
      console.log(`  ${slug}: exists, ${convCount} conversations`);
    } else {
      console.log(`  ${slug}: not found (already cleaned up)`);
    }
  }

  await mongoose.disconnect();
}

main().catch(console.error);
