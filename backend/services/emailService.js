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

import * as Templates from './emailTemplates.js';

/**
 * 1. Email Verification OTP
 */
export async function sendVerificationOTP(userId, email, otp, purpose = 'EMAIL_VERIFICATION') {
  const subject = `SwaplyOne Verification Code: ${otp}`;
  const text = `Your SwaplyOne verification code for ${purpose} is ${otp}. It expires in 5 minutes.`;
  const html = Templates.getEmailVerificationOTPTemplate({ username: email.split('@')[0], otp, expiresInMinutes: 5 });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'OTP' });
}

/**
 * 2. Welcome to SwaplyOne
 */
export async function sendWelcomeEmail(userId, email, betaId) {
  const username = email.split('@')[0];
  const subject = 'Welcome to SwaplyOne!';
  const text = `Welcome to SwaplyOne! Your unique Beta ID is ${betaId}. Visit our site to begin.`;
  const html = Templates.getWelcomeTemplate({ username, betaId });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Welcome' });
}

/**
 * 3. Beta Registration Successful
 */
export async function sendBetaRegistrationSuccessful(userId, email, betaId) {
  const username = email.split('@')[0];
  const subject = 'SwaplyOne Beta Registration Successful!';
  const text = `Your beta registration is successful! Beta ID: ${betaId}`;
  const html = Templates.getBetaRegistrationSuccessfulTemplate({ username, betaId });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Beta' });
}

/**
 * 4. Beta Waitlist Confirmation
 */
export async function sendBetaWaitlistConfirmation(userId, email, queuePosition = '#142') {
  const username = email.split('@')[0];
  const subject = 'SwaplyOne Beta Waitlist Confirmation';
  const text = `You are on the SwaplyOne beta waitlist at position ${queuePosition}.`;
  const html = Templates.getBetaWaitlistConfirmationTemplate({ username, queuePosition });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Beta' });
}

/**
 * 5. Beta Invitation
 */
export async function sendBetaInvitation(userId, email, inviteLink) {
  const username = email.split('@')[0];
  const subject = 'Exclusive Invitation to Join SwaplyOne Beta';
  const text = `You are invited to join SwaplyOne Beta. Accept invitation: ${inviteLink}`;
  const html = Templates.getBetaInvitationTemplate({ username, buttonUrl: inviteLink });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Beta' });
}

export async function sendBetaWaitlistConfirmationEmail(userId, email, username, position) {
  const subject = `You're on the SwaplyOne Beta Waitlist (Position ${position})`;
  const text = `Hello ${username}, you are confirmed on the SwaplyOne beta waitlist at position ${position}.`;
  const html = Templates.getBetaWaitlistConfirmationTemplate({ username, queuePosition: position });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Beta' });
}

export async function sendBetaInvitationEmail(userId, email, username, betaId, activationCode, expiryTime) {
  const subject = 'Your SwaplyOne Beta Invitation Pass is Ready!';
  const text = `Congratulations ${username}! Your SwaplyOne Beta pass is ready. Activate before ${new Date(expiryTime).toLocaleString()}.`;
  const html = Templates.getBetaInvitationTemplate({ username, inviteCode: activationCode });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Beta' });
}

/**
 * 6. Beta Accepted
 */
export async function sendBetaAccepted(userId, email, betaId) {
  const username = email.split('@')[0];
  const subject = 'Your SwaplyOne Beta Application was Accepted!';
  const text = `Congratulations! Your beta application was accepted. Beta ID: ${betaId}`;
  const html = Templates.getBetaAcceptedTemplate({ username, betaId });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Beta' });
}

export const sendBetaAcceptedEmail = sendBetaAccepted;

/**
 * 7. Rollout Update
 */
export async function sendRolloutUpdate(userId, email, version, highlights) {
  const username = email.split('@')[0];
  const subject = `SwaplyOne Platform Rollout Update ${version}`;
  const text = `SwaplyOne platform update ${version} is now live: ${highlights}`;
  const html = Templates.getRolloutUpdateTemplate({ username, version, highlights });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Updates' });
}

