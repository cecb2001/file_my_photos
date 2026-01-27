import React from 'react';
import { useApp } from '../../contexts/AppContext';

function FilterPanel() {
  const { state, actions } = useApp();

  const handleFilterChange = (key, value) => {
    const newFilters = { ...state.filters, [key]: value || null };
    actions.setFilters(newFilters);
    actions.searchFiles(state.searchQuery, newFilters);
  };

  const clearFilters = () => {
    actions.setFilters({
      status: null,
      type: null,
      dateFrom: null,
      dateTo: null,
      minSize: null,
      maxSize: null
    });
    actions.fetchFiles();
  };

  const hasActiveFilters = Object.values(state.filters).some(v => v !== null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Status filter */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Status
        </label>
        <select
          value={state.filters.status || ''}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="block w-full border border-gray-300 rounded-md py-1.5 px-2 text-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="moved">Moved</option>
          <option value="duplicate">Duplicate</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Type filter */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          File Type
        </label>
        <select
          value={state.filters.type || ''}
          onChange={(e) => handleFilterChange('type', e.target.value)}
          className="block w-full border border-gray-300 rounded-md py-1.5 px-2 text-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
          <option value="document">Documents</option>
        </select>
      </div>

      {/* Date range */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Date Range
        </label>
        <div className="space-y-2">
          <input
            type="date"
            value={state.filters.dateFrom || ''}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="block w-full border border-gray-300 rounded-md py-1.5 px-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="From"
          />
          <input
            type="date"
            value={state.filters.dateTo || ''}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="block w-full border border-gray-300 rounded-md py-1.5 px-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="To"
          />
        </div>
      </div>

      {/* Size filter */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          File Size
        </label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={state.filters.minSize || ''}
              onChange={(e) => handleFilterChange('minSize', e.target.value)}
              className="block w-full border border-gray-300 rounded-md py-1.5 px-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Min (bytes)"
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={state.filters.maxSize || ''}
              onChange={(e) => handleFilterChange('maxSize', e.target.value)}
              className="block w-full border border-gray-300 rounded-md py-1.5 px-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Max (bytes)"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Quick:
          <button
            onClick={() => handleFilterChange('minSize', 1024 * 1024)}
            className="ml-1 text-blue-600 hover:underline"
          >
            {'>1MB'}
          </button>
          <button
            onClick={() => handleFilterChange('minSize', 10 * 1024 * 1024)}
            className="ml-1 text-blue-600 hover:underline"
          >
            {'>10MB'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default FilterPanel;
