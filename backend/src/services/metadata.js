import fs from 'fs/promises';
import path from 'path';
import exifr from 'exifr';
import { fileTypeFromFile } from 'file-type';
import config from '../config.js';

/**
 * Extract EXIF metadata from an image file
 * @param {string} filePath - Path to the image file
 * @returns {Promise<Object|null>} - EXIF data or null if extraction fails
 */
export async function extractExif(filePath) {
  try {
    const exif = await exifr.parse(filePath, {
      // Extract all relevant date fields
      pick: [
        'DateTimeOriginal',
        'CreateDate',
        'ModifyDate',
        'DateTimeDigitized',
        'GPSLatitude',
        'GPSLongitude',
        'Make',
        'Model',
        'ImageWidth',
        'ImageHeight',
        'Orientation'
      ]
    });
    return exif;
  } catch (error) {
    // File may not have EXIF data or be unsupported
    return null;
  }
}

/**
 * Get file system metadata
 * @param {string} filePath - Path to the file
 * @returns {Promise<Object>} - File system metadata
 */
export async function getFileStats(filePath) {
  const stats = await fs.stat(filePath);
  return {
    size: stats.size,
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime,
    accessedAt: stats.atime,
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory()
  };
}

/**
 * Detect MIME type of a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string|null>} - MIME type or null if detection fails
 */
export async function detectMimeType(filePath) {
  try {
    const result = await fileTypeFromFile(filePath);
    return result?.mime || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get file extension and category
 * @param {string} filePath - Path to the file
 * @returns {Object} - Extension and category info
 */
export function getFileTypeInfo(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let category = 'other';

  if (config.imageExtensions.includes(ext)) {
    category = 'image';
  } else if (config.videoExtensions.includes(ext)) {
    category = 'video';
  } else if (config.documentExtensions.includes(ext)) {
    category = 'document';
  }

  return { extension: ext, category };
}

/**
 * Extract all available metadata from a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<Object>} - Combined metadata object
 */
export async function extractAllMetadata(filePath) {
  const filename = path.basename(filePath);

  // Get basic file info
  const [stats, mimeType] = await Promise.all([
    getFileStats(filePath),
    detectMimeType(filePath)
  ]);

  const typeInfo = getFileTypeInfo(filePath);

  // Extract EXIF for images
  let exifData = null;
  if (typeInfo.category === 'image') {
    exifData = await extractExif(filePath);
  }

  // Build metadata object
  const metadata = {
    filename,
    originalPath: filePath,
    extension: typeInfo.extension,
    category: typeInfo.category,
    mimeType: mimeType || `application/${typeInfo.extension.slice(1) || 'octet-stream'}`,
    size: stats.size,
    createdAt: stats.createdAt?.toISOString(),
    modifiedAt: stats.modifiedAt?.toISOString(),
    exif: exifData,
    exifDate: extractExifDate(exifData)
  };

  return metadata;
}

/**
 * Extract the best date from EXIF data
 * @param {Object|null} exifData - EXIF data object
 * @returns {string|null} - ISO date string or null
 */
export function extractExifDate(exifData) {
  if (!exifData) return null;

  // Priority: DateTimeOriginal > CreateDate > DateTimeDigitized > ModifyDate
  const dateFields = [
    'DateTimeOriginal',
    'CreateDate',
    'DateTimeDigitized',
    'ModifyDate'
  ];

  for (const field of dateFields) {
    const value = exifData[field];
    if (value) {
      // Handle both Date objects and strings
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === 'string') {
        // Parse EXIF date format: "YYYY:MM:DD HH:MM:SS"
        const parsed = parseExifDateString(value);
        if (parsed) return parsed;
      }
    }
  }

  return null;
}

/**
 * Parse EXIF date string format
 * @param {string} dateStr - Date string in EXIF format
 * @returns {string|null} - ISO date string or null
 */
function parseExifDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;

  // EXIF format: "YYYY:MM:DD HH:MM:SS"
  const match = dateStr.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    const date = new Date(year, month - 1, day, hour, minute, second);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  // Try parsing as a regular date string
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch (e) {
    // Ignore parsing errors
  }

  return null;
}

/**
 * Check if a file should be skipped during scanning
 * @param {string} filename - Name of the file
 * @param {string} dirPath - Path of the directory
 * @returns {boolean} - True if the file should be skipped
 */
export function shouldSkipFile(filename, dirPath) {
  // Skip hidden files (starting with .)
  if (filename.startsWith('.')) {
    return true;
  }

  // Skip configured skip files
  if (config.skipFiles.includes(filename)) {
    return true;
  }

  return false;
}

/**
 * Check if a directory should be skipped during scanning
 * @param {string} dirname - Name of the directory
 * @returns {boolean} - True if the directory should be skipped
 */
export function shouldSkipDirectory(dirname) {
  // Skip hidden directories
  if (dirname.startsWith('.')) {
    return true;
  }

  // Skip configured skip directories
  if (config.skipDirectories.includes(dirname)) {
    return true;
  }

  return false;
}

export default {
  extractExif,
  getFileStats,
  detectMimeType,
  getFileTypeInfo,
  extractAllMetadata,
  extractExifDate,
  shouldSkipFile,
  shouldSkipDirectory
};
