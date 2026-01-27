import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { getDatabase, fileQueries, errorQueries } from '../database/index.js';

const router = Router();

/**
 * GET /api/files
 * List files with optional filters
 */
router.get('/', (req, res, next) => {
  try {
    const db = getDatabase();
    const { status, limit = 100, offset = 0 } = req.query;

    let files;
    if (status) {
      files = fileQueries.getFilesByStatus().all(status);
    } else {
      const stmt = db.prepare(`
        SELECT * FROM files
        ORDER BY resolved_date DESC
        LIMIT ? OFFSET ?
      `);
      files = stmt.all(parseInt(limit), parseInt(offset));
    }

    const countResult = fileQueries.countFiles().get();

    res.json({
      files,
      total: countResult.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/files/stats
 * Get file statistics
 */
router.get('/stats', (req, res, next) => {
  try {
    const db = getDatabase();

    const statusCounts = fileQueries.countFilesByStatus().all();
    const totalCount = fileQueries.countFiles().get();
    const errorCount = errorQueries.countErrors().get();

    res.json({
      total: totalCount.count,
      byStatus: statusCounts.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {}),
      errors: errorCount.count
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/files/:id
 * Get single file details
 */
router.get('/:id', (req, res, next) => {
  try {
    const file = fileQueries.getFileById().get(req.params.id);

    if (!file) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    // Parse metadata JSON if present
    if (file.metadata_json) {
      try {
        file.metadata = JSON.parse(file.metadata_json);
      } catch (e) {
        file.metadata = null;
      }
    }

    res.json(file);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/files/:id/preview
 * Get image preview/thumbnail
 */
router.get('/:id/preview', (req, res, next) => {
  try {
    const file = fileQueries.getFileById().get(req.params.id);

    if (!file) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    const filePath = file.current_path || file.original_path;

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: { message: 'File no longer exists on disk' } });
    }

    // Check if it's an image
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    const ext = path.extname(filePath).toLowerCase();

    if (!imageExtensions.includes(ext)) {
      return res.status(400).json({ error: { message: 'Preview only available for images' } });
    }

    // For now, just serve the original file
    // TODO: Generate thumbnails for better performance
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/files/duplicates
 * Get all duplicate file groups
 */
router.get('/duplicates/all', (req, res, next) => {
  try {
    const db = getDatabase();

    // Get files that have duplicates
    const stmt = db.prepare(`
      SELECT hash_sha256, COUNT(*) as count
      FROM files
      WHERE hash_sha256 IS NOT NULL
      GROUP BY hash_sha256
      HAVING COUNT(*) > 1
    `);

    const duplicateHashes = stmt.all();

    const duplicateGroups = duplicateHashes.map(({ hash_sha256 }) => {
      const files = db.prepare('SELECT * FROM files WHERE hash_sha256 = ?').all(hash_sha256);
      return {
        hash: hash_sha256,
        count: files.length,
        files
      };
    });

    res.json({
      groups: duplicateGroups,
      totalGroups: duplicateGroups.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/files/errors
 * Get all error records
 */
router.get('/errors/all', (req, res, next) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const errors = errorQueries.getErrors().all(parseInt(limit), parseInt(offset));
    const countResult = errorQueries.countErrors().get();

    res.json({
      errors,
      total: countResult.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    next(error);
  }
});

export default router;
