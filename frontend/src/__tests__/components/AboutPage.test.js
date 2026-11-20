/**
 * Tests for AboutPage component
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import AboutPage from '../../components/AboutPage';

describe('AboutPage', () => {
  it('renders About title', () => {
    render(<AboutPage />);
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('renders project description paragraphs', () => {
    render(<AboutPage />);
    expect(screen.getByText(/Every match tells a story/i)).toBeInTheDocument();
    expect(screen.getByText(/Sincere FC Scouting UI/i)).toBeInTheDocument();
    expect(screen.getByText(/beautiful game from a whole new perspective/i)).toBeInTheDocument();
  });

  it('renders no logos', () => {
    render(<AboutPage />);
    expect(screen.queryAllByRole('img').length).toBe(0);
  });
});
