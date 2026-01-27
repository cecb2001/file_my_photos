import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import config from '../config.js';
import { runMigrations, setSchemaVersion, getSchemaVersion } from './migrations.js';

let db = null;

/**
 * Initialize the database connection and run migrations
 */
export function initDatabase(dbPath = config.dbPath) {
  // Ensure the directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Create database connection
  db = new Database(dbPath);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Run migrations
  runMigrations(db);

  // Set schema version
  const currentVersion = getSchemaVersion(db);
  if (currentVersion === 0) {
    setSchemaVersion(db, 1);
  }

  return db;
}

/**
 * Get the database instance
 */
export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Prepared statements for common file operations
 */
export const fileQueries = {
  insertFile: () => db.prepare(`
    INSERT INTO files (original_path, current_path, filename, extension, size, hash_sha256, hash_partial,
                       mime_type, created_at, modified_at, exif_date, resolved_date, date_source,
                       status, metadata_json)
    VALUES (@original_path, @current_path, @filename, @extension, @size, @hash_sha256, @hash_partial,
            @mime_type, @created_at, @modified_at, @exif_date, @resolved_date, @date_source,
            @status, @metadata_json)
  `),

  updateFile: () => db.prepare(`
    UPDATE files SET
      current_path = @current_path,
      hash_sha256 = @hash_sha256,
      hash_partial = @hash_partial,
      mime_type = @mime_type,
      exif_date = @exif_date,
      resolved_date = @resolved_date,
      date_source = @date_source,
      status = @status,
      duplicate_of = @duplicate_of,
      metadata_json = @metadata_json,
      updated_timestamp = CURRENT_TIMESTAMP
    WHERE id = @id
  `),

  getFileById: () => db.prepare('SELECT * FROM files WHERE id = ?'),

  getFileByPath: () => db.prepare('SELECT * FROM files WHERE original_path = ?'),

  getFileByHash: () => db.prepare('SELECT * FROM files WHERE hash_sha256 = ? AND status != ?'),

  getFilesByPartialHash: () => db.prepare('SELECT * FROM files WHERE hash_partial = ? AND size = ?'),

  getAllFiles: () => db.prepare('SELECT * FROM files ORDER BY resolved_date DESC'),

  getFilesByStatus: () => db.prepare('SELECT * FROM files WHERE status = ?'),

  searchFiles: () => db.prepare(`
    SELECT * FROM files
    WHERE filename LIKE @query
    OR original_path LIKE @query
    ORDER BY resolved_date DESC
    LIMIT @limit OFFSET @offset
  `),

  getDuplicates: () => db.prepare(`
    SELECT f1.*, f2.original_path as duplicate_original_path
    FROM files f1
    JOIN files f2 ON f1.duplicate_of = f2.id
    WHERE f1.status = 'duplicate'
  `),

  countFiles: () => db.prepare('SELECT COUNT(*) as count FROM files'),

  countFilesByStatus: () => db.prepare('SELECT status, COUNT(*) as count FROM files GROUP BY status'),

  deleteFile: () => db.prepare('DELETE FROM files WHERE id = ?')
};

/**
 * Prepared statements for operation logging
 */
export const operationQueries = {
  insertOperation: () => db.prepare(`
    INSERT INTO operations (batch_id, file_id, operation_type, source_path, destination_path, hash_used, reason, status)
    VALUES (@batch_id, @file_id, @operation_type, @source_path, @destination_path, @hash_used, @reason, @status)
  `),

  getOperationsByBatch: () => db.prepare('SELECT * FROM operations WHERE batch_id = ? ORDER BY created_at'),

  getOperationsByFile: () => db.prepare('SELECT * FROM operations WHERE file_id = ? ORDER BY created_at DESC'),

  getAllOperations: () => db.prepare('SELECT * FROM operations ORDER BY created_at DESC LIMIT ? OFFSET ?'),

  updateOperationStatus: () => db.prepare('UPDATE operations SET status = ? WHERE id = ?'),

  getRecentBatches: () => db.prepare(`
    SELECT batch_id, operation_type, COUNT(*) as count, MIN(created_at) as started_at
    FROM operations
    GROUP BY batch_id
    ORDER BY started_at DESC
    LIMIT ?
  `)
};

/**
 * Prepared statements for error logging
 */
export const errorQueries = {
  insertError: () => db.prepare(`
    INSERT INTO errors (file_id, file_path, error_type, error_message, stack_trace)
    VALUES (@file_id, @file_path, @error_type, @error_message, @stack_trace)
  `),

  getErrors: () => db.prepare('SELECT * FROM errors ORDER BY created_at DESC LIMIT ? OFFSET ?'),

  getErrorsByFile: () => db.prepare('SELECT * FROM errors WHERE file_id = ?'),

  countErrors: () => db.prepare('SELECT COUNT(*) as count FROM errors')
};

/**
 * Prepared statements for scan sessions
 */
export const scanSessionQueries = {
  createSession: () => db.prepare(`
    INSERT INTO scan_sessions (source_path, status)
    VALUES (@source_path, 'in_progress')
  `),

  updateSession: () => db.prepare(`
    UPDATE scan_sessions
    SET total_files = @total_files, processed_files = @processed_files, status = @status, completed_at = @completed_at
    WHERE id = @id
  `),

  getSession: () => db.prepare('SELECT * FROM scan_sessions WHERE id = ?'),

  getActiveSession: () => db.prepare("SELECT * FROM scan_sessions WHERE status = 'in_progress' ORDER BY started_at DESC LIMIT 1")
};

export default {
  initDatabase,
  getDatabase,
  closeDatabase,
  fileQueries,
  operationQueries,
  errorQueries,
  scanSessionQueries
};
