import mongoose from "mongoose";

async function main() {
  await mongoose.connect("mongodb://localhost:27017/wallvnext");
  const db = mongoose.connection.db!;
  const usersCol = db.collection("users");
  const clientsCol = db.collection("clients");
  const projectsCol = db.collection("projects");

  // Find the logged-in customer user
  const user = await usersCol.findOne({ email: "valeednaeem2@gmail.com" });
  if (!user) {
    console.log("User valeednaeem2@gmail.com not found");
    process.exit(1);
  }
  console.log("Found user:", user.email, user._id);

  // Check if client exists for this email
  let client = await clientsCol.findOne({ email: "valeednaeem2@gmail.com" });
  if (!client) {
    // Create client record
    const result = await clientsCol.insertOne({
      user: user._id,
      name: user.name || "Valeed Naeem",
      email: "valeednaeem2@gmail.com",
      phone: "",
      company: "",
      source: "ai-agent",
      status: "active",
      type: "individual",
      tags: [],
      totalProjects: 0,
      totalSpent: 0,
      lastContact: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    client = await clientsCol.findOne({ _id: result.insertedId });
    console.log("Created client:", client?.name, client?.email);
  } else {
    console.log("Client already exists:", client.email);
    // Link to user if not already
    if (!client.user) {
      await clientsCol.updateOne({ _id: client._id }, { $set: { user: user._id } });
      console.log("Linked client to user");
    }
  }

  // Update one project to use this client's email
  const project = await projectsCol.findOne({});
  if (project && client) {
    await projectsCol.updateOne(
      { _id: project._id },
      {
        $set: {
          "client.name": client.name,
          "client.email": client.email,
          clientRef: client._id,
        },
      }
    );
    console.log("Updated project to use client:", client.email);
  }

  console.log("Done!");
  process.exit(0);
}
main();
