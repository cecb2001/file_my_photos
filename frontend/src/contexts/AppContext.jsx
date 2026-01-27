import React, { createContext, useContext, useReducer, useCallback } from 'react';
import * as api from '../api/client';

// Initial state
const initialState = {
  // Files state
  files: [],
  totalFiles: 0,
  filesLoading: false,
  filesError: null,

  // Scan state
  scanStatus: null,
  scanProgress: null,

  // Organize state
  organizeStatus: null,
  organizeProgress: null,

  // Search/Filter state
  searchQuery: '',
  filters: {
    status: null,
    type: null,
    dateFrom: null,
    dateTo: null,
    minSize: null,
    maxSize: null
  },

  // Operations history
  operations: [],
  operationsLoading: false,

  // Stats
  stats: null,

  // Selected files
  selectedFiles: [],

  // Current paths
  sourcePath: '',
  destinationPath: ''
};

// Action types
const ActionTypes = {
  SET_FILES: 'SET_FILES',
  SET_FILES_LOADING: 'SET_FILES_LOADING',
  SET_FILES_ERROR: 'SET_FILES_ERROR',
  SET_SCAN_STATUS: 'SET_SCAN_STATUS',
  SET_ORGANIZE_STATUS: 'SET_ORGANIZE_STATUS',
  SET_SEARCH_QUERY: 'SET_SEARCH_QUERY',
  SET_FILTERS: 'SET_FILTERS',
  SET_OPERATIONS: 'SET_OPERATIONS',
  SET_STATS: 'SET_STATS',
  SET_SELECTED_FILES: 'SET_SELECTED_FILES',
  SET_SOURCE_PATH: 'SET_SOURCE_PATH',
  SET_DESTINATION_PATH: 'SET_DESTINATION_PATH',
  RESET_STATE: 'RESET_STATE'
};

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_FILES:
      return {
        ...state,
        files: action.payload.files,
        totalFiles: action.payload.total,
        filesLoading: false,
        filesError: null
      };
    case ActionTypes.SET_FILES_LOADING:
      return { ...state, filesLoading: action.payload };
    case ActionTypes.SET_FILES_ERROR:
      return { ...state, filesError: action.payload, filesLoading: false };
    case ActionTypes.SET_SCAN_STATUS:
      return { ...state, scanStatus: action.payload };
    case ActionTypes.SET_ORGANIZE_STATUS:
      return { ...state, organizeStatus: action.payload };
    case ActionTypes.SET_SEARCH_QUERY:
      return { ...state, searchQuery: action.payload };
    case ActionTypes.SET_FILTERS:
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case ActionTypes.SET_OPERATIONS:
      return { ...state, operations: action.payload };
    case ActionTypes.SET_STATS:
      return { ...state, stats: action.payload };
    case ActionTypes.SET_SELECTED_FILES:
      return { ...state, selectedFiles: action.payload };
    case ActionTypes.SET_SOURCE_PATH:
      return { ...state, sourcePath: action.payload };
    case ActionTypes.SET_DESTINATION_PATH:
      return { ...state, destinationPath: action.payload };
    case ActionTypes.RESET_STATE:
      return initialState;
    default:
      return state;
  }
}

// Context
const AppContext = createContext(null);

// Provider component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // File actions
  const fetchFiles = useCallback(async (options = {}) => {
    dispatch({ type: ActionTypes.SET_FILES_LOADING, payload: true });
    try {
      const result = await api.getFiles(options);
      dispatch({ type: ActionTypes.SET_FILES, payload: result });
    } catch (error) {
      dispatch({ type: ActionTypes.SET_FILES_ERROR, payload: error.message });
    }
  }, []);

  const searchFiles = useCallback(async (query, filters = {}) => {
    dispatch({ type: ActionTypes.SET_FILES_LOADING, payload: true });
    try {
      const result = await api.searchFiles({ query, ...filters });
      dispatch({ type: ActionTypes.SET_FILES, payload: result });
    } catch (error) {
      dispatch({ type: ActionTypes.SET_FILES_ERROR, payload: error.message });
    }
  }, []);

  // Scan actions
  const startScan = useCallback(async (sourcePath, recursive = true) => {
    try {
      const result = await api.startScan(sourcePath, recursive);
      dispatch({ type: ActionTypes.SET_SCAN_STATUS, payload: { status: 'in_progress', ...result } });
      return result;
    } catch (error) {
      dispatch({ type: ActionTypes.SET_SCAN_STATUS, payload: { status: 'error', error: error.message } });
      throw error;
    }
  }, []);

  const fetchScanStatus = useCallback(async () => {
    try {
      const result = await api.getScanStatus();
      dispatch({ type: ActionTypes.SET_SCAN_STATUS, payload: result });
      return result;
    } catch (error) {
      console.error('Error fetching scan status:', error);
    }
  }, []);

  // Organize actions
  const startOrganize = useCallback(async (destinationPath, dryRun = false, fileIds = null) => {
    try {
      const result = await api.startOrganize(destinationPath, dryRun, fileIds);
      dispatch({ type: ActionTypes.SET_ORGANIZE_STATUS, payload: { status: 'in_progress', ...result } });
      return result;
    } catch (error) {
      dispatch({ type: ActionTypes.SET_ORGANIZE_STATUS, payload: { status: 'error', error: error.message } });
      throw error;
    }
  }, []);

  const fetchOrganizeStatus = useCallback(async () => {
    try {
      const result = await api.getOrganizeStatus();
      dispatch({ type: ActionTypes.SET_ORGANIZE_STATUS, payload: result });
      return result;
    } catch (error) {
      console.error('Error fetching organize status:', error);
    }
  }, []);

  // Stats actions
  const fetchStats = useCallback(async () => {
    try {
      const result = await api.getStats();
      dispatch({ type: ActionTypes.SET_STATS, payload: result });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Operations actions
  const fetchOperations = useCallback(async (options = {}) => {
    try {
      const result = await api.getOperations(options);
      dispatch({ type: ActionTypes.SET_OPERATIONS, payload: result.operations });
    } catch (error) {
      console.error('Error fetching operations:', error);
    }
  }, []);

  // Filter actions
  const setSearchQuery = useCallback((query) => {
    dispatch({ type: ActionTypes.SET_SEARCH_QUERY, payload: query });
  }, []);

  const setFilters = useCallback((filters) => {
    dispatch({ type: ActionTypes.SET_FILTERS, payload: filters });
  }, []);

  // Path actions
  const setSourcePath = useCallback((path) => {
    dispatch({ type: ActionTypes.SET_SOURCE_PATH, payload: path });
  }, []);

  const setDestinationPath = useCallback((path) => {
    dispatch({ type: ActionTypes.SET_DESTINATION_PATH, payload: path });
  }, []);

  // Selection actions
  const setSelectedFiles = useCallback((files) => {
    dispatch({ type: ActionTypes.SET_SELECTED_FILES, payload: files });
  }, []);

  const value = {
    state,
    actions: {
      fetchFiles,
      searchFiles,
      startScan,
      fetchScanStatus,
      startOrganize,
      fetchOrganizeStatus,
      fetchStats,
      fetchOperations,
      setSearchQuery,
      setFilters,
      setSourcePath,
      setDestinationPath,
      setSelectedFiles
    }
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook to use the context
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
