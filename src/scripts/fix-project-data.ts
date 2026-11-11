import mongoose from "mongoose";

async function main() {
  await mongoose.connect("mongodb://localhost:27017/wallvnext");
  const db = mongoose.connection.db!;
  const projectsCol = db.collection("projects");

  const projects = await projectsCol.find().toArray();
  for (const project of projects) {
    const updates: Record<string, unknown> = {};
    const reqs = project.requirements;

    // Extract projectType from the embedded requirements object
    if (reqs && typeof reqs === "object" && !Array.isArray(reqs) && reqs.projectType) {
      const typeMap: Record<string, string> = {
        "web-application": "web-development",
        "website": "web-development",
        "web app": "web-development",
        "mobile-app": "mobile-app",
        "mobile app": "mobile-app",
        "ai-solution": "ai-solution",
        "ai/automation": "ai-solution",
        "e-commerce": "e-commerce",
        "ecommerce": "e-commerce",
        "hosting": "hosting",
      };
      updates.projectType = typeMap[reqs.projectType] || "other";
    }

    // Build scope from requirements
    if (reqs && typeof reqs === "object" && !Array.isArray(reqs)) {
      updates.scope = {
        description: reqs.objective || project.description || "",
        features: reqs.features || [],
        exclusions: [],
        assumptions: [],
        constraints: [],
        version: 1,
      };
    }

    // Build financial from budget
    const budget = project.budget || (reqs?.budget ? parseInt(String(reqs.budget).replace(/[^0-9]/g, "")) || 0 : 0);
    if (budget > 0) {
      updates.budget = budget;
      updates.financial = {
        quotedAmount: budget,
        approvedAmount: 0,
        invoicedAmount: 0,
        paidAmount: 0,
        outstandingAmount: budget,
        overdueAmount: 0,
        currency: "USD",
      };
    }

    // Set progress based on lifecycleStatus
    if (!project.progress) {
      updates.progress = 0;
    }

    if (Object.keys(updates).length > 0) {
      await projectsCol.updateOne({ _id: project._id }, { $set: updates });
      console.log(`Fixed project: ${project.name} — set ${Object.keys(updates).join(", ")}`);
    }
  }

  console.log("Done fixing project data");
  process.exit(0);
}
main();
