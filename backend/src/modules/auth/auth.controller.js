import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sql from "mssql";
import nodemailer from "nodemailer";
import { getPool } from "../../config/db.js";
import { getTransporter, FROM } from "../../config/mailer.js";

const OTP_EXPIRES_MIN = Number(process.env.OTP_EXPIRES_MIN || 5);

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function requestOtp(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ message: "Email required" });
    if (!isValidEmail(email)) return res.status(400).json({ message: "Invalid email" });

    const pool = await getPool();

    // Find or create user
    const userResult = await pool
      .request()
      .input("email", sql.NVarChar(255), email)
      .query("SELECT TOP 1 * FROM Users WHERE email = @email");

    let user = userResult.recordset[0];

    if (!user) {
      const fullName = email.split("@")[0];

      const insert = await pool
        .request()
        .input("email", sql.NVarChar(255), email)
        .input("fullName", sql.NVarChar(120), fullName)
        .query(`
          INSERT INTO Users (email, fullName)
          OUTPUT INSERTED.*
          VALUES (@email, @fullName)
        `);

      user = insert.recordset[0];
    }

    if (user?.isActive === false) {
      return res.status(403).json({ message: "User is deactivated" });
    }

    // Create OTP
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_MIN * 60 * 1000);

    // Store OTP (hashed)
    await pool
      .request()
      .input("userId", sql.Int, user.id)
      .input("otpHash", sql.NVarChar(255), otpHash)
      .input("expiresAt", sql.DateTime2, expiresAt)
      .query(`
        INSERT INTO UserOtps (userId, otpHash, expiresAt)
        VALUES (@userId, @otpHash, @expiresAt)
      `);

    // Send email (Ethereal in dev OR real SMTP if configured)
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || "no-reply@moneytransfer.local",
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is ${otp}. It expires in ${OTP_EXPIRES_MIN} minutes.`,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log("🔗 Ethereal Preview URL:", previewUrl);

    return res.json({
      message: "OTP sent to email",
      previewUrl, // helps evaluator open the email (Ethereal only)
    });
  } catch (err) {
    console.error("requestOtp error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// keep your verifyOtp unchanged



export async function verifyOtp(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP required" });
    }

    const pool = await getPool();

    const result = await pool
      .request()
      .input("email", sql.NVarChar(255), email)
      .query(`
        SELECT TOP 1
          u.id AS userId,
          u.email,
          u.isActive,
          o.id AS otpId,
          o.otpHash,
          o.expiresAt,
          o.consumedAt
        FROM Users u
        JOIN UserOtps o ON u.id = o.userId
        WHERE u.email = @email
        ORDER BY o.createdAt DESC
      `);

    const record = result.recordset[0];
    if (!record) return res.status(400).json({ message: "No OTP found. Request OTP first." });

    if (record.isActive === false) {
      return res.status(403).json({ message: "User is deactivated" });
    }

    if (record.consumedAt) {
      return res.status(400).json({ message: "OTP already used. Request a new OTP." });
    }

    if (new Date(record.expiresAt) < new Date()) {
      return res.status(400).json({ message: "OTP expired. Request a new OTP." });
    }

    const match = await bcrypt.compare(otp, record.otpHash);
    if (!match) return res.status(400).json({ message: "Invalid OTP" });

    await pool
      .request()
      .input("otpId", sql.Int, record.otpId)
      .query(`
        UPDATE UserOtps
        SET consumedAt = SYSDATETIME()
        WHERE id = @otpId
      `);

    const secret = process.env.JWT_SECRET || "dev-secret";
    const token = jwt.sign(
      { userId: record.userId, email: record.email },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    return res.json({ token });
  } catch (err) {
    console.error("verifyOtp error:", err);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
}
