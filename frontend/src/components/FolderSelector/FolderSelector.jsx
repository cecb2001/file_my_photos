import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';

function FolderSelector() {
  const { state, actions } = useApp();
  const [localSourcePath, setLocalSourcePath] = useState(state.sourcePath);
  const [localDestPath, setLocalDestPath] = useState(state.destinationPath);
  const [isScanning, setIsScanning] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [dryRun, setDryRun] = useState(true);

  const handleScan = async () => {
    if (!localSourcePath.trim()) {
      alert('Please enter a source folder path');
      return;
    }

    setIsScanning(true);
    actions.setSourcePath(localSourcePath);

    try {
      await actions.startScan(localSourcePath, true);
      // Start polling for status
      const pollInterval = setInterval(async () => {
        const status = await actions.fetchScanStatus();
        if (status.status === 'completed' || status.status === 'error' || status.status === 'idle') {
          clearInterval(pollInterval);
          setIsScanning(false);
          actions.fetchFiles();
          actions.fetchStats();
        }
      }, 1000);
    } catch (error) {
      console.error('Scan failed:', error);
      setIsScanning(false);
    }
  };

  const handleOrganize = async () => {
    if (!localDestPath.trim()) {
      alert('Please enter a destination folder path');
      return;
    }

    if (!dryRun) {
      const confirmed = window.confirm(
        'This will move files to the destination folder. Are you sure you want to continue?'
      );
      if (!confirmed) return;
    }

    setIsOrganizing(true);
    actions.setDestinationPath(localDestPath);

    try {
      await actions.startOrganize(localDestPath, dryRun);
      // Start polling for status
      const pollInterval = setInterval(async () => {
        const status = await actions.fetchOrganizeStatus();
        if (status.status === 'completed' || status.status === 'error' || status.status === 'idle') {
          clearInterval(pollInterval);
          setIsOrganizing(false);
          actions.fetchFiles();
          actions.fetchStats();
        }
      }, 1000);
    } catch (error) {
      console.error('Organize failed:', error);
      setIsOrganizing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Source folder */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Source Folder
        </label>
        <div className="flex space-x-4">
          <input
            type="text"
            value={localSourcePath}
            onChange={(e) => setLocalSourcePath(e.target.value)}
            placeholder="/path/to/source/folder"
            className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isScanning}
          />
          <button
            onClick={handleScan}
            disabled={isScanning || !localSourcePath.trim()}
            className={`px-6 py-2 rounded-md font-medium ${
              isScanning
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isScanning ? 'Scanning...' : 'Scan Folder'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Recursively scan this folder for files to organize
        </p>
      </div>

      {/* Destination folder */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Destination Folder
        </label>
        <div className="flex space-x-4">
          <input
            type="text"
            value={localDestPath}
            onChange={(e) => setLocalDestPath(e.target.value)}
            placeholder="/path/to/destination/folder"
            className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isOrganizing}
          />
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              disabled={isOrganizing}
            />
            <span className="text-sm text-gray-700">Dry Run</span>
          </label>
          <button
            onClick={handleOrganize}
            disabled={isOrganizing || !localDestPath.trim()}
            className={`px-6 py-2 rounded-md font-medium ${
              isOrganizing
                ? 'bg-gray-400 cursor-not-allowed'
                : dryRun
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isOrganizing
              ? 'Processing...'
              : dryRun
                ? 'Preview Changes'
                : 'Organize Files'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Files will be organized into YYYY/MM/DD structure
          {dryRun && ' (dry run - no files will be moved)'}
        </p>
      </div>

      {/* Stats display */}
      {state.stats && (
        <div className="flex space-x-6 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{state.stats.total || 0}</div>
            <div className="text-sm text-gray-500">Total Files</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {state.stats.byStatus?.pending || 0}
            </div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {state.stats.byStatus?.moved || 0}
            </div>
            <div className="text-sm text-gray-500">Moved</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {state.stats.byStatus?.duplicate || 0}
            </div>
            <div className="text-sm text-gray-500">Duplicates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {state.stats.errors || 0}
            </div>
            <div className="text-sm text-gray-500">Errors</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FolderSelector;
