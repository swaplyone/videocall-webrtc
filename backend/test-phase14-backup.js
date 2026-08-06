import assert from 'assert';
import { createFullBackup, verifyBackup, listBackups } from './services/backupService.js';

console.log('🧪 Starting Phase 14 Suite: Backup & Disaster Recovery...');

async function runTest() {
  try {
    // 1. Create backup archive
    const backupInfo = await createFullBackup('TEST');
    assert(backupInfo.success, 'Backup creation failed');
    assert(backupInfo.filename.includes('swaply_backup_test_'), 'Filename pattern invalid');

    // 2. Verify backup checksum
    const verification = verifyBackup(backupInfo.filename);
    assert(verification.valid, `Backup verification failed: ${verification.error}`);

    // 3. List backups
    const backups = listBackups();
    assert(backups.length > 0, 'List backups returned 0 items');

    console.log('✅ Phase 14 Backup & Disaster Recovery tests PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Phase 14 Backup test FAILED:', err);
    process.exit(1);
  }
}

runTest();
