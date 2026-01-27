import fs from 'fs';
import crypto from 'crypto';
import config from '../config.js';

/**
 * Calculate SHA-256 hash of a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - SHA-256 hash as hex string
 */
export async function calculateHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Calculate partial hash of a file (first N bytes)
 * Used for quick duplicate pre-filtering
 * @param {string} filePath - Path to the file
 * @param {number} size - Number of bytes to hash (default: 64KB)
 * @returns {Promise<string>} - Partial hash as hex string
 */
export async function calculatePartialHash(filePath, size = config.partialHashSize) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath, { start: 0, end: size - 1 });

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Calculate both full and partial hash of a file
 * @param {string} filePath - Path to the file
 * @param {number} fileSize - Size of the file in bytes
 * @returns {Promise<{full: string, partial: string}>}
 */
export async function calculateHashes(filePath, fileSize) {
  // For small files, the partial hash equals the full hash
  if (fileSize <= config.partialHashSize) {
    const hash = await calculateHash(filePath);
    return { full: hash, partial: hash };
  }

  // Calculate both hashes in parallel
  const [full, partial] = await Promise.all([
    calculateHash(filePath),
    calculatePartialHash(filePath)
  ]);

  return { full, partial };
}

/**
 * Compare two files by their hash
 * @param {string} filePath1 - Path to first file
 * @param {string} filePath2 - Path to second file
 * @returns {Promise<boolean>} - True if files are identical
 */
export async function compareFiles(filePath1, filePath2) {
  const [hash1, hash2] = await Promise.all([
    calculateHash(filePath1),
    calculateHash(filePath2)
  ]);
  return hash1 === hash2;
}

export default {
  calculateHash,
  calculatePartialHash,
  calculateHashes,
  compareFiles
};
