import mongoose from "mongoose";

async function main() {
  await mongoose.connect("mongodb://localhost:27017/wallvnext");
  const db = mongoose.connection.db!;
  const projectsCol = db.collection("projects");

  const projects = await projectsCol.find().toArray();
  for (const p of projects) {
    console.log("=== PROJECT ===");
    console.log("  name:", p.name);
    console.log("  description:", p.description?.substring(0, 150));
    console.log("  projectType:", p.projectType);
    console.log("  status:", p.status);
    console.log("  lifecycleStatus:", p.lifecycleStatus);
    console.log("  budget:", p.budget);
    console.log("  progress:", p.progress);
    console.log("  client:", JSON.stringify(p.client));
    console.log("  clientRef:", p.clientRef);
    console.log("  scope:", JSON.stringify(p.scope));
    console.log("  financial:", JSON.stringify(p.financial));
    console.log("  stages:", JSON.stringify(p.stages));
    console.log("  requirements:", JSON.stringify(p.requirements));
    console.log("  conversationRef:", p.conversationRef);
    console.log("  agentRef:", p.agentRef);
    console.log("");
  }
  process.exit(0);
}
main();
