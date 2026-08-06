import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
import {
  validateUploadFile,
  storeMediaFile,
  cleanupExpiredFiles,
  getStorageStats
} from '../services/fileStorageService.js';
import { logAdminAction } from '../services/auditLogService.js';

const router = express.Router();

// GET /api/storage/stats - Get storage statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await getStorageStats();
    return res.json({ success: true, stats });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch storage stats' });
  }
});

// POST /api/storage/cleanup - Manual trigger automatic file cleanup
router.post('/cleanup', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await cleanupExpiredFiles();
    await logAdminAction(req.user.id, 'CLEANUP_TEMP_FILES', null, result, req.ip);
    return res.json({ success: true, result });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to execute file cleanup' });
  }
});

// POST /api/storage/upload - Upload file (Mock/Buffer Handler)
router.post('/upload', authenticateToken, async (req, res) => {
  try {
    const { category = 'temp_files', fileName = 'upload.png', fileData = '', mimetype = 'image/png', isTemp = false } = req.body;
    const buffer = Buffer.from(fileData, 'base64');

    const validation = validateUploadFile({
      mimetype,
      size: buffer.length,
      category,
      buffer
    });

    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const fileRecord = await storeMediaFile({
      userId: req.user.id,
      category,
      fileName,
      buffer,
      mimetype,
      isTemp
    });

    return res.json({ success: true, file: fileRecord });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'File upload failed' });
  }
});

export default router;
