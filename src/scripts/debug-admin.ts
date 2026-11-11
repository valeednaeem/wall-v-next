import mongoose from "mongoose";

async function main() {
  await mongoose.connect("mongodb://localhost:27017/wallvnext");
  const db = mongoose.connection.db!;
  const projects = await db.collection("projects").countDocuments();
  const users = await db.collection("users").find().toArray();
  console.log("Total projects (local):", projects);
  console.log("All users (local):");
  users.forEach(u => console.log("  ", u.email, "-", u.role));
  process.exit(0);
}
main();
