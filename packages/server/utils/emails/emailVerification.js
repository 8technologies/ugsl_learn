import jwt from "jsonwebtoken";
import { CLIENT_URL, PRIVATE_KEY } from "../../config/config.js";
import sendEmail from "./email_server.js";

// A separate secret means a verification token can never be used as a
// session token (or the other way round).
const VERIFY_SECRET = `${PRIVATE_KEY}:verify-email`;
const VERIFY_EXPIRES_IN = "24h";

export const createVerificationToken = (user) =>
  jwt.sign({ id: user.id, email: user.email }, VERIFY_SECRET, {
    expiresIn: VERIFY_EXPIRES_IN,
  });

// Returns { id, email } or null if the token is invalid or expired
export const readVerificationToken = (token) => {
  try {
    const { id, email } = jwt.verify(token, VERIFY_SECRET);
    return id && email ? { id, email } : null;
  } catch {
    return null;
  }
};

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const sendVerificationEmail = async (user) => {
  const link = `${CLIENT_URL}/verify-email?token=${encodeURIComponent(createVerificationToken(user))}`;
  const name = escapeHtml(user.name || "there");

  await sendEmail({
    to: user.email,
    from: '"UGSL Learn" <info@ict4personswithdisabilities.org>',
    subject: "Verify your UGSL Learn email",
    message: `Hi ${user.name || "there"},\n\nWelcome to UGSL Learn! Confirm your email address by opening this link:\n\n${link}\n\nThe link expires in 24 hours. If you didn't create an account, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #1c1f3b;">Welcome to UGSL Learn, ${name}!</h2>
        <p>Confirm your email address to start learning.</p>
        <p style="margin: 28px 0;">
          <a href="${link}" style="background: #f97316; color: #ffffff; padding: 12px 22px; border-radius: 10px; text-decoration: none; font-weight: bold;">
            Verify my email
          </a>
        </p>
        <p style="font-size: 13px; color: #6b7280;">Or paste this link into your browser:<br><a href="${link}">${link}</a></p>
        <p style="font-size: 13px; color: #6b7280;">The link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
      </div>`,
  });
};
