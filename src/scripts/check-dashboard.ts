import mongoose from "mongoose";

async function main() {
  await mongoose.connect("mongodb://localhost:27017/wallvnext");
  const { default: User } = await import("@/models/user");
  const { default: Project } = await import("@/models/project");
  const { default: Client } = await import("@/models/client");

  const users = await User.find().select("name email role").lean();
  console.log("=== ALL USERS ===");
  users.forEach(u => console.log(`  ${u.email} - role: ${u.role}`));

  const projects = await Project.find().select("name client clientRef status lifecycleStatus").lean();
  console.log("\n=== ALL PROJECTS ===");
  projects.forEach(p => {
    console.log(`  Name: ${p.name}`);
    console.log(`  Client: ${JSON.stringify(p.client)}`);
    console.log(`  ClientRef: ${p.clientRef}`);
    console.log(`  Status: ${p.status} / Lifecycle: ${p.lifecycleStatus}`);
    console.log("  ---");
  });

  const clients = await Client.find().select("name email user status").lean();
  console.log("\n=== ALL CLIENTS ===");
  clients.forEach(c => {
    console.log(`  Name: ${c.name}, Email: ${c.email}, User: ${c.user}, Status: ${c.status}`);
  });

  process.exit(0);
}
main();
