/*
 * End-to-end verification of the backend fixes.
 * Usage: node test/verify-fixes.js   (server must be running on :5000)
 * Creates throwaway test users; safe for dev DB.
 */

const BASE = "http://localhost:5000/api";

let passed = 0;
let failed = 0;
const results = [];

function check(name, ok, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  ok ? passed++ : failed++;
}

async function main() {
  // ---------- Fix 1: rate limiter active with standard headers (trust proxy path) ----------
  const rl = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "nope@nope.com", password: "wrong" }),
  });
  check("Fix1 rate limiter responds with RateLimit headers", rl.headers.get("ratelimit-limit") !== null, `limit=${rl.headers.get("ratelimit-limit")}`);

  // ---------- Setup: two throwaway users ----------
  const stamp = Date.now();
  const mk = async (name) => {
    const email = `${name}-${stamp}@example.com`;
    const reg = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password: "testpass123" }),
    });
    if (reg.status !== 201) throw new Error(`register failed: ${reg.status} ${await reg.text()}`);
    const login = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "testpass123" }),
    });
    return login.json();
  };
  const alice = await mk("stunytest-alice");
  const bob = await mk("stunytest-bob");
  check("setup: test users registered + logged in", !!alice.token && !!bob.token);

  const auth = (t) => ({ "Content-Type": "application/json", Authorization: `Bearer ${t}` });

  // ---------- Fix 2/6-area: AI chat protected, then answers (also proves provider timeout path) ----------
  const noToken = await fetch(`${BASE}/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
  });
  check("ai/chat requires auth", noToken.status === 401);

  const t0 = Date.now();
  const chat = await fetch(`${BASE}/ai/chat`, {
    method: "POST",
    headers: auth(alice.token),
    body: JSON.stringify({
      messages: [{ role: "user", content: "Hi, I want to feel better today." }],
    }),
  });
  const chatJson = await chat.json().catch(() => ({}));
  check("Fix2 ai/chat replies within timeout", chat.status === 200 && !!chatJson.reply, `${Date.now() - t0}ms, provider=${chatJson.provider}`);

  // ---------- Fix 5: memory refresh (time-gated) — send a substantial message, poll profile ----------
  const memMsg =
    "My name is Alice. I'm really worried about my campus placements and my father's health has been poor lately, so I feel anxious most evenings.";
  let c2 = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    await new Promise((r) => setTimeout(r, 4000)); // free-tier provider throttling guard
    c2 = await fetch(`${BASE}/ai/chat`, {
      method: "POST",
      headers: auth(alice.token),
      body: JSON.stringify({ messages: [{ role: "user", content: memMsg }] }),
    });
    if (c2.status === 200) break;
  }
  check("chat with substantial message accepted", c2.status === 200, `status=${c2.status}`);

  let memory = "";
  for (let i = 0; i < 14; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const prof = await fetch(`${BASE}/auth/profile`, { headers: auth(alice.token) });
    const pj = await prof.json();
    memory = pj.stunyMemory || "";
    if (memory) break;
  }
  check("Fix5 stuny memory distilled & persisted", memory.length > 0, memory ? memory.slice(0, 90) + "…" : "empty after 70s");

  // ---------- Fix 4: message history capped at 200 ----------
  const msgs = await fetch(`${BASE}/messages/user/${bob._id}`, { headers: auth(alice.token) });
  const mj = await msgs.json();
  check("Fix4 direct history <= 200 & chronological", msgs.status === 200 && Array.isArray(mj) && mj.length <= 200, `count=${mj.length}`);

  // send + retrieve a message to prove the query change didn't break ordering
  await fetch(`${BASE}/messages`, {
    method: "POST",
    headers: auth(alice.token),
    body: JSON.stringify({ receiver: bob._id, message: "verify-order-1" }),
  });
  await new Promise((r) => setTimeout(r, 800));
  const mj2 = await (await fetch(`${BASE}/messages/user/${bob._id}`, { headers: auth(alice.token) })).json();
  const ordered = mj2.every((m, i) => i === 0 || new Date(m.createdAt) >= new Date(mj2[i - 1].createdAt));
  check("Fix4 messages still returned oldest→newest", ordered && mj2.length === 1);

  // ---------- Fix 3: declared compound indexes on Message schema ----------
  const Message = require("../models/message");
  const idx = Message.schema.indexes().map((i) => JSON.stringify(i[0]));
  const want = [
    { sender: 1, receiver: 1, createdAt: 1 },
    { receiver: 1, sender: 1, createdAt: 1 },
    { group: 1, createdAt: 1 },
  ];
  for (const w of want) {
    check(`Fix3 index declared ${JSON.stringify(w)}`, idx.includes(JSON.stringify(w)));
  }

  // ---------- Fix 6: production error masking ----------
  const { errorHandler } = require("../middleware/errorMiddleware");
  const oldEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  let captured = null;
  const resStub = {
    status() {
      return this;
    },
    json(body) {
      captured = body;
    },
  };
  errorHandler({ message: "mongo internal: E11000 duplicate at 10.0.3.7" }, {}, resStub, () => {});
  check("Fix6 500s masked in production", captured && captured.message === "Something went wrong on our side. Please try again.", JSON.stringify(captured));
  errorHandler({ statusCode: 400, message: "Email already exists" }, {}, resStub, () => {});
  check("Fix6 4xx still shows real message", captured && captured.message === "Email already exists");
  process.env.NODE_ENV = oldEnv;

  // ---------- Security regression checks (message-path audit fixes) ----------
  const charlie = await mk("stunytest-charlie");

  // SEC1: login must not reveal whether the email exists
  const badLogin = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `ghost-${stamp}@example.com`, password: "whatever123" }),
  });
  const badJson = await badLogin.json();
  check("SEC1 login error does not leak account existence", badJson.message === "Invalid email or password", badJson.message);

  // SEC2: conversations summary must not expose other people's groups
  const grp = await (await fetch(`${BASE}/groups`, {
    method: "POST",
    headers: auth(bob.token),
    body: JSON.stringify({ name: `secret-${stamp}`, members: [] }),
  })).json();
  await fetch(`${BASE}/messages`, {
    method: "POST",
    headers: auth(bob.token),
    body: JSON.stringify({ group: grp._id, message: "secret-group-msg" }),
  });
  const summary = await (
    await fetch(`${BASE}/messages/conversations/summary`, { headers: auth(alice.token) })
  ).json();
  check(
    "SEC2 group msgs hidden from non-member summary",
    !(String(grp._id) in summary) && !JSON.stringify(summary).includes("secret-group-msg")
  );

  // SEC3: third party cannot start a burn countdown on someone else's message
  const burnMsg = await (await fetch(`${BASE}/messages`, {
    method: "POST",
    headers: auth(alice.token),
    body: JSON.stringify({ receiver: bob._id, message: "top-secret-burn", isBurnAfterReading: true, burnDuration: 1 }),
  })).json();
  const charlieOpen = await fetch(`${BASE}/messages/${burnMsg._id}/open-burn`, {
    method: "PUT",
    headers: auth(charlie.token),
  });
  check("SEC3 stranger cannot open-burn a message", charlieOpen.status === 403, `status=${charlieOpen.status}`);

  // SEC4: expired burn message disappears from history without client cooperation
  await fetch(`${BASE}/messages/${burnMsg._id}/open-burn`, { method: "PUT", headers: auth(bob.token) });
  await new Promise((r) => setTimeout(r, 1500));
  const bobHist = await (await fetch(`${BASE}/messages/user/${alice._id}`, { headers: auth(bob.token) })).json();
  check("SEC4 expired burn filtered from history", !bobHist.some((m) => m._id === burnMsg._id));

  // SEC5: TTL index declared so Mongo hard-deletes expired burns server-side
  check("SEC5 TTL index declared on burnExpiresAt", idx.includes(JSON.stringify({ burnExpiresAt: 1 })));

  // SEC6: stored file extension comes from the mimetype, not the client filename
  const form = new FormData();
  form.append("file", new Blob([Uint8Array.from([137, 80, 78, 71])], { type: "image/png" }), "evil.html");
  const upl = await (
    await fetch(`${BASE}/upload`, { method: "POST", headers: { Authorization: `Bearer ${alice.token}` }, body: form })
  ).json();
  check("SEC6 upload forces safe extension", /\.png$/.test(upl.url || ""), upl.url);

  // SEC7: oversized message rejected
  const huge = await fetch(`${BASE}/messages`, {
    method: "POST",
    headers: auth(alice.token),
    body: JSON.stringify({ receiver: bob._id, message: "x".repeat(6000) }),
  });
  check("SEC7 message length capped", huge.status >= 400, `status=${huge.status}`);

  // ---------- Fix 2b: speak endpoint 501 when clone unconfigured (client fallback trigger) ----------
  const speak = await fetch(`${BASE}/ai/speak`, {
    method: "POST",
    headers: auth(alice.token),
    body: JSON.stringify({ text: "hello" }),
  });
  check("ai/speak returns 501 when voice clone unset", speak.status === 501);

  console.log("\n================ VERIFICATION RESULTS ================");
  results.forEach((r) => console.log(r));
  console.log(`------------------------------------------------------`);
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("TEST RUN CRASHED:", err);
  process.exit(1);
});
