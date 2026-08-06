import assert from 'assert';
import {
  validateUploadFile,
  scanFileForViruses,
  storeMediaFile,
  cleanupExpiredFiles,
  getStorageStats
} from './services/fileStorageService.js';

console.log('🧪 Starting Phase 14 Suite: File Storage & Media Management...');

async function runTest() {
  try {
    // 1. Virus scanner test
    const cleanScan = scanFileForViruses(Buffer.from('hello world image'));
    assert(cleanScan.clean === true, 'Clean file flagged as virus');

    const infectedScan = scanFileForViruses(Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE'));
    assert(infectedScan.clean === false, 'Mock virus not detected');

    // 2. Validate file upload
    const validResult = validateUploadFile({
      mimetype: 'image/png',
      size: 1000,
      category: 'profile_pictures',
      buffer: Buffer.from('png data')
    });
    assert(validResult.valid === true, 'Valid file rejected');

    // 3. Store test file
    const stored = await storeMediaFile({
      userId: null,
      category: 'temp_files',
      fileName: 'test_temp.png',
      buffer: Buffer.from('temp data'),
      mimetype: 'image/png',
      isTemp: true
    });
    assert(stored.id !== undefined, 'Storing media file failed');

    // 4. Storage stats
    const stats = await getStorageStats();
    assert(stats.totalStorageBytes >= 0, 'Invalid storage stats');

    // 5. Cleanup expired files
    const cleanup = await cleanupExpiredFiles();
    assert(cleanup.cleanedCount !== undefined, 'Cleanup check failed');

    console.log('✅ Phase 14 File Storage & Media Management tests PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Phase 14 File Storage test FAILED:', err);
    process.exit(1);
  }
}

runTest();
