import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, fileQueries, operationQueries, errorQueries } from '../database/index.js';
import { generateDestinationPath, extractDateComponents } from './dateResolver.js';
import { checkForExistingDuplicate } from './duplicateDetector.js';

// Organize status tracking
let currentOrganizeStatus = null;

/**
 * Get current organize status
 * @returns {Object|null} - Current status or null
 */
export function getOrganizeStatus() {
  return currentOrganizeStatus;
}

/**
 * Organize files into date-based folder structure
 * @param {string} destinationBase - Base destination folder
 * @param {boolean} dryRun - If true, don't actually move files
 * @param {number[]|null} fileIds - Specific file IDs to organize, or null for all pending
 * @returns {Promise<Object>} - Organization results
 */
export async function organizeFiles(destinationBase, dryRun = false, fileIds = null) {
  const db = getDatabase();
  const batchId = uuidv4();

  // Initialize status
  currentOrganizeStatus = {
    batchId,
    destinationBase,
    dryRun,
    status: 'in_progress',
    totalFiles: 0,
    processedFiles: 0,
    movedFiles: 0,
    skippedFiles: 0,
    duplicateFiles: 0,
    errorFiles: 0,
    startedAt: new Date().toISOString(),
    operations: []
  };

  try {
    // Get files to organize
    let filesToOrganize;
    if (fileIds && fileIds.length > 0) {
      const placeholders = fileIds.map(() => '?').join(',');
      filesToOrganize = db.prepare(`
        SELECT * FROM files
        WHERE id IN (${placeholders}) AND status = 'pending'
      `).all(...fileIds);
    } else {
      filesToOrganize = fileQueries.getFilesByStatus().all('pending');
    }

    currentOrganizeStatus.totalFiles = filesToOrganize.length;

    // Process each file
    for (const file of filesToOrganize) {
      await organizeFile(file, destinationBase, batchId, dryRun);
      currentOrganizeStatus.processedFiles++;
    }

    currentOrganizeStatus.status = 'completed';
    currentOrganizeStatus.completedAt = new Date().toISOString();

    return currentOrganizeStatus;
  } catch (error) {
    currentOrganizeStatus.status = 'error';
    currentOrganizeStatus.error = error.message;
    throw error;
  }
}

/**
 * Organize a single file
 * @param {Object} file - File record from database
 * @param {string} destinationBase - Base destination folder
 * @param {string} batchId - Batch ID for this operation
 * @param {boolean} dryRun - If true, don't actually move files
 */
async function organizeFile(file, destinationBase, batchId, dryRun) {
  const db = getDatabase();
  const sourcePath = file.current_path || file.original_path;

  try {
    // Check if source file still exists
    try {
      await fs.access(sourcePath);
    } catch {
      logOperation(batchId, file.id, 'skip', sourcePath, null, file.hash_sha256, 'Source file not found');
      currentOrganizeStatus.skippedFiles++;
      return;
    }

    // Check for existing duplicate at destination
    const existingDuplicate = checkForExistingDuplicate(file.hash_sha256, file.id);
    if (existingDuplicate) {
      // Mark as duplicate and skip
      fileQueries.updateFile().run({
        id: file.id,
        current_path: file.current_path,
        hash_sha256: file.hash_sha256,
        hash_partial: file.hash_partial,
        mime_type: file.mime_type,
        exif_date: file.exif_date,
        resolved_date: file.resolved_date,
        date_source: file.date_source,
        status: 'duplicate',
        duplicate_of: existingDuplicate.id,
        metadata_json: file.metadata_json
      });
      logOperation(batchId, file.id, 'duplicate', sourcePath, existingDuplicate.current_path,
        file.hash_sha256, `Duplicate of file ${existingDuplicate.id}`);
      currentOrganizeStatus.duplicateFiles++;
      return;
    }

    // Generate destination path
    let destPath = generateDestinationPath(destinationBase, file.resolved_date, file.filename);

    // Handle filename collision
    destPath = await handleCollision(destPath, file.hash_sha256);

    if (dryRun) {
      // Log what would happen
      logOperation(batchId, file.id, 'move', sourcePath, destPath, file.hash_sha256, 'Dry run - would move');
      currentOrganizeStatus.movedFiles++;
      currentOrganizeStatus.operations.push({
        fileId: file.id,
        source: sourcePath,
        destination: destPath,
        action: 'would_move'
      });
      return;
    }

    // Create destination directory
    const destDir = path.dirname(destPath);
    await fs.mkdir(destDir, { recursive: true });

    // Move the file
    await fs.rename(sourcePath, destPath);

    // Update database
    fileQueries.updateFile().run({
      id: file.id,
      current_path: destPath,
      hash_sha256: file.hash_sha256,
      hash_partial: file.hash_partial,
      mime_type: file.mime_type,
      exif_date: file.exif_date,
      resolved_date: file.resolved_date,
      date_source: file.date_source,
      status: 'moved',
      duplicate_of: null,
      metadata_json: file.metadata_json
    });

    logOperation(batchId, file.id, 'move', sourcePath, destPath, file.hash_sha256, 'File moved successfully');
    currentOrganizeStatus.movedFiles++;
    currentOrganizeStatus.operations.push({
      fileId: file.id,
      source: sourcePath,
      destination: destPath,
      action: 'moved'
    });

  } catch (error) {
    currentOrganizeStatus.errorFiles++;
    logError(file.id, sourcePath, 'organize_error', error.message, error.stack);
    logOperation(batchId, file.id, 'error', sourcePath, null, file.hash_sha256, error.message);
  }
}

