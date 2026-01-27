const API_BASE = '/api';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Request failed: ${response.status}`);
  }

  return response.json();
}

// Files API
export async function getFiles(options = {}) {
  const params = new URLSearchParams();
  if (options.status) params.append('status', options.status);
  if (options.limit) params.append('limit', options.limit);
  if (options.offset) params.append('offset', options.offset);

  const queryString = params.toString();
  return fetchApi(`/files${queryString ? `?${queryString}` : ''}`);
}

export async function getFileById(id) {
  return fetchApi(`/files/${id}`);
}

export async function getFilePreview(id) {
  return `${API_BASE}/files/${id}/preview`;
}

export async function getStats() {
  return fetchApi('/files/stats');
}

export async function getDuplicates() {
  return fetchApi('/files/duplicates/all');
}

export async function getErrors(options = {}) {
  const params = new URLSearchParams();
  if (options.limit) params.append('limit', options.limit);
  if (options.offset) params.append('offset', options.offset);

  const queryString = params.toString();
  return fetchApi(`/files/errors/all${queryString ? `?${queryString}` : ''}`);
}

// Scan API
export async function startScan(sourcePath, recursive = true) {
  return fetchApi('/scan', {
    method: 'POST',
    body: JSON.stringify({ sourcePath, recursive })
  });
}

export async function getScanStatus() {
  return fetchApi('/scan/status');
}

export async function cancelScan() {
  return fetchApi('/scan/cancel', { method: 'POST' });
}

export async function getScanHistory() {
  return fetchApi('/scan/history');
}

// Organize API
export async function startOrganize(destinationPath, dryRun = false, fileIds = null) {
  return fetchApi('/organize', {
    method: 'POST',
    body: JSON.stringify({ destinationPath, dryRun, fileIds })
  });
}

export async function getOrganizeStatus() {
  return fetchApi('/organize/status');
}

export async function cancelOrganize() {
  return fetchApi('/organize/cancel', { method: 'POST' });
}

export async function getOrganizePreview(destinationPath) {
  return fetchApi(`/organize/preview?destinationPath=${encodeURIComponent(destinationPath)}`);
}

// Operations API
export async function getOperations(options = {}) {
  const params = new URLSearchParams();
  if (options.limit) params.append('limit', options.limit);
  if (options.offset) params.append('offset', options.offset);

  const queryString = params.toString();
  return fetchApi(`/operations${queryString ? `?${queryString}` : ''}`);
}

export async function getOperationBatches(limit = 20) {
  return fetchApi(`/operations/batches?limit=${limit}`);
}

export async function getOperationsByBatch(batchId) {
  return fetchApi(`/operations/batch/${batchId}`);
}

export async function revertOperation(operationId) {
  return fetchApi(`/operations/${operationId}/revert`, { method: 'POST' });
}

export async function revertBatch(batchId) {
  return fetchApi(`/operations/batch/${batchId}/revert`, { method: 'POST' });
}

// Search API
export async function searchFiles(params = {}) {
  const queryParams = new URLSearchParams();

  if (params.query) queryParams.append('query', params.query);
  if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
  if (params.dateTo) queryParams.append('dateTo', params.dateTo);
  if (params.type) queryParams.append('type', params.type);
  if (params.minSize) queryParams.append('minSize', params.minSize);
  if (params.maxSize) queryParams.append('maxSize', params.maxSize);
  if (params.status) queryParams.append('status', params.status);
  if (params.extension) queryParams.append('extension', params.extension);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.offset) queryParams.append('offset', params.offset);

  const queryString = queryParams.toString();
  return fetchApi(`/search${queryString ? `?${queryString}` : ''}`);
}

export async function getExtensions() {
  return fetchApi('/search/extensions');
}

export async function getDateRange() {
  return fetchApi('/search/dates');
}

// Health check
export async function healthCheck() {
  return fetchApi('/health');
}
