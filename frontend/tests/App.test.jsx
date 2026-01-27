import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App';

// Mock fetch for API calls
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ files: [], total: 0 })
  })
);

describe('App', () => {
  test('renders the application title', () => {
    render(<App />);
    expect(screen.getByText('File My Photos')).toBeInTheDocument();
  });

  test('renders the folder selector section', () => {
    render(<App />);
    expect(screen.getByText('Source Folder')).toBeInTheDocument();
    expect(screen.getByText('Destination Folder')).toBeInTheDocument();
  });

  test('renders navigation tabs', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /files/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /duplicates/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /history/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /errors/i })).toBeInTheDocument();
  });

  test('renders scan button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /scan folder/i })).toBeInTheDocument();
  });
});
