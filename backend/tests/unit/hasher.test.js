import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { calculateHash, calculatePartialHash, calculateHashes, compareFiles } from '../../src/services/hasher.js';

describe('Hasher Service', () => {
  let tempDir;
  let testFile1;
  let testFile2;
  let testFile3;

  beforeAll(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hasher-test-'));

    // Create test files with known content
    testFile1 = path.join(tempDir, 'file1.txt');
    testFile2 = path.join(tempDir, 'file2.txt');
    testFile3 = path.join(tempDir, 'file3.txt');

    await fs.writeFile(testFile1, 'Hello, World!');
    await fs.writeFile(testFile2, 'Hello, World!'); // Same content as file1
    await fs.writeFile(testFile3, 'Different content here');
  });

  afterAll(async () => {
    // Clean up temp directory
    try {
      const files = await fs.readdir(tempDir);
      for (const file of files) {
        await fs.unlink(path.join(tempDir, file));
      }
      await fs.rmdir(tempDir);
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('calculateHash', () => {
    test('should return consistent SHA-256 hash for same file', async () => {
      const hash1 = await calculateHash(testFile1);
      const hash2 = await calculateHash(testFile1);
      expect(hash1).toBe(hash2);
    });

    test('should return 64-character hex string', async () => {
      const hash = await calculateHash(testFile1);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should return same hash for files with identical content', async () => {
      const hash1 = await calculateHash(testFile1);
      const hash2 = await calculateHash(testFile2);
      expect(hash1).toBe(hash2);
    });

    test('should return different hash for files with different content', async () => {
      const hash1 = await calculateHash(testFile1);
      const hash3 = await calculateHash(testFile3);
      expect(hash1).not.toBe(hash3);
    });

    test('should throw error for non-existent file', async () => {
      await expect(calculateHash('/nonexistent/file.txt')).rejects.toThrow();
    });
  });

  describe('calculatePartialHash', () => {
    test('should return partial hash', async () => {
      const hash = await calculatePartialHash(testFile1, 5);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should return same hash as full hash for small files', async () => {
      // For files smaller than partial size, partial should match full
      const fullHash = await calculateHash(testFile1);
      const partialHash = await calculatePartialHash(testFile1, 1000000);
      expect(partialHash).toBe(fullHash);
    });
  });

  describe('calculateHashes', () => {
    test('should return both full and partial hashes', async () => {
      const stats = await fs.stat(testFile1);
      const hashes = await calculateHashes(testFile1, stats.size);

      expect(hashes).toHaveProperty('full');
      expect(hashes).toHaveProperty('partial');
      expect(hashes.full).toMatch(/^[a-f0-9]{64}$/);
      expect(hashes.partial).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should return identical full and partial for small files', async () => {
      const stats = await fs.stat(testFile1);
      const hashes = await calculateHashes(testFile1, stats.size);

      // For small files, full and partial should be the same
      expect(hashes.full).toBe(hashes.partial);
    });
  });

  describe('compareFiles', () => {
    test('should return true for identical files', async () => {
      const result = await compareFiles(testFile1, testFile2);
      expect(result).toBe(true);
    });

    test('should return false for different files', async () => {
      const result = await compareFiles(testFile1, testFile3);
      expect(result).toBe(false);
    });
  });
});
