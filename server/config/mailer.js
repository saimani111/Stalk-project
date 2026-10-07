const nodemailer = require("nodemailer");
const net = require("net");
const { promises: dns } = require("dns");

// Transports cached per resolved host so an SMTP connection pool is reused.
const transports = new Map();
// Outcome of the most recent send attempt, exposed via /api/ai/status so SMTP
// health can be verified without dashboard log access.
let lastMailResult = null;

// Render free tier has no IPv6 egress and nodemailer dials a random address from
// the resolved pool, so sends intermittently died with ENETUNREACH on Gmail's
// AAAA record. Resolving to an IPv4 literal keeps the connect on IPv4.
async function resolveIPv4(host) {
  let timer;
  try {
    const lookup = dns.lookup(host, { family: 4 }).then(r => r.address);
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("DNS lookup timed out")), 5000);
      timer.unref();
    });
    return await Promise.race([lookup, timeout]);
  } catch {
    return host;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Gmail: create an App Password at https://myaccount.google.com/apppasswords
// then set SMTP_HOST=smtp.gmail.com SMTP_PORT=465 SMTP_USER=you@gmail.com SMTP_PASS=xxxx
function isConfigured() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

async function getTransporter() {
  if (!isConfigured()) return null;
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  const host = net.isIP(SMTP_HOST) ? SMTP_HOST : await resolveIPv4(SMTP_HOST);
  if (transports.has(host)) return transports.get(host);
  const port = Number(process.env.SMTP_PORT || 465);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port !== 587,
    // Hostname is still needed for TLS SNI and the server's certificate check.
    servername: net.isIP(SMTP_HOST) ? undefined : SMTP_HOST,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
  transports.set(host, transporter);
  return transporter;
}

// Returns false (instead of throwing) when mail is unconfigured so callers
// can fall back to dev-mode behaviour.
async function sendMail({ to, subject, html }) {
  const t = await getTransporter();
  if (!t) {
    lastMailResult = { ok: false, reason: "unconfigured", to, subject, at: new Date().toISOString() };
    console.log(`[mail:unconfigured] to=${to} subject="${subject}"`);
    return false;
  }
  try {
    await t.sendMail({
      from: `"Stalk" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    lastMailResult = { ok: true, to, subject, at: new Date().toISOString() };
    console.log(`[mail:sent] to=${to} subject="${subject}"`);
    return true;
  } catch (err) {
    lastMailResult = {
      ok: false,
      reason: err.message.slice(0, 300),
      to,
      subject,
      at: new Date().toISOString(),
    };
    throw err;
  }
}

function getMailStatus() {
  return { configured: isConfigured(), last: lastMailResult };
}

module.exports = { sendMail, getMailStatus };
