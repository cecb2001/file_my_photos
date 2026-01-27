import { getDatabase, fileQueries } from '../database/index.js';
import { calculateHash } from './hasher.js';

/**
 * Find duplicates for a specific file
 * @param {Object} file - File record from database
 * @returns {Promise<Object[]>} - Array of duplicate files
 */
export async function findDuplicatesForFile(file) {
  const db = getDatabase();
  const duplicates = [];

  // Strategy 1: Exact hash match (most reliable)
  if (file.hash_sha256) {
    const hashMatches = fileQueries.getFileByHash().all(file.hash_sha256, 'error');
    for (const match of hashMatches) {
      if (match.id !== file.id) {
        duplicates.push({
          ...match,
          matchType: 'hash',
          confidence: 'exact'
        });
      }
    }
  }

  // Strategy 2: Size + partial hash match (for files not fully hashed yet)
  if (file.hash_partial && file.size && duplicates.length === 0) {
    const partialMatches = fileQueries.getFilesByPartialHash().all(file.hash_partial, file.size);
    for (const match of partialMatches) {
      if (match.id !== file.id && !duplicates.some(d => d.id === match.id)) {
        duplicates.push({
          ...match,
          matchType: 'partial_hash',
          confidence: 'likely'
        });
      }
    }
  }

  return duplicates;
}

/**
 * Find all duplicate groups in the database
 * @returns {Promise<Object[]>} - Array of duplicate groups
 */
export async function findAllDuplicateGroups() {
  const db = getDatabase();

  // Find all files with duplicate hashes
  const stmt = db.prepare(`
    SELECT hash_sha256, COUNT(*) as count
    FROM files
    WHERE hash_sha256 IS NOT NULL AND status != 'error'
    GROUP BY hash_sha256
    HAVING COUNT(*) > 1
  `);

  const duplicateHashes = stmt.all();

  const groups = [];
  for (const { hash_sha256, count } of duplicateHashes) {
    const files = db.prepare(`
      SELECT * FROM files
      WHERE hash_sha256 = ?
      ORDER BY created_timestamp ASC
    `).all(hash_sha256);

    groups.push({
      hash: hash_sha256,
      count: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      files,
      // First file (oldest by discovery time) is considered the "original"
      original: files[0],
      duplicates: files.slice(1)
    });
  }

  return groups;
}

/**
 * Mark duplicate relationships in the database
 * @returns {Promise<Object>} - Results of duplicate marking
 */
export async function markDuplicates() {
  const db = getDatabase();
  const groups = await findAllDuplicateGroups();

  let markedCount = 0;

  for (const group of groups) {
    const originalId = group.original.id;

    // Mark all other files as duplicates
    for (const duplicate of group.duplicates) {
      if (duplicate.status === 'pending') {
        fileQueries.updateFile().run({
          id: duplicate.id,
          current_path: duplicate.current_path,
          hash_sha256: duplicate.hash_sha256,
          hash_partial: duplicate.hash_partial,
          mime_type: duplicate.mime_type,
          exif_date: duplicate.exif_date,
          resolved_date: duplicate.resolved_date,
          date_source: duplicate.date_source,
          status: 'duplicate',
          duplicate_of: originalId,
          metadata_json: duplicate.metadata_json
        });
        markedCount++;
      }
    }
  }

  return {
    groupsFound: groups.length,
    filesMarked: markedCount
  };
}

/**
 * Calculate potential space savings from duplicate removal
 * @returns {Promise<Object>} - Space savings info
 */
export async function calculateDuplicateStats() {
  const groups = await findAllDuplicateGroups();

  const stats = {
    duplicateGroups: groups.length,
    totalDuplicateFiles: 0,
    potentialSpaceSavings: 0,
    largestDuplicateGroup: null
  };

  for (const group of groups) {
    stats.totalDuplicateFiles += group.duplicates.length;
    // Space savings = size of all duplicates (keeping one original)
    stats.potentialSpaceSavings += group.duplicates.reduce((sum, f) => sum + f.size, 0);

    if (!stats.largestDuplicateGroup || group.count > stats.largestDuplicateGroup.count) {
      stats.largestDuplicateGroup = {
        hash: group.hash,
        count: group.count,
        totalSize: group.totalSize
      };
    }
  }

  return stats;
}

/**
 * Check if a file is a duplicate of an existing file at destination
 * @param {string} hash - SHA-256 hash of the file
 * @param {number} excludeFileId - File ID to exclude from check
 * @returns {Object|null} - Existing file if duplicate found
 */
export function checkForExistingDuplicate(hash, excludeFileId = null) {
  const db = getDatabase();

  let query = 'SELECT * FROM files WHERE hash_sha256 = ? AND status = ?';
  const params = [hash, 'moved'];

  if (excludeFileId) {
    query += ' AND id != ?';
    params.push(excludeFileId);
  }

  query += ' LIMIT 1';

  return db.prepare(query).get(...params);
}

/**
 * Verify if two files are truly duplicates by comparing full hashes
 * @param {string} filePath1 - Path to first file
 * @param {string} filePath2 - Path to second file
 * @returns {Promise<boolean>} - True if files are exact duplicates
 */
export async function verifyDuplicate(filePath1, filePath2) {
  try {
    const [hash1, hash2] = await Promise.all([
      calculateHash(filePath1),
      calculateHash(filePath2)
    ]);
    return hash1 === hash2;
  } catch (error) {
    return false;
  }
}

export default {
  findDuplicatesForFile,
  findAllDuplicateGroups,
  markDuplicates,
  calculateDuplicateStats,
  checkForExistingDuplicate,
  verifyDuplicate
};
