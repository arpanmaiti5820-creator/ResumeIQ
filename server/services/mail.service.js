const nodemailer = require('nodemailer');
const config = require('../config/env');

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return transporter;
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Sends the password reset email.
 * Without SMTP configured it prints the link to the console and returns { sent:false, devUrl }.
 */
async function sendResetEmail(user, resetUrl) {
  if (!config.smtpConfigured) {
    console.log(`\n[mail] SMTP not configured. Password reset link for ${user.email}:\n${resetUrl}\n`);
    return { sent: false, devUrl: resetUrl };
  }
  const name = escapeHtml(user.name.split(' ')[0]);
  await getTransporter().sendMail({
    from: config.mailFrom,
    to: user.email,
    subject: 'Reset your ResumeIQ password',
    text: `Hi ${user.name.split(' ')[0]},\n\nUse this link to set a new password (valid for 15 minutes):\n${resetUrl}\n\nIf you didn't ask for this, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#12151f">
      <h2 style="margin:0 0 12px">Reset your password</h2>
      <p>Hi ${name}, use the button below to set a new password. The link works for 15 minutes.</p>
      <p><a href="${resetUrl}" style="display:inline-block;background:#12151f;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Set a new password</a></p>
      <p style="font-size:13px;color:#667">If you didn't ask for this, you can ignore this email.</p>
    </div>`,
  });
  return { sent: true };
}

module.exports = { sendResetEmail };
