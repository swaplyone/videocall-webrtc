// Unit tests for the moderator filtering module
import { moderateMessage } from './moderator.js';

const testCases = [
  // Phone numbers - Standard
  { text: 'My number is 9876543210', shouldBlock: true, desc: 'Raw digits phone number' },
  { text: 'Call me at 98765 43210', shouldBlock: true, desc: 'Spaced phone number' },
  { text: 'Ping 98765-43210', shouldBlock: true, desc: 'Hyphenated phone number' },
  { text: 'Reach me on +91 9876543210', shouldBlock: true, desc: 'International prefix with space' },
  { text: 'Send to +91-98765-43210', shouldBlock: true, desc: 'International prefix with hyphens' },
  { text: 'Try (123) 456-7890', shouldBlock: true, desc: 'Parentheses and hyphens' },
  
  // Phone numbers - Obfuscated
  { text: 'Contact: nine eight seven six five four three two one zero', shouldBlock: true, desc: 'Spelled out digits' },
  { text: 'nine-eight-seven-six-five-four-three-two-one-zero', shouldBlock: true, desc: 'Spelled out with hyphens' },
  { text: 'Call nine 8 seven 6 five 4 three 2 one 0', shouldBlock: true, desc: 'Mixed words and digits' },
  
  // Safe messages
  { text: 'Let\'s meet at 5pm tomorrow.', shouldBlock: false, desc: 'Normal conversation' },
  { text: 'I have 3 dogs and 2 cats.', shouldBlock: false, desc: 'Scattered small numbers' },
  { text: 'Someone needs to review this code.', shouldBlock: false, desc: 'Word containing "one"' },
  { text: 'Wait for me at platform nine.', shouldBlock: false, desc: 'Single number word' },
  
  // Emails
  { text: 'My email is test@example.com', shouldBlock: true, desc: 'Standard email address', category: 'emails' },
  { text: 'contact me: user.name+tag@sub.domain.co.uk', shouldBlock: true, desc: 'Complex email address', category: 'emails' },
  
  // Socials
  { text: 'Follow me at t.me/mychannel', shouldBlock: true, desc: 'Telegram link', category: 'socials' },
  { text: 'Add me on telegram: @my_handle', shouldBlock: true, desc: 'Telegram handle', category: 'socials' },
  { text: 'My WhatsApp is wa.me/123456', shouldBlock: true, desc: 'WhatsApp shortcut', category: 'socials' },
  { text: 'See my instagram: instagram.com/myprofile', shouldBlock: true, desc: 'Instagram link', category: 'socials' }
];

let failed = 0;

console.log('Running Swaply Moderation Engine Tests...\n');

// 1. Run default blocks (all enabled)
console.log('--- Default Filters (All Enabled) ---');
for (const tc of testCases) {
  const res = moderateMessage(tc.text);
  const blocked = !res.safe;
  if (blocked !== tc.shouldBlock) {
    console.error(`❌ FAIL [${tc.desc}]: "${tc.text}" -> Got blocked=${blocked}, Expected=${tc.shouldBlock}`);
    failed++;
  } else {
    console.log(`✅ PASS [${tc.desc}]: ${blocked ? 'Blocked: ' + res.error : 'Allowed'}`);
  }
}

// 2. Run configurable blocks (disable emails and socials, keep phones)
console.log('\n--- Custom Filters (Emails & Socials Allowed, Phones Blocked) ---');
const customConfig = { blockPhoneNumbers: true, blockEmails: false, blockSocials: false };

const emailTest = moderateMessage('My email is test@example.com', customConfig);
if (emailTest.safe) {
  console.log('✅ PASS: Emails allowed when disabled in config.');
} else {
  console.error('❌ FAIL: Email blocked when blockEmails is false.');
  failed++;
}

const socialTest = moderateMessage('Add me: @my_handle', customConfig);
if (socialTest.safe) {
  console.log('✅ PASS: Social handles allowed when disabled in config.');
} else {
  console.error('❌ FAIL: Social handle blocked when blockSocials is false.');
  failed++;
}

const phoneTest = moderateMessage('Call 9876543210', customConfig);
if (!phoneTest.safe) {
  console.log('✅ PASS: Phone number blocked under custom config.');
} else {
  console.error('❌ FAIL: Phone number allowed under custom config.');
  failed++;
}

console.log(`\nTests finished. Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
