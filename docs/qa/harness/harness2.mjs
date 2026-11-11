/* Wall-V QA harness v2 — corrected assumptions + XSS exploit verification */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const ROOT = process.env.QA_ROOT || "C:/xampp/htdocs/nextApp";
const BASE = "http://localhost:3000";
const OUT = path.dirname(fileURLToPath(import.meta.url));
const RUN_LABEL = process.argv[2] || "run";

function loadEnv(file) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}
const env = { ...loadEnv(".env.local"), ...loadEnv(".env"), ...loadEnv(".env.production.local") };
const SECRET = env.JWT_SECRET;
if (!SECRET) { console.error("FATAL: JWT_SECRET"); process.exit(2); }

const b64url = (o) => Buffer.from(o).toString("base64url");
function sign(payload) {
  const h = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const p = b64url(JSON.stringify({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, ...payload }));
  const s = crypto.createHmac("sha256", SECRET).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${s}`;
}
const adminTok = sign({ userId: "000000000000000000000000", email: "qa-admin@localhost.invalid", role: "super-admin", permissions: ["*"] });
const realAdminTok = sign({
  userId: process.env.QA_TEST_USER_ID || "000000000000000000000001",
  email: process.env.QA_TEST_USER_EMAIL || "qa-realuser@localhost.invalid",
  role: "super-admin",
  permissions: ["*"],
});
const custTok = sign({ userId: "111111111111111111111111", email: "qa-customer@localhost.invalid", role: "customer", permissions: [] });

async function call(method, p, opts = {}) {
  const { token, body, headers = {}, redirect = "follow" } = opts;
  const init = { method, redirect, headers: { ...headers }, signal: AbortSignal.timeout(25000) };
  if (token) init.headers.Cookie = `token=${token}`;
  if (body !== undefined && !(body instanceof FormData)) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  } else if (body instanceof FormData) init.body = body;
  const t0 = Date.now();
  try {
    const r = await fetch(BASE + p, init);
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    const h = {};
    r.headers.forEach((v, k) => (h[k] = v));
    return { status: r.status, location: r.headers.get("location"), text, json, headers: h, ms: Date.now() - t0 };
  } catch (e) {
    return { status: 0, error: String(e), text: "", json: null, headers: {}, ms: Date.now() - t0 };
  }
}

const results = [];
function rec(r) {
  results.push({ ...r, at: new Date().toISOString() });
  const flag = r.status === "PASS" ? "ok  " : r.status === "FAIL" ? "FAIL" : r.status.slice(0, 4);
  console.log(`[${flag}] ${r.id} ${r.title} -> ${r.actual}${r.evidence ? " | " + String(r.evidence).slice(0, 160) : ""}`);
}

// ============ PUBLIC / SEO ============
for (const [id, p, want] of [["QA-0101", "/", 200], ["QA-0102", "/blog", 200], ["QA-0103", "/pricing", 200], ["QA-0104", "/products", 200], ["QA-0105", "/contact", 200], ["QA-0106", "/login", 200]]) {
  const r = await call("GET", p);
  rec({ id, module: "Public/SEO", title: `GET ${p}`, priority: "P2", expected: String(want), actual: String(r.status), status: r.status === want ? "PASS" : "FAIL", evidence: `${r.ms}ms` });
}
{
  const r = await call("GET", "/qa-nonexistent-route-xyz");
  rec({ id: "QA-0107", module: "Public/SEO", title: "Unknown route → 404", priority: "P2", expected: "404", actual: String(r.status), status: r.status === 404 ? "PASS" : "FAIL" });
}
{
  const r = await call("GET", "/sitemap.xml");
  const ok = r.status === 200 && (r.text.includes("<urlset") || r.text.includes("<url>"));
  rec({ id: "QA-0108", module: "Public/SEO", title: "GET /sitemap.xml", priority: "P2", expected: "200 + urlset", actual: `${r.status} len=${r.text.length}`, status: ok ? "PASS" : "FAIL" });
}
{
  const r = await call("GET", "/robots.txt");
  rec({ id: "QA-0109", module: "Public/SEO", title: "GET /robots.txt", priority: "P2", expected: "200", actual: String(r.status), status: r.status === 200 ? "PASS" : "FAIL", evidence: r.text.slice(0, 80) });
}
{
  const r = await call("GET", "/ads.txt");
  rec({ id: "QA-0110", module: "Public/SEO", title: "GET /ads.txt no 5xx", priority: "P3", expected: "200/404", actual: String(r.status), status: r.status < 500 ? "PASS" : "FAIL" });
}
{
  const r = await call("GET", "/");
  const need = ["x-frame-options", "x-content-type-options"];
  const present = need.filter((k) => r.headers[k]);
  rec({ id: "QA-0111", module: "Security headers", title: "Security headers on /", priority: "P2", expected: "XFO + XCTO", actual: present.join(",") || "none", status: present.length === 2 ? "PASS" : "FAIL", evidence: `csp=${r.headers["content-security-policy"] ? "y" : "n"} hsts=${r.headers["strict-transport-security"] ? "y" : "n"}` });
}
{
  const r = await call("GET", "/api/health", { headers: { Origin: "https://evil.example" } });
  const acao = r.headers["access-control-allow-origin"];
  const cred = r.headers["access-control-allow-credentials"];
  const ok = !acao && !cred;
  rec({ id: "QA-0112", module: "Security headers", title: "CORS: no ACAO on API", priority: "P1", expected: "no ACAO header", actual: `acao=${acao ?? "none"} creds=${cred ?? "none"}`, status: ok ? "PASS" : acao === "*" ? "FAIL" : "FAIL", evidence: acao ? `unexpected CORS: ${acao}` : "" });
}
{
  const r = await call("GET", "/");
  rec({ id: "QA-0113", module: "Public/SEO", title: "/ has <title>", priority: "P2", expected: "title present", actual: /<title>[^<]{5,}/.test(r.text) ? "present" : "missing", status: /<title>[^<]{5,}/.test(r.text) ? "PASS" : "FAIL" });
}

// ============ AUTH / AUTHZ ============
for (const [id, method, p, token, pred, want, title] of [
  ["QA-0201", "GET", "/api/auth/me", null, (s) => s === 401, "401", "anon /api/auth/me → 401"],
  ["QA-0203", "GET", "/api/social/jobs", null, (s) => s === 401, "401", "anon social jobs → 401"],
  ["QA-0204", "GET", "/api/admin/users", null, (s) => s === 401 || s === 403, "401/403", "anon admin users → denied"],
  ["QA-0206", "GET", "/api/crm/leads", null, (s) => s === 401 || s === 403, "401/403", "anon crm leads → denied"],
  ["QA-0207", "GET", "/api/invoices", null, (s) => s === 401 || s === 403, "401/403", "anon invoices → denied"],
  ["QA-0208", "GET", "/api/notifications", null, (s) => s === 401 || s === 403, "401/403", "anon notifications → denied"],
  ["QA-0211", "GET", "/api/client/projects", null, (s) => s === 401 || s === 403, "401/403", "anon client projects → denied"],
  ["QA-0212", "POST", "/api/blog/posts", null, (s) => s === 401 || s === 403, "401/403", "anon blog create → denied"],
  ["QA-0205", "GET", "/api/admin/users", custTok, (s) => s === 401 || s === 403, "401/403", "customer token → admin users denied"],
  ["QA-0210", "GET", "/api/social/jobs", custTok, (s) => s === 403, "403", "customer token → social jobs 403"],
]) {
  const r = await call(method, p, { token, body: method === "POST" ? { title: "x", content: "y" } : undefined });
  rec({ id, module: "Auth/AuthZ", title, priority: "P0", expected: want, actual: String(r.status), status: pred(r.status) ? "PASS" : "FAIL", evidence: (r.text || "").slice(0, 100), notes: id === "QA-0205" ? "401 vs 403 semantics: deny works; 403 preferred (P3 nit)" : "" });
}
{
  if (process.env.QA_TEST_USER_ID) {
    const r = await call("GET", "/api/auth/me", { token: realAdminTok });
    const role = r.json?.data?.role || r.json?.data?.role?.name || "?";
    const ok = r.status === 200 && r.json?.success === true;
    rec({ id: "QA-0202", module: "Auth/AuthZ", title: "/api/auth/me with real user id", priority: "P0", expected: "200 + success", actual: `${r.status} role=${typeof role === "object" ? JSON.stringify(role) : role}`, status: ok ? "PASS" : "FAIL", evidence: (r.text || "").slice(0, 120) });
  } else {
    rec({ id: "QA-0202", module: "Auth/AuthZ", title: "/api/auth/me with real user id", priority: "P0", expected: "200 + success", actual: "-", status: "NOT RUN", notes: "set QA_TEST_USER_ID (and QA_TEST_USER_EMAIL) to an existing user id to run this case" });
  }
}
{
  const r = await call("GET", "/dashboard", { redirect: "manual" });
  const loc = r.location || "";
  const ok = r.status >= 300 && r.status < 400 && /login/i.test(loc);
  rec({ id: "QA-0209", module: "Auth/AuthZ", title: "/dashboard anon → redirect login", priority: "P0", expected: "3xx /login", actual: `${r.status} loc=${loc || "none"}`, status: ok ? "PASS" : "FAIL" });
}
{
  const r = await call("GET", "/api/settings/payment-gateways");
  const leak = r.status === 200 && /secret|privateKey|passphrase/i.test(r.text);
  const ok = (r.status === 401 || r.status === 403) && !leak;
  rec({ id: "QA-0213", module: "Auth/AuthZ", title: "gateways anon denied, no secret leak", priority: "P0", expected: "401/403 no leak", actual: `${r.status} leak=${leak}`, status: ok ? "PASS" : "FAIL", evidence: (r.text || "").slice(0, 120) });
}

// ============ LOGIN ============
{
  const r = await call("POST", "/api/auth/login", { body: { email: "qa-nobody@localhost.invalid", password: "WrongPass!123" } });
  rec({ id: "QA-0301", module: "Login", title: "invalid credentials rejected", priority: "P0", expected: "400/401", actual: String(r.status), status: r.status === 400 || r.status === 401 ? "PASS" : "FAIL" });
  {
    const lr = await call("POST", "/api/auth/login", { body: { email: process.env.QA_ADMIN_EMAIL || "admin@wall-v.com", password: process.env.QA_ADMIN_PASSWORD || "admin123" } });
    const hasToken = /token=/i.test(lr.headers["set-cookie"] || "");
    rec({ id: "QA-0302", module: "Login", title: "seeded admin login (admin@wall-v.com)", priority: "P0", expected: "200 + token cookie", actual: `${lr.status} cookie=${hasToken}`, status: lr.status === 200 && hasToken ? "PASS" : "FAIL", evidence: (lr.text || "").slice(0, 120) });
  }
  const email = `qa-rate-${Date.now()}@localhost.invalid`;
  let blocked = 0;
  const statuses = [];
  for (let i = 0; i < 8; i++) {
    const r = await call("POST", "/api/auth/login", { body: { email, password: `bad-${i}` } });
    statuses.push(r.status);
    if (r.status === 429 || r.json?.blocked || (r.json?.error || "").includes("Too many")) blocked++;
    if (blocked) break;
  }
  rec({ id: "QA-0303", module: "Login", title: "brute-force rate limit", priority: "P1", expected: "429/blocked ≤8", actual: `blocked=${blocked} via ${statuses.join(",")}`, status: blocked > 0 ? "PASS" : "FAIL" });
}

// ============ CONTACT ============
const stamp = Date.now();
const contactEmail = `qa-contact-${stamp}@localhost.invalid`;
{
  const r = await call("POST", "/api/contact", { body: { name: "QA Tester", email: contactEmail, subject: "QA smoke test", message: "Automated QA verification message." } });
  const ok = r.status >= 200 && r.status < 300;
  rec({ id: "QA-0401", module: "Contact", title: "POST /api/contact valid", priority: "P1", expected: "2xx", actual: String(r.status), status: ok ? "PASS" : "FAIL", evidence: (r.text || "").slice(0, 160), notes: "notifications field may report failed SMTP in local env — save must still succeed" });
}
{
  const r = await call("POST", "/api/contact", { body: {} });
  rec({ id: "QA-0402", module: "Contact", title: "empty contact → 400", priority: "P1", expected: "400", actual: String(r.status), status: r.status === 400 ? "PASS" : "FAIL" });
}
{
  const r = await call("GET", "/api/contact");
  rec({ id: "QA-0403", module: "Contact", title: "GET /api/contact anon denied", priority: "P1", expected: "401/403", actual: String(r.status), status: r.status === 401 || r.status === 403 ? "PASS" : "FAIL" });
}
{
  const r = await call("GET", "/api/contact", { token: adminTok });
  const found = r.status === 200 && r.text.includes(contactEmail);
  rec({ id: "QA-0404", module: "Contact", title: "admin list includes created contact", priority: "P1", expected: "200 + email in list", actual: `${r.status} found=${found}`, status: found ? "PASS" : "FAIL", evidence: found ? "present" : (r.text || "").slice(0, 100) });
}

// ============ BLOG LIFECYCLE + XSS ============
let slug = null;
const draftMarker = `QA-DRAFT-MARKER-${stamp}`;
const xssContent = `<h1>QA Head</h1><p>QA paragraph body.</p><script>window.__qa=1</script><img src=x onerror="window.__qa=1">`;
{
  const title = `QA Smoke Post ${stamp}`;
  const r = await call("POST", "/api/blog/posts", { token: adminTok, body: { title, content: xssContent, status: "draft" } });
  slug = r.json?.data?.slug || r.json?.slug || null;
  rec({ id: "QA-0501", module: "Blog", title: "admin creates draft", priority: "P1", expected: "201/200 + slug", actual: `${r.status} slug=${slug}`, status: r.status < 300 && slug ? "PASS" : "FAIL", evidence: (r.text || "").slice(0, 120) });
}
if (slug) {
  const draftTitle = `QA Smoke Post ${stamp}`;
  {
    const r = await call("GET", `/blog/${slug}`);
    const leaked = r.text.includes("QA Head") || r.text.includes(draftTitle) || r.text.includes(draftMarker);
    rec({ id: "QA-0502", module: "Blog", title: "draft page HTML contains no draft content", priority: "P1", expected: "no draft title/content in HTML", actual: `status=${r.status} leaked=${leaked}`, status: !leaked ? "PASS" : "FAIL", notes: `status ${r.status} = soft-404 (page shell, client fetch shows Post Not Found); P3 SEO nit: notFound() not called` });
  }
  {
    const r = await call("GET", "/api/blog/posts");
    const listed = r.text.includes(slug);
    rec({ id: "QA-0503", module: "Blog", title: "public list excludes drafts", priority: "P1", expected: "slug absent", actual: `${r.status} listed=${listed}`, status: r.status === 200 && !listed ? "PASS" : "FAIL" });
  }
  {
    const r = await call("GET", `/api/blog/posts/${slug}`);
    const ok = r.status === 404;
    rec({ id: "QA-0509", module: "Blog", title: "anon single-post API: draft → 404", priority: "P0", expected: "404", actual: String(r.status), status: ok ? "PASS" : "FAIL", evidence: (r.text || "").slice(0, 100) });
  }
  {
    const r = await call("POST", "/api/blog/posts", { token: adminTok, body: { title: `QA Smoke Post ${stamp}`, content: "dup", status: "draft" } });
    rec({ id: "QA-0504", module: "Blog", title: "duplicate title → 409", priority: "P1", expected: "409", actual: String(r.status), status: r.status === 409 ? "PASS" : "FAIL" });
  }
  {
    const r = await call("PUT", `/api/blog/posts/${slug}`, { token: adminTok, body: { title: `QA Smoke Post ${stamp}`, content: xssContent, status: "published" } });
    rec({ id: "QA-0505", module: "Blog", title: "publish draft via PUT", priority: "P1", expected: "2xx", actual: String(r.status), status: r.status < 300 ? "PASS" : "FAIL", evidence: (r.text || "").slice(0, 100) });
  }
  {
    const r = await call("GET", `/blog/${slug}`);
    const visible = r.status === 200 && r.text.includes("QA Head");
    const rawScript = /<script>window\.__qa=/.test(r.text);
    const rawOnerror = /onerror\s*=\s*["']?window\.__qa/.test(r.text);
    const jsonLdOk = !rawScript && !rawOnerror;
    if (rawScript) {
      const i = r.text.indexOf("<script>window.__qa=");
      fs.writeFileSync(path.join(OUT, `xss-evidence-${RUN_LABEL}.txt`), r.text.slice(Math.max(0, i - 300), i + 300));
    }
    rec({ id: "QA-0506", module: "Blog/Security", title: "published page: content shown, no executable payload in HTML", priority: "P1", expected: "200 + QA Head + NO raw <script>/onerror anywhere in HTML", actual: `status=${r.status} visible=${visible} rawScript=${rawScript} rawOnerror=${rawOnerror}`, status: visible && jsonLdOk ? "PASS" : "FAIL", evidence: rawScript ? "raw <script> payload found in server HTML (see xss-evidence file)" : "no raw payload", notes: "payload source: JSON-LD description falls back to content.substring(0,160) when excerpt missing; JsonLd renders JSON.stringify without < escaping" });
  }
  {
    const api = await call("GET", `/api/blog/posts/${slug}`);
    const ok = api.status === 200 && !!api.json?.success;
    rec({ id: "QA-0508", module: "Blog", title: "published post API 200 JSON (raw HTML by design; client sanitizes via DOMPurify)", priority: "P2", expected: "200 JSON", actual: `${api.status}`, status: ok ? "PASS" : "FAIL", notes: "client-side DOMPurify sanitization NOT verified in browser → marked NOT RUN for runtime sanitization claim" });
  }
  {
    const r = await call("DELETE", `/api/blog/posts/${slug}`, { token: adminTok });
    const after = await call("GET", `/blog/${slug}`);
    const stillThere = after.text.includes("QA Head") && /<script>window\.__qa=/.test(after.text);
    rec({ id: "QA-0507", module: "Blog", title: "delete test post → content gone from public page", priority: "P1", expected: "2xx + no content", actual: `del=${r.status} page=${after.status} stillThere=${stillThere}`, status: r.status < 300 && !stillThere ? "PASS" : "FAIL" });
  }
} else {
  for (const id of ["QA-0502", "QA-0503", "QA-0504", "QA-0505", "QA-0506", "QA-0507", "QA-0508", "QA-0509"])
    rec({ id, module: "Blog", title: "skipped: create failed", priority: "P1", expected: "-", actual: "-", status: "BLOCKED", notes: "QA-0501 failed" });
}

// ============ SEARCH / AI / UPLOAD ============
{
  const r = await call("GET", "/api/search?q=test");
  rec({ id: "QA-0601", module: "Search", title: "GET /api/search?q=test", priority: "P2", expected: "2xx", actual: String(r.status), status: r.status >= 200 && r.status < 300 ? "PASS" : "FAIL" });
}
{
  const r = await call("POST", "/api/ai/chat", { body: { messages: [{ role: "user", content: "hi" }] } });
  const isJson = !!r.json;
  const leak = /api[_-]?key\s*[:=]\s*["']|sk-[A-Za-z0-9]{10,}|node_modules\//.test(r.text);
  rec({ id: "QA-0701", module: "AI", title: "AI chat anon with valid body: controlled response, no leak", priority: "P1", expected: "JSON, no stack/secret leak (endpoint public by design: 20 req/min/IP)", actual: `${r.status} json=${isJson} leak=${leak}`, status: isJson && !leak ? "PASS" : "FAIL", evidence: (r.text || "").slice(0, 140), notes: "public chat widget endpoint (chat-interface.tsx); protected only by rate limit" });
  rec({ id: "QA-0702", module: "AI", title: "AI chat admin controlled error (invalid provider creds)", priority: "P1", expected: "JSON error, no leak", actual: "covered by QA-0701 request path", status: "NOT RUN", notes: "same code path as QA-0701 (no auth branch); provider creds unusable in env" });
}
{
  const anon = await call("POST", "/api/upload");
  rec({ id: "QA-0801", module: "Upload", title: "upload anon → denied", priority: "P1", expected: "401/403", actual: String(anon.status), status: anon.status === 401 || anon.status === 403 ? "PASS" : "FAIL" });
  const fd = new FormData();
  fd.append("file", new Blob(["definitely not a png"], { type: "text/plain" }), "qa-fake.png");
  const r = await call("POST", "/api/upload", { token: adminTok, body: fd });
  rec({ id: "QA-0802", module: "Upload", title: "text file as .png rejected", priority: "P1", expected: "400/415", actual: String(r.status), status: r.status >= 400 && r.status < 500 ? "PASS" : "FAIL", evidence: (r.text || "").slice(0, 120) });
}

// ============ PAYMENTS / SOCIAL ============
{
  const r = await call("POST", "/api/webhooks/2checkout", { body: { bogus: "1" } });
  rec({ id: "QA-0901", module: "Payments", title: "2Checkout IPN w/o hash → 4xx", priority: "P1", expected: "4xx not 500", actual: String(r.status), status: r.status >= 400 && r.status < 500 ? "PASS" : "FAIL", evidence: (r.text || "").slice(0, 80) });
  const inv = await call("GET", "/api/invoices", { token: adminTok });
  rec({ id: "QA-0902", module: "Payments", title: "admin GET /api/invoices", priority: "P1", expected: "2xx", actual: String(inv.status), status: inv.status >= 200 && inv.status < 300 ? "PASS" : "FAIL" });
  const pay = await call("GET", "/api/payments", { token: adminTok });
  rec({ id: "QA-0903", module: "Payments", title: "admin GET /api/payments", priority: "P1", expected: "2xx", actual: String(pay.status), status: pay.status >= 200 && pay.status < 300 ? "PASS" : "FAIL" });
}
{
  const r = await call("GET", "/api/social/jobs", { token: adminTok });
  const n = Array.isArray(r.json?.jobs) ? `jobs=${r.json.jobs.length}` : Array.isArray(r.json?.data) ? `data=${r.json.data.length}` : typeof r.json;
  rec({ id: "QA-1001", module: "Social", title: "admin GET /api/social/jobs", priority: "P1", expected: "200 list", actual: `${r.status} ${n}`, status: r.status === 200 ? "PASS" : "FAIL" });
  const bad = await call("POST", "/api/social/jobs", { token: adminTok, body: { platform: "not-a-platform" } });
  rec({ id: "QA-1002", module: "Social", title: "POST /api/social/jobs handled (405: route is GET-only)", priority: "P3", expected: "405/4xx (no POST route)", actual: String(bad.status), status: bad.status === 405 ? "PASS" : bad.status >= 400 && bad.status < 500 ? "PASS" : "FAIL", notes: "enqueue path is /api/content/publish (covered by prior smoke)" });
}

// ============ ROBUSTNESS / CLIENT / PREVIEW ============
{
  const r = await call("GET", "/api/health");
  rec({ id: "QA-1101", module: "Health", title: "/api/health + mongo", priority: "P0", expected: "200 connected", actual: `${r.status} ${r.json?.mongodb}`, status: r.status === 200 && r.json?.mongodb === "connected" ? "PASS" : "FAIL" });
  const n = await call("GET", "/api/no-such-endpoint-qa");
  rec({ id: "QA-1102", module: "Robustness", title: "unknown API → 404", priority: "P2", expected: "404", actual: String(n.status), status: n.status === 404 ? "PASS" : "FAIL" });
  const m = await call("DELETE", "/api/health");
  rec({ id: "QA-1103", module: "Robustness", title: "DELETE /api/health → 405", priority: "P3", expected: "405", actual: String(m.status), status: m.status === 405 ? "PASS" : "FAIL" });
  const api = await call("GET", "/api/previews/qa-bogus-token-123");
  rec({ id: "QA-1104", module: "Preview", title: "bogus preview token API → denied", priority: "P1", expected: "401/404", actual: String(api.status), status: api.status === 401 || api.status === 404 ? "PASS" : "FAIL", evidence: (api.text || "").slice(0, 100), notes: "/preview page itself returns 200 shell (client-side fetch); P3 soft-404" });
  const prof = await call("GET", "/api/client/profile", { token: custTok });
  const anonProf = await call("GET", "/api/client/profile");
  rec({ id: "QA-1201", module: "Client", title: "profile token 200 / anon 401", priority: "P1", expected: "200 / 401", actual: `${prof.status} / ${anonProf.status}`, status: prof.status === 200 && (anonProf.status === 401 || anonProf.status === 403) ? "PASS" : "FAIL" });
}

// ============ E2E JOURNEYS ============
{
  const list = await call("GET", "/api/blog/posts");
  const posts = list.json?.data || list.json?.posts || list.json || [];
  const first = Array.isArray(posts) && posts.length ? posts[0] : null;
  if (first?.slug) {
    const page = await call("GET", `/blog/${first.slug}`);
    const api = await call("GET", `/api/blog/posts/${first.slug}`);
    rec({ id: "QA-1301", module: "E2E Visitor", title: "visitor: blog list → first published post page", priority: "P2", expected: "200", actual: `${page.status} (slug=${first.slug})`, status: page.status === 200 ? "PASS" : "FAIL" });
    rec({ id: "QA-1302", module: "E2E Visitor", title: "visitor: published post API serves data", priority: "P2", expected: "200 JSON", actual: String(api.status), status: api.status === 200 ? "PASS" : "FAIL" });
  } else {
    rec({ id: "QA-1301", module: "E2E Visitor", title: "blog list → first published post", priority: "P2", expected: "200", actual: `no published posts in list (len=${Array.isArray(posts) ? posts.length : "n/a"})`, status: "NOT RUN", notes: "no published post available in local DB" });
    rec({ id: "QA-1302", module: "E2E Visitor", title: "published post API", priority: "P2", expected: "200", actual: "-", status: "NOT RUN", notes: "depends on QA-1301" });
  }
  {
    const home = await call("GET", "/");
    const hasLoginLink = /\/login|Sign in|Log in/i.test(home.text);
    const loginPage = await call("GET", "/login");
    const hasForm = /password/i.test(loginPage.text);
    rec({ id: "QA-1303", module: "E2E Visitor", title: "visitor: home → login page renders form", priority: "P2", expected: "200 + password field", actual: `home200=${home.status === 200} link=${hasLoginLink} form=${hasForm}`, status: loginPage.status === 200 && hasForm ? "PASS" : "FAIL" });
  }
}

const counts = results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
console.log("\n=== SUMMARY", RUN_LABEL, "===");
console.log(JSON.stringify(counts), "TOTAL", results.length);
fs.writeFileSync(path.join(OUT, `harness2-${RUN_LABEL}.json`), JSON.stringify({ run: RUN_LABEL, generatedAt: new Date().toISOString(), counts, results }, null, 2));
console.log(`written: harness2-${RUN_LABEL}.json`);
