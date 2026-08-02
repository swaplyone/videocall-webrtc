import fs from 'fs';
import path from 'path';
import * as Templates from './services/emailTemplates.js';

const templatesMap = {
  '1_email_verification_otp': Templates.getEmailVerificationOTPTemplate({ username: 'AlexCreator', otp: '849204', expiresInMinutes: 5 }),
  '2_welcome_to_swaplyone': Templates.getWelcomeTemplate({ username: 'AlexCreator', betaId: 'BETA-8821' }),
  '3_beta_registration_successful': Templates.getBetaRegistrationSuccessfulTemplate({ username: 'AlexCreator', betaId: 'BETA-8821' }),
  '4_beta_waitlist_confirmation': Templates.getBetaWaitlistConfirmationTemplate({ username: 'JordanDev', queuePosition: '#142' }),
  '5_beta_invitation': Templates.getBetaInvitationTemplate({ username: 'JordanDev', inviteCode: 'SWAPLY-PASS-2026', buttonUrl: 'https://swaply.app/register' }),
  '6_beta_accepted': Templates.getBetaAcceptedTemplate({ username: 'JordanDev', betaId: 'BETA-9102' }),
  '7_rollout_update': Templates.getRolloutUpdateTemplate({ username: 'AlexCreator', version: 'v2.4.0', highlights: 'Enhanced WebRTC connection setup, dynamic PiP telemetry, and improved security audit logs.' }),
  '8_friend_request_received': Templates.getFriendRequestReceivedTemplate({ username: 'AlexCreator', requesterName: 'Taylor Code', requesterUsername: 'taylor_code' }),
  '9_friend_request_accepted': Templates.getFriendRequestAcceptedTemplate({ username: 'AlexCreator', friendName: 'Sam Design', friendUsername: 'sam_design' }),
  '10_password_reset_otp': Templates.getPasswordResetOTPTemplate({ username: 'AlexCreator', otp: '392015', expiresInMinutes: 5 }),
  '11_email_change_verification': Templates.getEmailChangeVerificationTemplate({ username: 'AlexCreator', otp: '710492', newEmail: 'alex.new@swaply.app' }),
  '12_new_device_login_alert': Templates.getNewDeviceLoginAlertTemplate({ username: 'AlexCreator', device: 'Chrome on macOS (San Francisco, CA)', location: 'San Francisco, US', ip: '192.168.1.1' }),
  '13_security_alert': Templates.getSecurityAlertTemplate({ username: 'AlexCreator', title: 'Security Token Rotated', details: 'Your security ID was updated following a password modification.' }),
  '14_privacy_warning': Templates.getPrivacyWarningTemplate({ username: 'AlexCreator', warningType: 'Screen Capture Attempt', callId: 'call_sess_9921' }),
  '15_call_missed_notification': Templates.getCallMissedNotificationTemplate({ username: 'AlexCreator', callerName: 'Morgan Smith', callerUsername: 'morgan_s' }),
  '16_call_summary': Templates.getCallSummaryTemplate({ username: 'AlexCreator', peerName: 'Morgan Smith', duration: '24m 15s', callId: 'call_sess_9921' }),
  '17_account_scheduled_deletion': Templates.getAccountScheduledForDeletionTemplate({ username: 'AlexCreator', scheduledDate: 'Today at 07:30 PM (5-Hour Window)' }),
  '18_account_recovery_successful': Templates.getAccountRecoverySuccessfulTemplate({ username: 'AlexCreator' }),
  '19_account_permanently_deleted': Templates.getAccountPermanentlyDeletedTemplate({ username: 'AlexCreator' }),
  '20_feature_announcement': Templates.getFeatureAnnouncementTemplate({ username: 'AlexCreator', featureName: 'QR Code Direct Connect', description: 'Instant 1-on-1 peer connections via custom dynamic QR tokens.' }),
  '21_maintenance_notification': Templates.getMaintenanceNotificationTemplate({ username: 'AlexCreator', scheduledTime: 'Sunday 02:00 UTC', duration: '30 Minutes', impact: 'Brief WebRTC signaling upgrade' }),
  '22_admin_announcement': Templates.getAdminAnnouncementTemplate({ username: 'AlexCreator', title: 'Community Safety Guidelines Update', message: 'We have updated our platform safety protocols to enforce end-to-end privacy checks.' }),
  '23_beta_feedback_request': Templates.getBetaFeedbackRequestTemplate({ username: 'AlexCreator', surveyUrl: 'https://swaply.app/feedback' }),
  '24_weekly_product_updates': Templates.getWeeklyProductUpdatesTemplate({ username: 'AlexCreator', weekDate: 'Week 31, 2026', highlights: 'Faster connection latency, enhanced dark mode branding, and improved account deletion grace management.' })
};

const outputDir = path.join(path.resolve(), 'email_previews');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate individual HTML files
Object.entries(templatesMap).forEach(([filename, html]) => {
  fs.writeFileSync(path.join(outputDir, `${filename}.html`), html);
});

// Generate combined interactive Email Gallery HTML file
const galleryOptions = Object.keys(templatesMap).map((key, idx) => {
  const title = key.replace(/^\d+_/, '').replace(/_/g, ' ').toUpperCase();
  return `<option value="${key}">${idx + 1}. ${title}</option>`;
}).join('\n');

const galleryHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SwaplyOne HTML Email Templates Showcase</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0F172A;
      color: #F8FAFC;
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    header {
      background: #1E293B;
      padding: 1rem 1.5rem;
      border-bottom: 2px solid #334155;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .brand-logo {
      background: linear-gradient(135deg, #2563EB, #4F46E5);
      color: #FFF;
      font-weight: 900;
      padding: 0.4rem 0.8rem;
      border-radius: 8px;
      font-size: 1.1rem;
    }
    select {
      background: #0F172A;
      color: #F8FAFC;
      border: 2px solid #3B82F6;
      padding: 0.6rem 1rem;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: bold;
      outline: none;
      cursor: pointer;
    }
    .main-stage {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1.5rem;
      background: #0F172A;
    }
    iframe {
      width: 100%;
      max-width: 680px;
      height: 100%;
      border: 3px solid #334155;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      background: #FFFFFF;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-logo">&infin; SwaplyOne</div>
      <div>
        <strong style="display:block; font-size: 1.05rem;">HTML Email Design System Showcase</strong>
        <span style="font-size: 0.8rem; color: #94A3B8;">24 Responsive Templates &bull; "In a Deep Ocean of Skills."</span>
      </div>
    </div>
    <div>
      <label for="template-select" style="font-size: 0.85rem; color: #94A3B8; margin-right: 8px;">Select Template:</label>
      <select id="template-select" onchange="loadTemplate(this.value)">
        ${galleryOptions}
      </select>
    </div>
  </header>

  <div class="main-stage">
    <iframe id="preview-frame" src="email_previews/1_email_verification_otp.html"></iframe>
  </div>

  <script>
    function loadTemplate(key) {
      document.getElementById('preview-frame').src = 'email_previews/' + key + '.html';
    }
  </script>
</body>
</html>`;

fs.writeFileSync('email_gallery.html', galleryHtml);
console.log('✅ Generated 24 individual email template previews in /email_previews and created interactive email_gallery.html');
