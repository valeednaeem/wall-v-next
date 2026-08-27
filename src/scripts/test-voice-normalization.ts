/**
 * Unit test: verify extractVoicePayload normalization for all Dograh payload shapes.
 * Run: npx tsx src/scripts/test-voice-normalization.ts
 * No MongoDB or running server needed — pure logic test.
 */

// ── Inline the normalization logic from the webhook for testing ──────────────

interface NormalizedVoicePayload {
  agentId: string;
  workflowRunId: string;
  sessionId: string;
  status: string;
  duration: number;
  transcript: string;
  summary: string;
  messages: { role: "user" | "assistant"; content: string; timestamp?: string }[];
}

function pick(obj: Record<string, unknown> | undefined, keys: string[]): unknown {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function normalizeMessages(rawMessages: unknown): NormalizedVoicePayload["messages"] {
  if (!rawMessages) return [];
  if (Array.isArray(rawMessages)) {
    const out: NormalizedVoicePayload["messages"] = [];
    for (const m of rawMessages) {
      if (Array.isArray(m) && m.length >= 2) {
        const role = String(m[0]).toLowerCase().includes("user") || String(m[0]).toLowerCase().includes("caller") ? "user" : "assistant";
        out.push({ role, content: String(m[1]) });
        continue;
      }
      if (m && typeof m === "object") {
        const mo = m as Record<string, unknown>;
        const content = String(pick(mo, ["content", "text", "message", "transcript"]) ?? "").trim();
        if (!content) continue;
        const rawRole = String(pick(mo, ["role", "speaker", "from", "sender"]) ?? "assistant").toLowerCase();
        const isUser = rawRole.includes("user") || rawRole.includes("caller") || rawRole.includes("human") || rawRole.includes("customer");
        out.push({
          role: isUser ? "user" : "assistant",
          content,
          timestamp: typeof mo.timestamp === "string" ? mo.timestamp : undefined,
        });
      }
    }
    return out;
  }
  if (typeof rawMessages === "object") {
    const mo = rawMessages as Record<string, unknown>;
    const out: NormalizedVoicePayload["messages"] = [];
    const user = pick(mo, ["user", "caller", "human"]);
    const assistant = pick(mo, ["assistant", "agent", "ai"]);
    if (typeof user === "string" && user.trim()) out.push({ role: "user", content: user.trim() });
    if (typeof assistant === "string" && assistant.trim()) out.push({ role: "assistant", content: assistant.trim() });
    return out;
  }
  return [];
}

function transcriptToMessages(transcript: string): NormalizedVoicePayload["messages"] {
  const out: NormalizedVoicePayload["messages"] = [];
  if (!transcript || !transcript.trim()) return out;
  const linePattern = /^\s*(user|caller|visitor|customer|human|agent|assistant|ai|bot|system)\s*[:\-]\s*/gim;
  const matches: { role: "user" | "assistant"; start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = linePattern.exec(transcript)) !== null) {
    const label = m[1].toLowerCase();
    const isUser = ["user", "caller", "visitor", "customer", "human"].includes(label);
    matches.push({ role: isUser ? "user" : "assistant", start: m.index + m[0].length, end: m.index });
  }
  if (matches.length === 0) return out;
  for (let i = 0; i < matches.length; i++) {
    const segStart = matches[i].start;
    const segEnd = i + 1 < matches.length ? matches[i + 1].end : transcript.length;
    const content = transcript.slice(segStart, segEnd).trim();
    if (content) out.push({ role: matches[i].role, content });
  }
  return out;
}

function messagesToTranscript(messages: NormalizedVoicePayload["messages"]): string {
  return messages.map((msg) => `${msg.role === "user" ? "USER" : "AGENT"}: ${msg.content}`).join("\n\n");
}

