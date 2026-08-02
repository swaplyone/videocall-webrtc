import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { query } from '../db.js';

dotenv.config();

const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587', 10);
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@swaply.app';

let transporter = null;
let mockMode = false;

// Initialize Transporter
if (EMAIL_HOST && EMAIL_USER && EMAIL_PASSWORD) {
  try {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465, // true for 465, false for other ports
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 5000 // 5 seconds timeout
    });
  } catch (err) {
    console.warn('⚠️ NodeMailer initialization failed. Falling back to local logging mode:', err.message);
    mockMode = true;
  }
} else {
  console.log('ℹ️ SMTP credentials not fully configured. Email service will run in local logging fallback mode.');
  mockMode = true;
}

/**
 * Log email status to database and optionally write local fallback files.
 */
async function logEmail({ userId, recipient, emailType, status, providerId, content }) {
  try {
    const insertRes = await query(
      `INSERT INTO email_logs (user_id, recipient, email_type, status, provider_id, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [userId || null, recipient, emailType, status, providerId || null, status === 'SENT' ? new Date() : null]
    );
    
    // For local testing fallback, also save email contents to disk
    if (mockMode || status === 'FAILED') {
      const logDir = path.join(path.resolve(), 'logs', 'emails');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const logFile = path.join(logDir, `${Date.now()}_${emailType.replace(/\s+/g, '_')}_${recipient.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
      fs.writeFileSync(logFile, JSON.stringify({
        dbLogId: insertRes.rows[0]?.id,
        userId,
        recipient,
        emailType,
        status,
        providerId,
        content,
        timestamp: new Date().toISOString()
      }, null, 2));
    }
    
    return insertRes.rows[0]?.id;
  } catch (err) {
    console.error('Error logging email activity to database:', err);
    return null;
  }
}

/**
 * Validates the SMTP connection (Module 2).
 */
export async function validateConnection() {
  if (mockMode || !transporter) {
    return { success: true, message: 'Running in Local Logging Fallback Mode (No active SMTP connection).' };
  }
  try {
    await transporter.verify();
    return { success: true, message: 'SMTP connection validated successfully.' };
  } catch (err) {
    console.error('SMTP Connection Validation Failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Base dispatcher to send HTML/text emails.
 */
async function dispatchEmail({ userId, to, subject, html, text, emailType }) {
  const mailOptions = {
    from: EMAIL_FROM,
    to,
    subject,
    html,
    text
  };

  if (mockMode || !transporter) {
    // Simulated delivery success
    const providerId = `mock_msg_${Math.random().toString(36).substring(2, 10)}`;
    const logId = await logEmail({
      userId,
      recipient: to,
      emailType,
      status: 'SENT',
      providerId,
      content: { subject, html, text }
    });
    return { success: true, logId, providerId };
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    const logId = await logEmail({
      userId,
      recipient: to,
      emailType,
      status: 'SENT',
      providerId: info.messageId,
      content: { subject, html, text }
    });
    return { success: true, logId, providerId: info.messageId };
  } catch (err) {
    console.error(`Failed to send ${emailType} email to ${to}:`, err.message);
    const logId = await logEmail({
      userId,
      recipient: to,
      emailType,
      status: 'FAILED',
      providerId: null,
      content: { subject, html, text, error: err.message }
    });
    return { success: false, logId, error: err.message };
  }
}

/**
 * Module 1 & 11: verification and welcoming dispatchers.
 */
export async function sendVerificationOTP(userId, email, otp, purpose) {
  const subject = `Swaply Verification Code: ${otp}`;
  const text = `Your Swaply verification code for ${purpose} is ${otp}. It expires in 5 minutes.`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 3px solid #111827; background: #FFFDF9; border-radius: 8px; box-shadow: 4px 4px 0px #111827; max-width: 450px;">
      <h2 style="margin-top: 0; color: #111827;">Swaply Security</h2>
      <p>Please enter the following one-time code to complete your <strong>${purpose}</strong> request:</p>
      <div style="font-size: 2.2rem; font-weight: 800; font-family: monospace; letter-spacing: 4px; padding: 15px; background: #FEF3C7; border: 2px solid #111827; display: inline-block; margin: 15px 0; border-radius: 6px; box-shadow: 2px 2px 0 #111827; color: #111827;">
        ${otp}
      </div>
      <p style="font-size: 0.85rem; color: #6B7280; margin-bottom: 0;">This code is valid for 5 minutes and can only be used once. If you did not make this request, please change your password immediately.</p>
    </div>
  `;
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'OTP' });
}

export async function sendWelcomeEmail(userId, email, betaId) {
  const subject = 'Welcome to Swaply Web Beta!';
  const text = `Welcome to Swaply! Your unique Beta ID is ${betaId}. Visit our site to begin Calling.`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 3px solid #111827; background: #FFFDF9; border-radius: 8px; box-shadow: 4px 4px 0px #111827; max-width: 450px;">
      <h2 style="margin-top: 0; color: #10B981;">Welcome to Swaply!</h2>
      <p>Your Swaply account is verified and ready for secure video calling.</p>
      <p><strong>Your Unique Beta ID:</strong> <span style="font-family: monospace; background: #E5E7EB; padding: 2px 6px; border-radius: 4px; border: 1px solid #9CA3AF;">${betaId}</span></p>
      <hr style="border: 0; border-top: 2px dashed #111827; margin: 15px 0;" />
      <h4 style="margin: 0 0 8px 0; color: #D97706;">🔒 Privacy Reminder:</h4>
      <ul style="padding-left: 20px; margin: 0; font-size: 0.9rem; line-height: 1.4;">
        <li>Keep your invitations private.</li>
        <li>Be respectful of other participants.</li>
        <li>We enforce active screenshot and screen capture alerts to prevent image blackmail.</li>
      </ul>
    </div>
  `;
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Welcome' });
}

export async function sendFriendRequestEmail(userId, email, senderUsername) {
  const subject = `Swaply: New connection request from @${senderUsername}`;
  const text = `@${senderUsername} sent you a connection request on Swaply.`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 3px solid #111827; background: #FFFDF9; border-radius: 8px; box-shadow: 4px 4px 0px #111827; max-width: 450px;">
      <h3 style="margin-top: 0; color: #111827;">New Connection Invitation</h3>
      <p><strong>@${senderUsername}</strong> wants to connect with you on Swaply so you can video call and chat securely.</p>
      <p>Accept or reject this invitation in your Swaply dashboard swipe deck.</p>
    </div>
  `;
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Friend Requests' });
}

export async function sendFriendAcceptedEmail(userId, email, friendUsername) {
  const subject = `Swaply: Invitation accepted by @${friendUsername}`;
  const text = `@${friendUsername} accepted your connection request on Swaply.`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 3px solid #111827; background: #FFFDF9; border-radius: 8px; box-shadow: 4px 4px 0px #111827; max-width: 450px;">
      <h3 style="margin-top: 0; color: #10B981;">Connection Request Accepted!</h3>
      <p><strong>@${friendUsername}</strong> is now your friend on Swaply.</p>
      <p>You can start placing end-to-end authorized calls and messaging them right away.</p>
    </div>
  `;
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Friend Requests' });
}

export async function sendSecurityAlert(userId, email, alertType, details) {
  const subject = `Swaply Security Alert: ${alertType}`;
  const text = `Security alert on your account: ${details}`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 3px solid #111827; background: #FFFDF9; border-radius: 8px; box-shadow: 4px 4px 0px #111827; max-width: 450px;">
      <h3 style="margin-top: 0; color: #EF4444;">⚠ Account Security Alert</h3>
      <p>We detected important changes or logins on your Swaply account:</p>
      <p><strong>Event:</strong> ${alertType}</p>
      <p><strong>Details:</strong> ${details}</p>
      <p style="font-size: 0.85rem; color: #6B7280; border-top: 1px solid #E5E7EB; padding-top: 10px; margin-top: 15px;">If you did not perform this action, please change your password immediately.</p>
    </div>
  `;
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Security' });
}

export async function sendPasswordResetOTP(userId, email, otp) {
  return sendVerificationOTP(userId, email, otp, 'PASSWORD_RESET');
}

export async function sendBetaInvitation(userId, email, inviteLink) {
  const subject = 'You are invited to join Swaply Beta!';
  const text = `You have been invited to test Swaply. Join using this link: ${inviteLink}`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 3px solid #111827; background: #FFFDF9; border-radius: 8px; box-shadow: 4px 4px 0px #111827; max-width: 450px;">
      <h2 style="margin-top: 0; color: #8B5CF6;">Swaply Beta Invitation</h2>
      <p>You have been invited to join the private beta of the Swaply Video Calling Platform.</p>
      <a href="${inviteLink}" style="display: inline-block; padding: 10px 20px; background: #8B5CF6; color: #FFF; text-decoration: none; border: 2px solid #111827; border-radius: 6px; box-shadow: 2px 2px 0 #111827; font-weight: bold; margin: 15px 0;">
        Accept Invitation & Register
      </a>
      <p style="font-size: 0.85rem; color: #6B7280;">This invitation is unique and should not be shared.</p>
    </div>
  `;
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Security' });
}

export async function sendAccountDeletionRequestedEmail(userId, email, username, scheduledTime) {
  const subject = 'Swaply: Account Deletion Requested (5-Hour Grace Period)';
  const formattedTime = new Date(scheduledTime).toLocaleString();
  const text = `Account deletion requested for @${username}. Permanent deletion scheduled for ${formattedTime}. Log in within 5 hours to cancel.`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 3px solid #111827; background: #FFFDF9; border-radius: 8px; box-shadow: 4px 4px 0px #111827; max-width: 480px;">
      <h2 style="margin-top: 0; color: #E11D48;">⚠ Account Deletion Requested</h2>
      <p>Hello <strong>@${username}</strong>,</p>
      <p>A request to permanently delete your Swaply account has been received.</p>
      <div style="background: #FEE2E2; border: 2px solid #111827; padding: 12px; border-radius: 6px; font-size: 0.9rem; margin: 15px 0;">
        <strong>Scheduled Permanent Deletion:</strong> ${formattedTime}<br/>
        <strong>Recovery Grace Window:</strong> 5 Hours
      </div>
      <p>Your account is temporarily suspended and hidden from search. If you did NOT request this, log into Swaply immediately to recover your account.</p>
    </div>
  `;
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Security' });
}

export async function sendAccountRestoredEmail(userId, email, username) {
  const subject = 'Swaply: Account Successfully Restored!';
  const text = `Great news @${username}! Your Swaply account deletion request has been cancelled and full access is restored.`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 3px solid #111827; background: #FFFDF9; border-radius: 8px; box-shadow: 4px 4px 0px #111827; max-width: 480px;">
      <h2 style="margin-top: 0; color: #10B981;">✅ Account Deletion Cancelled & Restored</h2>
      <p>Hello <strong>@${username}</strong>,</p>
      <p>Your scheduled account deletion has been successfully cancelled.</p>
      <p>Your profile, friend connections, call history, and search visibility have been fully restored.</p>
    </div>
  `;
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Security' });
}

export async function sendPermanentDeletionConfirmedEmail(email, username) {
  const subject = 'Swaply: Account Permanently Deleted';
  const text = `Your Swaply account (@${username}) has been permanently deleted as requested.`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 3px solid #111827; background: #FFFDF9; border-radius: 8px; box-shadow: 4px 4px 0px #111827; max-width: 480px;">
      <h2 style="margin-top: 0; color: #6B7280;">Account Permanently Deleted</h2>
      <p>Hello <strong>@${username}</strong>,</p>
      <p>Your Swaply account and all associated data have been permanently purged following the 5-hour grace period.</p>
      <p>Thank you for using Swaply.</p>
    </div>
  `;
  return dispatchEmail({ userId: null, to: email, subject, html, text, emailType: 'Security' });
}
