import React, { useState, useEffect } from 'react';
import { AppProvider } from './contexts/AppContext';
import Layout from './components/Layout/Layout';
import FolderSelector from './components/FolderSelector/FolderSelector';
import FileList from './components/FileList/FileList';
import SearchBar from './components/SearchBar/SearchBar';
import FilterPanel from './components/FilterPanel/FilterPanel';
import OperationHistory from './components/OperationHistory/OperationHistory';
import ProgressIndicator from './components/ProgressIndicator/ProgressIndicator';

function App() {
  const [activeTab, setActiveTab] = useState('files');

  return (
    <AppProvider>
      <Layout>
        <div className="min-h-screen bg-gray-100">
          {/* Header */}
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
              <h1 className="text-3xl font-bold text-gray-900">
                File My Photos
              </h1>
              <p className="text-gray-600 mt-1">
                Organize your files by date, detect duplicates, and keep everything in order.
              </p>
            </div>
          </header>

          {/* Progress indicator for active operations */}
          <ProgressIndicator />

          {/* Main content */}
          <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            {/* Folder selector */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <FolderSelector />
            </div>

            {/* Navigation tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('files')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'files'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Files
                </button>
                <button
                  onClick={() => setActiveTab('duplicates')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'duplicates'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Duplicates
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'history'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  History
                </button>
                <button
                  onClick={() => setActiveTab('errors')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'errors'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Errors
                </button>
              </nav>
            </div>

            {/* Tab content */}
            <div className="bg-white rounded-lg shadow">
              {activeTab === 'files' && (
                <div>
                  <div className="p-4 border-b">
                    <SearchBar />
                  </div>
                  <div className="flex">
                    <div className="w-64 border-r p-4">
                      <FilterPanel />
                    </div>
                    <div className="flex-1 p-4">
                      <FileList />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'duplicates' && (
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Duplicate Files
                  </h2>
                  <p className="text-gray-500">
                    Files with identical content will be shown here after scanning.
                  </p>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="p-6">
                  <OperationHistory />
                </div>
              )}

              {activeTab === 'errors' && (
                <div className="p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Errors
                  </h2>
                  <p className="text-gray-500">
                    Files that could not be processed will be shown here.
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>
      </Layout>
    </AppProvider>
  );
}

export default App;
