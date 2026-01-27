/**
 * Date Resolution Service
 *
 * Determines the most accurate "creation date" for a file using priority:
 * 1. Embedded metadata (EXIF DateTimeOriginal, etc.)
 * 2. Filesystem creation time
 * 3. Filesystem modified time
 * 4. Fallback: file discovery time
 */

/**
 * Resolve the best date for a file based on available metadata
 * @param {Object} metadata - File metadata object
 * @returns {Object} - { date: string, source: string }
 */
export function resolveDate(metadata) {
  // Priority 1: EXIF date (most reliable for photos)
  if (metadata.exifDate) {
    const date = new Date(metadata.exifDate);
    if (isValidDate(date)) {
      return {
        date: date.toISOString(),
        source: 'exif'
      };
    }
  }

  // Priority 2: Filesystem creation time
  if (metadata.createdAt) {
    const date = new Date(metadata.createdAt);
    if (isValidDate(date)) {
      return {
        date: date.toISOString(),
        source: 'created'
      };
    }
  }

  // Priority 3: Filesystem modified time
  if (metadata.modifiedAt) {
    const date = new Date(metadata.modifiedAt);
    if (isValidDate(date)) {
      return {
        date: date.toISOString(),
        source: 'modified'
      };
    }
  }

  // Priority 4: Discovery time (current time)
  return {
    date: new Date().toISOString(),
    source: 'discovered'
  };
}

/**
 * Check if a date is valid and not in the future
 * @param {Date} date - Date object to validate
 * @returns {boolean} - True if date is valid
 */
export function isValidDate(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return false;
  }

  // Check for reasonable date range (1970 to now + 1 day for timezone issues)
  const minDate = new Date('1970-01-01');
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 1);

  return date >= minDate && date <= maxDate;
}

/**
 * Extract date components for folder structure
 * @param {string} dateStr - ISO date string
 * @returns {Object} - { year, month, day }
 */
export function extractDateComponents(dateStr) {
  const date = new Date(dateStr);

  if (!isValidDate(date)) {
    const now = new Date();
    return {
      year: now.getFullYear().toString(),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      day: String(now.getDate()).padStart(2, '0')
    };
  }

  return {
    year: date.getFullYear().toString(),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0')
  };
}

/**
 * Generate destination path based on date
 * @param {string} destinationBase - Base destination folder
 * @param {string} dateStr - ISO date string
 * @param {string} filename - Original filename
 * @returns {string} - Full destination path
 */
export function generateDestinationPath(destinationBase, dateStr, filename) {
  const { year, month, day } = extractDateComponents(dateStr);
  return `${destinationBase}/${year}/${month}/${day}/${filename}`;
}

/**
 * Compare dates for sorting
 * @param {string} dateA - First ISO date string
 * @param {string} dateB - Second ISO date string
 * @returns {number} - Comparison result (-1, 0, 1)
 */
export function compareDates(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);

  if (!isValidDate(a) && !isValidDate(b)) return 0;
  if (!isValidDate(a)) return 1;
  if (!isValidDate(b)) return -1;

  return a.getTime() - b.getTime();
}

/**
 * Format date for display
 * @param {string} dateStr - ISO date string
 * @param {string} format - Format type: 'short', 'long', 'iso'
 * @returns {string} - Formatted date string
 */
export function formatDate(dateStr, format = 'short') {
  const date = new Date(dateStr);

  if (!isValidDate(date)) {
    return 'Unknown date';
  }

  switch (format) {
    case 'short':
      return date.toLocaleDateString();
    case 'long':
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'iso':
      return date.toISOString();
    case 'path':
      const { year, month, day } = extractDateComponents(dateStr);
      return `${year}/${month}/${day}`;
    default:
      return date.toLocaleDateString();
  }
}

export default {
  resolveDate,
  isValidDate,
  extractDateComponents,
  generateDestinationPath,
  compareDates,
  formatDate
};
