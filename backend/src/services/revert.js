import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, fileQueries, operationQueries, errorQueries } from '../database/index.js';
import { calculateHash } from './hasher.js';

/**
 * Revert a single operation
 * @param {Object} operation - Operation record from database
 * @returns {Promise<Object>} - Revert result
 */
export async function revertOperation(operation) {
  const db = getDatabase();

  if (operation.operation_type !== 'move') {
    throw new Error('Only move operations can be reverted');
  }

  if (operation.status === 'reverted') {
    throw new Error('Operation already reverted');
  }

  const file = fileQueries.getFileById().get(operation.file_id);
  if (!file) {
    throw new Error('Associated file not found');
  }

  const currentPath = operation.destination_path;
  const originalPath = operation.source_path;

  // Check if file still exists at destination
  try {
    await fs.access(currentPath);
  } catch {
    throw new Error('File no longer exists at destination path');
  }

  // Optionally verify file integrity
  if (operation.hash_used) {
    const currentHash = await calculateHash(currentPath);
    if (currentHash !== operation.hash_used) {
      throw new Error('File has been modified since it was moved');
    }
  }

  // Check if original location is available
  const originalDir = path.dirname(originalPath);
  try {
    await fs.access(originalDir);
  } catch {
    // Create the original directory if it doesn't exist
    await fs.mkdir(originalDir, { recursive: true });
  }

  // Check if something already exists at the original path
  try {
    await fs.access(originalPath);
    throw new Error('A file already exists at the original location');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    // ENOENT means file doesn't exist, which is what we want
  }

  // Move file back
  await fs.rename(currentPath, originalPath);

  // Update file record
  fileQueries.updateFile().run({
    id: file.id,
    current_path: originalPath,
    hash_sha256: file.hash_sha256,
    hash_partial: file.hash_partial,
    mime_type: file.mime_type,
    exif_date: file.exif_date,
    resolved_date: file.resolved_date,
    date_source: file.date_source,
    status: 'pending',
    duplicate_of: null,
    metadata_json: file.metadata_json
  });

  // Update operation status
  operationQueries.updateOperationStatus().run('reverted', operation.id);

  // Log the revert operation
  const batchId = uuidv4();
  operationQueries.insertOperation().run({
    batch_id: batchId,
    file_id: file.id,
    operation_type: 'revert',
    source_path: currentPath,
    destination_path: originalPath,
    hash_used: operation.hash_used,
    reason: `Reverted operation ${operation.id}`,
    status: 'completed'
  });

  // Try to clean up empty directories
  await cleanupEmptyDirectories(path.dirname(currentPath));

  return {
    success: true,
    operationId: operation.id,
    fileId: file.id,
    originalPath,
    revertedFrom: currentPath
  };
}

/**
 * Revert all operations in a batch
 * @param {string} batchId - Batch ID to revert
 * @returns {Promise<Object>} - Batch revert results
 */
export async function revertBatch(batchId) {
  const db = getDatabase();

  // Get all move operations in the batch (in reverse order)
  const operations = db.prepare(`
    SELECT * FROM operations
    WHERE batch_id = ? AND operation_type = 'move' AND status = 'completed'
    ORDER BY created_at DESC
  `).all(batchId);

  if (operations.length === 0) {
    throw new Error('No revertible operations found in batch');
  }

  const results = {
    batchId,
    totalOperations: operations.length,
    reverted: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };

  for (const operation of operations) {
    try {
      await revertOperation(operation);
      results.reverted++;
    } catch (error) {
      if (error.message === 'Operation already reverted') {
        results.skipped++;
      } else {
        results.failed++;
        results.errors.push({
          operationId: operation.id,
          error: error.message
        });
      }
    }
  }

  return results;
}

/**
 * Check if an operation can be reverted
 * @param {Object} operation - Operation record
 * @returns {Promise<Object>} - Revert possibility info
 */
export async function canRevert(operation) {
  const result = {
    canRevert: false,
    reason: null
  };

  if (operation.operation_type !== 'move') {
    result.reason = 'Only move operations can be reverted';
    return result;
  }

  if (operation.status === 'reverted') {
    result.reason = 'Operation already reverted';
    return result;
  }

  // Check if file exists at destination
  try {
    await fs.access(operation.destination_path);
  } catch {
    result.reason = 'File no longer exists at destination';
    return result;
  }

  // Check if original path is free
  try {
    await fs.access(operation.source_path);
    result.reason = 'A file already exists at the original location';
    return result;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      result.reason = `Cannot access original path: ${error.message}`;
      return result;
    }
  }

  result.canRevert = true;
  return result;
}

/**
 * Get revert preview for a batch
 * @param {string} batchId - Batch ID
 * @returns {Promise<Object[]>} - Preview of revert operations
 */
export async function previewBatchRevert(batchId) {
  const db = getDatabase();

  const operations = db.prepare(`
    SELECT * FROM operations
    WHERE batch_id = ? AND operation_type = 'move' AND status = 'completed'
    ORDER BY created_at DESC
  `).all(batchId);

  const preview = [];
  for (const operation of operations) {
    const revertability = await canRevert(operation);
    preview.push({
      operationId: operation.id,
      fileId: operation.file_id,
      currentPath: operation.destination_path,
      originalPath: operation.source_path,
      canRevert: revertability.canRevert,
      reason: revertability.reason
    });
  }

  return preview;
}

/**
 * Clean up empty directories after reverting files
 * @param {string} dirPath - Directory to check
 */
async function cleanupEmptyDirectories(dirPath) {
  try {
    const entries = await fs.readdir(dirPath);
    if (entries.length === 0) {
      await fs.rmdir(dirPath);
      // Recursively clean parent
      const parent = path.dirname(dirPath);
      await cleanupEmptyDirectories(parent);
    }
  } catch (error) {
    // Ignore errors during cleanup
  }
}

/**
 * Get revert history for a file
 * @param {number} fileId - File ID
 * @returns {Object[]} - History of operations for this file
 */
export function getFileHistory(fileId) {
  return operationQueries.getOperationsByFile().all(fileId);
}

export default {
  revertOperation,
  revertBatch,
  canRevert,
  previewBatchRevert,
  getFileHistory
};