/**
 * Handle filename collision at destination
 * @param {string} destPath - Proposed destination path
 * @param {string} hash - File hash for uniqueness
 * @returns {Promise<string>} - Resolved destination path
 */
async function handleCollision(destPath, hash) {
  let finalPath = destPath;
  let counter = 1;

  while (await fileExists(finalPath)) {
    const dir = path.dirname(destPath);
    const ext = path.extname(destPath);
    const base = path.basename(destPath, ext);

    // Try numbered suffix first
    finalPath = path.join(dir, `${base} (${counter})${ext}`);
    counter++;

    // If we've tried too many times, use hash prefix
    if (counter > 100 && hash) {
      const hashPrefix = hash.substring(0, 8);
      finalPath = path.join(dir, `${base} (${hashPrefix})${ext}`);
      break;
    }
  }

  return finalPath;
}

/**
 * Check if a file exists
 * @param {string} filePath - Path to check
 * @returns {Promise<boolean>} - True if file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Log an operation to the database
 */
function logOperation(batchId, fileId, operationType, sourcePath, destPath, hash, reason) {
  try {
    operationQueries.insertOperation().run({
      batch_id: batchId,
      file_id: fileId,
      operation_type: operationType,
      source_path: sourcePath,
      destination_path: destPath,
      hash_used: hash,
      reason,
      status: 'completed'
    });
  } catch (error) {
    console.error('Failed to log operation:', error);
  }
}

/**
 * Log an error to the database
 */
function logError(fileId, filePath, errorType, message, stack) {
  try {
    errorQueries.insertError().run({
      file_id: fileId,
      file_path: filePath,
      error_type: errorType,
      error_message: message,
      stack_trace: stack
    });
  } catch (error) {
    console.error('Failed to log error:', error);
  }
}

/**
 * Preview organization results without moving files
 * @param {string} destinationBase - Base destination folder
 * @param {number[]|null} fileIds - Specific file IDs or null for all
 * @returns {Promise<Object[]>} - Preview of what would happen
 */
export async function previewOrganization(destinationBase, fileIds = null) {
  const db = getDatabase();

  let filesToPreview;
  if (fileIds && fileIds.length > 0) {
    const placeholders = fileIds.map(() => '?').join(',');
    filesToPreview = db.prepare(`
      SELECT * FROM files
      WHERE id IN (${placeholders}) AND status = 'pending'
    `).all(...fileIds);
  } else {
    filesToPreview = fileQueries.getFilesByStatus().all('pending');
  }

  const preview = [];
  for (const file of filesToPreview) {
    const destPath = generateDestinationPath(destinationBase, file.resolved_date, file.filename);
    const existingDuplicate = checkForExistingDuplicate(file.hash_sha256, file.id);

    preview.push({
      id: file.id,
      filename: file.filename,
      sourcePath: file.current_path || file.original_path,
      destinationPath: destPath,
      resolvedDate: file.resolved_date,
      dateSource: file.date_source,
      size: file.size,
      action: existingDuplicate ? 'duplicate' : 'move',
      duplicateOf: existingDuplicate?.id || null
    });
  }

  return preview;
}

export default {
  organizeFiles,
  getOrganizeStatus,
  previewOrganization
};
