import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/wall-v");
  const db = mongoose.connection.db!;

  const settings = await db.collection("sitesettings").find({ category: "contact" }).toArray();
  console.log("SiteSettings contact:", JSON.stringify(settings, null, 2));

  const admin = await db.collection("users").findOne(
    { role: { $in: ["super-admin", "admin"] } },
    { projection: { name: 1, email: 1, phone: 1, company: 1, location: 1, role: 1 } }
  );
  console.log("Admin user:", JSON.stringify(admin, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
