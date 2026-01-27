import { Router } from 'express';
import { getDatabase, operationQueries } from '../database/index.js';
import { revertOperation, revertBatch } from '../services/revert.js';

const router = Router();

/**
 * GET /api/operations
 * List operations with pagination
 */
router.get('/', (req, res, next) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const operations = operationQueries.getAllOperations().all(parseInt(limit), parseInt(offset));

    const db = getDatabase();
    const countResult = db.prepare('SELECT COUNT(*) as count FROM operations').get();

    res.json({
      operations,
      total: countResult.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/operations/batches
 * Get list of operation batches
 */
router.get('/batches', (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    const batches = operationQueries.getRecentBatches().all(parseInt(limit));

    res.json({ batches });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/operations/batch/:batchId
 * Get all operations in a batch
 */
router.get('/batch/:batchId', (req, res, next) => {
  try {
    const { batchId } = req.params;

    const operations = operationQueries.getOperationsByBatch().all(batchId);

    if (operations.length === 0) {
      return res.status(404).json({ error: { message: 'Batch not found' } });
    }

    res.json({
      batchId,
      operations,
      count: operations.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/operations/:id
 * Get single operation details
 */
router.get('/:id', (req, res, next) => {
  try {
    const db = getDatabase();
    const operation = db.prepare('SELECT * FROM operations WHERE id = ?').get(req.params.id);

    if (!operation) {
      return res.status(404).json({ error: { message: 'Operation not found' } });
    }

    res.json(operation);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/operations/:id/revert
 * Revert a single operation
 */
router.post('/:id/revert', async (req, res, next) => {
  try {
    const { id } = req.params;

    const db = getDatabase();
    const operation = db.prepare('SELECT * FROM operations WHERE id = ?').get(id);

    if (!operation) {
      return res.status(404).json({ error: { message: 'Operation not found' } });
    }

    if (operation.status === 'reverted') {
      return res.status(400).json({ error: { message: 'Operation already reverted' } });
    }

    if (operation.operation_type !== 'move') {
      return res.status(400).json({ error: { message: 'Only move operations can be reverted' } });
    }

    const result = await revertOperation(operation);

    res.json({
      message: 'Operation reverted successfully',
      result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/operations/batch/:batchId/revert
 * Revert all operations in a batch
 */
router.post('/batch/:batchId/revert', async (req, res, next) => {
  try {
    const { batchId } = req.params;

    const operations = operationQueries.getOperationsByBatch().all(batchId);

    if (operations.length === 0) {
      return res.status(404).json({ error: { message: 'Batch not found' } });
    }

    // Check if any operations are already reverted
    const alreadyReverted = operations.filter(op => op.status === 'reverted').length;
    if (alreadyReverted === operations.length) {
      return res.status(400).json({ error: { message: 'All operations in batch already reverted' } });
    }

    const result = await revertBatch(batchId);

    res.json({
      message: 'Batch reverted',
      batchId,
      result
    });
  } catch (error) {
    next(error);
  }
});

export default router;
