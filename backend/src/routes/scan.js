import { Router } from 'express';
import { getDatabase, scanSessionQueries } from '../database/index.js';
import { scanDirectory, getScanStatus } from '../services/scanner.js';

const router = Router();

// Track active scan
let activeScan = null;

/**
 * POST /api/scan
 * Start a new folder scan
 */
router.post('/', async (req, res, next) => {
  try {
    const { sourcePath, recursive = true } = req.body;

    if (!sourcePath) {
      return res.status(400).json({ error: { message: 'sourcePath is required' } });
    }

    // Check if a scan is already in progress
    if (activeScan && activeScan.status === 'in_progress') {
      return res.status(409).json({
        error: { message: 'A scan is already in progress' },
        scan: activeScan
      });
    }

    // Create a new scan session
    const db = getDatabase();
    const result = scanSessionQueries.createSession().run({ source_path: sourcePath });
    const sessionId = result.lastInsertRowid;

    // Start scan asynchronously
    activeScan = {
      sessionId,
      sourcePath,
      recursive,
      status: 'in_progress',
      totalFiles: 0,
      processedFiles: 0,
      startedAt: new Date().toISOString()
    };

    // Run scan in background
    scanDirectory(sourcePath, recursive, sessionId)
      .then(result => {
        activeScan = {
          ...activeScan,
          ...result,
          status: 'completed',
          completedAt: new Date().toISOString()
        };
      })
      .catch(error => {
        activeScan = {
          ...activeScan,
          status: 'error',
          error: error.message,
          completedAt: new Date().toISOString()
        };
      });

    res.status(202).json({
      message: 'Scan started',
      sessionId,
      sourcePath
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/scan/status
 * Get current scan progress
 */
router.get('/status', (req, res, next) => {
  try {
    const status = getScanStatus();

    if (!activeScan && !status) {
      return res.json({
        status: 'idle',
        message: 'No scan in progress'
      });
    }

    res.json({
      ...activeScan,
      ...status
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/scan/cancel
 * Cancel the current scan
 */
router.post('/cancel', (req, res, next) => {
  try {
    if (!activeScan || activeScan.status !== 'in_progress') {
      return res.status(400).json({ error: { message: 'No scan in progress to cancel' } });
    }

    // TODO: Implement cancellation logic
    activeScan.status = 'cancelled';
    activeScan.completedAt = new Date().toISOString();

    res.json({
      message: 'Scan cancelled',
      scan: activeScan
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/scan/history
 * Get scan history
 */
router.get('/history', (req, res, next) => {
  try {
    const db = getDatabase();
    const sessions = db.prepare(`
      SELECT * FROM scan_sessions
      ORDER BY started_at DESC
      LIMIT 20
    `).all();

    res.json({ sessions });
  } catch (error) {
    next(error);
  }
});

export default router;
