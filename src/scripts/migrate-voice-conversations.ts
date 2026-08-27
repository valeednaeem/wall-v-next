/**
 * Voice conversation normalization — NON-DESTRUCTIVE.
 *
 * Fixes historical voice conversations that are missing content due to the
 * pipeline bugs:
 *   - Records with messages[] but empty voiceAgent.transcript → synthesize transcript
 *   - Records with transcript but no messages → parse transcript into messages
 *
 * Never deletes records. Only fills in missing fields, preserving originals.
 * Run: npx tsx src/scripts/migrate-voice-conversations.ts
 */
import mongoose from "mongoose";

interface RawMessage {
  role: string;
  content: string;
  timestamp?: Date | string;
}

function transcriptToMessages(transcript: string): { role: "user" | "assistant"; content: string }[] {
  const out: { role: "user" | "assistant"; content: string }[] = [];
  if (!transcript || !transcript.trim()) return out;

  const linePattern = /^\s*(user|caller|visitor|customer|human|agent|assistant|ai|bot|system)\s*[:\-]\s*/gim;
  const marks: { role: "user" | "assistant"; contentStart: number; markStart: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = linePattern.exec(transcript)) !== null) {
    const label = m[1].toLowerCase();
    const isUser = ["user", "caller", "visitor", "customer", "human"].includes(label);
    marks.push({ role: isUser ? "user" : "assistant", contentStart: m.index + m[0].length, markStart: m.index });
  }
  if (marks.length === 0) return out;

  for (let i = 0; i < marks.length; i++) {
    const start = marks[i].contentStart;
    const end = i + 1 < marks.length ? marks[i + 1].markStart : transcript.length;
    const content = transcript.slice(start, end).trim();
    if (content) out.push({ role: marks[i].role, content });
  }
  return out;
}

function messagesToTranscript(messages: RawMessage[]): string {
  return messages
    .map((msg) => `${msg.role === "user" ? "USER" : "AGENT"}: ${msg.content}`)
    .join("\n\n");
}

async function main() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/wallvnext";
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  const col = db.collection("conversations");

  const query = {
    $or: [{ channel: "voice" }, { agentType: "voice-agent" }],
  };
  const docs = await col.find(query).toArray();
  console.log(`Found ${docs.length} voice conversations`);

  let fixedTranscript = 0;
  let fixedMessages = 0;
  let skipped = 0;

  for (const doc of docs) {
    const updates: Record<string, unknown> = {};
    const voiceAgent = (doc.voiceAgent || {}) as Record<string, unknown>;
    const messages = Array.isArray(doc.messages) ? (doc.messages as RawMessage[]) : [];
    const transcript = typeof voiceAgent.transcript === "string" ? voiceAgent.transcript : "";

    // Case A: has structured messages but no transcript
    if (messages.length > 0 && !transcript.trim()) {
      const synthesized = messagesToTranscript(messages);
      if (synthesized.trim()) {
        voiceAgent.transcript = synthesized;
        updates.voiceAgent = voiceAgent;
        fixedTranscript++;
      }
    }

    // Case B: has transcript but no messages
    if (messages.length === 0 && transcript.trim()) {
      const parsed = transcriptToMessages(transcript);
      if (parsed.length > 0) {
        updates.messages = parsed.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: new Date(),
        }));
        updates.messageCount = parsed.length;
        fixedMessages++;
      }
    }

    // Case C: messageCount mismatch
    if (messages.length > 0 && (doc.messageCount || 0) !== messages.length) {
      updates.messageCount = messages.length;
    }

    if (Object.keys(updates).length === 0) {
      skipped++;
      continue;
    }

    await col.updateOne({ _id: doc._id }, { $set: updates });
    console.log(`Fixed ${doc._id}: ${Object.keys(updates).join(", ")}`);
  }

  console.log(`\nDone. transcript synthesized: ${fixedTranscript}, messages parsed: ${fixedMessages}, unchanged: ${skipped}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
