import React from 'react';
import { getFilePreview } from '../../api/client';

function FilePreview({ file, onClose }) {
  const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(
    file.extension?.toLowerCase()
  );

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            {file.filename}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Image preview */}
          {isImage && (
            <div className="preview-container mb-6 bg-gray-100 rounded-lg flex items-center justify-center">
              <img
                src={getFilePreview(file.id)}
                alt={file.filename}
                className="max-w-full max-h-[300px] object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* File details */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Original Path</h3>
              <p className="mt-1 text-sm text-gray-900 break-all">{file.original_path}</p>
            </div>

            {file.current_path && file.current_path !== file.original_path && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Current Path</h3>
                <p className="mt-1 text-sm text-gray-900 break-all">{file.current_path}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Size</h3>
                <p className="mt-1 text-sm text-gray-900">{formatFileSize(file.size)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Extension</h3>
                <p className="mt-1 text-sm text-gray-900">{file.extension || 'None'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">MIME Type</h3>
                <p className="mt-1 text-sm text-gray-900">{file.mime_type || 'Unknown'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <p className="mt-1 text-sm text-gray-900 capitalize">{file.status}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Resolved Date</h3>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(file.resolved_date)}
                {file.date_source && (
                  <span className="text-gray-500 ml-2">
                    (from {file.date_source})
                  </span>
                )}
              </p>
            </div>

            {file.exif_date && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">EXIF Date</h3>
                <p className="mt-1 text-sm text-gray-900">{formatDate(file.exif_date)}</p>
              </div>
            )}

            {file.hash_sha256 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">SHA-256 Hash</h3>
                <p className="mt-1 text-xs text-gray-900 font-mono break-all">
                  {file.hash_sha256}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">File Created</h3>
                <p className="mt-1 text-sm text-gray-900">{formatDate(file.created_at)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">File Modified</h3>
                <p className="mt-1 text-sm text-gray-900">{formatDate(file.modified_at)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default FilePreview;
