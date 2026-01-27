# File My Photos - Architecture & Implementation Plan


## Project Overview

A local desktop-style file organization application with a React frontend and Node.js backend that scans, analyzes, organizes, and tracks files from local folders.

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend (3000)                     │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌─────────────────┐  │
│  │ Scanner │ │  Search  │ │ Preview │ │ Operation History│  │
│  │   UI    │ │    UI    │ │   UI    │ │       UI        │  │
│  └─────────┘ └──────────┘ └─────────┘ └─────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/REST
┌─────────────────────────▼───────────────────────────────────┐
│                  Node.js Backend (3001)                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Express API Layer                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │   Scanner   │ │  Metadata   │ │  Date Resolution    │   │
│  │   Service   │ │  Extractor  │ │     Service         │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
│                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │  Organizer  │ │  Duplicate  │ │  Revert             │   │
│  │   Service   │ │  Detector   │ │  Service            │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              SQLite Database (better-sqlite3)         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: SQLite with better-sqlite3 (synchronous, fast, no external deps)
- **File Hashing**: Node.js crypto module (SHA-256)
- **EXIF/Metadata**: exifr (comprehensive EXIF extraction)
- **File Type Detection**: file-type package
- **Testing**: Jest

### Frontend
- **Framework**: React 18+ with Vite (browser-based, not Electron)
- **State Management**: React Context + useReducer
- **Styling**: Tailwind CSS
- **HTTP Client**: fetch API
- **Image Previews**: On-demand generation with in-memory caching
- **Testing**: Vitest + React Testing Library

---

## Data Models

### Database Schema (SQLite)

