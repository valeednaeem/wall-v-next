import mongoose from "mongoose";

async function main() {
  await mongoose.connect("mongodb://localhost:27017/wallvnext");

  // Use raw collection to bypass validation on corrupted documents
  const db = mongoose.connection.db!;
  const projectsCol = db.collection("projects");
  const clientsCol = db.collection("clients");

  // Fix all projects: set lifecycleStatus, clear corrupted requirements, set scope.features from description
  const projects = await projectsCol.find().toArray();
  for (const project of projects) {
    const updates: Record<string, unknown> = {};

    if (!project.lifecycleStatus || project.lifecycleStatus === "request") {
      updates.lifecycleStatus = "project-created";
    }

    // Clear corrupted requirements (should be ObjectIds, not strings)
    if (project.requirements && project.requirements.length > 0 && typeof project.requirements[0] === "string") {
      updates.requirements = [];
    }

    // Clear corrupted changeRequests
    if (project.changeRequests && project.changeRequests.length > 0 && typeof project.changeRequests[0] === "string") {
      updates.changeRequests = [];
    }

    // Clear corrupted stages
    if (project.stages && project.stages.length > 0 && typeof project.stages[0] === "string") {
      updates.stages = [];
    }

    // Link clientRef from embedded client email
    if (!project.clientRef && project.client && typeof project.client === "object" && project.client.email) {
      const client = await clientsCol.findOne({ email: project.client.email });
      if (client) {
        updates.clientRef = client._id;
      }
    }

    if (Object.keys(updates).length > 0) {
      await projectsCol.updateOne({ _id: project._id }, { $set: updates });
      console.log(`Fixed project: ${project.name}`);
    }
  }

  // Fix clients: set status to active
  const result = await clientsCol.updateMany(
    { status: "prospect" },
    { $set: { status: "active" } }
  );
  console.log(`Fixed ${result.modifiedCount} clients to active status`);

  // Fix user role
  const usersCol = db.collection("users");
  await usersCol.updateMany(
    { role: "CLIENT" },
    { $set: { role: "customer" } }
  );
  console.log("Fixed user roles from CLIENT to customer");

  console.log("Done!");
  process.exit(0);
}
main();
