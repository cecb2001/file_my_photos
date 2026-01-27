import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { initDatabase, closeDatabase, getDatabase } from '../../src/database/index.js';

// Helper to make API requests (simulating HTTP client)
const BASE_URL = 'http://localhost:3001';

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  return {
    status: response.status,
    data: await response.json()
  };
}

describe('E2E: API Endpoints', () => {
  let tempDir;
  let sourceDir;
  let destDir;
  let testFiles = [];

  beforeAll(async () => {
    // Create temporary directories with test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-api-test-'));
    sourceDir = path.join(tempDir, 'source');
    destDir = path.join(tempDir, 'destination');

    await fs.mkdir(sourceDir, { recursive: true });
    await fs.mkdir(destDir, { recursive: true });

    // Create various test files
    const files = [
      { name: 'image1.jpg', content: 'fake jpeg content 1' },
      { name: 'image2.jpg', content: 'fake jpeg content 2' },
      { name: 'image1_dup.jpg', content: 'fake jpeg content 1' }, // Duplicate
      { name: 'document.pdf', content: 'fake pdf content' },
      { name: 'video.mp4', content: 'fake video content' }
    ];

    for (const file of files) {
      const filePath = path.join(sourceDir, file.name);
      await fs.writeFile(filePath, file.content);
      testFiles.push(filePath);
    }

    // Create nested structure
    const nestedDir = path.join(sourceDir, 'nested', 'deep');
    await fs.mkdir(nestedDir, { recursive: true });
    await fs.writeFile(path.join(nestedDir, 'nested_file.txt'), 'nested content');
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore
    }
  });

  describe('Health Check', () => {
    test('GET /api/health returns ok status', async () => {
      const { status, data } = await apiRequest('/api/health');
      expect(status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('File Scanning', () => {
    test('POST /api/scan starts a scan', async () => {
      const { status, data } = await apiRequest('/api/scan', {
        method: 'POST',
        body: JSON.stringify({ sourcePath: sourceDir, recursive: true })
      });

      expect(status).toBe(202);
      expect(data.message).toBe('Scan started');
      expect(data.sessionId).toBeDefined();
    });

    test('GET /api/scan/status returns scan progress', async () => {
      // Wait for scan to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { status, data } = await apiRequest('/api/scan/status');
      expect(status).toBe(200);
      expect(data.status).toBe('completed');
      expect(data.totalFiles).toBeGreaterThan(0);
    });

    test('GET /api/scan/history returns scan history', async () => {
      const { status, data } = await apiRequest('/api/scan/history');
      expect(status).toBe(200);
      expect(data.sessions).toBeDefined();
      expect(Array.isArray(data.sessions)).toBe(true);
    });
  });

  describe('File Management', () => {
    test('GET /api/files returns list of files', async () => {
      const { status, data } = await apiRequest('/api/files');
      expect(status).toBe(200);
      expect(data.files).toBeDefined();
      expect(Array.isArray(data.files)).toBe(true);
      expect(data.total).toBeGreaterThan(0);
    });

    test('GET /api/files/stats returns statistics', async () => {
      const { status, data } = await apiRequest('/api/files/stats');
      expect(status).toBe(200);
      expect(data.total).toBeDefined();
      expect(data.byStatus).toBeDefined();
    });

    test('GET /api/files/:id returns single file', async () => {
      const { data: listData } = await apiRequest('/api/files');
      const fileId = listData.files[0].id;

      const { status, data } = await apiRequest(`/api/files/${fileId}`);
      expect(status).toBe(200);
      expect(data.id).toBe(fileId);
      expect(data.filename).toBeDefined();
    });

    test('GET /api/files/:id returns 404 for non-existent file', async () => {
      const { status } = await apiRequest('/api/files/99999');
      expect(status).toBe(404);
    });
  });

  describe('Duplicate Detection', () => {
    test('GET /api/files/duplicates/all returns duplicate groups', async () => {
      const { status, data } = await apiRequest('/api/files/duplicates/all');
      expect(status).toBe(200);
      expect(data.groups).toBeDefined();
      expect(Array.isArray(data.groups)).toBe(true);
      // Should find at least one duplicate group (image1.jpg and image1_dup.jpg)
      expect(data.groups.length).toBeGreaterThan(0);
    });
  });

  describe('Search', () => {
    test('GET /api/search with query returns matching files', async () => {
      const { status, data } = await apiRequest('/api/search?query=image');
      expect(status).toBe(200);
      expect(data.files).toBeDefined();
      expect(data.files.length).toBeGreaterThan(0);
    });

    test('GET /api/search with type filter works', async () => {
      const { status, data } = await apiRequest('/api/search?type=image');
      expect(status).toBe(200);
      expect(data.files).toBeDefined();
    });

    test('GET /api/search/extensions returns extension list', async () => {
      const { status, data } = await apiRequest('/api/search/extensions');
      expect(status).toBe(200);
      expect(data.extensions).toBeDefined();
      expect(Array.isArray(data.extensions)).toBe(true);
    });

    test('GET /api/search/dates returns date range', async () => {
      const { status, data } = await apiRequest('/api/search/dates');
      expect(status).toBe(200);
      expect(data.minDate).toBeDefined();
      expect(data.maxDate).toBeDefined();
    });
  });

  describe('Organization', () => {
    test('POST /api/organize with dryRun shows preview', async () => {
      const { status, data } = await apiRequest('/api/organize', {
        method: 'POST',
        body: JSON.stringify({ destinationPath: destDir, dryRun: true })
      });

      expect(status).toBe(202);
      expect(data.dryRun).toBe(true);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: statusData } = await apiRequest('/api/organize/status');
      expect(statusData.status).toBe('completed');
      expect(statusData.operations.length).toBeGreaterThan(0);
    });

    test('POST /api/organize actually moves files', async () => {
      const { status, data } = await apiRequest('/api/organize', {
        method: 'POST',
        body: JSON.stringify({ destinationPath: destDir, dryRun: false })
      });

      expect(status).toBe(202);
      expect(data.dryRun).toBe(false);

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { data: statusData } = await apiRequest('/api/organize/status');
      expect(statusData.status).toBe('completed');
      expect(statusData.movedFiles).toBeGreaterThan(0);
    });
  });

  describe('Operations & Revert', () => {
    test('GET /api/operations returns operation list', async () => {
      const { status, data } = await apiRequest('/api/operations');
      expect(status).toBe(200);
      expect(data.operations).toBeDefined();
      expect(Array.isArray(data.operations)).toBe(true);
    });

    test('GET /api/operations/batches returns batch list', async () => {
      const { status, data } = await apiRequest('/api/operations/batches');
      expect(status).toBe(200);
      expect(data.batches).toBeDefined();
    });

    test('POST /api/operations/batch/:id/revert reverts a batch', async () => {
      // Get the latest batch
      const { data: batchData } = await apiRequest('/api/operations/batches');
      const latestBatch = batchData.batches.find(b => b.operation_type === 'move');

      if (latestBatch) {
        const { status, data } = await apiRequest(
          `/api/operations/batch/${latestBatch.batch_id}/revert`,
          { method: 'POST' }
        );

        expect(status).toBe(200);
        expect(data.result.reverted).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Error Handling', () => {
    test('GET /api/files/errors/all returns error list', async () => {
      const { status, data } = await apiRequest('/api/files/errors/all');
      expect(status).toBe(200);
      expect(data.errors).toBeDefined();
    });

    test('POST /api/scan with invalid path handles gracefully', async () => {
      const { status, data } = await apiRequest('/api/scan', {
        method: 'POST',
        body: JSON.stringify({ sourcePath: '/nonexistent/path', recursive: true })
      });

      // Should accept the request (async operation)
      expect(status).toBe(202);
    });

    test('POST /api/organize without destinationPath returns 400', async () => {
      const { status, data } = await apiRequest('/api/organize', {
        method: 'POST',
        body: JSON.stringify({ dryRun: true })
      });

      expect(status).toBe(400);
      expect(data.error).toBeDefined();
    });

    test('GET /api/nonexistent returns 404', async () => {
      const { status } = await apiRequest('/api/nonexistent');
      expect(status).toBe(404);
    });
  });

  describe('Pagination', () => {
    test('GET /api/files with limit and offset works', async () => {
      const { status, data } = await apiRequest('/api/files?limit=2&offset=0');
      expect(status).toBe(200);
      expect(data.files.length).toBeLessThanOrEqual(2);
      expect(data.limit).toBe(2);
      expect(data.offset).toBe(0);
    });

    test('GET /api/operations with limit works', async () => {
      const { status, data } = await apiRequest('/api/operations?limit=5&offset=0');
      expect(status).toBe(200);
      expect(data.operations.length).toBeLessThanOrEqual(5);
    });
  });
});

describe('E2E: Edge Cases', () => {
  let tempDir;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-edge-test-'));
  });

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore
    }
  });

  describe('Large File Names', () => {
    test('handles files with long names', async () => {
      const sourceDir = path.join(tempDir, 'long-names');
      await fs.mkdir(sourceDir, { recursive: true });

      // Create file with very long name
      const longName = 'a'.repeat(200) + '.txt';
      await fs.writeFile(path.join(sourceDir, longName), 'content');

      const { status } = await apiRequest('/api/scan', {
        method: 'POST',
        body: JSON.stringify({ sourcePath: sourceDir, recursive: true })
      });

      expect(status).toBe(202);
    });
  });

  describe('Special Characters', () => {
    test('handles files with special characters in names', async () => {
      const sourceDir = path.join(tempDir, 'special-chars');
      await fs.mkdir(sourceDir, { recursive: true });

      // Create files with various special characters
      const specialNames = [
        'file with spaces.txt',
        'file-with-dashes.txt',
        'file_with_underscores.txt'
      ];

      for (const name of specialNames) {
        await fs.writeFile(path.join(sourceDir, name), 'content');
      }

      const { status } = await apiRequest('/api/scan', {
        method: 'POST',
        body: JSON.stringify({ sourcePath: sourceDir, recursive: true })
      });

      expect(status).toBe(202);
    });
  });

  describe('Empty Directory', () => {
    test('handles empty directories gracefully', async () => {
      const emptyDir = path.join(tempDir, 'empty');
      await fs.mkdir(emptyDir, { recursive: true });

      // Wait for any previous scan to complete
      let scanStatus = await apiRequest('/api/scan/status');
      while (scanStatus.data.status === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 100));
        scanStatus = await apiRequest('/api/scan/status');
      }

      const { status } = await apiRequest('/api/scan', {
        method: 'POST',
        body: JSON.stringify({ sourcePath: emptyDir, recursive: true })
      });

      expect(status).toBe(202);

      await new Promise(resolve => setTimeout(resolve, 500));

      const { data } = await apiRequest('/api/scan/status');
      expect(data.totalFiles).toBe(0);
    });
  });
});
