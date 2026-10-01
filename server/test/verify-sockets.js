/*
 * Verifies the server-authoritative socket relays (audit fixes 2 & 3).
 * Usage: node test/verify-sockets.js   (server must be running on :5000)
 */

const { io } = require("socket.io-client");

const BASE = "http://localhost:5000/api";
const WS = "http://localhost:5000";

let passed = 0;
let failed = 0;
const results = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  ok ? passed++ : failed++;
};

const auth = (t) => ({ "Content-Type": "application/json", Authorization: `Bearer ${t}` });

async function mk(name) {
  const stamp = Date.now();
  const email = `${name}-${stamp}@example.com`;
  await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password: "testpass123" }),
  });
  const login = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "testpass123" }),
  });
  return login.json();
}

const connect = (token) =>
  new Promise((resolve, reject) => {
    const s = io(WS, { auth: { token }, transports: ["websocket"] });
    s.on("connect", () => resolve(s));
    s.on("connect_error", reject);
    setTimeout(() => reject(new Error("socket connect timeout")), 5000);
  });

const waitFor = (socket, event, ms) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

async function main() {
  const alice = await mk("socktest-alice");
  const bob = await mk("socktest-bob");
  const intruder = await mk("socktest-intruder");

  const [sa, sb, si] = await Promise.all([
    connect(alice.token),
    connect(bob.token),
    connect(intruder.token),
  ]);
  check("setup: three sockets connected", sa.connected && sb.connected && si.connected);

  // 1. Legit send reaches the other party with a server-built payload
  const msg1 = await (
    await fetch(`${BASE}/messages`, {
      method: "POST",
      headers: auth(alice.token),
      body: JSON.stringify({ receiver: bob._id, message: "hello-bob" }),
    })
  ).json();
  sa.emit("send_message", msg1);
  const got1 = await waitFor(sb, "receive_message", 2000);
  check("relay: legit DM delivered to recipient", !!got1 && got1._id === msg1._id && got1.message === "hello-bob");

  // 2. Forged relay: bob re-emits alice's message id — sender !== bob,
  // so alice must NOT get another receive_message
  sb.emit("send_message", msg1);
  const got2 = await waitFor(sa, "receive_message", 1500);
  check("relay: forged send_message dropped", got2 === null);

  // 3. Unauthenticated join_group is refused; member still gets group messages
  const grp = await (
    await fetch(`${BASE}/groups`, {
      method: "POST",
      headers: auth(alice.token),
      body: JSON.stringify({ name: `sockgrp-${Date.now()}`, members: [bob._id] }),
    })
  ).json();
  si.emit("join_group", grp._id); // intruder is not a member
  await new Promise((r) => setTimeout(r, 500));
  const gmsg = await (
    await fetch(`${BASE}/messages`, {
      method: "POST",
      headers: auth(alice.token),
      body: JSON.stringify({ group: grp._id, message: "group-secret" }),
    })
  ).json();
  sa.emit("send_message", gmsg);
  const gotMember = await waitFor(sb, "receive_message", 2000);
  const gotIntruder = await waitFor(si, "receive_message", 1000);
  check("groups: member receives group message", !!gotMember && gotMember._id === gmsg._id);
  check("groups: non-member join_group refused", gotIntruder === null || gotIntruder._id !== gmsg._id);

  // 4. Forged delete announcement is dropped
  sb.emit("delete_message", { messageId: msg1._id }); // bob is not the sender
  const gotDel = await waitFor(sa, "message_deleted", 1500);
  check("delete: forged message_deleted dropped", gotDel === null);

  // 5. Burn announcement from a third party is dropped
  const burn = await (
    await fetch(`${BASE}/messages`, {
      method: "POST",
      headers: auth(alice.token),
      body: JSON.stringify({ receiver: bob._id, message: "burn-me", isBurnAfterReading: true, burnDuration: 5 }),
    })
  ).json();
  si.emit("message_burned", { messageId: burn._id }); // intruder is not a party
  const gotBurn = await waitFor(sb, "message_burned", 1500);
  check("burn: third-party message_burned dropped", gotBurn === null);

  [sa, sb, si].forEach((s) => s.disconnect());
  console.log("\n================ SOCKET VERIFICATION ================");
  results.forEach((r) => console.log(r));
  console.log("------------------------------------------------------");
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("SOCKET TEST CRASHED:", err);
  process.exit(1);
});
