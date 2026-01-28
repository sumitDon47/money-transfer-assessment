import nodemailer from "nodemailer";

export const FROM = process.env.MAIL_FROM || process.env.MAIL_USER;

export const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || 587),
  secure: String(process.env.MAIL_SECURE || "false") === "true", // true only for 465
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});
