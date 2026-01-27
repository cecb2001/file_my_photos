import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppProvider } from '../../src/contexts/AppContext';
import FilterPanel from '../../src/components/FilterPanel/FilterPanel';

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ files: [], total: 0 })
  })
);

function renderWithProvider(component) {
  return render(
    <AppProvider>
      {component}
    </AppProvider>
  );
}

describe('FilterPanel Component', () => {
  beforeEach(() => {
    global.fetch.mockClear();
  });

  test('renders Filters heading', () => {
    renderWithProvider(<FilterPanel />);
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  test('renders status label', () => {
    renderWithProvider(<FilterPanel />);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  test('renders file type label', () => {
    renderWithProvider(<FilterPanel />);
    expect(screen.getByText('File Type')).toBeInTheDocument();
  });

  test('renders date range label', () => {
    renderWithProvider(<FilterPanel />);
    expect(screen.getByText('Date Range')).toBeInTheDocument();
  });

  test('renders file size label', () => {
    renderWithProvider(<FilterPanel />);
    expect(screen.getByText('File Size')).toBeInTheDocument();
  });

  test('renders All option in dropdowns', () => {
    renderWithProvider(<FilterPanel />);
    const allOptions = screen.getAllByText('All');
    expect(allOptions.length).toBe(2); // Status and File Type
  });

  test('renders status options', () => {
    renderWithProvider(<FilterPanel />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Moved')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  test('renders file type options', () => {
    renderWithProvider(<FilterPanel />);
    expect(screen.getByText('Images')).toBeInTheDocument();
    expect(screen.getByText('Videos')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
  });

  test('renders quick size filter buttons', () => {
    renderWithProvider(<FilterPanel />);
    expect(screen.getByText('>1MB')).toBeInTheDocument();
    expect(screen.getByText('>10MB')).toBeInTheDocument();
  });

  test('changing a filter triggers search', async () => {
    renderWithProvider(<FilterPanel />);

    // Find the first select (Status)
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);

    fireEvent.change(selects[0], { target: { value: 'pending' } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  test('quick size filter triggers search', async () => {
    renderWithProvider(<FilterPanel />);

    const quickFilter = screen.getByText('>1MB');
    fireEvent.click(quickFilter);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
