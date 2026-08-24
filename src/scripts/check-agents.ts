import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI!);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Agent = (await import("@/models/agent")).default as any;
  const count = await Agent.countDocuments();
  const active = await Agent.countDocuments({ status: "active" });
  const master = await Agent.findOne({ isMasterAgent: true }).select("name slug status isMasterAgent isClientFacing").lean();
  const firstActive = await Agent.findOne({ status: "active" }).select("name slug status isMasterAgent isClientFacing").lean();
  console.log("Total agents:", count);
  console.log("Active:", active);
  console.log("Master agent:", master || "NOT FOUND");
  console.log("First active:", firstActive || "NOT FOUND");
  process.exit(0);
}
check();
