import { Router } from 'express';
import { getDatabase } from '../database/index.js';

const router = Router();

/**
 * GET /api/search
 * Search files with various filters
 */
router.get('/', (req, res, next) => {
  try {
    const {
      query,
      dateFrom,
      dateTo,
      type,
      minSize,
      maxSize,
      status,
      extension,
      limit = 100,
      offset = 0
    } = req.query;

    const db = getDatabase();

    // Build dynamic query
    const conditions = [];
    const params = {};

    if (query) {
      conditions.push("(filename LIKE @query OR original_path LIKE @query)");
      params.query = `%${query}%`;
    }

    if (dateFrom) {
      conditions.push("resolved_date >= @dateFrom");
      params.dateFrom = dateFrom;
    }

    if (dateTo) {
      conditions.push("resolved_date <= @dateTo");
      params.dateTo = dateTo;
    }

    if (type) {
      // Type can be: image, video, document, other
      const typeExtensions = getTypeExtensions(type);
      if (typeExtensions.length > 0) {
        const placeholders = typeExtensions.map((_, i) => `@ext${i}`).join(', ');
        conditions.push(`extension IN (${placeholders})`);
        typeExtensions.forEach((ext, i) => {
          params[`ext${i}`] = ext;
        });
      }
    }

    if (extension) {
      conditions.push("extension = @extension");
      params.extension = extension.startsWith('.') ? extension : `.${extension}`;
    }

    if (minSize) {
      conditions.push("size >= @minSize");
      params.minSize = parseInt(minSize);
    }

    if (maxSize) {
      conditions.push("size <= @maxSize");
      params.maxSize = parseInt(maxSize);
    }

    if (status) {
      conditions.push("status = @status");
      params.status = status;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT * FROM files
      ${whereClause}
      ORDER BY resolved_date DESC
      LIMIT @limit OFFSET @offset
    `;

    params.limit = parseInt(limit);
    params.offset = parseInt(offset);

    const files = db.prepare(sql).all(params);

    // Get total count
    const countSql = `SELECT COUNT(*) as count FROM files ${whereClause}`;
    const countParams = { ...params };
    delete countParams.limit;
    delete countParams.offset;
    const countResult = db.prepare(countSql).get(countParams);

    res.json({
      files,
      total: countResult.count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      filters: {
        query,
        dateFrom,
        dateTo,
        type,
        minSize,
        maxSize,
        status,
        extension
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/search/extensions
 * Get list of all file extensions in the database
 */
router.get('/extensions', (req, res, next) => {
  try {
    const db = getDatabase();

    const extensions = db.prepare(`
      SELECT extension, COUNT(*) as count
      FROM files
      WHERE extension IS NOT NULL
      GROUP BY extension
      ORDER BY count DESC
    `).all();

    res.json({ extensions });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/search/dates
 * Get date range of files in database
 */
router.get('/dates', (req, res, next) => {
  try {
    const db = getDatabase();

    const result = db.prepare(`
      SELECT
        MIN(resolved_date) as minDate,
        MAX(resolved_date) as maxDate
      FROM files
      WHERE resolved_date IS NOT NULL
    `).get();

    res.json({
      minDate: result.minDate,
      maxDate: result.maxDate
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get file extensions for a given type category
 */
function getTypeExtensions(type) {
  const types = {
    image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.heif', '.tiff', '.tif', '.raw', '.cr2', '.nef', '.arw'],
    video: ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.3gp'],
    document: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.odt', '.ods', '.odp']
  };

  return types[type.toLowerCase()] || [];
}

export default router;
