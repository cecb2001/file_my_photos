import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';

function FolderSelector() {
  const { state, actions } = useApp();
  const [localSourcePath, setLocalSourcePath] = useState(state.sourcePath);
  const [localDestPath, setLocalDestPath] = useState(state.destinationPath);
  const [isScanning, setIsScanning] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [error, setError] = useState(null);

  // Check if File System Access API is supported
  const isFileSystemAccessSupported = 'showDirectoryPicker' in window;

  const handleBrowseSource = async () => {
    console.log('Browse source clicked');
    setError(null);

    if (!isFileSystemAccessSupported) {
      setError('Folder picker not supported in this browser. Please type the path manually.');
      return;
    }

    try {
      const dirHandle = await window.showDirectoryPicker({
        mode: 'read'
      });
      console.log('Selected directory:', dirHandle.name);
      // Note: We can't get the full path from the handle for security reasons
      // We'll need to ask the user to confirm or type the full path
      const fullPath = prompt(
        `Selected folder: "${dirHandle.name}"\n\nPlease enter the full path to this folder:`,
        `/Users/${dirHandle.name}`
      );
      if (fullPath) {
        setLocalSourcePath(fullPath);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error selecting folder:', err);
        setError('Failed to select folder: ' + err.message);
      }
    }
  };

  const handleBrowseDest = async () => {
    console.log('Browse destination clicked');
    setError(null);

    if (!isFileSystemAccessSupported) {
      setError('Folder picker not supported in this browser. Please type the path manually.');
      return;
    }

    try {
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      console.log('Selected directory:', dirHandle.name);
      const fullPath = prompt(
        `Selected folder: "${dirHandle.name}"\n\nPlease enter the full path to this folder:`,
        `/Users/${dirHandle.name}`
      );
      if (fullPath) {
        setLocalDestPath(fullPath);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error selecting folder:', err);
        setError('Failed to select folder: ' + err.message);
      }
    }
  };

  const handleScan = async () => {
    console.log('Scan button clicked, path:', localSourcePath);
    setError(null);

    if (!localSourcePath.trim()) {
      setError('Please enter a source folder path');
      return;
    }

    setIsScanning(true);
    actions.setSourcePath(localSourcePath);

    try {
      console.log('Starting scan for:', localSourcePath);
      await actions.startScan(localSourcePath, true);
      console.log('Scan started successfully, beginning polling');

      // Start polling for status
      const pollInterval = setInterval(async () => {
        const status = await actions.fetchScanStatus();
        console.log('Scan status:', status);
        if (status.status === 'completed' || status.status === 'error' || status.status === 'idle') {
          clearInterval(pollInterval);
          setIsScanning(false);
          if (status.status === 'error') {
            setError('Scan failed: ' + (status.error || 'Unknown error'));
          }
          actions.fetchFiles();
          actions.fetchStats();
        }
      }, 1000);
    } catch (err) {
      console.error('Scan failed:', err);
      setError('Scan failed: ' + err.message);
      setIsScanning(false);
    }
  };

  const handleOrganize = async () => {
    console.log('Organize button clicked, path:', localDestPath, 'dryRun:', dryRun);
    setError(null);

    if (!localDestPath.trim()) {
      setError('Please enter a destination folder path');
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
      console.log('Starting organize to:', localDestPath);
      await actions.startOrganize(localDestPath, dryRun);
      console.log('Organize started successfully, beginning polling');

      // Start polling for status
      const pollInterval = setInterval(async () => {
        const status = await actions.fetchOrganizeStatus();
        console.log('Organize status:', status);
        if (status.status === 'completed' || status.status === 'error' || status.status === 'idle') {
          clearInterval(pollInterval);
          setIsOrganizing(false);
          if (status.status === 'error') {
            setError('Organize failed: ' + (status.error || 'Unknown error'));
          }
          actions.fetchFiles();
          actions.fetchStats();
        }
      }, 1000);
    } catch (err) {
      console.error('Organize failed:', err);
      setError('Organize failed: ' + err.message);
      setIsOrganizing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Browser support notice */}
      {!isFileSystemAccessSupported && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md text-sm">
          Folder picker not available. Please type the full folder path manually.
        </div>
      )}

      {/* Source folder */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Source Folder
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={localSourcePath}
            onChange={(e) => setLocalSourcePath(e.target.value)}
            placeholder="/path/to/source/folder (e.g., /Users/yourname/Photos)"
            className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isScanning}
          />
          {isFileSystemAccessSupported && (
            <button
              type="button"
              onClick={handleBrowseSource}
              disabled={isScanning}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Browse...
            </button>
          )}
          <button
            type="button"
            onClick={handleScan}
            disabled={isScanning || !localSourcePath.trim()}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              isScanning || !localSourcePath.trim()
                ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isScanning ? 'Scanning...' : 'Scan Folder'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {localSourcePath.trim()
            ? 'Click "Scan Folder" to scan this directory'
            : 'Enter the full path to the folder you want to scan'}
        </p>
      </div>

      {/* Destination folder */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Destination Folder
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={localDestPath}
            onChange={(e) => setLocalDestPath(e.target.value)}
            placeholder="/path/to/destination/folder (e.g., /Users/yourname/Organized)"
            className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isOrganizing}
          />
          {isFileSystemAccessSupported && (
            <button
              type="button"
              onClick={handleBrowseDest}
              disabled={isOrganizing}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Browse...
            </button>
          )}
          <label className="flex items-center space-x-2 whitespace-nowrap">
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
            type="button"
            onClick={handleOrganize}
            disabled={isOrganizing || !localDestPath.trim()}
            className={`px-6 py-2 rounded-md font-medium transition-colors whitespace-nowrap ${
              isOrganizing || !localDestPath.trim()
                ? 'bg-gray-400 cursor-not-allowed text-gray-200'
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
