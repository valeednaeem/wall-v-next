import mongoose from "mongoose";

async function main() {
  await mongoose.connect("mongodb://localhost:27017/wallvnext");
  const db = mongoose.connection.db!;

  const users = await db.collection("users").find({ role: "customer" }).toArray();
  const projects = await db.collection("projects").find().toArray();

  console.log("Customer users:");
  users.forEach(u => console.log("  email:", u.email, "role:", u.role));

  console.log("\nProjects:");
  projects.forEach(p => console.log("  name:", p.name, "| client.email:", p.client?.email));

  // Check which user can see which projects
  for (const u of users) {
    const visible = projects.filter(p => p.client?.email?.toLowerCase() === u.email?.toLowerCase());
    console.log(`\n${u.email} sees ${visible.length} projects:`, visible.map(p => p.name));
  }

  process.exit(0);
}
main();