/**
 * 8. Friend Request Received
 */
export async function sendFriendRequestEmail(userId, email, senderUsername) {
  const username = email.split('@')[0];
  const subject = `SwaplyOne: New connection request from @${senderUsername}`;
  const text = `@${senderUsername} sent you a connection request on SwaplyOne.`;
  const html = Templates.getFriendRequestReceivedTemplate({ username, requesterName: senderUsername, requesterUsername: senderUsername });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Friend Requests' });
}

/**
 * 9. Friend Request Accepted
 */
export async function sendFriendAcceptedEmail(userId, email, friendUsername) {
  const username = email.split('@')[0];
  const subject = `SwaplyOne: Connection request accepted by @${friendUsername}`;
  const text = `@${friendUsername} accepted your connection request on SwaplyOne.`;
  const html = Templates.getFriendRequestAcceptedTemplate({ username, friendName: friendUsername, friendUsername });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Friend Requests' });
}

/**
 * 10. Password Reset OTP
 */
export async function sendPasswordResetOTP(userId, email, otp) {
  const username = email.split('@')[0];
  const subject = `SwaplyOne Password Reset Code: ${otp}`;
  const text = `Your SwaplyOne password reset code is ${otp}. Expires in 5 minutes.`;
  const html = Templates.getPasswordResetOTPTemplate({ username, otp, expiresInMinutes: 5 });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Security' });
}

/**
 * 11. Email Change Verification
 */
export async function sendEmailChangeVerification(userId, email, otp, newEmail) {
  const username = email.split('@')[0];
  const subject = `SwaplyOne Email Change Verification Code: ${otp}`;
  const text = `Your SwaplyOne verification code to update email to ${newEmail} is ${otp}.`;
  const html = Templates.getEmailChangeVerificationTemplate({ username, otp, newEmail });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Security' });
}

/**
 * 12. New Device Login Alert
 */
export async function sendNewDeviceLoginAlert(userId, email, deviceDetails) {
  const username = email.split('@')[0];
  const subject = 'SwaplyOne Security Alert: New Device Login';
  const text = `New login detected on your SwaplyOne account from ${deviceDetails.device || 'unrecognized device'}.`;
  const html = Templates.getNewDeviceLoginAlertTemplate({
    username,
    device: deviceDetails.device,
    location: deviceDetails.location,
    ip: deviceDetails.ip,
    time: deviceDetails.time
  });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Security' });
}

/**
 * 13. Security Alert
 */
export async function sendSecurityAlert(userId, email, alertType, details) {
  const username = email.split('@')[0];
  const subject = `SwaplyOne Security Alert: ${alertType}`;
  const text = `Security alert on your account: ${details}`;
  const html = Templates.getSecurityAlertTemplate({ username, title: alertType, details });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Security' });
}

/**
 * 14. Screenshot / Privacy Warning
 */
export async function sendPrivacyWarning(userId, email, warningType, callId) {
  const username = email.split('@')[0];
  const subject = `SwaplyOne Privacy Alert: ${warningType}`;
  const text = `Privacy warning triggered on session ${callId}: ${warningType}`;
  const html = Templates.getPrivacyWarningTemplate({ username, warningType, callId });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Security' });
}

/**
 * 15. Call Missed Notification
 */
export async function sendCallMissedNotification(userId, email, callerUsername, callTime) {
  const username = email.split('@')[0];
  const subject = `SwaplyOne: Missed video call from @${callerUsername}`;
  const text = `You missed a call from @${callerUsername} on SwaplyOne at ${callTime}.`;
  const html = Templates.getCallMissedNotificationTemplate({ username, callerName: callerUsername, callerUsername, callTime });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Calls' });
}

/**
 * 16. Call Summary
 */
export async function sendCallSummary(userId, email, peerName, duration, callId) {
  const username = email.split('@')[0];
  const subject = `SwaplyOne Call Summary with ${peerName}`;
  const text = `Summary for call with ${peerName}. Duration: ${duration}. Session ID: ${callId}`;
  const html = Templates.getCallSummaryTemplate({ username, peerName, duration, callId });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Calls' });
}

