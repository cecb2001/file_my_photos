import React, { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import FilePreview from '../FilePreview/FilePreview';

function FileList() {
  const { state, actions } = useApp();
  const [selectedFile, setSelectedFile] = useState(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    actions.fetchFiles({ limit: pageSize, offset: page * pageSize });
  }, [page]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-gray-100 text-gray-800',
      moved: 'bg-green-100 text-green-800',
      duplicate: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getFileIcon = (extension) => {
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic'];
    const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.wmv'];
    const docExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];

    if (imageExts.includes(extension?.toLowerCase())) return '🖼️';
    if (videoExts.includes(extension?.toLowerCase())) return '🎬';
    if (docExts.includes(extension?.toLowerCase())) return '📄';
    return '📁';
  };

  if (state.filesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading files...</div>
      </div>
    );
  }

  if (state.filesError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {state.filesError}</div>
      </div>
    );
  }

  if (state.files.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-500">
          <p className="text-lg mb-2">No files found</p>
          <p className="text-sm">Scan a folder to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* File list */}
      <div className="file-list-container">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                File
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {state.files.map((file) => (
              <tr
                key={file.id}
                onClick={() => setSelectedFile(file)}
                className={`cursor-pointer hover:bg-gray-50 ${
                  selectedFile?.id === file.id ? 'bg-blue-50' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <span className="text-xl mr-3">{getFileIcon(file.extension)}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900 truncate max-w-md">
                        {file.filename}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-md">
                        {file.original_path}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {formatFileSize(file.size)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  <div>{formatDate(file.resolved_date)}</div>
                  <div className="text-xs text-gray-400">{file.date_source}</div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                      file.status
                    )}`}
                  >
                    {file.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t">
        <div className="text-sm text-gray-700">
          Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, state.totalFiles)} of{' '}
          {state.totalFiles} files
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(page + 1)}
            disabled={(page + 1) * pageSize >= state.totalFiles}
            className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Preview modal */}
      {selectedFile && (
        <FilePreview file={selectedFile} onClose={() => setSelectedFile(null)} />
      )}
    </div>
  );
}

export default FileList;