```sql
-- Files table: All discovered files
CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_path TEXT NOT NULL UNIQUE,
    current_path TEXT,
    filename TEXT NOT NULL,
    extension TEXT,
    size INTEGER NOT NULL,
    hash_sha256 TEXT,
    hash_partial TEXT,  -- First 64KB hash for performance
    mime_type TEXT,
    created_at TEXT,    -- From metadata
    modified_at TEXT,   -- From filesystem
    exif_date TEXT,     -- From EXIF
    resolved_date TEXT, -- Final determined date
    date_source TEXT,   -- 'exif' | 'created' | 'modified' | 'discovered'
    status TEXT DEFAULT 'pending',  -- pending | moved | duplicate | error
    duplicate_of INTEGER REFERENCES files(id),
    created_timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Operations table: Audit trail
CREATE TABLE operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id TEXT NOT NULL,  -- Groups operations for batch revert
    file_id INTEGER REFERENCES files(id),
    operation_type TEXT NOT NULL,  -- scan | move | skip | duplicate | error | revert
    source_path TEXT NOT NULL,
    destination_path TEXT,
    hash_used TEXT,
    reason TEXT,
    status TEXT DEFAULT 'completed',  -- completed | reverted | failed
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Errors table: Failed operations
CREATE TABLE errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER REFERENCES files(id),
    file_path TEXT NOT NULL,
    error_type TEXT NOT NULL,
    error_message TEXT,
    stack_trace TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Settings table: App configuration
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

---

## Backend Module Structure

```
backend/
├── src/
│   ├── index.js              # Entry point, Express app setup
│   ├── config.js             # Configuration management
│   ├── database/
│   │   ├── index.js          # Database initialization
│   │   ├── migrations.js     # Schema creation
│   │   └── queries.js        # SQL query helpers
│   ├── services/
│   │   ├── scanner.js        # File scanning service
│   │   ├── metadata.js       # Metadata extraction
│   │   ├── dateResolver.js   # Date resolution logic
│   │   ├── hasher.js         # File hashing
│   │   ├── duplicateDetector.js  # Duplicate detection
│   │   ├── organizer.js      # File organization/moving
│   │   ├── revert.js         # Revert operations
│   │   └── logger.js         # JSON logging
│   ├── routes/
│   │   ├── files.js          # File-related endpoints
│   │   ├── operations.js     # Operation endpoints
│   │   ├── organize.js       # Organize/move endpoints
│   │   └── search.js         # Search endpoints
│   └── utils/
│       ├── fileUtils.js      # File system helpers
│       ├── retry.js          # Retry logic with exponential backoff
│       └── validation.js     # Input validation
├── tests/
│   ├── fixtures/             # Test files (images, docs)
│   ├── unit/
│   │   ├── scanner.test.js
│   │   ├── metadata.test.js
│   │   ├── dateResolver.test.js
│   │   ├── duplicateDetector.test.js
│   │   └── organizer.test.js
│   └── integration/
│       └── workflow.test.js
├── package.json
└── jest.config.js
```

---

## Frontend Module Structure

```
frontend/
├── src/
│   ├── main.jsx              # Entry point
│   ├── App.jsx               # Root component
│   ├── api/
│   │   └── client.js         # API client
│   ├── components/
│   │   ├── Layout/
│   │   ├── FolderSelector/
│   │   ├── FileList/
│   │   ├── FilePreview/
│   │   ├── SearchBar/
│   │   ├── FilterPanel/
│   │   ├── OperationHistory/
│   │   ├── DuplicateViewer/
│   │   └── ProgressIndicator/
│   ├── contexts/
│   │   └── AppContext.jsx
│   ├── hooks/
│   │   ├── useFiles.js
│   │   └── useOperations.js
│   └── styles/
├── tests/
├── package.json
├── vite.config.js
└── index.html
```

---

## API Endpoints

### Files
- `GET /api/files` - List files with filters (status, date, type, size)
- `GET /api/files/:id` - Get single file details
- `GET /api/files/:id/preview` - Get image preview (thumbnail)

### Scanning
- `POST /api/scan` - Start folder scan (body: { sourcePath, recursive })
- `GET /api/scan/status` - Get current scan progress

### Organization
- `POST /api/organize` - Start organization (body: { destinationPath, dryRun })
- `GET /api/organize/status` - Get organization progress

### Duplicates
- `GET /api/duplicates` - List duplicate groups
- `POST /api/duplicates/:id/resolve` - Resolve duplicate (keep/delete)

### Operations
- `GET /api/operations` - List operations with filters
- `GET /api/operations/:batchId` - Get batch operations
- `POST /api/operations/:id/revert` - Revert single operation
- `POST /api/operations/batch/:batchId/revert` - Revert batch

### Search
- `GET /api/search` - Search files (query: name, dateFrom, dateTo, type, minSize, maxSize)

### Errors
- `GET /api/errors` - List all errors

---

## Implementation Phases

### Phase 1: Project Setup & Core Infrastructure
1. Initialize backend with Express, better-sqlite3
2. Initialize frontend with Vite + React
3. Set up database schema and migrations
4. Create basic API structure
5. Set up testing infrastructure

### Phase 2: File Scanning & Metadata
1. Implement recursive file scanner with streaming
2. Implement metadata extractor (EXIF, file info)
3. Implement file hashing (full + partial)
4. Implement date resolution logic
5. Write unit tests for all services

### Phase 3: Duplicate Detection & Organization
1. Implement duplicate detection strategies
2. Implement file organizer (move with date structure)
3. Implement collision handling
4. Implement dry-run mode
5. Write integration tests

### Phase 4: Logging & Reversibility
1. Implement operation logging
2. Implement revert service
3. Implement batch operations
4. Write revert tests

### Phase 5: Frontend - Core UI
1. Create layout and navigation
2. Implement folder selector
3. Implement file list with virtualization
4. Implement search and filters
5. Implement operation history view

### Phase 6: Frontend - Advanced Features
1. Implement image preview
2. Implement duplicate viewer
3. Implement progress indicators
4. Implement revert UI

### Phase 7: Polish & Testing
1. End-to-end testing
2. Error handling improvements
3. Performance optimization
4. Documentation

---

## Key Implementation Details

### File Scanning (Streaming)
- Use `fs.opendir()` with async iteration to avoid loading all entries at once
- Process files in batches (100 files at a time)
- Emit progress events for UI updates
- Skip system files (., .., .DS_Store, etc.)

### Hashing Strategy
- Full SHA-256 hash for definitive duplicate detection
- Partial hash (first 64KB) for quick pre-filtering
- Hash computation is async and non-blocking

### Date Resolution Priority
1. EXIF DateTimeOriginal
2. EXIF CreateDate
3. File system birth time (creation)
4. File system mtime (modified)
5. Current timestamp (discovery time)

### Duplicate Handling
- Primary: Full hash match = definitive duplicate
- Secondary: Size + partial hash = likely duplicate (confirm with full hash)
- Tertiary: Filename similarity (Levenshtein) = possible duplicate (flag for review)

### Collision Handling
When destination file exists:
1. Check if it's a duplicate (same hash) - skip, mark as duplicate
2. If different content, rename: `filename (1).ext`, `filename (2).ext`, etc.

### Retry Logic
Automatic retry for transient failures:
- **Max retries**: 3 attempts per file
- **Backoff**: Exponential (1s, 2s, 4s delays)
- **Retryable errors**: EBUSY (file in use), EAGAIN, ENOENT (timing), network timeouts
- **Non-retryable errors**: EACCES (permission), ENOSPC (disk full), EINVAL
- **Implementation**:
  ```javascript
  async function withRetry(operation, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (!isRetryable(error) || attempt === maxRetries) {
          throw error;
        }
        await sleep(Math.pow(2, attempt - 1) * 1000);
      }
    }
  }
  ```
- **Tracking**: Each retry attempt is logged; final failure goes to errors table with retry count

---

## Verification Plan

### Backend Tests
```bash
cd backend && npm test
```
- Unit tests for each service
- Integration tests with temporary directories

### Frontend Tests
```bash
cd frontend && npm test
```
- Component tests with React Testing Library

### Manual Testing
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Test workflow:
   - Select source folder with test files
   - Run scan and verify file detection
   - Review duplicates
   - Run organization (dry-run first)
   - Verify files moved correctly
   - Test revert functionality
   - Test search and filters

---

## Risk Areas & Mitigations

| Risk | Mitigation |
|------|------------|
| Large folders overwhelming memory | Stream-based scanning, batch processing |
| Slow hash computation | Partial hashing for pre-filter, async processing |
| EXIF extraction failures | Graceful fallback to filesystem dates |
| File permission errors | Comprehensive error logging, continue on error |
| Concurrent operation conflicts | Operation locking at database level |

---

## Files to Create (Implementation Order)

### Phase 1
1. `backend/package.json`
2. `backend/src/index.js`
3. `backend/src/config.js`
4. `backend/src/database/index.js`
5. `backend/src/database/migrations.js`
6. `frontend/package.json`
7. `frontend/vite.config.js`
8. `frontend/index.html`
9. `frontend/src/main.jsx`
10. `frontend/src/App.jsx`

### Phase 2
11. `backend/src/services/scanner.js`
12. `backend/src/services/metadata.js`
13. `backend/src/services/hasher.js`
14. `backend/src/services/dateResolver.js`
15. `backend/src/routes/files.js`
16. Tests for above

### Phase 3
17. `backend/src/services/duplicateDetector.js`
18. `backend/src/services/organizer.js`
19. `backend/src/routes/organize.js`
20. `backend/src/routes/duplicates.js`
21. Tests for above

### Phase 4+
(Remaining services, routes, and frontend components)