function extractVoicePayload(body: Record<string, unknown>): NormalizedVoicePayload {
  const data = (body.data && typeof body.data === "object" ? body.data : undefined) as Record<string, unknown> | undefined;
  const payload = (body.payload && typeof body.payload === "object" ? body.payload : undefined) as Record<string, unknown> | undefined;
  const call = (body.call && typeof body.call === "object" ? body.call : undefined) as Record<string, unknown> | undefined;
  const nestedPayload = payload?.payload && typeof payload.payload === "object" ? payload.payload as Record<string, unknown> : undefined;
  const payloadCall = payload?.call && typeof payload.call === "object" ? payload.call as Record<string, unknown> : undefined;
  const dataCall = data?.call && typeof data.call === "object" ? data.call as Record<string, unknown> : undefined;
  const nestedData = data?.data && typeof data.data === "object" ? data.data as Record<string, unknown> : undefined;
  const merged: Record<string, unknown> = { ...nestedData, ...dataCall, ...nestedPayload, ...payloadCall, ...call, ...payload, ...data, ...body };

  const agentId = String(pick(merged, ["agentId", "agent_id", "dograhAgentId", "assistantId"]) ?? "");
  const workflowRunId = String(pick(merged, ["workflowRunId", "workflow_run_id", "runId", "run_id"]) ?? "");
  const sessionId = String(pick(merged, ["sessionId", "session_id", "conversationId", "conversation_id"]) ?? "");
  const status = String(pick(merged, ["status", "callStatus", "call_status", "state"]) ?? "completed");
  const durationRaw = pick(merged, ["duration", "durationSeconds", "duration_seconds", "callDuration", "call_duration"]);
  const duration = typeof durationRaw === "number" ? durationRaw : parseFloat(String(durationRaw ?? "0")) || 0;
  const summary = String(pick(merged, ["summary", "callSummary", "call_summary", "recap"]) ?? "");

  let messages = normalizeMessages(
    pick(merged, ["messages", "transcript_segments", "transcriptSegments", "segments", "history", "conversation_history", "conversationHistory"])
  );
  let transcript = String(pick(merged, ["transcript", "transcription", "full_transcript", "fullTranscript", "conversation_transcript", "text"]) ?? "");

  if (!transcript && messages.length > 0) {
    transcript = messagesToTranscript(messages);
  } else if (transcript && messages.length === 0) {
    messages = transcriptToMessages(transcript);
  }

  return { agentId, workflowRunId, sessionId, status, duration, transcript, summary, messages };
}

// ── Test cases ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}`);
    console.log(`    expected: ${e}`);
    console.log(`    actual:   ${a}`);
  }
}

function assertOk(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.log(`  ✗ ${label}`); }
}

// ── Shape 1: Standard Dograh (top-level fields) ──────────────────────────────
console.log("\n1. Standard top-level payload");
{
  const r = extractVoicePayload({
    agentId: "agent_123",
    workflowRunId: "run_abc",
    sessionId: "sess_001",
    status: "completed",
    duration: 120,
    transcript: "USER: Hello\n\nAGENT: Hi there!",
    summary: "Greeting call",
    callerInfo: { name: "Alice", email: "alice@test.com" },
  });
  assert("agentId", r.agentId, "agent_123");
  assert("workflowRunId", r.workflowRunId, "run_abc");
  assert("sessionId", r.sessionId, "sess_001");
  assert("duration", r.duration, 120);
  assert("summary", r.summary, "Greeting call");
  assert("transcript has content", r.transcript.length > 0, true);
  assert("messages parsed from transcript", r.messages.length, 2);
  assert("user msg", r.messages[0].content, "Hello");
  assert("assistant msg", r.messages[1].content, "Hi there!");
}

// ── Shape 2: Nested under data.* ─────────────────────────────────────────────
console.log("\n2. Nested under data.*");
{
  const r = extractVoicePayload({
    data: {
      agentId: "agent_456",
      workflow_run_id: "run_xyz",
      conversation_id: "sess_002",
      duration_seconds: 90,
      conversation_transcript: "Caller: Need help with billing\nAgent: I can look into that",
      call_summary: "Billing inquiry",
    },
  });
  assert("agentId from data.agentId", r.agentId, "agent_456");
  assert("workflowRunId from data.workflow_run_id", r.workflowRunId, "run_xyz");
  assert("sessionId from data.conversation_id", r.sessionId, "sess_002");
  assert("duration from data.duration_seconds", r.duration, 90);
  assert("summary from data.call_summary", r.summary, "Billing inquiry");
  assert("transcript extracted", r.transcript.length > 0, true);
  assert("messages parsed", r.messages.length, 2);
  assert("user msg", r.messages[0].content, "Need help with billing");
}

// ── Shape 3: Nested under payload.call.* ─────────────────────────────────────
console.log("\n3. Nested under payload.call.*");
{
  const r = extractVoicePayload({
    payload: {
      call: {
        agent_id: "agent_789",
        run_id: "run_def",
        status: "completed",
        call_duration: 45,
      },
    },
  });
  assert("agentId from payload.call.agent_id", r.agentId, "agent_789");
  assert("workflowRunId from payload.call.run_id", r.workflowRunId, "run_def");
  assert("duration from payload.call.call_duration", r.duration, 45);
}

