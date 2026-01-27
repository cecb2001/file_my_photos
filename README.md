# File My Photos

A local desktop-style file organization application with a React frontend and Node.js backend that scans, analyzes, organizes, and tracks files from local folders.

## Features

- **File Scanning**: Recursively scan folders to discover files with metadata extraction
- **Date Resolution**: Determine the best creation date from EXIF, filesystem, or discovery time
- **Duplicate Detection**: Identify duplicate files using SHA-256 hashing
- **File Organization**: Move files into YYYY/MM/DD folder structure based on resolved dates
- **Collision Handling**: Automatic renaming when destination files already exist
- **Audit Trail**: Full logging of all operations with JSON-format logs
- **Reversibility**: Revert operations to move files back to original locations
- **Search & Filter**: Search files by name, date, type, size with various filters

## Tech Stack

- **Backend**: Node.js with Express.js
- **Frontend**: React 18 with Vite
- **Database**: SQLite with better-sqlite3
- **Styling**: Tailwind CSS
- **Testing**: Jest (backend) and Vitest (frontend)

## Project Structure

```
file_my_photos/
├── backend/
│   ├── src/
│   │   ├── index.js              # Express server entry point
│   │   ├── config.js             # Configuration
│   │   ├── database/             # SQLite database setup
│   │   ├── services/             # Business logic
│   │   │   ├── scanner.js        # File scanning
│   │   │   ├── metadata.js       # Metadata extraction
│   │   │   ├── hasher.js         # File hashing
│   │   │   ├── dateResolver.js   # Date resolution
│   │   │   ├── duplicateDetector.js  # Duplicate detection
│   │   │   ├── organizer.js      # File organization
│   │   │   └── revert.js         # Revert operations
│   │   └── routes/               # API endpoints
│   └── tests/                    # Backend tests
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Main application
│   │   ├── api/                  # API client
│   │   ├── components/           # React components
│   │   ├── contexts/             # State management
│   │   └── styles/               # CSS
│   └── tests/                    # Frontend tests
└── README.md
```

## Installation

### Prerequisites

- Node.js 20 or higher
- npm

### Backend Setup

```bash
cd backend
npm install
```

### Frontend Setup

```bash
cd frontend
npm install
```

## Running the Application

### Start Backend Server

```bash
cd backend
npm run dev
```

The backend server will start at `http://localhost:3001`

### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The frontend will start at `http://localhost:3000`

## Running Tests

### Backend Tests

```bash
cd backend
npm test
```

### Frontend Tests

```bash
cd frontend
npm test
```

## API Endpoints

### Files
- `GET /api/files` - List files with pagination
- `GET /api/files/:id` - Get file details
- `GET /api/files/:id/preview` - Get image preview
- `GET /api/files/stats` - Get statistics

### Scanning
- `POST /api/scan` - Start folder scan
- `GET /api/scan/status` - Get scan progress

### Organization
- `POST /api/organize` - Start file organization
- `GET /api/organize/status` - Get organization progress
- `GET /api/organize/preview` - Preview organization

### Operations
- `GET /api/operations` - List operations
- `POST /api/operations/:id/revert` - Revert operation
- `POST /api/operations/batch/:batchId/revert` - Revert batch

### Search
- `GET /api/search` - Search files with filters

## Usage

1. **Start both servers** (backend and frontend)
2. **Enter source folder path** - The folder containing files to organize
3. **Click "Scan Folder"** - Scans and analyzes all files recursively
4. **Review files** - View detected files, duplicates, and metadata
5. **Enter destination folder** - Where organized files will be moved
6. **Preview changes** - Use "Dry Run" to see what will happen
7. **Organize files** - Move files to date-based folder structure
8. **Revert if needed** - Undo any operation through the History tab

## File Organization Structure

Files are organized by their resolved date into:
```
destination/
├── 2023/
│   ├── 07/
│   │   ├── 15/
│   │   │   ├── photo1.jpg
│   │   │   └── photo2.jpg
│   │   └── 16/
│   │       └── photo3.jpg
```

## Date Resolution Priority

1. EXIF DateTimeOriginal
2. EXIF CreateDate
3. Filesystem creation time
4. Filesystem modified time
5. Discovery time (fallback)

## Duplicate Handling

- Files are identified as duplicates using SHA-256 hash
- First discovered file is kept as "original"
- Duplicates are marked and not moved
- All duplicate relationships are tracked in the database

## Known Limitations

- Image preview is currently serving original files (no thumbnail generation)
- No progress events via WebSocket (uses polling)
- Frontend file browser uses native browser folder picker limitations

## Future Improvements

- Add WebSocket support for real-time progress updates
- Generate thumbnails for image previews
- Add batch selection for manual duplicate resolution
- Support for more metadata formats (XMP, IPTC)
- Add export functionality for audit logs
