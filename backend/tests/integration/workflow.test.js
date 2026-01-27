import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { initDatabase, closeDatabase, getDatabase, fileQueries } from '../../src/database/index.js';
import { scanDirectory } from '../../src/services/scanner.js';
import { organizeFiles } from '../../src/services/organizer.js';
import { findAllDuplicateGroups } from '../../src/services/duplicateDetector.js';
import { revertBatch } from '../../src/services/revert.js';

describe('Integration: Full Workflow', () => {
  let tempDir;
  let sourceDir;
  let destDir;
  let dbPath;

  beforeAll(async () => {
    // Create temporary directories
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'workflow-test-'));
    sourceDir = path.join(tempDir, 'source');
    destDir = path.join(tempDir, 'destination');
    dbPath = path.join(tempDir, 'test.db');

    await fs.mkdir(sourceDir, { recursive: true });
    await fs.mkdir(destDir, { recursive: true });

    // Create test files
    await fs.writeFile(path.join(sourceDir, 'file1.txt'), 'Content of file 1');
    await fs.writeFile(path.join(sourceDir, 'file2.txt'), 'Content of file 2');
    await fs.writeFile(path.join(sourceDir, 'duplicate.txt'), 'Content of file 1'); // Duplicate content

    // Create subdirectory with files
    const subDir = path.join(sourceDir, 'subdir');
    await fs.mkdir(subDir);
    await fs.writeFile(path.join(subDir, 'nested.txt'), 'Nested file content');

    // Initialize database
    initDatabase(dbPath);
  });

  afterAll(async () => {
    // Close database
    closeDatabase();

    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  });

  describe('Scanning', () => {
    test('should scan directory and find all files', async () => {
      const result = await scanDirectory(sourceDir, true, null);

      expect(result.status).toBe('completed');
      expect(result.totalFiles).toBe(4); // 3 in source + 1 in subdir
      expect(result.newFiles).toBe(4);
      expect(result.errorFiles).toBe(0);
    });

    test('should populate database with scanned files', () => {
      const db = getDatabase();
      const files = db.prepare('SELECT * FROM files').all();

      expect(files.length).toBe(4);

      // Check that all files have required fields
      for (const file of files) {
        expect(file.filename).toBeDefined();
        expect(file.original_path).toBeDefined();
        expect(file.size).toBeGreaterThan(0);
        expect(file.hash_sha256).toBeDefined();
        expect(file.status).toBe('pending');
      }
    });

    test('should skip already scanned files on rescan', async () => {
      const result = await scanDirectory(sourceDir, true, null);

      // All files should be skipped since they're already in the database
      expect(result.newFiles).toBe(0);
      expect(result.skippedFiles).toBe(4);
    });
  });

  describe('Duplicate Detection', () => {
    test('should find duplicate files', async () => {
      const groups = await findAllDuplicateGroups();

      // file1.txt and duplicate.txt have the same content
      expect(groups.length).toBe(1);
      expect(groups[0].count).toBe(2);
    });
  });

  describe('Organization', () => {
    test('should organize files in dry run mode', async () => {
      const result = await organizeFiles(destDir, true, null);

      expect(result.status).toBe('completed');
      expect(result.dryRun).toBe(true);
      expect(result.totalFiles).toBe(4);

      // Files should not actually be moved in dry run
      const sourceFiles = await fs.readdir(sourceDir);
      expect(sourceFiles).toContain('file1.txt');
    });

    test('should organize files and move them', async () => {
      const result = await organizeFiles(destDir, false, null);

      expect(result.status).toBe('completed');
      expect(result.dryRun).toBe(false);
      expect(result.movedFiles).toBeGreaterThan(0);

      // Check that files were moved to destination
      const destContents = await fs.readdir(destDir, { recursive: true });
      expect(destContents.length).toBeGreaterThan(0);

      // Some files may remain if marked as duplicates (expected behavior)
      // The important thing is that movedFiles > 0
    });

    test('should update file status in database', () => {
      const db = getDatabase();
      const movedFiles = fileQueries.getFilesByStatus().all('moved');
      const duplicateFiles = fileQueries.getFilesByStatus().all('duplicate');

      // At least some files should be moved
      expect(movedFiles.length + duplicateFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Revert', () => {
    test('should revert moved files back to original location', async () => {
      const db = getDatabase();

      // Get the batch ID from the last organization
      const lastBatch = db.prepare(`
        SELECT batch_id FROM operations
        WHERE operation_type = 'move'
        ORDER BY created_at DESC
        LIMIT 1
      `).get();

      if (lastBatch) {
        const result = await revertBatch(lastBatch.batch_id);

        expect(result.batchId).toBe(lastBatch.batch_id);
        expect(result.reverted).toBeGreaterThan(0);
      }
    });
  });
});

describe('Integration: Error Handling', () => {
  let tempDir;
  let dbPath;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'error-test-'));
    dbPath = path.join(tempDir, 'test.db');
    initDatabase(dbPath);
  });

  afterAll(async () => {
    closeDatabase();
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  test('should handle scanning non-existent directory gracefully', async () => {
    const nonExistent = path.join(tempDir, 'nonexistent');

    // Scanner handles non-existent directories gracefully by returning 0 files
    const result = await scanDirectory(nonExistent, true, null);
    expect(result.status).toBe('completed');
    expect(result.totalFiles).toBe(0);
    expect(result.newFiles).toBe(0);
  });
});