// ── Shape 4: Messages only (alt field names: speaker/text) ───────────────────
console.log("\n4. Messages with alt field names (speaker/text)");
{
  const r = extractVoicePayload({
    agentId: "a1",
    workflowRunId: "r1",
    messages: [
      { speaker: "user", text: "I want to build an app" },
      { speaker: "agent", text: "Great! Let's discuss the requirements." },
    ],
  });
  assert("messageCount", r.messages.length, 2);
  assert("user msg via text field", r.messages[0].content, "I want to build an app");
  assert("assistant msg via text field", r.messages[1].content, "Great! Let's discuss the requirements.");
  assert("transcript synthesized from messages", r.transcript.includes("USER:"), true);
}

// ── Shape 5: Transcript only, no messages — should parse into messages ───────
console.log("\n5. Transcript only (USER:/AGENT: prefixed)");
{
  const r = extractVoicePayload({
    agentId: "a2",
    workflowRunId: "r2",
    transcript: "USER: I need a website\n\nAGENT: What kind of website?\n\nUSER: E-commerce\n\nAGENT: Great, let me help with that.",
  });
  assert("messages parsed from transcript", r.messages.length, 4);
  assert("first user", r.messages[0].content, "I need a website");
  assert("first agent", r.messages[1].content, "What kind of website?");
  assert("second user", r.messages[2].content, "E-commerce");
  assert("second agent", r.messages[3].content, "Great, let me help with that.");
}

// ── Shape 6: Transcript with Caller:/AI: labels ─────────────────────────────
console.log("\n6. Transcript with Caller:/AI: labels");
{
  const r = extractVoicePayload({
    agentId: "a3",
    workflowRunId: "r3",
    transcript: "Caller: Tell me about pricing\nAI: We have three tiers...",
  });
  assert("messages parsed", r.messages.length, 2);
  assert("caller → user", r.messages[0].role, "user");
  assert("ai → assistant", r.messages[1].role, "assistant");
  assert("content correct", r.messages[0].content, "Tell me about pricing");
}

// ── Shape 7: Object-style messages (caller/agent keys) ──────────────────────
console.log("\n7. Object-style messages");
{
  const r = extractVoicePayload({
    agentId: "a4",
    workflowRunId: "r4",
    messages: { user: "Help me build something", agent: "Sure, what do you need?" },
  });
  assert("messageCount", r.messages.length, 2);
  assert("user", r.messages[0].role, "user");
  assert("user content", r.messages[0].content, "Help me build something");
  assert("assistant content", r.messages[1].content, "Sure, what do you need?");
}

// ── Shape 8: Array-of-arrays messages (from some providers) ──────────────────
console.log("\n8. Array-of-arrays messages");
{
  const r = extractVoicePayload({
    agentId: "a5",
    workflowRunId: "r5",
    messages: [["caller", "Hello"], ["agent", "Hi"]],
  });
  assert("messageCount", r.messages.length, 2);
  assert("user", r.messages[0].role, "user");
  assert("content", r.messages[0].content, "Hello");
}

// ── Shape 9: dograh-specific nested with data.data.agentId ──────────────────
console.log("\n9. Deep nested (call.* overrides)");
{
  const r = extractVoicePayload({
    data: { agentId: "outer" },
    call: { agentId: "inner_call" },
    agentId: "top_level",
  });
  // call is merged first, then data, then body — body wins
  assert("top-level wins over call and data", r.agentId, "top_level");
}

// ── Shape 10: Both transcript AND messages — messages preserved, transcript kept
console.log("\n10. Both transcript AND messages present");
{
  const r = extractVoicePayload({
    agentId: "a6",
    workflowRunId: "r6",
    transcript: "USER: Hi\nAGENT: Hello",
    messages: [
      { role: "user", content: "Hi there!" },
      { role: "assistant", content: "Hello, how can I help?" },
    ],
  });
  assert("messages kept (not overwritten)", r.messages.length, 2);
  assert("message content preserved", r.messages[0].content, "Hi there!");
  assert("transcript also kept", r.transcript.includes("USER:"), true);
}

// ── Shape 11: Completely empty payload ───────────────────────────────────────
console.log("\n11. Completely empty payload");
{
  const r = extractVoicePayload({});
  assert("agentId empty", r.agentId, "");
  assert("workflowRunId empty", r.workflowRunId, "");
  assert("messages empty", r.messages.length, 0);
  assert("transcript empty", r.transcript, "");
  assert("duration zero", r.duration, 0);
}

// ── Shape 12: duration as string ─────────────────────────────────────────────
console.log("\n12. Duration as string");
{
  const r = extractVoicePayload({
    agentId: "a7",
    workflowRunId: "r7",
    duration_seconds: "42",
  });
  assert("duration parsed from string", r.duration, 42);
}

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${"=".repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All tests passed!");
}
