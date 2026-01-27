import fs from 'fs/promises';
import path from 'path';
import { getDatabase, fileQueries, errorQueries, scanSessionQueries } from '../database/index.js';
import { extractAllMetadata, shouldSkipFile, shouldSkipDirectory } from './metadata.js';
import { calculateHashes } from './hasher.js';
import { resolveDate } from './dateResolver.js';
import config from '../config.js';

// Scan status tracking
let currentScanStatus = null;

/**
 * Get the current scan status
 * @returns {Object|null} - Current scan status or null
 */
export function getScanStatus() {
  return currentScanStatus;
}

/**
 * Scan a directory recursively for files
 * @param {string} sourcePath - Path to scan
 * @param {boolean} recursive - Whether to scan subdirectories
 * @param {number} sessionId - Scan session ID for tracking
 * @returns {Promise<Object>} - Scan results
 */
export async function scanDirectory(sourcePath, recursive = true, sessionId = null) {
  const db = getDatabase();

  // Initialize scan status
  currentScanStatus = {
    sessionId,
    sourcePath,
    status: 'in_progress',
    totalFiles: 0,
    processedFiles: 0,
    newFiles: 0,
    skippedFiles: 0,
    errorFiles: 0,
    startedAt: new Date().toISOString()
  };

  try {
    // First pass: count total files
    const totalFiles = await countFiles(sourcePath, recursive);
    currentScanStatus.totalFiles = totalFiles;

    // Update session
    if (sessionId) {
      scanSessionQueries.updateSession().run({
        id: sessionId,
        total_files: totalFiles,
        processed_files: 0,
        status: 'in_progress',
        completed_at: null
      });
    }

    // Second pass: process files in batches
    await processDirectory(sourcePath, recursive, sessionId);

    // Mark scan as completed
    currentScanStatus.status = 'completed';
    currentScanStatus.completedAt = new Date().toISOString();

    if (sessionId) {
      scanSessionQueries.updateSession().run({
        id: sessionId,
        total_files: currentScanStatus.totalFiles,
        processed_files: currentScanStatus.processedFiles,
        status: 'completed',
        completed_at: currentScanStatus.completedAt
      });
    }

    return currentScanStatus;
  } catch (error) {
    currentScanStatus.status = 'error';
    currentScanStatus.error = error.message;

    if (sessionId) {
      scanSessionQueries.updateSession().run({
        id: sessionId,
        total_files: currentScanStatus.totalFiles,
        processed_files: currentScanStatus.processedFiles,
        status: 'error',
        completed_at: new Date().toISOString()
      });
    }

    throw error;
  }
}

/**
 * Count files in a directory
 * @param {string} dirPath - Directory to count
 * @param {boolean} recursive - Whether to count subdirectories
 * @returns {Promise<number>} - Total file count
 */
async function countFiles(dirPath, recursive) {
  let count = 0;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile()) {
        if (!shouldSkipFile(entry.name, dirPath)) {
          count++;
        }
      } else if (entry.isDirectory() && recursive) {
        if (!shouldSkipDirectory(entry.name)) {
          const subPath = path.join(dirPath, entry.name);
          count += await countFiles(subPath, recursive);
        }
      }
    }
  } catch (error) {
    console.error(`Error counting files in ${dirPath}:`, error.message);
  }

  return count;
}

/**
 * Process a directory and its contents
 * @param {string} dirPath - Directory to process
 * @param {boolean} recursive - Whether to process subdirectories
 * @param {number} sessionId - Scan session ID
 */
async function processDirectory(dirPath, recursive, sessionId) {
  const db = getDatabase();

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = [];
    const subdirs = [];

    // Separate files and directories
    for (const entry of entries) {
      if (entry.isFile()) {
        if (!shouldSkipFile(entry.name, dirPath)) {
          files.push(path.join(dirPath, entry.name));
        } else {
          currentScanStatus.skippedFiles++;
        }
      } else if (entry.isDirectory() && recursive) {
        if (!shouldSkipDirectory(entry.name)) {
          subdirs.push(path.join(dirPath, entry.name));
        }
      }
    }

    // Process files in batches
    for (let i = 0; i < files.length; i += config.batchSize) {
      const batch = files.slice(i, i + config.batchSize);
      await processBatch(batch, db);

      // Update session progress
      if (sessionId && i % (config.batchSize * 5) === 0) {
        scanSessionQueries.updateSession().run({
          id: sessionId,
          total_files: currentScanStatus.totalFiles,
          processed_files: currentScanStatus.processedFiles,
          status: 'in_progress',
          completed_at: null
        });
      }
    }

    // Process subdirectories
    for (const subdir of subdirs) {
      await processDirectory(subdir, recursive, sessionId);
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error.message);
    logError(db, null, dirPath, 'directory_access', error.message, error.stack);
  }
}

