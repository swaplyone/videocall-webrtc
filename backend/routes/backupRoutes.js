import express from 'express';
import path from 'path';
import fs from 'fs';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
import { createFullBackup, listBackups, verifyBackup, restoreBackup } from '../services/backupService.js';
import { logAdminAction } from '../services/auditLogService.js';

const router = express.Router();

// GET /api/backups - List all backups
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const backups = listBackups();
    return res.json({ success: true, backups });
  } catch (err) {
    console.error('Error listing backups:', err);
    return res.status(500).json({ success: false, error: 'Failed to list backups' });
  }
});

// POST /api/backups/trigger - Trigger manual backup
router.post('/trigger', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const backupInfo = await createFullBackup('MANUAL');
    await logAdminAction(req.user.id, 'TRIGGER_BACKUP', null, { filename: backupInfo.filename }, req.ip);
    return res.json({ success: true, backup: backupInfo });
  } catch (err) {
    console.error('Error triggering backup:', err);
    return res.status(500).json({ success: false, error: 'Failed to create backup' });
  }
});

// POST /api/backups/verify - Verify backup file
router.post('/verify', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ success: false, error: 'Filename is required' });
    }
    const result = verifyBackup(filename);
    return res.json({ success: true, result });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Backup verification failed' });
  }
});

// POST /api/backups/restore - Restore backup archive
router.post('/restore', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ success: false, error: 'Filename is required' });
    }
    const result = await restoreBackup(filename);
    await logAdminAction(req.user.id, 'RESTORE_BACKUP', null, { filename }, req.ip);
    return res.json({ success: true, result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/backups/download/:filename - Download encrypted backup
router.get('/download/:filename', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { filename } = req.params;
    const backupDir = path.resolve(process.cwd(), 'backups');
    const filePath = path.join(backupDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Backup file not found' });
    }

    return res.download(filePath, filename);
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to download backup file' });
  }
});

export default router;
