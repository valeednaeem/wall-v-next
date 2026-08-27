const mongoose = require("mongoose");

async function main() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/wallvnext";
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const cols = await db.listCollections().toArray();
  console.log("Collections:", cols.map((c) => c.name).join(", "));

  const convCol = db.collection("conversations");
  const total = await convCol.countDocuments({});
  const voice = await convCol.countDocuments({ $or: [{ channel: "voice" }, { agentType: "voice-agent" }] });
  console.log(`\nTotal conversations: ${total}, Voice: ${voice}`);

  const voiceDocs = await convCol.find({ $or: [{ channel: "voice" }, { agentType: "voice-agent" }] })
    .sort({ createdAt: -1 }).limit(10).toArray();

  for (const d of voiceDocs) {
    console.log("\n--- VOICE CONV ---");
    console.log("id:", d._id.toString());
    console.log("sessionId:", d.sessionId);
    console.log("channel:", d.channel, "| agentType:", d.agentType);
    console.log("messageCount:", d.messageCount);
    console.log("messages.length:", Array.isArray(d.messages) ? d.messages.length : "NOT ARRAY");
    if (Array.isArray(d.messages) && d.messages.length > 0) {
      console.log("first msg:", JSON.stringify(d.messages[0]).slice(0, 150));
    }
    console.log("voiceAgent:", JSON.stringify(d.voiceAgent || null).slice(0, 400));
    console.log("outcome:", d.outcome, "| createdAt:", d.createdAt);
  }

  // Compare with a chat conversation
  const chatDoc = await convCol.findOne({ channel: "chat", agentType: "discovery" });
  if (chatDoc) {
    console.log("\n--- SAMPLE CHAT CONV ---");
    console.log("messageCount:", chatDoc.messageCount,
      "| messages:", Array.isArray(chatDoc.messages) ? chatDoc.messages.length : "none",
      "| first:", chatDoc.messages?.[0] ? JSON.stringify(chatDoc.messages[0]).slice(0, 120) : "n/a");
  }

  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