/**
 * Process a batch of files
 * @param {string[]} filePaths - Array of file paths
 * @param {Object} db - Database instance
 */
async function processBatch(filePaths, db) {
  for (const filePath of filePaths) {
    await processFile(filePath, db);
  }
}

/**
 * Process a single file
 * @param {string} filePath - Path to the file
 * @param {Object} db - Database instance
 */
async function processFile(filePath, db) {
  try {
    // Check if file already exists in database
    const existingFile = fileQueries.getFileByPath().get(filePath);
    if (existingFile) {
      currentScanStatus.processedFiles++;
      currentScanStatus.skippedFiles++;
      return;
    }

    // Extract metadata
    const metadata = await extractAllMetadata(filePath);

    // Calculate hashes
    const hashes = await calculateHashes(filePath, metadata.size);

    // Resolve date
    const { date: resolvedDate, source: dateSource } = resolveDate(metadata);

    // Insert into database
    const fileData = {
      original_path: filePath,
      current_path: filePath,
      filename: metadata.filename,
      extension: metadata.extension,
      size: metadata.size,
      hash_sha256: hashes.full,
      hash_partial: hashes.partial,
      mime_type: metadata.mimeType,
      created_at: metadata.createdAt,
      modified_at: metadata.modifiedAt,
      exif_date: metadata.exifDate,
      resolved_date: resolvedDate,
      date_source: dateSource,
      status: 'pending',
      metadata_json: JSON.stringify({
        category: metadata.category,
        exif: metadata.exif
      })
    };

    fileQueries.insertFile().run(fileData);

    currentScanStatus.processedFiles++;
    currentScanStatus.newFiles++;
  } catch (error) {
    currentScanStatus.processedFiles++;
    currentScanStatus.errorFiles++;
    console.error(`Error processing file ${filePath}:`, error.message);
    logError(db, null, filePath, 'file_processing', error.message, error.stack);
  }
}

/**
 * Log an error to the database
 * @param {Object} db - Database instance
 * @param {number|null} fileId - Associated file ID
 * @param {string} filePath - File path
 * @param {string} errorType - Type of error
 * @param {string} message - Error message
 * @param {string} stack - Stack trace
 */
function logError(db, fileId, filePath, errorType, message, stack) {
  try {
    errorQueries.insertError().run({
      file_id: fileId,
      file_path: filePath,
      error_type: errorType,
      error_message: message,
      stack_trace: stack
    });
  } catch (e) {
    console.error('Failed to log error:', e);
  }
}

/**
 * Rescan a specific file (update metadata and hashes)
 * @param {number} fileId - File ID to rescan
 * @returns {Promise<Object>} - Updated file data
 */
export async function rescanFile(fileId) {
  const db = getDatabase();
  const file = fileQueries.getFileById().get(fileId);

  if (!file) {
    throw new Error('File not found');
  }

  const filePath = file.current_path || file.original_path;

  // Extract updated metadata
  const metadata = await extractAllMetadata(filePath);
  const hashes = await calculateHashes(filePath, metadata.size);
  const { date: resolvedDate, source: dateSource } = resolveDate(metadata);

  // Update file in database
  fileQueries.updateFile().run({
    id: fileId,
    current_path: filePath,
    hash_sha256: hashes.full,
    hash_partial: hashes.partial,
    mime_type: metadata.mimeType,
    exif_date: metadata.exifDate,
    resolved_date: resolvedDate,
    date_source: dateSource,
    status: file.status,
    duplicate_of: file.duplicate_of,
    metadata_json: JSON.stringify({
      category: metadata.category,
      exif: metadata.exif
    })
  });

  return fileQueries.getFileById().get(fileId);
}

export default {
  scanDirectory,
  getScanStatus,
  rescanFile
};
