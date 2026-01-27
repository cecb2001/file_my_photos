import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppProvider } from '../../src/contexts/AppContext';
import SearchBar from '../../src/components/SearchBar/SearchBar';

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

describe('SearchBar Component', () => {
  beforeEach(() => {
    global.fetch.mockClear();
  });

  test('renders search input', () => {
    renderWithProvider(<SearchBar />);
    expect(screen.getByPlaceholderText(/search files/i)).toBeInTheDocument();
  });

  test('input accepts text', () => {
    renderWithProvider(<SearchBar />);
    const input = screen.getByPlaceholderText(/search files/i);

    fireEvent.change(input, { target: { value: 'photo' } });
    expect(input.value).toBe('photo');
  });

  test('clear button appears when text is entered', () => {
    renderWithProvider(<SearchBar />);
    const input = screen.getByPlaceholderText(/search files/i);

    // Initially no clear button
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'photo' } });

    // Clear button should appear
    const clearButton = screen.getByRole('button');
    expect(clearButton).toBeInTheDocument();
  });

  test('clear button clears input', () => {
    renderWithProvider(<SearchBar />);
    const input = screen.getByPlaceholderText(/search files/i);

    fireEvent.change(input, { target: { value: 'photo' } });
    expect(input.value).toBe('photo');

    const clearButton = screen.getByRole('button');
    fireEvent.click(clearButton);

    expect(input.value).toBe('');
  });

  test('input value changes on typing', () => {
    renderWithProvider(<SearchBar />);
    const input = screen.getByPlaceholderText(/search files/i);

    fireEvent.change(input, { target: { value: 'photo' } });

    expect(input.value).toBe('photo');
  });
});
