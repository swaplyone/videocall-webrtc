// Server-side text filtering logic for Swaply

const NUMBER_WORDS = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9'
};

/**
 * Converts written number words (e.g., "nine", "eight") to digits.
 * Uses word boundaries to avoid false positives (e.g. "someone" doesn't become "some1").
 */
function convertWordsToDigits(text) {
  let normalized = text.toLowerCase();
  
  // Replace each written number word with its digit representation
  for (const [word, digit] of Object.entries(NUMBER_WORDS)) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    normalized = normalized.replace(regex, digit);
  }
  return normalized;
}

/**
 * Moderates a chat message based on config flags.
 * 
 * @param {string} text The raw chat message
 * @param {object} config Moderation configuration
 * @param {boolean} config.blockPhoneNumbers Block phone numbers
 * @param {boolean} config.blockEmails Block emails
 * @param {boolean} config.blockSocials Block social media handles/links
 * @returns {object} { safe: boolean, error?: string }
 */
export function moderateMessage(text, config = {}) {
  const {
    blockPhoneNumbers = true,
    blockEmails = true,
    blockSocials = true
  } = config;

  if (!text || typeof text !== 'string') {
    return { safe: true };
  }

  // 1. Phone number moderation
  if (blockPhoneNumbers) {
    // First convert any word-based numbers to digits
    const textWithDigits = convertWordsToDigits(text);

    // Regular expression matching:
    // - Optionally starts with '+'
    // - Followed by 8 to 20 digits, separated by common dividers (spaces, hyphens, dots, parentheses, underscores, commas)
    const phoneRegex = /(?:\+?\d[\s\-()._,]*){8,20}/g;
    
    if (phoneRegex.test(textWithDigits)) {
      return {
        safe: false,
        error: 'For your safety, sharing phone numbers is not allowed in Swaply chat.'
      };
    }
  }

  // 2. Email moderation
  if (blockEmails) {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    if (emailRegex.test(text)) {
      return {
        safe: false,
        error: 'For your safety, sharing email addresses is not allowed in Swaply chat.'
      };
    }
  }

  // 3. Social media handles / external links moderation
  if (blockSocials) {
    // Matches Telegram links (t.me/username, telegram.me/username) and usernames (@username)
    const telegramRegex = /(?:t\.me|telegram\.me)\/[a-zA-Z0-9_]{4,}|(?:\s|^)@[a-zA-Z0-9_]{5,}/gi;
    
    // Matches WhatsApp links (wa.me/number, whatsapp.com/...)
    const whatsappRegex = /(?:wa\.me|whatsapp\.com)\/[a-zA-Z0-9_]+/gi;
    
    // Matches Instagram links (instagram.com/username) and handles if matched with @
    const instagramRegex = /(?:instagram\.com|instagr\.am)\/[a-zA-Z0-9_.]+/gi;

    if (telegramRegex.test(text) || whatsappRegex.test(text) || instagramRegex.test(text)) {
      return {
        safe: false,
        error: 'For your safety, sharing social handles or external chat links is not allowed in Swaply chat.'
      };
    }
  }

  return { safe: true };
}
