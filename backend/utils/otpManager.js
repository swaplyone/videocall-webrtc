import { generateOTP, hashOTP } from './otp.js';
import { sendVerificationOTP } from '../services/emailService.js';
import { query } from '../db.js';

/**
 * Creates, hashes, and inserts a 6-digit OTP code into the database,
 * enforcing resend rate-limits and dispatching the email (Module 4, 7).
 */
export async function createAndSendOTP(userId, email, purpose) {
  const normalizedEmail = email.trim().toLowerCase();
  
  // 1. Enforce Resend Frequency Protection: Max 1 per 60 seconds (Module 7)
  const recentRes = await query(
    `SELECT created_at FROM email_verification_codes
     WHERE email = $1 AND purpose = $2 AND used = FALSE AND created_at > NOW() - INTERVAL '60 seconds'
     ORDER BY created_at DESC LIMIT 1`,
    [normalizedEmail, purpose]
  );
  
  if (recentRes.rowCount > 0) {
    return {
      success: false,
      error: 'Please wait before requesting another code',
      code: 429
    };
  }

  // 2. Generate and hash OTP
  const rawOtp = generateOTP();
  const codeHash = hashOTP(rawOtp);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration (Module 7)

  try {
    // 3. Save to database
    await query(
      `INSERT INTO email_verification_codes (user_id, email, code_hash, purpose, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, normalizedEmail, codeHash, purpose, expiresAt]
    );

    // 4. Send Welcoming or verification Email
    await sendVerificationOTP(userId, normalizedEmail, rawOtp, purpose);

    return {
      success: true,
      otp: rawOtp // Exposed for testing purposes
    };
  } catch (err) {
    console.error('Error creating/sending OTP:', err);
    return {
      success: false,
      error: 'Failed to generate verification code',
      code: 500
    };
  }
}

/**
 * Verifies a user-supplied OTP code, validating expiration, used status, and attempt count limits (Module 7).
 */
export async function verifyOTP(email, code, purpose) {
  const normalizedEmail = email.trim().toLowerCase();
  const codeHash = hashOTP(code);

  try {
    // 1. Fetch the latest active code for purpose
    const codeRes = await query(
      `SELECT * FROM email_verification_codes
       WHERE email = $1 AND purpose = $2 AND used = FALSE
       ORDER BY created_at DESC LIMIT 1`,
      [normalizedEmail, purpose]
    );

    if (codeRes.rowCount === 0) {
      return { success: false, error: 'Invalid code' };
    }

    const record = codeRes.rows[0];

    // 2. Check Expiration
    if (new Date() > new Date(record.expires_at)) {
      return { success: false, error: 'Code expired' };
    }

    // 3. Check Attempt Count Limits (Max 5 attempts) (Module 7)
    if (record.attempt_count >= 5) {
      return { success: false, error: 'Too many attempts' };
    }

    // 4. Compare Hash
    if (record.code_hash !== codeHash) {
      // Increment attempts
      await query(
        'UPDATE email_verification_codes SET attempt_count = attempt_count + 1 WHERE id = $1',
        [record.id]
      );
      return { success: false, error: 'Invalid code' };
    }

    // 5. Mark as used
    await query(
      'UPDATE email_verification_codes SET used = TRUE WHERE id = $1',
      [record.id]
    );

    return { success: true };
  } catch (err) {
    console.error('Error verifying OTP:', err);
    return { success: false, error: 'Server verification error' };
  }
}
