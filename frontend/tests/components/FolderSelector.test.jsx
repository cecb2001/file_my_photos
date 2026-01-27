import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppProvider } from '../../src/contexts/AppContext';
import FolderSelector from '../../src/components/FolderSelector/FolderSelector';

// Mock fetch
global.fetch = vi.fn();

function mockFetch(response) {
  global.fetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(response)
  });
}

function renderWithProvider(component) {
  return render(
    <AppProvider>
      {component}
    </AppProvider>
  );
}

describe('FolderSelector Component', () => {
  beforeEach(() => {
    global.fetch.mockReset();
  });

  test('renders source folder input', () => {
    renderWithProvider(<FolderSelector />);
    expect(screen.getByPlaceholderText(/source/i)).toBeInTheDocument();
  });

  test('renders destination folder input', () => {
    renderWithProvider(<FolderSelector />);
    expect(screen.getByPlaceholderText(/destination/i)).toBeInTheDocument();
  });

  test('renders Scan Folder button', () => {
    renderWithProvider(<FolderSelector />);
    expect(screen.getByRole('button', { name: /scan folder/i })).toBeInTheDocument();
  });

  test('renders dry run checkbox', () => {
    renderWithProvider(<FolderSelector />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getAllByText(/dry run/i).length).toBeGreaterThan(0);
  });

  test('dry run is checked by default', () => {
    renderWithProvider(<FolderSelector />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  test('scan button is disabled when source path is empty', () => {
    renderWithProvider(<FolderSelector />);
    const scanButton = screen.getByRole('button', { name: /scan folder/i });
    expect(scanButton).toBeDisabled();
  });

  test('scan button is enabled when source path is entered', () => {
    renderWithProvider(<FolderSelector />);
    const sourceInput = screen.getByPlaceholderText(/source/i);
    fireEvent.change(sourceInput, { target: { value: '/test/path' } });

    const scanButton = screen.getByRole('button', { name: /scan folder/i });
    expect(scanButton).not.toBeDisabled();
  });

  test('clicking scan button triggers API call', async () => {
    mockFetch({ message: 'Scan started', sessionId: 1 });
    mockFetch({ status: 'completed', totalFiles: 0 });
    mockFetch({ files: [], total: 0 });
    mockFetch({ total: 0, byStatus: {}, errors: 0 });

    renderWithProvider(<FolderSelector />);

    const sourceInput = screen.getByPlaceholderText(/source/i);
    fireEvent.change(sourceInput, { target: { value: '/test/path' } });

    const scanButton = screen.getByRole('button', { name: /scan folder/i });
    fireEvent.click(scanButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/scan'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  test('button shows "Scanning..." while scan is in progress', async () => {
    mockFetch({ message: 'Scan started', sessionId: 1 });

    renderWithProvider(<FolderSelector />);

    const sourceInput = screen.getByPlaceholderText(/source/i);
    fireEvent.change(sourceInput, { target: { value: '/test/path' } });

    const scanButton = screen.getByRole('button', { name: /scan folder/i });
    fireEvent.click(scanButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /scanning/i })).toBeInTheDocument();
    });
  });

  test('toggling dry run checkbox updates state', () => {
    renderWithProvider(<FolderSelector />);
    const checkbox = screen.getByRole('checkbox');

    expect(checkbox).toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});
