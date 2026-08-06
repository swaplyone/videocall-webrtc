import fs from 'fs';
import path from 'path';
import { query } from '../db.js';

const STORAGE_ROOT = path.resolve(process.cwd(), 'public/uploads');

const CATEGORY_LIMITS = {
  profile_pictures: 5 * 1024 * 1024, // 5MB
  qr_codes: 2 * 1024 * 1024,       // 2MB
  evidence: 20 * 1024 * 1024,       // 20MB
  feedback: 10 * 1024 * 1024,       // 10MB
  admin_docs: 25 * 1024 * 1024,     // 25MB
  temp_files: 50 * 1024 * 1024      // 50MB
};

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'application/json', 'text/plain', 'video/webm'
];

if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

/**
 * Virus Scan Hook - inspect file buffer against virus signatures
 */
export function scanFileForViruses(buffer) {
  const content = buffer.toString('utf-8');
  // Check mock EICAR test string
  if (content.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) {
    return { clean: false, virusName: 'EICAR-Test-Signature' };
  }
  return { clean: true, virusName: null };
}

/**
 * Validate upload file payload
 */
export function validateUploadFile(file) {
  if (!file) return { valid: false, error: 'No file provided' };

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return { valid: false, error: `Invalid MIME type: ${file.mimetype}` };
  }

  const category = file.category || 'temp_files';
  const maxSize = CATEGORY_LIMITS[category] || 10 * 1024 * 1024;

  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds category limit of ${maxSize / (1024 * 1024)}MB` };
  }

  const virusResult = scanFileForViruses(file.buffer || Buffer.from(''));
  if (!virusResult.clean) {
    return { valid: false, error: `Virus detected: ${virusResult.virusName}` };
  }

  return { valid: true };
}

/**
 * Save file record in DB and filesystem
 */
export async function storeMediaFile({ userId, category, fileName, buffer, mimetype, isTemp = false }) {
  const catDir = path.join(STORAGE_ROOT, category);
  if (!fs.existsSync(catDir)) {
    fs.mkdirSync(catDir, { recursive: true });
  }

  const safeFileName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
  const filePath = path.join(catDir, safeFileName);

  fs.writeFileSync(filePath, buffer);

  const expiresAt = isTemp ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null; // 24 hours expiry for temp

  const res = await query(
    `INSERT INTO media_files (user_id, category, file_path, file_size, mime_type, virus_scanned, is_temp, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [userId || null, category, filePath, buffer.length, mimetype, true, isTemp, expiresAt]
  );

  return res.rows[0];
}

/**
 * Automatic cleanup of expired temporary files
 */
export async function cleanupExpiredFiles() {
  try {
    const expiredRes = await query(
      `SELECT id, file_path FROM media_files WHERE is_temp = TRUE AND expires_at < CURRENT_TIMESTAMP`
    );

    for (const row of expiredRes.rows) {
      if (fs.existsSync(row.file_path)) {
        fs.unlinkSync(row.file_path);
      }
      await query('DELETE FROM media_files WHERE id = $1', [row.id]);
    }

    return { cleanedCount: expiredRes.rows.length };
  } catch (err) {
    console.error('Error during file cleanup:', err);
    return { cleanedCount: 0 };
  }
}

/**
 * Storage usage statistics
 */
export async function getStorageStats() {
  try {
    const res = await query(
      `SELECT category, COUNT(*) as file_count, COALESCE(SUM(file_size), 0) as total_bytes
       FROM media_files GROUP BY category`
    );

    let totalDiskBytes = 0;
    const categories = {};

    res.rows.forEach(row => {
      const bytes = parseInt(row.total_bytes, 10);
      totalDiskBytes += bytes;
      categories[row.category] = {
        count: parseInt(row.file_count, 10),
        sizeBytes: bytes,
        sizeMb: (bytes / (1024 * 1024)).toFixed(2)
      };
    });

    return {
      totalStorageBytes: totalDiskBytes,
      totalStorageMb: (totalDiskBytes / (1024 * 1024)).toFixed(2),
      categories
    };
  } catch (err) {
    return { totalStorageBytes: 0, totalStorageMb: '0.00', categories: {} };
  }
}
