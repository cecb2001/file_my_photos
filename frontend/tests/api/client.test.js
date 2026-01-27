import { describe, test, expect, vi, beforeEach } from 'vitest';
import * as api from '../../src/api/client';

// Mock fetch
global.fetch = vi.fn();

function mockFetchSuccess(data) {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(data)
  });
}

function mockFetchError(status, message) {
  global.fetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ error: { message } })
  });
}

describe('API Client', () => {
  beforeEach(() => {
    global.fetch.mockReset();
  });

  describe('getFiles', () => {
    test('fetches files with default parameters', async () => {
      mockFetchSuccess({ files: [], total: 0 });

      await api.getFiles();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/files',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    test('includes status filter in query', async () => {
      mockFetchSuccess({ files: [], total: 0 });

      await api.getFiles({ status: 'pending' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=pending'),
        expect.anything()
      );
    });

    test('includes limit and offset in query', async () => {
      mockFetchSuccess({ files: [], total: 0 });

      await api.getFiles({ limit: 50, offset: 100 });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.anything()
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=100'),
        expect.anything()
      );
    });
  });

  describe('getFileById', () => {
    test('fetches single file', async () => {
      mockFetchSuccess({ id: 1, filename: 'test.jpg' });

      const result = await api.getFileById(1);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/files/1',
        expect.anything()
      );
      expect(result.filename).toBe('test.jpg');
    });
  });

  describe('getStats', () => {
    test('fetches file statistics', async () => {
      mockFetchSuccess({ total: 100, byStatus: { pending: 50, moved: 50 } });

      const result = await api.getStats();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/files/stats',
        expect.anything()
      );
      expect(result.total).toBe(100);
    });
  });

  describe('startScan', () => {
    test('sends POST request with correct body', async () => {
      mockFetchSuccess({ message: 'Scan started', sessionId: 1 });

      await api.startScan('/path/to/scan', true);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/scan',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ sourcePath: '/path/to/scan', recursive: true })
        })
      );
    });
  });

  describe('getScanStatus', () => {
    test('fetches scan status', async () => {
      mockFetchSuccess({ status: 'completed', totalFiles: 100 });

      const result = await api.getScanStatus();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/scan/status',
        expect.anything()
      );
      expect(result.status).toBe('completed');
    });
  });

  describe('startOrganize', () => {
    test('sends POST request with correct body', async () => {
      mockFetchSuccess({ message: 'Organization started' });

      await api.startOrganize('/dest/path', false, null);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/organize',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ destinationPath: '/dest/path', dryRun: false, fileIds: null })
        })
      );
    });

    test('includes dryRun flag', async () => {
      mockFetchSuccess({ message: 'Dry run started' });

      await api.startOrganize('/dest/path', true);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/organize',
        expect.objectContaining({
          body: expect.stringContaining('"dryRun":true')
        })
      );
    });
  });

  describe('getOperations', () => {
    test('fetches operations', async () => {
      mockFetchSuccess({ operations: [], total: 0 });

      await api.getOperations();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/operations',
        expect.anything()
      );
    });
  });

  describe('revertOperation', () => {
    test('sends POST request to revert endpoint', async () => {
      mockFetchSuccess({ message: 'Reverted' });

      await api.revertOperation(1);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/operations/1/revert',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('revertBatch', () => {
    test('sends POST request to batch revert endpoint', async () => {
      mockFetchSuccess({ message: 'Batch reverted' });

      await api.revertBatch('batch-123');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/operations/batch/batch-123/revert',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('searchFiles', () => {
    test('includes all search parameters', async () => {
      mockFetchSuccess({ files: [], total: 0 });

      await api.searchFiles({
        query: 'photo',
        type: 'image',
        status: 'pending',
        dateFrom: '2023-01-01',
        dateTo: '2023-12-31',
        minSize: 1000,
        maxSize: 10000000
      });

      const call = global.fetch.mock.calls[0][0];
      expect(call).toContain('query=photo');
      expect(call).toContain('type=image');
      expect(call).toContain('status=pending');
      expect(call).toContain('dateFrom=2023-01-01');
      expect(call).toContain('dateTo=2023-12-31');
      expect(call).toContain('minSize=1000');
      expect(call).toContain('maxSize=10000000');
    });
  });

  describe('Error Handling', () => {
    test('throws error on failed request', async () => {
      mockFetchError(404, 'Not found');

      await expect(api.getFileById(999)).rejects.toThrow('Not found');
    });

    test('handles server error', async () => {
      mockFetchError(500, 'Internal server error');

      await expect(api.getFiles()).rejects.toThrow('Internal server error');
    });
  });

  describe('getDuplicates', () => {
    test('fetches duplicate groups', async () => {
      mockFetchSuccess({ groups: [], totalGroups: 0 });

      const result = await api.getDuplicates();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/files/duplicates/all',
        expect.anything()
      );
    });
  });

  describe('healthCheck', () => {
    test('checks API health', async () => {
      mockFetchSuccess({ status: 'ok' });

      const result = await api.healthCheck();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/health',
        expect.anything()
      );
      expect(result.status).toBe('ok');
    });
  });
});
