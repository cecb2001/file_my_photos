/**
 * Database migrations for File My Photos
 */

export function runMigrations(db) {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create files table
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_path TEXT NOT NULL UNIQUE,
      current_path TEXT,
      filename TEXT NOT NULL,
      extension TEXT,
      size INTEGER NOT NULL,
      hash_sha256 TEXT,
      hash_partial TEXT,
      mime_type TEXT,
      created_at TEXT,
      modified_at TEXT,
      exif_date TEXT,
      resolved_date TEXT,
      date_source TEXT,
      status TEXT DEFAULT 'pending',
      duplicate_of INTEGER REFERENCES files(id),
      metadata_json TEXT,
      created_timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create operations table (audit trail)
  db.exec(`
    CREATE TABLE IF NOT EXISTS operations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT NOT NULL,
      file_id INTEGER REFERENCES files(id),
      operation_type TEXT NOT NULL,
      source_path TEXT NOT NULL,
      destination_path TEXT,
      hash_used TEXT,
      reason TEXT,
      status TEXT DEFAULT 'completed',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create errors table
  db.exec(`
    CREATE TABLE IF NOT EXISTS errors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER REFERENCES files(id),
      file_path TEXT NOT NULL,
      error_type TEXT NOT NULL,
      error_message TEXT,
      stack_trace TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Create scan_sessions table to track scanning progress
  db.exec(`
    CREATE TABLE IF NOT EXISTS scan_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_path TEXT NOT NULL,
      status TEXT DEFAULT 'in_progress',
      total_files INTEGER DEFAULT 0,
      processed_files INTEGER DEFAULT 0,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    )
  `);

  // Create indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
    CREATE INDEX IF NOT EXISTS idx_files_hash_sha256 ON files(hash_sha256);
    CREATE INDEX IF NOT EXISTS idx_files_hash_partial ON files(hash_partial);
    CREATE INDEX IF NOT EXISTS idx_files_resolved_date ON files(resolved_date);
    CREATE INDEX IF NOT EXISTS idx_files_extension ON files(extension);
    CREATE INDEX IF NOT EXISTS idx_files_size ON files(size);
    CREATE INDEX IF NOT EXISTS idx_operations_batch_id ON operations(batch_id);
    CREATE INDEX IF NOT EXISTS idx_operations_file_id ON operations(file_id);
    CREATE INDEX IF NOT EXISTS idx_errors_file_id ON errors(file_id);
  `);

  return true;
}

export function getSchemaVersion(db) {
  const result = db.prepare("SELECT value FROM settings WHERE key = 'schema_version'").get();
  return result ? parseInt(result.value) : 0;
}

export function setSchemaVersion(db, version) {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', ?)").run(version.toString());
}
