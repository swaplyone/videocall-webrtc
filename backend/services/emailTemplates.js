/**
 * SwaplyOne HTML Email Design System
 * 
 * Brand Overview:
 * Company Name: SwaplyOne
 * Tagline: "In a Deep Ocean of Skills."
 * Theme: Premium • Minimal • Modern • Trustworthy • Social Platform
 * Colors: Primary #2563EB, Secondary #4F46E5, Accent #06B6D4, Success #10B981, Warning #F59E0B, Danger #EF4444
 * Background: #F5F7FB, Card Background: #FFFFFF, Border Radius: 18px
 * Compatibility: Outlook, Gmail, Apple Mail, Yahoo Mail (Table-based, Inline CSS)
 */

// --- CORE REUSABLE COMPONENT BUILDERS ---

/**
 * Primary CTA Button Builder
 */
export function renderButton(text, url) {
  if (!text || !url) return '';
  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" bgcolor="#2563EB" style="border-radius: 12px; background: linear-gradient(135deg, #2563EB 0%, #4F46E5 100%);">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="25%" stroke="f" fillcolor="#2563EB">
                  <w:anchorlock/>
                  <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">${text}</center>
                </v:roundrect>
                <![endif]-->
                <!--[if !mso]><!-->
                <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 12px; letter-spacing: 0.02em;">
                  ${text} &rarr;
                </a>
                <!--<![endif]-->
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Centered Large OTP Card Builder
 */
export function renderOTPBlock(otp, expiresInMinutes = 5) {
  const digits = String(otp).split('');
  const formattedDigits = digits.map(d => `
    <td align="center" valign="middle" width="44" height="52" style="background: #FFFFFF; border: 2px solid #D1D5DB; border-radius: 10px; font-family: 'Courier New', Courier, monospace; font-size: 26px; font-weight: 900; color: #1E293B; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
      ${d}
    </td>
  `).join('<td width="8"></td>');

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
      <tr>
        <td align="center">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="background: #F0F5FF; border: 1px solid #C7D2FE; border-radius: 16px; padding: 24px; max-width: 440px; width: 100%;">
            <tr>
              <td align="center" style="font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #4F46E5; padding-bottom: 14px;">
                One-Time Verification Code
              </td>
            </tr>
            <tr>
              <td align="center">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    ${formattedDigits}
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="font-family: 'Inter', sans-serif; font-size: 13px; color: #64748B; padding-top: 16px;">
                &bull; Code expires in <strong>${expiresInMinutes} minutes</strong> &bull;<br/>
                <span style="font-size: 12px; color: #94A3B8;">Do not share this code with anyone for your account security.</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Alert Box Component Builder
 */
export function renderAlertBox(type, message) {
  const styles = {
    success: { bg: '#ECFDF5', border: '#10B981', text: '#065F46', icon: '&#10004;' },
    warning: { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E', icon: '&#9888;' },
    error:   { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B', icon: '&#9888;' },
    danger:  { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B', icon: '&#9888;' },
    info:    { bg: '#EFF6FF', border: '#2563EB', text: '#1E40AF', icon: '&#8505;' }
  };
  const cfg = styles[type] || styles.info;
  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
      <tr>
        <td style="background-color: ${cfg.bg}; border-left: 4px solid ${cfg.border}; border-radius: 8px; padding: 14px 18px; font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.5; color: ${cfg.text};">
          <strong style="margin-right: 6px;">${cfg.icon}</strong> ${message}
        </td>
      </tr>
    </table>
  `;
}

/**
 * Information Card Component Builder
 */
export function renderInfoCard(title, items = []) {
  const rows = items.map(item => `
    <tr>
      <td valign="top" style="padding: 8px 0; font-family: 'Inter', sans-serif; font-size: 13px; color: #64748B; width: 38%; font-weight: 600;">
        ${item.label}
      </td>
      <td valign="top" style="padding: 8px 0; font-family: 'Inter', sans-serif; font-size: 13px; color: #0F172A; font-weight: 700;">
        ${item.value}
      </td>
    </tr>
  `).join('');

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 20px;">
      ${title ? `
      <tr>
        <td colspan="2" style="font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 800; color: #1E293B; text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 8px; border-bottom: 1px solid #E2E8F0;">
          ${title}
        </td>
      </tr>
      ` : ''}
      ${rows}
    </table>
  `;
}

// --- MASTER TEMPLATE LAYOUT BUILDER ---

/**
 * Wraps content in the SwaplyOne master HTML email wrapper.
 */
export function renderMasterLayout({
  preheader = 'SwaplyOne - In a Deep Ocean of Skills.',
  title = '',
  subtitle = '',
  contentHtml = '',
  footerNote = ''
}) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${title} | SwaplyOne</title>
  <style type="text/css">
    /* Client-specific Resets */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #F5F7FB; }
    
    /* Dark Mode Media Queries */
    @media (prefers-color-scheme: dark) {
      .bg-main { background-color: #0F172A !important; }
      .bg-card { background-color: #1E293B !important; border-color: #334155 !important; }
      .text-dark { color: #F8FAFC !important; }
      .text-muted { color: #94A3B8 !important; }
    }
  </style>
</head>
<body class="bg-main" style="margin: 0; padding: 0; background-color: #F5F7FB; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  
  <!-- Hidden Preheader Text -->
  <div style="display: none; font-size: 1px; color: #F5F7FB; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader} &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Outer Background Container -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="bg-main" style="background-color: #F5F7FB; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        
        <!-- Main Card Container (Max Width 600px) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto;">
          
          <!-- BRAND HEADER BANNER -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, #2563EB 0%, #4F46E5 100%); border-top-left-radius: 18px; border-top-right-radius: 18px; padding: 36px 32px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Brand Icon Badge -->
                    <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 14px; padding: 10px 16px; margin-bottom: 12px;">
                      <span style="font-family: 'Inter', sans-serif; font-size: 22px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.02em;">
                        &infin; Swaply<span style="color: #06B6D4;">One</span>
                      </span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; color: #E0E7FF; letter-spacing: 0.1em; text-transform: uppercase;">
                    In a Deep Ocean of Skills.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN CARD BODY -->
          <tr>
            <td class="bg-card" style="background-color: #FFFFFF; border-bottom-left-radius: 18px; border-bottom-right-radius: 18px; border: 1px solid #E2E8F0; border-top: none; padding: 40px 36px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                
                ${title ? `
                <tr>
                  <td style="padding-bottom: 8px;">
                    <h1 class="text-dark" style="margin: 0; font-family: 'Inter', -apple-system, sans-serif; font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: -0.02em; line-height: 1.3;">
                      ${title}
                    </h1>
                  </td>
                </tr>
                ` : ''}

                ${subtitle ? `
                <tr>
                  <td style="padding-bottom: 24px; border-bottom: 1px solid #F1F5F9;">
                    <p class="text-muted" style="margin: 0; font-family: 'Inter', sans-serif; font-size: 15px; color: #64748B; line-height: 1.5;">
                      ${subtitle}
                    </p>
                  </td>
                </tr>
                ` : ''}

                <!-- Content Slot -->
                <tr>
                  <td style="padding-top: 20px; font-family: 'Inter', sans-serif; font-size: 15px; color: #334155; line-height: 1.6;">
                    ${contentHtml}
                  </td>
                </tr>

                ${footerNote ? `
                <tr>
                  <td style="padding-top: 28px; border-top: 1px solid #F1F5F9;">
                    <p class="text-muted" style="margin: 0; font-family: 'Inter', sans-serif; font-size: 13px; color: #94A3B8; line-height: 1.5;">
                      ${footerNote}
                    </p>
                  </td>
                </tr>
                ` : ''}

              </table>
            </td>
          </tr>

          <!-- FOOTER SECTION -->
          <tr>
            <td align="center" style="padding: 32px 24px 0 24px; text-align: center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700; color: #475569;">
                    SwaplyOne Inc. &bull; <span style="font-weight: 400; color: #64748B;">In a Deep Ocean of Skills.</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 12px; font-family: 'Inter', sans-serif; font-size: 13px; color: #64748B;">
                    <a href="https://swaply.app" target="_blank" style="color: #2563EB; text-decoration: none; font-weight: 600;">Website</a> &bull; 
                    <a href="mailto:support@swaply.app" style="color: #2563EB; text-decoration: none; font-weight: 600;">Support</a> &bull; 
                    <a href="https://swaply.app/privacy" target="_blank" style="color: #64748B; text-decoration: none;">Privacy Policy</a> &bull; 
                    <a href="https://swaply.app/terms" target="_blank" style="color: #64748B; text-decoration: none;">Terms of Service</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 16px; font-family: 'Inter', sans-serif; font-size: 12px; color: #94A3B8;">
                    &copy; 2026 SwaplyOne Inc. All rights reserved.<br/>
                    You are receiving this automated email regarding your SwaplyOne account activity.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

// --- 24 REUSABLE PRODUCTION EMAIL TEMPLATES ---

/**
 * 1. Email Verification OTP
 */
export function getEmailVerificationOTPTemplate({ username = 'Member', otp = '123456', expiresInMinutes = 5 }) {
  const contentHtml = `
    <p>Hello <strong>@${username}</strong>,</p>
    <p>Please enter the following one-time verification code to verify your email address and secure your SwaplyOne account:</p>
    ${renderOTPBlock(otp, expiresInMinutes)}
    ${renderAlertBox('warning', 'If you did not request this verification code, please ignore this message or contact security.')}
  `;
  return renderMasterLayout({
    preheader: `Your SwaplyOne verification code is ${otp}`,
    title: 'Verify Your Email Address',
    subtitle: 'Security Verification & Identity Confirmation',
    contentHtml
  });
}

/**
 * 2. Welcome to SwaplyOne
 */
export function getWelcomeTemplate({ username = 'Member', betaId = 'BETA-9999' }) {
  const contentHtml = `
    <p>Welcome to <strong>SwaplyOne</strong>, <strong>@${username}</strong>! We're thrilled to have you in our community.</p>
    <p>SwaplyOne connects skilled creators, developers, and learners across a deep ocean of skills through peer-to-peer video communication.</p>
    ${renderInfoCard('Your Account Credentials', [
      { label: 'Username', value: `@${username}` },
      { label: 'Assigned Beta ID', value: betaId },
      { label: 'Platform Access', value: 'Full Peer Video & Chat' }
    ])}
    ${renderButton('Enter SwaplyOne Dashboard', 'https://swaply.app/dashboard')}
    ${renderAlertBox('info', 'Keep your Beta ID private. SwaplyOne features automated screenshot and screen capture telemetry for participant protection.')}
  `;
  return renderMasterLayout({
    preheader: `Welcome to SwaplyOne! Your Beta ID is ${betaId}`,
    title: 'Welcome to SwaplyOne',
    subtitle: 'In a Deep Ocean of Skills.',
    contentHtml
  });
}

/**
 * 3. Beta Registration Successful
 */
export function getBetaRegistrationSuccessfulTemplate({ username = 'Member', betaId = 'BETA-1234' }) {
  const contentHtml = `
    <p>Hello <strong>@${username}</strong>,</p>
    <p>Your beta registration for <strong>SwaplyOne</strong> has been successfully processed and verified.</p>
    ${renderAlertBox('success', `Beta Profile Activated! Your Beta ID is <strong>${betaId}</strong>.`)}
    ${renderInfoCard('Beta Membership Details', [
      { label: 'Status', value: 'ACTIVE BETA ACCESS' },
      { label: 'Beta ID', value: betaId },
      { label: 'Capabilities', value: 'Unlimited 1-on-1 Calls, QR Connect' }
    ])}
    ${renderButton('Access Beta Features', 'https://swaply.app/dashboard')}
  `;
  return renderMasterLayout({
    preheader: `Beta Registration Successful! Beta ID: ${betaId}`,
    title: 'Beta Registration Successful',
    subtitle: 'SwaplyOne Private Beta Program',
    contentHtml
  });
}

/**
 * 4. Beta Waitlist Confirmation
 */
export function getBetaWaitlistConfirmationTemplate({ username = 'Applicant', queuePosition = '#142' }) {
  const contentHtml = `
    <p>Hello <strong>${username}</strong>,</p>
    <p>Thank you for applying to the <strong>SwaplyOne Private Beta</strong>. You are officially on our priority waitlist!</p>
    ${renderInfoCard('Waitlist Status', [
      { label: 'Current Queue Position', value: queuePosition },
      { label: 'Estimated Invitation', value: 'Upcoming Batch Release' }
    ])}
    <p>We roll out new beta slots weekly to ensure maximum video stability and network infrastructure performance.</p>
    ${renderAlertBox('info', 'We will send an invitation link directly to this email address once your slot opens.')}
  `;
  return renderMasterLayout({
    preheader: `SwaplyOne Beta Waitlist Confirmation - Position ${queuePosition}`,
    title: 'Beta Waitlist Confirmed',
    subtitle: 'You are on the list for SwaplyOne Beta',
    contentHtml
  });
}

/**
 * 5. Beta Invitation
 */
export function getBetaInvitationTemplate({ username = 'Member', inviteCode = 'SWAPLY-BETA-2026', buttonUrl = 'https://swaply.app/register' }) {
  const contentHtml = `
    <p>Hello <strong>${username}</strong>,</p>
    <p>You have been officially invited to join the <strong>SwaplyOne Private Beta Platform</strong>!</p>
    ${renderInfoCard('Exclusive Invitation Details', [
      { label: 'Invite Pass', value: inviteCode },
      { label: 'Validity', value: '72 Hours' }
    ])}
    ${renderButton('Claim Your Beta Account', buttonUrl)}
    ${renderAlertBox('warning', 'This invitation code is non-transferable and linked to your email address.')}
  `;
  return renderMasterLayout({
    preheader: 'You are invited to join SwaplyOne Private Beta!',
    title: 'Exclusive Beta Invitation',
    subtitle: 'Your pass to SwaplyOne is ready',
    contentHtml
  });
}

/**
 * 6. Beta Accepted
 */
export function getBetaAcceptedTemplate({ username = 'Member', betaId = 'BETA-5678', buttonUrl = 'https://swaply.app/dashboard' }) {
  const contentHtml = `
    <p>Congratulations <strong>@${username}</strong>!</p>
    <p>Your request to join the SwaplyOne Beta Creator Network has been accepted by our review team.</p>
    ${renderAlertBox('success', 'Full Beta Credentials Approved.')}
    ${renderButton('Open SwaplyOne App', buttonUrl)}
  `;
  return renderMasterLayout({
    preheader: 'Your SwaplyOne Beta Application was Accepted!',
    title: 'Beta Application Accepted',
    subtitle: 'Welcome to the SwaplyOne Creator Cohort',
    contentHtml
  });
}

/**
 * 7. Rollout Update
 */
export function getRolloutUpdateTemplate({ username = 'Member', version = 'v2.4.0', highlights = 'Enhanced WebRTC connection setup, dynamic PiP telemetry, and improved security audit logs.' }) {
  const contentHtml = `
    <p>Hello <strong>@${username}</strong>,</p>
    <p>A new platform rollout (<strong>${version}</strong>) has been deployed across the SwaplyOne network.</p>
    ${renderInfoCard('Rollout Highlights', [
      { label: 'Version', value: version },
      { label: 'Release Date', value: new Date().toLocaleDateString() }
    ])}
    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 16px; border-radius: 12px; font-size: 14px;">
      <strong>Key Enhancements:</strong><br/>
      ${highlights}
    </div>
    ${renderButton('Explore New Release', 'https://swaply.app/dashboard')}
  `;
  return renderMasterLayout({
    preheader: `SwaplyOne Rollout Update ${version}`,
    title: `Platform Update ${version}`,
    subtitle: 'New features and security enhancements',
    contentHtml
  });
}

/**
 * 8. Friend Request Received
 */
export function getFriendRequestReceivedTemplate({ username = 'Member', requesterName = 'Alex', requesterUsername = 'alex_dev', buttonUrl = 'https://swaply.app/friends' }) {
  const contentHtml = `
    <p>Hello <strong>@${username}</strong>,</p>
    <p><strong>${requesterName}</strong> (<code>@${requesterUsername}</code>) has sent you a connection request on SwaplyOne.</p>
    ${renderInfoCard('Connection Details', [
      { label: 'Requester', value: `${requesterName} (@${requesterUsername})` },
      { label: 'Privacy Status', value: 'Verified Peer' }
    ])}
    ${renderButton('Respond to Request', buttonUrl)}
  `;
  return renderMasterLayout({
    preheader: `@${requesterUsername} sent you a friend request on SwaplyOne`,
    title: 'New Connection Request',
    subtitle: 'Expand your skill communication network',
    contentHtml
  });
}

/**
 * 9. Friend Request Accepted
 */
export function getFriendRequestAcceptedTemplate({ username = 'Member', friendName = 'Sam', friendUsername = 'sam_design', profileUrl = 'https://swaply.app/friends' }) {
  const contentHtml = `
    <p>Great news <strong>@${username}</strong>!</p>
    <p><strong>${friendName}</strong> (<code>@${friendUsername}</code>) accepted your connection request on SwaplyOne.</p>
    ${renderAlertBox('success', `You and <strong>@${friendUsername}</strong> are now connected!`)}
    ${renderButton('Start Video Call & Chat', profileUrl)}
  `;
  return renderMasterLayout({
    preheader: `@${friendUsername} accepted your connection request!`,
    title: 'Connection Accepted',
    subtitle: 'You have a new peer connection',
    contentHtml
  });
}

/**
 * 10. Password Reset OTP
 */
export function getPasswordResetOTPTemplate({ username = 'Member', otp = '654321', expiresInMinutes = 5 }) {
  const contentHtml = `
    <p>Hello <strong>@${username}</strong>,</p>
    <p>We received a request to reset the password for your SwaplyOne account. Use the code below to set a new password:</p>
    ${renderOTPBlock(otp, expiresInMinutes)}
    ${renderAlertBox('danger', 'If you did not request a password reset, someone may be trying to access your account. Please secure your email immediately.')}
  `;
  return renderMasterLayout({
    preheader: `SwaplyOne Password Reset Code: ${otp}`,
    title: 'Reset Your Password',
    subtitle: 'Account Password Recovery Security',
    contentHtml
  });
}

/**
 * 11. Email Change Verification
 */
export function getEmailChangeVerificationTemplate({ username = 'Member', otp = '987654', newEmail = 'new@swaply.app' }) {
  const contentHtml = `
    <p>Hello <strong>@${username}</strong>,</p>
    <p>A request was made to change your registered email address to <strong>${newEmail}</strong>.</p>
    ${renderOTPBlock(otp, 10)}
    ${renderAlertBox('warning', 'If you did not initiate this email modification, please contact SwaplyOne security immediately.')}
  `;
  return renderMasterLayout({
    preheader: `Email Change Verification Code: ${otp}`,
    title: 'Verify Email Modification',
    subtitle: 'Confirming your new contact address',
    contentHtml
  });
}

/**
 * 12. New Device Login Alert
 */
export function getNewDeviceLoginAlertTemplate({ username = 'Member', device = 'Chrome on Windows', location = 'New York, US', ip = '192.168.1.1', time = new Date().toLocaleString(), buttonUrl = 'https://swaply.app/settings' }) {
  const contentHtml = `
    <p>Hello <strong>@${username}</strong>,</p>
    <p>We detected a new login to your SwaplyOne account from an unrecognized device or location.</p>
    ${renderInfoCard('Login Activity Details', [
      { label: 'Device / Browser', value: device },
      { label: 'Location', value: location },
      { label: 'IP Address', value: ip },
      { label: 'Timestamp', value: time }
    ])}
    ${renderAlertBox('warning', 'If this was you, no action is required.')}
    ${renderButton('Review Account Security', buttonUrl)}
  `;
  return renderMasterLayout({
    preheader: 'New device login detected on your SwaplyOne account',
    title: 'New Device Login Alert',
    subtitle: 'Security & Access Control',
    contentHtml
  });
}

/**
 * 13. Security Alert
 */
export function getSecurityAlertTemplate({ username = 'Member', title = 'Security ID Rotated', details = 'Your session security ID was updated following a password modification.', actionUrl = 'https://swaply.app/settings' }) {
  const contentHtml = `
    <p>Hello <strong>@${username}</strong>,</p>
    ${renderAlertBox('danger', `<strong>Security Event:</strong> ${title}`)}
    <p>${details}</p>
    ${renderButton('Manage Security Settings', actionUrl)}
  `;
  return renderMasterLayout({
    preheader: `SwaplyOne Security Alert: ${title}`,
    title: title || 'Security Notification',
    subtitle: 'Important safety notice regarding your account',
    contentHtml
  });
}

/**
 * 14. Screenshot / Privacy Warning
 */
export function getPrivacyWarningTemplate({ username = 'Member', warningType = 'Screen Capture Attempt', time = new Date().toLocaleString(), callId = 'call_9999' }) {
  const contentHtml = `
    <p>Hello <strong>@${username}</strong>,</p>
    ${renderAlertBox('danger', 'Privacy Telemetry Alert Triggered!')}
    <p>Our automated participant protection system registered a <strong>${warningType}</strong> during an active call session.</p>
    ${renderInfoCard('Incident Record', [
      { label: 'Event Type', value: warningType },
      { label: 'Session ID', value: callId },
      { label: 'Timestamp', value: time }
    ])}
    <p>SwaplyOne strictly prohibits unauthorized recording or capturing of video calls to safeguard participant privacy.</p>
  `;
  return renderMasterLayout({
    preheader: `SwaplyOne Privacy Alert: ${warningType}`,
    title: 'Privacy Violation Warning',
    subtitle: 'Automated telemetry detection alert',
    contentHtml
  });
}

/**
 * 15. Call Missed Notification
 */
export function getCallMissedNotificationTemplate({ username = 'Member', callerName = 'Taylor', callerUsername = 'taylor_code', callTime = new Date().toLocaleString(), buttonUrl = 'https://swaply.app/history' }) {
  const contentHtml = `
    <p>Hello <strong>@${username}</strong>,</p>
    <p>You missed a video call connection from <strong>${callerName}</strong> (<code>@${callerUsername}</code>).</p>
    ${renderInfoCard('Missed Call Info', [
      { label: 'Caller', value: `${callerName} (@${callerUsername})` },
      { label: 'Time', value: callTime }
    ])}
    ${renderButton('Call Back Now', buttonUrl)}
  `;
  return renderMasterLayout({
    preheader: `Missed call from @${callerUsername} on SwaplyOne`,
    title: 'Missed Call Notification',
    subtitle: 'Peer-to-peer connection alert',
    contentHtml
  });
}

/**
 * 16. Call Summary
 */
export function getCallSummaryTemplate({ username = 'Member', peerName = 'Jordan', duration = '18m 42s', callId = 'call_8888', date = new Date().toLocaleDateString() }) {
  const contentHtml = `
    <p>Hello <strong>@${username}</strong>,</p>
    <p>Here is your summary for your video session with <strong>${peerName}</strong>.</p>
    ${renderInfoCard('Session Summary', [
      { label: 'Peer Connection', value: peerName },
      { label: 'Duration', value: duration },
      { label: 'Session ID', value: callId },
      { label: 'Date', value: date }
    ])}
    ${renderButton('View Call Log History', 'https://swaply.app/history')}
  `;
  return renderMasterLayout({
    preheader: `Call Summary with ${peerName} (${duration})`,
    title: 'Call Session Summary',
    subtitle: 'SwaplyOne Call Statistics',
    contentHtml
  });
}

/**
 * 17. Account Scheduled for Deletion
 */
export function getAccountScheduledForDeletionTemplate({ username = 'Member', scheduledDate = '5 Hours from request', recoveryUrl = 'https://swaply.app/login' }) {
  const contentHtml = `
    <p>Hello <strong>@${username}</strong>,</p>
    ${renderAlertBox('danger', 'Account Scheduled for Permanent Deletion!')}
    <p>A request to permanently delete your SwaplyOne account has been received and processed.</p>
    ${renderInfoCard('Scheduled Deletion Window', [
      { label: 'Account Username', value: `@${username}` },
      { label: 'Scheduled Execution', value: scheduledDate },
      { label: 'Recovery Window', value: '5 Hours Grace Period' }
    ])}
    <p>Your account is currently disabled and hidden from search. If you wish to cancel this request, simply log into SwaplyOne within 5 hours.</p>
    ${renderButton('Cancel Deletion & Recover Account', recoveryUrl)}
  `;
  return renderMasterLayout({
    preheader: `Account deletion scheduled for @${username} (5-Hour Grace Period)`,
    title: 'Account Scheduled for Deletion',
    subtitle: '5-Hour Account Recovery Grace Window',
    contentHtml
  });
}

/**
 * 18. Account Recovery Successful
 */
export function getAccountRecoverySuccessfulTemplate({ username = 'Member', restoredDate = new Date().toLocaleString(), buttonUrl = 'https://swaply.app/dashboard' }) {
  const contentHtml = `
    <p>Welcome back <strong>@${username}</strong>!</p>
    ${renderAlertBox('success', 'Account Deletion Request Cancelled & Account Restored!')}
    <p>Your SwaplyOne account, profile data, connections, and privacy settings have been fully reactivated.</p>
    ${renderInfoCard('Restoration Summary', [
      { label: 'Account Username', value: `@${username}` },
      { label: 'Restoration Date', value: restoredDate },
      { label: 'Account Status', value: 'ACTIVE' }
    ])}
    ${renderButton('Return to Dashboard', buttonUrl)}
  `;
  return renderMasterLayout({
    preheader: `Account @${username} successfully restored!`,
    title: 'Account Successfully Restored',
    subtitle: 'Your deletion schedule has been cancelled',
    contentHtml
  });
}

/**
 * 19. Account Permanently Deleted
 */
export function getAccountPermanentlyDeletedTemplate({ username = 'Member', deletedDate = new Date().toLocaleString() }) {
  const contentHtml = `
    <p>Hello <strong>@${username}</strong>,</p>
    ${renderAlertBox('error', 'Account Permanently Purged.')}
    <p>Your SwaplyOne account and all associated profile records, call logs, messages, and security identifiers have been permanently deleted following the 5-hour grace period.</p>
    ${renderInfoCard('Deletion Record', [
      { label: 'Account Username', value: `@${username}` },
      { label: 'Purged Timestamp', value: deletedDate }
    ])}
    <p style="font-size: 13px; color: #64748B;">Thank you for being part of the SwaplyOne platform.</p>
  `;
  return renderMasterLayout({
    preheader: `SwaplyOne Account @${username} Permanently Deleted`,
    title: 'Account Permanently Deleted',
    subtitle: 'Confirmation of data wipe',
    contentHtml
  });
}

/**
 * 20. Feature Announcement
 */
export function getFeatureAnnouncementTemplate({ username = 'Member', featureName = 'QR Code Direct Connect', description = 'Instant 1-on-1 peer connections via custom dynamic QR tokens.', buttonUrl = 'https://swaply.app/dashboard' }) {
  const contentHtml = `
    <p>Hello <strong>@${username}</strong>,</p>
    <p>We are excited to introduce a major new capability to SwaplyOne: <strong>${featureName}</strong>!</p>
    <div style="background: #F0F5FF; border: 1px solid #C7D2FE; padding: 20px; border-radius: 14px; font-size: 15px; color: #1E1B4B; margin: 20px 0;">
      <strong style="font-size: 16px; color: #2563EB;">${featureName}</strong><br/><br/>
      ${description}
    </div>
    ${renderButton('Try Feature Now', buttonUrl)}
  `;
  return renderMasterLayout({
    preheader: `New Feature Announcement: ${featureName}`,
    title: `Introducing ${featureName}`,
    subtitle: 'SwaplyOne Product Innovation',
    contentHtml
  });
}

/**
 * 21. Maintenance Notification
 */
export function getMaintenanceNotificationTemplate({ username = 'Member', scheduledTime = 'Sunday 02:00 UTC', duration = '30 Minutes', impact = 'Brief WebRTC signaling server upgrade' }) {
  const contentHtml = `
    <p>Hello <strong>@${username}</strong>,</p>
    <p>SwaplyOne will undergo scheduled infrastructure maintenance to upgrade network bandwidth and connection stability.</p>
    ${renderInfoCard('Maintenance Schedule', [
      { label: 'Scheduled Time', value: scheduledTime },
      { label: 'Expected Duration', value: duration },
      { label: 'Impact Area', value: impact }
    ])}
    ${renderAlertBox('info', 'Video calling service may experience brief connectivity resets during this window.')}
  `;
  return renderMasterLayout({
    preheader: `Scheduled Maintenance Notice: ${scheduledTime}`,
    title: 'Scheduled System Maintenance',
    subtitle: 'Infrastructure & Performance Optimization',
    contentHtml
  });
}

/**
 * 22. Admin Announcement
 */
export function getAdminAnnouncementTemplate({ username = 'Member', title = 'Community Guidelines Update', message = 'We have updated our platform safety protocols to enforce end-to-end privacy checks on all active sessions.', buttonUrl = 'https://swaply.app/privacy' }) {
  const contentHtml = `
    <p>Hello <strong>@${username}</strong>,</p>
    <p>${message}</p>
    ${renderButton('Read Official Announcement', buttonUrl)}
  `;
  return renderMasterLayout({
    preheader: `SwaplyOne Official Announcement: ${title}`,
    title: title || 'Official Announcement',
    subtitle: 'Message from SwaplyOne Administration',
    contentHtml
  });
}

/**
 * 23. Beta Feedback Request
 */
export function getBetaFeedbackRequestTemplate({ username = 'Member', surveyUrl = 'https://swaply.app/feedback' }) {
  const contentHtml = `
    <p>Hello <strong>@${username}</strong>,</p>
    <p>As an active member of the <strong>SwaplyOne Beta Program</strong>, your insights shape the future of our skill-sharing communication platform.</p>
    <p>Could you take 2 minutes to share your experience regarding video clarity and connection setup?</p>
    ${renderButton('Share Beta Feedback', surveyUrl)}
  `;
  return renderMasterLayout({
    preheader: 'We want your feedback on SwaplyOne Beta!',
    title: 'Your Feedback Matters',
    subtitle: 'Help us refine SwaplyOne',
    contentHtml
  });
}

/**
 * 24. Weekly Product Updates
 */
export function getWeeklyProductUpdatesTemplate({ username = 'Member', weekDate = 'Week 31, 2026', highlights = 'Faster connection latency, enhanced dark mode branding, and improved account deletion grace management.', buttonUrl = 'https://swaply.app/dashboard' }) {
  const contentHtml = `
    <p>Hello <strong>@${username}</strong>,</p>
    <p>Here is your weekly roundup of what's new on SwaplyOne for <strong>${weekDate}</strong>:</p>
    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 18px; border-radius: 12px; font-size: 14px; color: #334155;">
      <strong>Weekly Digest:</strong><br/>
      ${highlights}
    </div>
    ${renderButton('Open SwaplyOne App', buttonUrl)}
  `;
  return renderMasterLayout({
    preheader: `SwaplyOne Weekly Update - ${weekDate}`,
    title: 'Weekly Product Digest',
    subtitle: 'Stay updated with SwaplyOne',
    contentHtml
  });
}
