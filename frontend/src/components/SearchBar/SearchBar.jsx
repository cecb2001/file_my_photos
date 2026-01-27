import React, { useState, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';

function SearchBar() {
  const { state, actions } = useApp();
  const [localQuery, setLocalQuery] = useState(state.searchQuery);

  // Debounce search
  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const debouncedSearch = useCallback(
    debounce((query) => {
      actions.setSearchQuery(query);
      actions.searchFiles(query, state.filters);
    }, 300),
    [state.filters]
  );

  const handleChange = (e) => {
    const query = e.target.value;
    setLocalQuery(query);
    debouncedSearch(query);
  };

  const handleClear = () => {
    setLocalQuery('');
    actions.setSearchQuery('');
    actions.fetchFiles();
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg
          className="h-5 w-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        type="text"
        value={localQuery}
        onChange={handleChange}
        placeholder="Search files by name or path..."
        className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />
      {localQuery && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default SearchBar;
