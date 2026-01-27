import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  getFileStats,
  getFileTypeInfo,
  extractExifDate,
  shouldSkipFile,
  shouldSkipDirectory,
  extractAllMetadata
} from '../../src/services/metadata.js';

describe('Metadata Service', () => {
  let tempDir;
  let testTextFile;
  let testImageFile;

  beforeAll(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'metadata-test-'));

    // Create test files
    testTextFile = path.join(tempDir, 'test.txt');
    testImageFile = path.join(tempDir, 'test.jpg');

    await fs.writeFile(testTextFile, 'Test content');
    // Create a minimal file with .jpg extension (not actually a JPEG)
    await fs.writeFile(testImageFile, 'Not really an image');
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

  describe('getFileStats', () => {
    test('should return file statistics', async () => {
      const stats = await getFileStats(testTextFile);

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('createdAt');
      expect(stats).toHaveProperty('modifiedAt');
      expect(stats).toHaveProperty('isFile');
      expect(stats).toHaveProperty('isDirectory');
      expect(stats.isFile).toBe(true);
      expect(stats.isDirectory).toBe(false);
    });

    test('should return correct file size', async () => {
      const stats = await getFileStats(testTextFile);
      expect(stats.size).toBe('Test content'.length);
    });

    test('should throw error for non-existent file', async () => {
      await expect(getFileStats('/nonexistent/file.txt')).rejects.toThrow();
    });
  });

  describe('getFileTypeInfo', () => {
    test('should identify image files', () => {
      const result = getFileTypeInfo('/path/to/photo.jpg');
      expect(result.extension).toBe('.jpg');
      expect(result.category).toBe('image');
    });

    test('should identify video files', () => {
      const result = getFileTypeInfo('/path/to/video.mp4');
      expect(result.extension).toBe('.mp4');
      expect(result.category).toBe('video');
    });

    test('should identify document files', () => {
      const result = getFileTypeInfo('/path/to/document.pdf');
      expect(result.extension).toBe('.pdf');
      expect(result.category).toBe('document');
    });

    test('should categorize unknown extensions as other', () => {
      const result = getFileTypeInfo('/path/to/file.xyz');
      expect(result.extension).toBe('.xyz');
      expect(result.category).toBe('other');
    });

    test('should handle various image extensions', () => {
      const extensions = ['.png', '.gif', '.bmp', '.webp', '.heic'];
      for (const ext of extensions) {
        const result = getFileTypeInfo(`/path/to/image${ext}`);
        expect(result.category).toBe('image');
      }
    });
  });

  describe('extractExifDate', () => {
    test('should extract DateTimeOriginal', () => {
      const exifData = {
        DateTimeOriginal: new Date('2023-07-15T10:30:00Z')
      };
      const result = extractExifDate(exifData);
      expect(result).toContain('2023-07-15');
    });

    test('should fall back to CreateDate if no DateTimeOriginal', () => {
      const exifData = {
        CreateDate: new Date('2023-07-15T10:30:00Z')
      };
      const result = extractExifDate(exifData);
      expect(result).toContain('2023-07-15');
    });

    test('should return null for empty EXIF data', () => {
      expect(extractExifDate(null)).toBeNull();
      expect(extractExifDate({})).toBeNull();
    });

    test('should handle string date format', () => {
      const exifData = {
        DateTimeOriginal: '2023:07:15 10:30:00'
      };
      const result = extractExifDate(exifData);
      expect(result).toContain('2023-07-15');
    });
  });

  describe('shouldSkipFile', () => {
    test('should skip hidden files', () => {
      expect(shouldSkipFile('.hidden', '/path')).toBe(true);
      expect(shouldSkipFile('.DS_Store', '/path')).toBe(true);
    });

    test('should skip system files', () => {
      expect(shouldSkipFile('Thumbs.db', '/path')).toBe(true);
      expect(shouldSkipFile('desktop.ini', '/path')).toBe(true);
    });

    test('should not skip regular files', () => {
      expect(shouldSkipFile('photo.jpg', '/path')).toBe(false);
      expect(shouldSkipFile('document.pdf', '/path')).toBe(false);
    });
  });

  describe('shouldSkipDirectory', () => {
    test('should skip hidden directories', () => {
      expect(shouldSkipDirectory('.git')).toBe(true);
      expect(shouldSkipDirectory('.cache')).toBe(true);
    });

    test('should skip node_modules', () => {
      expect(shouldSkipDirectory('node_modules')).toBe(true);
    });

    test('should not skip regular directories', () => {
      expect(shouldSkipDirectory('photos')).toBe(false);
      expect(shouldSkipDirectory('documents')).toBe(false);
    });
  });

  describe('extractAllMetadata', () => {
    test('should extract all metadata from a file', async () => {
      const metadata = await extractAllMetadata(testTextFile);

      expect(metadata).toHaveProperty('filename', 'test.txt');
      expect(metadata).toHaveProperty('originalPath', testTextFile);
      expect(metadata).toHaveProperty('extension', '.txt');
      expect(metadata).toHaveProperty('size');
      expect(metadata).toHaveProperty('createdAt');
      expect(metadata).toHaveProperty('modifiedAt');
    });

    test('should identify category correctly', async () => {
      const textMetadata = await extractAllMetadata(testTextFile);
      expect(textMetadata.category).toBe('document'); // .txt is a document

      const imageMetadata = await extractAllMetadata(testImageFile);
      expect(imageMetadata.category).toBe('image');
    });
  });
});
