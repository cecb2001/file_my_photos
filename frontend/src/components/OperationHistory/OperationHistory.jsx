import React, { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import * as api from '../../api/client';

function OperationHistory() {
  const { state, actions } = useApp();
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchOperations, setBatchOperations] = useState([]);
  const [isReverting, setIsReverting] = useState(false);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      const result = await api.getOperationBatches(20);
      setBatches(result.batches || []);
    } catch (error) {
      console.error('Error loading batches:', error);
    }
  };

  const loadBatchOperations = async (batchId) => {
    try {
      const result = await api.getOperationsByBatch(batchId);
      setBatchOperations(result.operations || []);
      setSelectedBatch(batchId);
    } catch (error) {
      console.error('Error loading batch operations:', error);
    }
  };

  const handleRevertBatch = async (batchId) => {
    const confirmed = window.confirm(
      'This will revert all operations in this batch, moving files back to their original locations. Continue?'
    );
    if (!confirmed) return;

    setIsReverting(true);
    try {
      await api.revertBatch(batchId);
      await loadBatches();
      if (selectedBatch === batchId) {
        await loadBatchOperations(batchId);
      }
      actions.fetchFiles();
      actions.fetchStats();
    } catch (error) {
      console.error('Error reverting batch:', error);
      alert(`Failed to revert: ${error.message}`);
    } finally {
      setIsReverting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getOperationIcon = (type) => {
    const icons = {
      scan: '🔍',
      move: '📦',
      skip: '⏭️',
      duplicate: '📋',
      error: '❌',
      revert: '↩️'
    };
    return icons[type] || '📄';
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-4">Operation History</h2>

      <div className="flex gap-6">
        {/* Batch list */}
        <div className="w-1/3">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Batches</h3>
          {batches.length === 0 ? (
            <p className="text-sm text-gray-500">No operations recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {batches.map((batch) => (
                <div
                  key={batch.batch_id}
                  onClick={() => loadBatchOperations(batch.batch_id)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedBatch === batch.batch_id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {getOperationIcon(batch.operation_type)} {batch.operation_type}
                    </span>
                    <span className="text-xs text-gray-500">{batch.count} ops</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatDate(batch.started_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Operations detail */}
        <div className="flex-1">
          {selectedBatch ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">
                  Operations in Batch
                </h3>
                <button
                  onClick={() => handleRevertBatch(selectedBatch)}
                  disabled={isReverting}
                  className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
                >
                  {isReverting ? 'Reverting...' : 'Revert Batch'}
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Source
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Destination
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {batchOperations.map((op) => (
                      <tr key={op.id}>
                        <td className="px-3 py-2 text-sm">
                          {getOperationIcon(op.operation_type)} {op.operation_type}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 truncate max-w-xs">
                          {op.source_path}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 truncate max-w-xs">
                          {op.destination_path || '-'}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              op.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : op.status === 'reverted'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {op.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-500">
              Select a batch to view operations
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OperationHistory;
