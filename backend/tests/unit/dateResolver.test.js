import {
  resolveDate,
  isValidDate,
  extractDateComponents,
  generateDestinationPath,
  compareDates,
  formatDate
} from '../../src/services/dateResolver.js';

describe('DateResolver Service', () => {
  describe('isValidDate', () => {
    test('should return true for valid dates', () => {
      expect(isValidDate(new Date('2023-07-15'))).toBe(true);
      expect(isValidDate(new Date('2000-01-01'))).toBe(true);
      expect(isValidDate(new Date())).toBe(true);
    });

    test('should return false for invalid dates', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false);
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
      expect(isValidDate('2023-07-15')).toBe(false); // String, not Date
    });

    test('should return false for dates before 1970', () => {
      expect(isValidDate(new Date('1960-01-01'))).toBe(false);
    });

    test('should return false for dates in the far future', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 10);
      expect(isValidDate(futureDate)).toBe(false);
    });
  });

  describe('resolveDate', () => {
    test('should prioritize EXIF date', () => {
      const metadata = {
        exifDate: '2023-07-15T10:30:00.000Z',
        createdAt: '2023-08-01T00:00:00.000Z',
        modifiedAt: '2023-09-01T00:00:00.000Z'
      };

      const result = resolveDate(metadata);
      expect(result.source).toBe('exif');
      expect(result.date).toContain('2023-07-15');
    });

    test('should fall back to created date if no EXIF', () => {
      const metadata = {
        exifDate: null,
        createdAt: '2023-08-01T12:00:00.000Z',
        modifiedAt: '2023-09-01T00:00:00.000Z'
      };

      const result = resolveDate(metadata);
      expect(result.source).toBe('created');
      expect(result.date).toContain('2023-08-01');
    });

    test('should fall back to modified date if no created date', () => {
      const metadata = {
        exifDate: null,
        createdAt: null,
        modifiedAt: '2023-09-01T15:30:00.000Z'
      };

      const result = resolveDate(metadata);
      expect(result.source).toBe('modified');
      expect(result.date).toContain('2023-09-01');
    });

    test('should use discovery time if no dates available', () => {
      const metadata = {
        exifDate: null,
        createdAt: null,
        modifiedAt: null
      };

      const result = resolveDate(metadata);
      expect(result.source).toBe('discovered');
      expect(result.date).toBeDefined();
    });

    test('should skip invalid dates', () => {
      const metadata = {
        exifDate: 'invalid-date',
        createdAt: '2023-08-01T12:00:00.000Z',
        modifiedAt: '2023-09-01T00:00:00.000Z'
      };

      const result = resolveDate(metadata);
      expect(result.source).toBe('created');
    });
  });

  describe('extractDateComponents', () => {
    test('should extract year, month, day correctly', () => {
      const result = extractDateComponents('2023-07-15T10:30:00.000Z');
      expect(result.year).toBe('2023');
      expect(result.month).toBe('07');
      expect(result.day).toBe('15');
    });

    test('should pad single-digit months and days', () => {
      // Use noon UTC to avoid timezone day boundary issues
      const result = extractDateComponents('2023-01-05T12:00:00.000Z');
      expect(result.month).toBe('01');
      expect(result.day).toBe('05');
    });

    test('should handle invalid dates by using current date', () => {
      const result = extractDateComponents('invalid');
      expect(result.year).toBeDefined();
      expect(result.month).toBeDefined();
      expect(result.day).toBeDefined();
    });
  });

  describe('generateDestinationPath', () => {
    test('should generate correct path structure', () => {
      const result = generateDestinationPath('/dest', '2023-07-15T10:30:00.000Z', 'photo.jpg');
      expect(result).toBe('/dest/2023/07/15/photo.jpg');
    });

    test('should handle different dates', () => {
      // Use noon UTC to avoid timezone day boundary issues
      const result = generateDestinationPath('/photos', '2020-12-25T12:00:00.000Z', 'christmas.png');
      expect(result).toBe('/photos/2020/12/25/christmas.png');
    });
  });

  describe('compareDates', () => {
    test('should return negative for earlier date first', () => {
      const result = compareDates('2023-01-01', '2023-06-01');
      expect(result).toBeLessThan(0);
    });

    test('should return positive for later date first', () => {
      const result = compareDates('2023-06-01', '2023-01-01');
      expect(result).toBeGreaterThan(0);
    });

    test('should return 0 for equal dates', () => {
      const result = compareDates('2023-06-01', '2023-06-01');
      expect(result).toBe(0);
    });
  });

  describe('formatDate', () => {
    test('should format date as path', () => {
      const result = formatDate('2023-07-15T10:30:00.000Z', 'path');
      expect(result).toBe('2023/07/15');
    });

    test('should format date as ISO', () => {
      const result = formatDate('2023-07-15T10:30:00.000Z', 'iso');
      expect(result).toContain('2023-07-15');
    });

    test('should return "Unknown date" for invalid dates', () => {
      const result = formatDate('invalid', 'short');
      expect(result).toBe('Unknown date');
    });
  });
});
