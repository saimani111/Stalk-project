const nodemailer = require("nodemailer");

let transporter = null;
// Outcome of the most recent send attempt, exposed via /api/ai/status so SMTP
// health can be verified without dashboard log access.
let lastMailResult = null;

// Gmail: create an App Password at https://myaccount.google.com/apppasswords
// then set SMTP_HOST=smtp.gmail.com SMTP_PORT=465 SMTP_USER=you@gmail.com SMTP_PASS=xxxx
function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) !== 587,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

// Returns false (instead of throwing) when mail is unconfigured so callers
// can fall back to dev-mode behaviour.
async function sendMail({ to, subject, html }) {
  const t = getTransporter();
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
  return { configured: !!getTransporter(), last: lastMailResult };
}

module.exports = { sendMail, getMailStatus };
