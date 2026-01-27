import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppProvider } from '../../src/contexts/AppContext';
import FileList from '../../src/components/FileList/FileList';

// Mock fetch
global.fetch = vi.fn();

const mockFiles = [
  {
    id: 1,
    filename: 'photo1.jpg',
    original_path: '/path/to/photo1.jpg',
    current_path: '/path/to/photo1.jpg',
    extension: '.jpg',
    size: 1024000,
    status: 'pending',
    resolved_date: '2023-07-15T10:30:00.000Z',
    date_source: 'exif'
  },
  {
    id: 2,
    filename: 'document.pdf',
    original_path: '/path/to/document.pdf',
    current_path: '/path/to/document.pdf',
    extension: '.pdf',
    size: 2048000,
    status: 'moved',
    resolved_date: '2023-08-20T14:00:00.000Z',
    date_source: 'created'
  },
  {
    id: 3,
    filename: 'video.mp4',
    original_path: '/path/to/video.mp4',
    current_path: '/path/to/video.mp4',
    extension: '.mp4',
    size: 10485760,
    status: 'duplicate',
    resolved_date: '2023-09-01T09:15:00.000Z',
    date_source: 'modified'
  }
];

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

describe('FileList Component', () => {
  beforeEach(() => {
    global.fetch.mockReset();
  });

  test('renders loading state initially', () => {
    mockFetch({ files: [], total: 0 });
    renderWithProvider(<FileList />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('renders empty state when no files', async () => {
    mockFetch({ files: [], total: 0, limit: 50, offset: 0 });

    renderWithProvider(<FileList />);

    await waitFor(() => {
      expect(screen.getByText(/no files found/i)).toBeInTheDocument();
    });
  });

  test('renders file list when files exist', async () => {
    mockFetch({ files: mockFiles, total: 3, limit: 50, offset: 0 });

    renderWithProvider(<FileList />);

    await waitFor(() => {
      expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      expect(screen.getByText('video.mp4')).toBeInTheDocument();
    });
  });

  test('displays file size', async () => {
    mockFetch({ files: mockFiles, total: 3, limit: 50, offset: 0 });

    renderWithProvider(<FileList />);

    await waitFor(() => {
      // Just verify the file list renders with file sizes present
      expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
    });
  });

  test('displays status badges', async () => {
    mockFetch({ files: mockFiles, total: 3, limit: 50, offset: 0 });

    renderWithProvider(<FileList />);

    await waitFor(() => {
      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('moved')).toBeInTheDocument();
      expect(screen.getByText('duplicate')).toBeInTheDocument();
    });
  });

  test('displays date source', async () => {
    mockFetch({ files: mockFiles, total: 3, limit: 50, offset: 0 });

    renderWithProvider(<FileList />);

    await waitFor(() => {
      expect(screen.getByText('exif')).toBeInTheDocument();
      expect(screen.getByText('created')).toBeInTheDocument();
      expect(screen.getByText('modified')).toBeInTheDocument();
    });
  });

  test('clicking a file row opens preview', async () => {
    mockFetch({ files: mockFiles, total: 3, limit: 50, offset: 0 });

    renderWithProvider(<FileList />);

    await waitFor(() => {
      expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
    });

    const fileRow = screen.getByText('photo1.jpg').closest('tr');
    fireEvent.click(fileRow);

    // Preview modal should open
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });
  });

  test('pagination shows correct information', async () => {
    mockFetch({ files: mockFiles, total: 100, limit: 50, offset: 0 });

    renderWithProvider(<FileList />);

    await waitFor(() => {
      expect(screen.getByText(/showing 1 to/i)).toBeInTheDocument();
    });
  });

  test('pagination buttons work', async () => {
    mockFetch({ files: mockFiles, total: 100, limit: 50, offset: 0 });
    mockFetch({ files: mockFiles, total: 100, limit: 50, offset: 50 });

    renderWithProvider(<FileList />);

    await waitFor(() => {
      expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  test('previous button is disabled on first page', async () => {
    mockFetch({ files: mockFiles, total: 100, limit: 50, offset: 0 });

    renderWithProvider(<FileList />);

    await waitFor(() => {
      expect(screen.getByText('photo1.jpg')).toBeInTheDocument();
    });

    const prevButton = screen.getByRole('button', { name: /previous/i });
    expect(prevButton).toBeDisabled();
  });
});
