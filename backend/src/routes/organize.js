import { Router } from 'express';
import { getDatabase } from '../database/index.js';
import { organizeFiles, getOrganizeStatus } from '../services/organizer.js';

const router = Router();

// Track active organization
let activeOrganize = null;

/**
 * POST /api/organize
 * Start file organization
 */
router.post('/', async (req, res, next) => {
  try {
    const { destinationPath, dryRun = false, fileIds } = req.body;

    if (!destinationPath) {
      return res.status(400).json({ error: { message: 'destinationPath is required' } });
    }

    // Check if organization is already in progress
    if (activeOrganize && activeOrganize.status === 'in_progress') {
      return res.status(409).json({
        error: { message: 'Organization is already in progress' },
        organize: activeOrganize
      });
    }

    // Initialize organization status
    activeOrganize = {
      destinationPath,
      dryRun,
      status: 'in_progress',
      totalFiles: 0,
      processedFiles: 0,
      movedFiles: 0,
      skippedFiles: 0,
      errorFiles: 0,
      startedAt: new Date().toISOString()
    };

    // Run organization in background
    organizeFiles(destinationPath, dryRun, fileIds)
      .then(result => {
        activeOrganize = {
          ...activeOrganize,
          ...result,
          status: 'completed',
          completedAt: new Date().toISOString()
        };
      })
      .catch(error => {
        activeOrganize = {
          ...activeOrganize,
          status: 'error',
          error: error.message,
          completedAt: new Date().toISOString()
        };
      });

    res.status(202).json({
      message: dryRun ? 'Dry run started' : 'Organization started',
      destinationPath,
      dryRun
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/organize/status
 * Get current organization progress
 */
router.get('/status', (req, res, next) => {
  try {
    const status = getOrganizeStatus();

    if (!activeOrganize && !status) {
      return res.json({
        status: 'idle',
        message: 'No organization in progress'
      });
    }

    res.json({
      ...activeOrganize,
      ...status
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/organize/cancel
 * Cancel the current organization
 */
router.post('/cancel', (req, res, next) => {
  try {
    if (!activeOrganize || activeOrganize.status !== 'in_progress') {
      return res.status(400).json({ error: { message: 'No organization in progress to cancel' } });
    }

    // TODO: Implement cancellation logic
    activeOrganize.status = 'cancelled';
    activeOrganize.completedAt = new Date().toISOString();

    res.json({
      message: 'Organization cancelled',
      organize: activeOrganize
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/organize/preview
 * Preview what would happen during organization
 */
router.get('/preview', (req, res, next) => {
  try {
    const { destinationPath } = req.query;

    if (!destinationPath) {
      return res.status(400).json({ error: { message: 'destinationPath query parameter is required' } });
    }

    const db = getDatabase();

    // Get pending files
    const pendingFiles = db.prepare(`
      SELECT * FROM files
      WHERE status = 'pending' AND resolved_date IS NOT NULL
      ORDER BY resolved_date
    `).all();

    // Generate preview of destination paths
    const preview = pendingFiles.map(file => {
      const date = new Date(file.resolved_date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      return {
        id: file.id,
        sourcePath: file.original_path,
        destinationPath: `${destinationPath}/${year}/${month}/${day}/${file.filename}`,
        resolvedDate: file.resolved_date,
        dateSource: file.date_source
      };
    });

    res.json({
      totalFiles: preview.length,
      preview: preview.slice(0, 100) // Limit preview to 100 files
    });
  } catch (error) {
    next(error);
  }
});

export default router;
