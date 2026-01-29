import nodemailer from "nodemailer";

// Default FROM (works for both real SMTP + Ethereal preview)
export const FROM =
  process.env.MAIL_FROM || "Money Transfer <no-reply@moneytransfer.local>";

let cachedTransporter = null;

/**
 * Uses real SMTP if MAIL_HOST + MAIL_USER + MAIL_PASS exist.
 * Otherwise uses Ethereal (dev inbox + preview URL).
 */
export async function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.MAIL_HOST;
  const port = Number(process.env.MAIL_PORT || 587);
  const secure = String(process.env.MAIL_SECURE || "false") === "true";
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;

  const hasRealSmtp = Boolean(host && user && pass);

  if (hasRealSmtp) {
    console.log("📧 Using real SMTP mailer:", host, port);

    const t = nodemailer.createTransport({
      host,
      port,
      secure, // true for 465, false for 587
      auth: { user, pass },
    });

    // verify should NOT crash your server if creds are wrong
    try {
      await t.verify();
      console.log("✅ Mailer ready");
    } catch (e) {
      console.log("❌ Mailer verify failed:", e?.message || e);
      // still return transporter; requestOtp will show real error if send fails
    }

    cachedTransporter = t;
    return cachedTransporter;
  }

  // ---- Ethereal fallback (best for assessment evaluators) ----
  console.log("📧 Using Ethereal test mailer (no real SMTP creds found)");

  const testAccount = await nodemailer.createTestAccount();

  const t = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  try {
    await t.verify();
    console.log("✅ Ethereal mailer ready");
    console.log("👤 Ethereal user:", testAccount.user);
  } catch (e) {
    console.log("❌ Ethereal verify failed:", e?.message || e);
  }

  cachedTransporter = t;
  return cachedTransporter;
}

// Backward-compatible named export (so older imports won’t crash).
// This is created lazily. If you import `transporter`, it will be a Promise-like situation,
// so DON’T use this in new code; prefer getTransporter().
export const transporter = {
  async sendMail(opts) {
    const t = await getTransporter();
    return t.sendMail(opts);
  },
};
