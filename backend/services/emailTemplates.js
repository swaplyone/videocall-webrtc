/**
 * SwaplyOne Editorial Paper & Sticker HTML Email Design System
 * 
 * Theme: Warm Recycled Paper & Neo-Brutalist Sticker Design System
 * Background: #FAF6EE (Recycled Warm Paper)
 * Card: #FFFFFF (White Paper Sticker Card, Border: 3px solid #2A2723, Box-Shadow: 6px 6px 0px #2A2723)
 * Primary Accent: #D45B3E (Terracotta Red)
 * Secondary Accent: #4A6E53 (Moss Green)
 * Mustard Accent: #E5A93C / #FEF3C7 (Warm Mustard Yellow Badge)
 * Dark Charcoal: #2A2723 (Text & Outlines)
 * Compatibility: Outlook, Gmail, Apple Mail, Yahoo Mail
 */

// --- CORE STICKER & PAPER COMPONENT BUILDERS ---

/**
 * Primary Sticker Button Builder
 */
export function renderButton(text, url) {
  if (!text || !url) return '';
  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" bgcolor="#D45B3E" style="border: 3px solid #2A2723; border-radius: 10px; background-color: #D45B3E; box-shadow: 4px 4px 0px #2A2723;">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="20%" stroke="t" strokecolor="#2A2723" fillcolor="#D45B3E">
                  <w:anchorlock/>
                  <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;text-transform:uppercase;">${text}</center>
                </v:roundrect>
                <![endif]-->
                <!--[if !mso]><!-->
                <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 900; color: #FFFFFF; text-decoration: none; border-radius: 8px; letter-spacing: 0.05em; text-transform: uppercase;">
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
 * Centered Large OTP Paper Sticker Card Builder
 */
export function renderOTPBlock(otp, expiresInMinutes = 5) {
  const digits = String(otp).split('');
  const formattedDigits = digits.map(d => `
    <td align="center" valign="middle" width="46" height="54" style="background: #FFFFFF; border: 2.5px solid #2A2723; border-radius: 8px; font-family: 'Space Mono', Courier, monospace; font-size: 26px; font-weight: 900; color: #2A2723; box-shadow: 2px 2px 0px #2A2723;">
      ${d}
    </td>
  `).join('<td width="8"></td>');

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
      <tr>
        <td align="center">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="background: #FEF3C7; border: 3px solid #2A2723; border-radius: 14px; padding: 24px; max-width: 440px; width: 100%; box-shadow: 5px 5px 0px #2A2723;">
            <tr>
              <td align="center" style="font-family: 'Space Mono', monospace; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #2A2723; padding-bottom: 14px;">
                &#128274; One-Time Verification Pass
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
              <td align="center" style="font-family: 'Work Sans', sans-serif; font-size: 13px; color: #6B655C; padding-top: 16px;">
                &bull; Code expires in <strong style="color: #2A2723;">${expiresInMinutes} minutes</strong> &bull;<br/>
                <span style="font-size: 12px; color: #6B655C;">Do not share this code for security reasons.</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Sticker Alert Box Component Builder
 */
export function renderAlertBox(type, message) {
  const styles = {
    success: { bg: '#E6F4EA', border: '#4A6E53', text: '#1E3A27', icon: '&#10004;' },
    warning: { bg: '#FEF3C7', border: '#E5A93C', text: '#78350F', icon: '&#9888;' },
    error:   { bg: '#FCE8E6', border: '#BE4D4D', text: '#7A1C1C', icon: '&#9888;' },
    danger:  { bg: '#FCE8E6', border: '#BE4D4D', text: '#7A1C1C', icon: '&#9888;' },
    info:    { bg: '#EBF3FA', border: '#4C779F', text: '#1A365D', icon: '&#8505;' }
  };
  const cfg = styles[type] || styles.info;
  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0;">
      <tr>
        <td style="background-color: ${cfg.bg}; border: 2.5px solid #2A2723; border-left: 6px solid ${cfg.border}; border-radius: 10px; padding: 14px 18px; font-family: 'Work Sans', sans-serif; font-size: 14px; line-height: 1.5; color: ${cfg.text}; box-shadow: 3px 3px 0px #2A2723;">
          <strong style="margin-right: 6px; font-size: 16px;">${cfg.icon}</strong> ${message}
        </td>
      </tr>
    </table>
  `;
}

/**
 * Information Card Component Builder (Paper Sticker Card)
 */
export function renderInfoCard(title, items = []) {
  const rows = items.map(item => `
    <tr>
      <td valign="top" style="padding: 8px 0; font-family: 'Space Mono', monospace; font-size: 12px; color: #6B655C; width: 40%; font-weight: 700; text-transform: uppercase;">
        ${item.label}
      </td>
      <td valign="top" style="padding: 8px 0; font-family: 'Work Sans', sans-serif; font-size: 13px; color: #2A2723; font-weight: 700;">
        ${item.value}
      </td>
    </tr>
  `).join('');

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; background: #FFF0EB; border: 2.5px solid #2A2723; border-radius: 12px; padding: 18px; box-shadow: 4px 4px 0px #2A2723;">
      ${title ? `
      <tr>
        <td colspan="2" style="font-family: 'Syne', 'Work Sans', sans-serif; font-size: 13px; font-weight: 800; color: #2A2723; text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 10px; border-bottom: 2px dashed #2A2723;">
          ${title}
        </td>
      </tr>
      ` : ''}
      ${rows}
    </table>
  `;
}

// --- MASTER STICKER PAPER TEMPLATE LAYOUT BUILDER ---

/**
 * Wraps content in SwaplyOne Editorial Warm Paper & Sticker Master Wrapper.
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
  <title>${title} | SwaplyOne</title>
  <style type="text/css">
    /* Client-specific Resets */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #FAF6EE; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF6EE; font-family: 'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #2A2723;">
  
  <!-- Hidden Preheader Text -->
  <div style="display: none; font-size: 1px; color: #FAF6EE; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader} &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <!-- Outer Recycled Paper Background -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF6EE; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        
        <!-- Main Card Container (Max Width 600px) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto;">
          
          <!-- BRAND STICKER HEADER BANNER -->
          <tr>
            <td align="center" style="background-color: #D45B3E; border: 3px solid #2A2723; border-top-left-radius: 16px; border-top-right-radius: 16px; padding: 32px 28px; text-align: center; box-shadow: 6px 6px 0px #2A2723;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Yellow Sticker Badge with Swaply Logo Image -->
                    <div style="display: inline-block; background-color: #FEF3C7; border: 2.5px solid #2A2723; border-radius: 10px; padding: 6px 16px; box-shadow: 3px 3px 0px #2A2723; margin-bottom: 10px;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td valign="middle" style="padding-right: 10px;">
                            <img src="/swaply-favicon-bgl.png" alt="Swaply Logo" width="34" height="34" style="display: block; border: 0; outline: none; width: 34px; height: 34px; object-fit: contain;" />
                          </td>
                          <td valign="middle">
                            <span style="font-family: 'Syne', 'Work Sans', sans-serif; font-size: 22px; font-weight: 900; color: #2A2723; letter-spacing: -0.02em; text-transform: uppercase;">
                              Swaply<span style="color: #D45B3E;">One</span>
                            </span>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family: 'Space Mono', monospace; font-size: 12px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.1em; text-transform: uppercase; padding-top: 4px;">
                    "In a Deep Ocean of Skills."
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN WHITE PAPER CARD BODY -->
          <tr>
            <td style="background-color: #FFFFFF; border: 3px solid #2A2723; border-top: none; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; padding: 36px 32px; box-shadow: 6px 6px 0px #2A2723;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                
                ${title ? `
                <tr>
                  <td style="padding-bottom: 8px;">
                    <h1 style="margin: 0; font-family: 'Syne', 'Work Sans', sans-serif; font-size: 24px; font-weight: 900; color: #2A2723; letter-spacing: -0.02em; line-height: 1.3; text-transform: uppercase;">
                      ${title}
                    </h1>
                  </td>
                </tr>
                ` : ''}

                ${subtitle ? `
                <tr>
                  <td style="padding-bottom: 22px; border-bottom: 2px dashed #2A2723;">
                    <p style="margin: 0; font-family: 'Work Sans', sans-serif; font-size: 15px; color: #6B655C; line-height: 1.5; font-weight: 500;">
                      ${subtitle}
                    </p>
                  </td>
                </tr>
                ` : ''}

                <!-- Content Slot -->
                <tr>
                  <td style="padding-top: 22px; font-family: 'Work Sans', sans-serif; font-size: 15px; color: #2A2723; line-height: 1.6;">
                    ${contentHtml}
                  </td>
                </tr>

                ${footerNote ? `
                <tr>
                  <td style="padding-top: 26px; border-top: 2px dashed #2A2723;">
                    <p style="margin: 0; font-family: 'Work Sans', sans-serif; font-size: 13px; color: #6B655C; line-height: 1.5;">
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
                  <td align="center" style="font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 800; color: #2A2723;">
                    SwaplyOne Inc. &bull; <span style="font-family: 'Space Mono', monospace; font-size: 12px; color: #6B655C; font-weight: 400;">In a Deep Ocean of Skills.</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 12px; font-family: 'Work Sans', sans-serif; font-size: 13px; color: #6B655C;">
                    <a href="https://swaply.app" target="_blank" style="color: #D45B3E; text-decoration: none; font-weight: 800;">Website</a> &bull; 
                    <a href="mailto:support@swaply.app" style="color: #D45B3E; text-decoration: none; font-weight: 800;">Support</a> &bull; 
                    <a href="https://swaply.app/privacy" target="_blank" style="color: #2A2723; text-decoration: none;">Privacy Policy</a> &bull; 
                    <a href="https://swaply.app/terms" target="_blank" style="color: #2A2723; text-decoration: none;">Terms of Service</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 16px; font-family: 'Space Mono', monospace; font-size: 11px; color: #6B655C;">
                    &copy; 2026 SwaplyOne Inc. All rights reserved.<br/>
                    Automated notification regarding your SwaplyOne account activity.
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

// --- 24 REUSABLE STICKER PAPER EMAIL TEMPLATES ---

/**
 * 1. Email Verification OTP
 */
export function getEmailVerificationOTPTemplate({ username = 'Member', otp = '123456', expiresInMinutes = 5 }) {
  const contentHtml = `
    <p>Hello <strong>@${username}</strong>,</p>
    <p>Please enter the following one-time verification pass code to confirm your email address and activate your SwaplyOne account:</p>
    ${renderOTPBlock(otp, expiresInMinutes)}
    ${renderAlertBox('warning', 'If you did not request this verification pass, please ignore this email.')}
  `;
  return renderMasterLayout({
    preheader: `Your SwaplyOne verification pass code is ${otp}`,
    title: 'Verify Your Email Address',
    subtitle: 'Security Verification & Identity Pass',
    contentHtml
  });
}

/**
 * 2. Welcome to SwaplyOne
 */
export function getWelcomeTemplate({ username = 'Member', betaId = 'BETA-9999' }) {
  const contentHtml = `
    <p>Welcome to <strong>SwaplyOne</strong>, <strong>@${username}</strong>!</p>
    <p>SwaplyOne connects creators, developers, and learners across a deep ocean of skills through peer-to-peer video communication.</p>
    ${renderInfoCard('Your Account Pass', [
      { label: 'Username', value: `@${username}` },
      { label: 'Beta ID', value: betaId },
      { label: 'Platform Status', value: 'Full Access Granted' }
    ])}
    ${renderButton('Enter SwaplyOne Console', 'https://swaply.app/dashboard')}
    ${renderAlertBox('info', 'Keep your Beta ID private. SwaplyOne incorporates participant capture telemetry for safety.')}
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
    <p>Your beta registration for <strong>SwaplyOne</strong> has been processed and verified.</p>
    ${renderAlertBox('success', `Beta Profile Activated! Assigned Beta ID: <strong>${betaId}</strong>`)}
    ${renderInfoCard('Beta Access Pass', [
      { label: 'Status', value: 'ACTIVE BETA ACCESS' },
      { label: 'Beta ID', value: betaId },
      { label: 'Access Level', value: 'Peer Video, Dynamic QR Dial' }
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
    <p>Thank you for applying to the <strong>SwaplyOne Private Beta</strong>. You are officially registered on our waitlist!</p>
    ${renderInfoCard('Waitlist Record', [
      { label: 'Queue Position', value: queuePosition },
      { label: 'Estimated Batch', value: 'Next Slot Release' }
    ])}
    <p>We roll out new beta passes in batches to maintain video streaming stability.</p>
    ${renderAlertBox('info', 'We will send a direct invite pass to this email as soon as your slot opens.')}
  `;
  return renderMasterLayout({
    preheader: `SwaplyOne Beta Waitlist Confirmation - Position ${queuePosition}`,
    title: 'Waitlist Confirmed',
    subtitle: 'You are on the list for SwaplyOne Beta',
    contentHtml
  });
}

/**
 * 5. Beta Invitation
 */
export function getBetaInvitationTemplate({ username = 'Member', inviteCode = 'SWAPLY-PASS-2026', buttonUrl = 'https://swaply.app/register' }) {
  const contentHtml = `
    <p>Hello <strong>${username}</strong>,</p>
    <p>You have been officially invited to join the <strong>SwaplyOne Private Beta Platform</strong>!</p>
    ${renderInfoCard('Invitation Pass Details', [
      { label: 'Invite Pass Code', value: inviteCode },
      { label: 'Pass Expiration', value: '72 Hours' }
    ])}
    ${renderButton('Claim Beta Pass Now', buttonUrl)}
    ${renderAlertBox('warning', 'This invitation pass is non-transferable and linked to your email address.')}
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
    <p>Your request to join the SwaplyOne Beta Creator Network has been accepted by our team.</p>
    ${renderAlertBox('success', `Beta Application Approved! Beta ID: <strong>${betaId}</strong>`)}
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
    <p>A new platform update (<strong>${version}</strong>) has been deployed across the SwaplyOne network.</p>
    ${renderInfoCard('Release Notes', [
      { label: 'Version Tag', value: version },
      { label: 'Release Date', value: new Date().toLocaleDateString() }
    ])}
    <div style="background: #FAF6EE; border: 2px solid #2A2723; padding: 16px; border-radius: 10px; font-size: 14px; box-shadow: 3px 3px 0px #2A2723;">
      <strong>Key Enhancements:</strong><br/>
      ${highlights}
    </div>
    ${renderButton('Explore Release', 'https://swaply.app/dashboard')}
  `;
  return renderMasterLayout({
    preheader: `SwaplyOne Rollout Update ${version}`,
    title: `Platform Update ${version}`,
    subtitle: 'New features and performance enhancements',
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
      { label: 'Connection Type', value: 'Peer Skill Sharing' }
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
    <p>We received a request to reset the password for your SwaplyOne account. Use the verification pass code below to set your new password:</p>
    ${renderOTPBlock(otp, expiresInMinutes)}
    ${renderAlertBox('danger', 'If you did not request a password reset, please secure your email account immediately.')}
  `;
  return renderMasterLayout({
    preheader: `SwaplyOne Password Reset Code: ${otp}`,
    title: 'Reset Your Password',
    subtitle: 'Account Password Security',
    contentHtml
  });
}

/**
 * 11. Email Change Verification
 */
export function getEmailChangeVerificationTemplate({ username = 'Member', otp = '987654', newEmail = 'new@swaply.app' }) {
  const contentHtml = `
    <p>Hello <strong>@${username}</strong>,</p>
    <p>A request was made to update your registered email address to <strong>${newEmail}</strong>.</p>
    ${renderOTPBlock(otp, 10)}
    ${renderAlertBox('warning', 'If you did not initiate this change, please contact SwaplyOne support immediately.')}
  `;
  return renderMasterLayout({
    preheader: `Email Change Verification Code: ${otp}`,
    title: 'Verify Email Change',
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
    <p>We detected a login to your SwaplyOne account from a new device or location.</p>
    ${renderInfoCard('Login Details', [
      { label: 'Device / Browser', value: device },
      { label: 'Location', value: location },
      { label: 'IP Address', value: ip },
      { label: 'Timestamp', value: time }
    ])}
    ${renderAlertBox('warning', 'If this was you, no action is required.')}
    ${renderButton('Review Security', buttonUrl)}
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
    ${renderAlertBox('danger', 'Privacy Protection Telemetry Alert Triggered!')}
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
    title: 'Privacy Warning',
    subtitle: 'Automated telemetry alert',
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
    <p>Here is your call summary for your session with <strong>${peerName}</strong>.</p>
    ${renderInfoCard('Session Summary', [
      { label: 'Peer Connection', value: peerName },
      { label: 'Duration', value: duration },
      { label: 'Session ID', value: callId },
      { label: 'Date', value: date }
    ])}
    ${renderButton('View Call History', 'https://swaply.app/history')}
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
    <p>Your account is currently disabled and hidden from search. If you wish to cancel this request, log into SwaplyOne within 5 hours.</p>
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
    <p>Your SwaplyOne account, profile data, connections, and settings have been fully reactivated.</p>
    ${renderInfoCard('Restoration Record', [
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
    <p>Your SwaplyOne account and all associated profile records, call logs, messages, and identifiers have been permanently deleted following the 5-hour grace period.</p>
    ${renderInfoCard('Deletion Record', [
      { label: 'Account Username', value: `@${username}` },
      { label: 'Purged Timestamp', value: deletedDate }
    ])}
    <p style="font-size: 13px; color: #6B655C;">Thank you for being part of the SwaplyOne platform.</p>
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
    <p>We are excited to introduce a major new feature to SwaplyOne: <strong>${featureName}</strong>!</p>
    <div style="background: #FFF0EB; border: 2.5px solid #2A2723; padding: 20px; border-radius: 12px; font-size: 15px; color: #2A2723; margin: 20px 0; box-shadow: 4px 4px 0px #2A2723;">
      <strong style="font-size: 16px; color: #D45B3E; font-family: 'Syne', sans-serif;">${featureName}</strong><br/><br/>
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
    <p>As an active member of the <strong>SwaplyOne Beta Program</strong>, your feedback shapes the future of our platform.</p>
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
    <div style="background: #FFF0EB; border: 2.5px solid #2A2723; padding: 18px; border-radius: 12px; font-size: 14px; color: #2A2723; box-shadow: 4px 4px 0px #2A2723;">
      <strong>Weekly Digest:</strong><br/>
      ${highlights}
    </div>
    ${renderButton('Open SwaplyOne Console', buttonUrl)}
  `;
  return renderMasterLayout({
    preheader: `SwaplyOne Weekly Update - ${weekDate}`,
    title: 'Weekly Product Digest',
    subtitle: 'Stay updated with SwaplyOne',
    contentHtml
  });
}
