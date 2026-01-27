import React from 'react';
import { useApp } from '../../contexts/AppContext';

function ProgressIndicator() {
  const { state } = useApp();

  const scanStatus = state.scanStatus;
  const organizeStatus = state.organizeStatus;

  // Determine which operation is active
  const isScanning = scanStatus?.status === 'in_progress';
  const isOrganizing = organizeStatus?.status === 'in_progress';

  if (!isScanning && !isOrganizing) {
    return null;
  }

  const activeOperation = isScanning ? scanStatus : organizeStatus;
  const operationType = isScanning ? 'Scanning' : 'Organizing';

  const progress = activeOperation.totalFiles > 0
    ? Math.round((activeOperation.processedFiles / activeOperation.totalFiles) * 100)
    : 0;

  return (
    <div className="bg-blue-600 text-white">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Spinner */}
            <svg
              className="animate-spin h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>

            <span className="font-medium">{operationType}...</span>

            {activeOperation.totalFiles > 0 && (
              <span className="text-blue-200">
                {activeOperation.processedFiles} / {activeOperation.totalFiles} files
              </span>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Progress percentage */}
            <span className="font-medium">{progress}%</span>

            {/* Progress bar */}
            <div className="w-48 h-2 bg-blue-400 rounded-full overflow-hidden">
              <div
                className="h-full bg-white progress-bar-striped transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Additional stats for organizing */}
        {isOrganizing && (
          <div className="flex items-center space-x-6 mt-2 text-sm text-blue-200">
            <span>Moved: {activeOperation.movedFiles || 0}</span>
            <span>Skipped: {activeOperation.skippedFiles || 0}</span>
            <span>Errors: {activeOperation.errorFiles || 0}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProgressIndicator;
