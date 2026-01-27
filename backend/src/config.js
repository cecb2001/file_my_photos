import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  // Server settings
  port: process.env.PORT || 3001,
  host: process.env.HOST || 'localhost',

  // Database settings
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'filemyphotos.db'),

  // Scanning settings
  batchSize: parseInt(process.env.BATCH_SIZE) || 100,

  // Hashing settings
  partialHashSize: parseInt(process.env.PARTIAL_HASH_SIZE) || 65536, // 64KB

  // File type categories
  imageExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.heif', '.tiff', '.tif', '.raw', '.cr2', '.nef', '.arw'],
  videoExtensions: ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.3gp'],
  documentExtensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.odt', '.ods', '.odp'],

  // Files to skip during scanning
  skipFiles: ['.DS_Store', 'Thumbs.db', 'desktop.ini', '.gitkeep', '.gitignore'],
  skipDirectories: ['node_modules', '.git', '__pycache__', '.cache', '.Trash'],

  // Logging settings
  logPath: process.env.LOG_PATH || path.join(__dirname, '..', 'logs'),

  // Environment
  env: process.env.NODE_ENV || 'development',

  // CORS settings
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:5173']
};

export default config;
