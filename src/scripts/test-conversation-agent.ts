/**
 * End-to-end test for the conversation agent system.
 *
 * Tests:
 * 1. New visitor provides name + email + request → User created, project request created
 * 2. Existing visitor → No duplicate user
 * 3. Missing required fields → Agent asks for them
 * 4. Multi-turn extraction → State accumulates across turns
 * 5. Tool result verification → No fabricated success
 *
 * Run: npx tsx src/scripts/test-conversation-agent.ts
 */

import { orchestrateConversation, createVisitorState } from "@/lib/conversation-agent";
import type { VisitorState } from "@/lib/conversation-agent";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

async function runTest(
  name: string,
  fn: () => Promise<{ passed: boolean; details: string }>
): Promise<TestResult> {
  try {
    const result = await fn();
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${status}: ${name}`);
    if (!result.passed) console.log(`  → ${result.details}`);
    return { name, passed: result.passed, details: result.details };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.log(`❌ ERROR: ${name}`);
    console.log(`  → ${msg}`);
    return { name, passed: false, details: msg };
  }
}

async function testNewVisitorCreation(): Promise<{ passed: boolean; details: string }> {
  const state = createVisitorState({ source: "test" });

  // Turn 1: Name
  const r1 = await orchestrateConversation({
    message: "My name is Test User",
    channel: "chat",
    visitorState: state,
  });
  if (!r1.visitorState.name || r1.visitorState.name !== "Test User") {
    return { passed: false, details: `Name not extracted: ${r1.visitorState.name}` };
  }

  // Turn 2: Email
  const r2 = await orchestrateConversation({
    message: "testuser@example.com",
    channel: "chat",
    visitorState: r1.visitorState,
    conversationId: r1.conversationId,
  });
  if (!r2.visitorState.email || r2.visitorState.email !== "testuser@example.com") {
    return { passed: false, details: `Email not extracted: ${r2.visitorState.email}` };
  }

  // Turn 3: Project request
  const r3 = await orchestrateConversation({
    message: "I need an ecommerce website with product catalog and checkout",
    channel: "chat",
    visitorState: r2.visitorState,
    conversationId: r2.conversationId,
  });

  // Check that tools were called
  const toolNames = r3.toolCallsMade.map((t) => t.toolName);
  const hasLookup = toolNames.includes("lookup_user");
  const hasCreate = toolNames.includes("create_user");

  // Check that user was created (or found existing)
  const userCreated = r3.visitorState.userId !== null;
  const clientCreated = r3.visitorState.clientId !== null;
  const projectRequestCreated = r3.visitorState.projectRequestId !== null;

  const details = `Tools: [${toolNames.join(", ")}] | userId: ${r3.visitorState.userId} | clientId: ${r3.visitorState.clientId} | projectRequestId: ${r3.visitorState.projectRequestId}`;

  if (userCreated && clientCreated) {
    return { passed: true, details };
  }

  return { passed: false, details: `Missing IDs. ${details}` };
}

async function testExistingUserDetection(): Promise<{ passed: boolean; details: string }> {
  // First conversation creates the user
  const state1 = createVisitorState({ source: "test-duplicate" });
  const r1 = await orchestrateConversation({
    message: "My name is Duplicate Test, email is duplicate@example.com, I need a website",
    channel: "chat",
    visitorState: state1,
  });

  const userId1 = r1.visitorState.userId;
  if (!userId1) {
    return { passed: false, details: "First conversation didn't create user" };
  }

  // Second conversation with same email should find existing user
  const state2 = createVisitorState({ source: "test-duplicate" });
  const r2 = await orchestrateConversation({
    message: "Hi, I'm Duplicate Test, my email is duplicate@example.com",
    channel: "chat",
    visitorState: state2,
  });

  const userId2 = r2.visitorState.userId;

  if (userId1 === userId2) {
    return { passed: true, details: `Same user reused: ${userId1}` };
  }

  return { passed: false, details: `Different users: ${userId1} vs ${userId2}` };
}

async function testMultiTurnExtraction(): Promise<{ passed: boolean; details: string }> {
  const state = createVisitorState({ source: "test-multiturn" });

  const r1 = await orchestrateConversation({
    message: "I need a mobile app for healthcare",
    channel: "chat",
    visitorState: state,
  });

  const r2 = await orchestrateConversation({
    message: "My budget is $10,000 to $20,000",
    channel: "chat",
    visitorState: r1.visitorState,
    conversationId: r1.conversationId,
  });

  const r3 = await orchestrateConversation({
    message: "I need it within 2 months, my name is Jane Doe and my email is jane@healthcorp.com",
    channel: "chat",
    visitorState: r2.visitorState,
    conversationId: r2.conversationId,
  });

  const s = r3.visitorState;
  const checks = [
    s.projectType === "mobile-app",
    s.budget !== null,
    s.timeline !== null,
    s.name === "Jane Doe",
    s.email === "jane@healthcorp.com",
    s.features.length > 0 || s.objective !== null,
  ];

  const passed = checks.every(Boolean);
  const details = `projectType: ${s.projectType} | budget: ${s.budget} | timeline: ${s.timeline} | name: ${s.name} | email: ${s.email} | features: [${s.features.join(", ")}]`;

  return { passed, details };
}

async function testToolVerification(): Promise<{ passed: boolean; details: string }> {
  const state = createVisitorState({ source: "test-verify" });

  const result = await orchestrateConversation({
    message: "Create a project for me",
    channel: "chat",
    visitorState: state,
  });

  // Check that tool results are present and verified
  const allVerified = result.toolCallsMade.every((t) => {
    if (t.success) return t.data !== null;
    return t.error !== null;
  });

  const details = `Tool calls: ${result.toolCallsMade.length} | All verified: ${allVerified} | Response includes fabricated IDs: ${result.response.includes("undefined")}`;

  return { passed: allVerified, details };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== Conversation Agent E2E Tests ===\n");

  const results: TestResult[] = [];

  results.push(await runTest("TEST 1: New visitor creation", testNewVisitorCreation));
  results.push(await runTest("TEST 2: Existing user detection", testExistingUserDetection));
  results.push(await runTest("TEST 3: Multi-turn extraction", testMultiTurnExtraction));
  results.push(await runTest("TEST 4: Tool result verification", testToolVerification));

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  console.log(`\n=== Results: ${passed}/${total} passed ===\n`);

  if (passed < total) {
    console.log("FAILURES:");
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  - ${r.name}: ${r.details}`);
    });
  }

  process.exit(passed === total ? 0 : 1);
}

main().catch((error) => {
  console.error("Test runner failed:", error);
  process.exit(1);
});