/**
 * 17. Account Scheduled for Deletion
 */
export async function sendAccountDeletionRequestedEmail(userId, email, username, scheduledTime) {
  const subject = 'SwaplyOne: Account Deletion Scheduled (5-Hour Grace Period)';
  const formattedTime = new Date(scheduledTime).toLocaleString();
  const text = `Account deletion requested for @${username}. Permanent deletion scheduled for ${formattedTime}. Log in within 5 hours to cancel.`;
  const html = Templates.getAccountScheduledForDeletionTemplate({ username, scheduledDate: formattedTime });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Security' });
}

/**
 * 18. Account Recovery Successful
 */
export async function sendAccountRestoredEmail(userId, email, username) {
  const subject = 'SwaplyOne: Account Successfully Restored!';
  const text = `Great news @${username}! Your SwaplyOne account deletion request has been cancelled and full access is restored.`;
  const html = Templates.getAccountRecoverySuccessfulTemplate({ username });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Security' });
}

/**
 * 19. Account Permanently Deleted
 */
export async function sendPermanentDeletionConfirmedEmail(email, username) {
  const subject = 'SwaplyOne: Account Permanently Deleted';
  const text = `Your SwaplyOne account (@${username}) has been permanently deleted as requested.`;
  const html = Templates.getAccountPermanentlyDeletedTemplate({ username });
  return dispatchEmail({ userId: null, to: email, subject, html, text, emailType: 'Security' });
}

/**
 * 20. Feature Announcement
 */
export async function sendFeatureAnnouncement(userId, email, featureName, description, buttonUrl) {
  const username = email.split('@')[0];
  const subject = `SwaplyOne Feature Announcement: ${featureName}`;
  const text = `Introducing ${featureName}: ${description}`;
  const html = Templates.getFeatureAnnouncementTemplate({ username, featureName, description, buttonUrl });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Announcements' });
}

/**
 * 21. Maintenance Notification
 */
export async function sendMaintenanceNotification(userId, email, scheduledTime, duration, impact) {
  const username = email.split('@')[0];
  const subject = `SwaplyOne Scheduled System Maintenance Notice: ${scheduledTime}`;
  const text = `SwaplyOne system maintenance scheduled for ${scheduledTime}. Expected duration: ${duration}. Impact: ${impact}`;
  const html = Templates.getMaintenanceNotificationTemplate({ username, scheduledTime, duration, impact });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Maintenance' });
}

/**
 * 22. Admin Announcement
 */
export async function sendAdminAnnouncement(userId, email, title, message, buttonUrl) {
  const username = email.split('@')[0];
  const subject = `SwaplyOne Official Announcement: ${title}`;
  const text = `${title}: ${message}`;
  const html = Templates.getAdminAnnouncementTemplate({ username, title, message, buttonUrl });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Announcements' });
}

/**
 * 23. Beta Feedback Request
 */
export async function sendBetaFeedbackRequest(userId, email, surveyUrl) {
  const username = email.split('@')[0];
  const subject = 'SwaplyOne Beta Program: We Want Your Feedback!';
  const text = `Please take 2 minutes to share your SwaplyOne beta experience: ${surveyUrl}`;
  const html = Templates.getBetaFeedbackRequestTemplate({ username, surveyUrl });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Feedback' });
}

/**
 * 24. Weekly Product Updates
 */
export async function sendWeeklyProductUpdates(userId, email, weekDate, highlights) {
  const username = email.split('@')[0];
  const subject = `SwaplyOne Weekly Digest - ${weekDate}`;
  const text = `SwaplyOne weekly digest for ${weekDate}: ${highlights}`;
  const html = Templates.getWeeklyProductUpdatesTemplate({ username, weekDate, highlights });
  return dispatchEmail({ userId, to: email, subject, html, text, emailType: 'Updates' });
}

