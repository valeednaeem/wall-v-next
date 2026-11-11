/* CRM journey + DB integrity + QA cleanup (local DB) */
import { createRequire } from "node:module";
import crypto from "node:crypto";
const req = createRequire("C:/xampp/htdocs/nextApp/package.json");
const mongoose = await req("C:/xampp/htdocs/nextApp/node_modules/mongoose");
const fs = req("fs");
const path = req("path");
const { fileURLToPath } = await import("node:url");
const OUT = path.dirname(fileURLToPath(import.meta.url));

const ROOT = process.env.QA_ROOT || "C:/xampp/htdocs/nextApp";
const BASE = "http://localhost:3000";
const env = {};
for (const f of [".env.production.local", ".env.local", ".env"]) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const b64url = (o) => Buffer.from(o).toString("base64url");
function sign(payload) {
  const h = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64url(JSON.stringify({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, ...payload }));
  const s = crypto.createHmac("sha256", env.JWT_SECRET).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${s}`;
}
const adminTok = sign({ userId: "000000000000000000000000", email: "qa-admin@localhost.invalid", role: "super-admin", permissions: ["*"] });

async function call(method, p, body, token) {
  const init = { method, signal: AbortSignal.timeout(20000), headers: {} };
  if (token) init.headers.Cookie = `token=${token}`;
  if (body !== undefined) { init.headers["Content-Type"] = "application/json"; init.body = JSON.stringify(body); }
  try {
    const r = await fetch(BASE + p, init);
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch {}
    return { status: r.status, text, json };
  } catch (e) { return { status: 0, text: String(e), json: null }; }
}

const results = [];
const rec = (r) => { results.push({ ...r, at: new Date().toISOString() }); console.log(`[${r.status === "PASS" ? "ok  " : r.status.slice(0, 4)}] ${r.id} ${r.title} -> ${r.actual}`); };

// ===== CRM LEAD LIFECYCLE (QA-1304) =====
const stamp = Date.now();
const leadEmail = `qa-lead-${stamp}@localhost.invalid`;
let leadId = null;
{
  const c = await call("POST", "/api/crm/leads", { name: "QA Lead", email: leadEmail, source: "qa-test", status: "new" }, adminTok);
  leadId = c.json?.data?._id || c.json?._id || c.json?.lead?._id || null;
  rec({ id: "QA-1304a", module: "E2E CRM", title: "admin creates lead", priority: "P1", expected: "2xx + id", actual: `${c.status} id=${leadId}`, status: c.status < 300 && leadId ? "PASS" : "FAIL", evidence: c.text.slice(0, 120) });
}
if (leadId) {
  const list = await call("GET", "/api/crm/leads", undefined, adminTok);
  const inList = list.text.includes(leadEmail);
  rec({ id: "QA-1304b", module: "E2E CRM", title: "lead appears in admin list", priority: "P1", expected: "200 + email present", actual: `${list.status} found=${inList}`, status: list.status === 200 && inList ? "PASS" : "FAIL" });
  const up = await call("PUT", `/api/crm/leads/${leadId}`, { status: "qualified" }, adminTok);
  rec({ id: "QA-1304c", module: "E2E CRM", title: "lead status update", priority: "P1", expected: "2xx", actual: String(up.status), status: up.status < 300 ? "PASS" : "FAIL", evidence: up.text.slice(0, 100) });
  const del = await call("DELETE", `/api/crm/leads/${leadId}`, undefined, adminTok);
  const after = await call("GET", `/api/crm/leads/${leadId}`, undefined, adminTok);
  const gone = after.status === 404 || !after.text.includes(leadEmail);
  rec({ id: "QA-1304d", module: "E2E CRM", title: "lead deleted + gone", priority: "P1", expected: "2xx + 404/absent", actual: `del=${del.status} get=${after.status}`, status: del.status < 300 && gone ? "PASS" : "FAIL" });
}

// ===== DB INTEGRITY =====
await mongoose.connect("mongodb://localhost:27017/wallvnext", { serverSelectionTimeoutMS: 5000 });
const db = mongoose.connection.db;

{
  const idx = await db.collection("users").indexes();
  const e = idx.find((i) => i.key && i.key.email === 1);
  rec({ id: "QA-1401", module: "DB Integrity", title: "users.email unique index exists", priority: "P1", expected: "unique index on email", actual: e ? `unique=${!!e.unique}` : "missing", status: e && e.unique ? "PASS" : "FAIL" });
}
{
  const idx = await db.collection("blogposts").indexes();
  const s = idx.find((i) => i.key && i.key.slug === 1);
  rec({ id: "QA-1402", module: "DB Integrity", title: "blogposts.slug unique index exists", priority: "P1", expected: "unique index on slug", actual: s ? `unique=${!!s.unique}` : "missing", status: s && s.unique ? "PASS" : "FAIL" });
}
{
  const testSlug = `qa-idx-negative-${stamp}`;
  let first = null, secondCode = null;
  try {
    first = await db.collection("blogposts").insertOne({ title: "QA IDX TEST", slug: testSlug, status: "draft", content: "x", createdAt: new Date(), updatedAt: new Date() });
  } catch (e) { first = "ERR " + e.code; }
  try {
    await db.collection("blogposts").insertOne({ title: "QA IDX TEST DUP", slug: testSlug, status: "draft", content: "y", createdAt: new Date(), updatedAt: new Date() });
    secondCode = "NO_ERROR";
  } catch (e) { secondCode = e.code; }
  if (first && typeof first === "object") await db.collection("blogposts").deleteOne({ _id: first.insertedId });
  rec({ id: "QA-1403", module: "DB Integrity", title: "duplicate slug insert rejected (E11000)", priority: "P1", expected: "11000 on second insert", actual: `first=${typeof first === "object" ? "ok" : first} second=${secondCode}`, status: secondCode === 11000 ? "PASS" : "FAIL" });
}
{
  const has = (await db.listCollections({ name: "publicationjobs" }).toArray()).length > 0;
  if (has) {
    const idx = await db.collection("publicationjobs").indexes();
    const k = idx.find((i) => i.key && i.key.idempotencyKey === 1);
    rec({ id: "QA-1404", module: "DB Integrity", title: "publicationjobs.idempotencyKey unique", priority: "P1", expected: "unique index", actual: k ? `unique=${!!k.unique}` : "missing", status: k && k.unique ? "PASS" : "FAIL" });
  } else {
    rec({ id: "QA-1404", module: "DB Integrity", title: "publicationjobs.idempotencyKey unique", priority: "P1", expected: "unique index", actual: "collection not yet created in local DB", status: "NOT RUN", notes: "index declared in src/models/publication-job.ts:86 (inspected); collection created on first job; logic covered by publication-queue unit tests" });
  }
}
{
  const cols = (await db.listCollections().toArray()).map((c) => c.name);
  const orphanChecks = [];
  if (cols.includes("leads")) orphanChecks.push(["leads", await db.collection("leads").countDocuments({ email: /qa-lead-/ })]);
  if (cols.includes("blogposts")) orphanChecks.push(["blogposts", await db.collection("blogposts").countDocuments({ title: /^QA Smoke/ })]);
  if (cols.includes("contacts")) orphanChecks.push(["contacts", await db.collection("contacts").countDocuments({ email: /qa-contact-/ })]);
  if (cols.includes("contentevents")) orphanChecks.push(["contentevents", await db.collection("contentevents").countDocuments({ $or: [{ title: /QA Smoke/ }, { "payload.title": /QA Smoke/ }] })]);
  console.log("PRE_CLEANUP_COUNTS", JSON.stringify(orphanChecks));
}

// ===== CLEANUP =====
const cleanup = {};
for (const [col, cond] of [
  ["contacts", { email: /qa-contact-/ }],
  ["blogposts", { title: /^QA Smoke/ }],
  ["leads", { email: /qa-lead-/ }],
]) {
  if (!(await db.listCollections({ name: col }).toArray()).length) { cleanup[col] = "n/a"; continue; }
  const r = await db.collection(col).deleteMany(cond);
  cleanup[col] = r.deletedCount;
}
for (const col of (await db.listCollections().toArray()).map((c) => c.name)) {
  if (/login|security|attempt|rate/i.test(col)) {
    const r = await db.collection(col).deleteMany({ $or: [{ email: /qa-(nobody|rate|contact|lead)/ }, { identifier: /qa-/ }, { key: /qa-/ }] });
    if (r.deletedCount) cleanup[col] = r.deletedCount;
  }
}
console.log("CLEANUP", JSON.stringify(cleanup));

const post = {};
for (const [col, cond] of [["contacts", { email: /qa-contact-/ }], ["blogposts", { title: /^QA Smoke/ }], ["leads", { email: /qa-lead-/ }]]) {
  if ((await db.listCollections({ name: col }).toArray()).length) post[col] = await db.collection(col).countDocuments(cond);
}
console.log("POST_CLEANUP_COUNTS", JSON.stringify(post));
rec({ id: "QA-1405", module: "Cleanup", title: "QA fixture cleanup (contacts/blog/leads/login-attempts)", priority: "P1", expected: "0 remaining", actual: JSON.stringify(post), status: Object.values(post).every((v) => v === 0) ? "PASS" : "FAIL", evidence: JSON.stringify(cleanup) });

await mongoose.disconnect();

const counts = results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
console.log("\n=== JOURNEY+INTEGRITY SUMMARY ===");
console.log(JSON.stringify(counts), "TOTAL", results.length);
fs.writeFileSync(path.join(OUT, "journey-db-results.json"), JSON.stringify({ generatedAt: new Date().toISOString(), counts, results, cleanup }, null, 2));
console.log("written: journey-db-results.json");
