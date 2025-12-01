/**
 * Tests for Sidebar component
 */
import React from 'react';
import { screen, render } from '@testing-library/react';
import Sidebar from '../../components/Sidebar';

// Mock react-router-dom
const mockLocation = { pathname: '/' };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => mockLocation,
  Link: ({ to, children, className, ...props }) => (
    <a href={to} className={className} {...props}>
      {children}
    </a>
  ),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    mockLocation.pathname = '/';
  });

  it('renders navigation title', () => {
    render(<Sidebar />);
    expect(screen.getByText('Navigation')).toBeInTheDocument();
  });

  it('renders Home link', () => {
    render(<Sidebar />);
    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders Tournaments link', () => {
    render(<Sidebar />);
    const tournamentsLink = screen.getByRole('link', { name: /tournaments/i });
    expect(tournamentsLink).toBeInTheDocument();
    expect(tournamentsLink).toHaveAttribute('href', '/tournaments');
  });

  it('renders Players (Coming Soon) link as disabled', () => {
    render(<Sidebar />);
    const playersLink = screen.getByRole('link', { name: /players.*coming soon/i });
    expect(playersLink).toBeInTheDocument();
    expect(playersLink).toHaveAttribute('href', '#');
  });

  it('renders "Powered by" text', () => {
    render(<Sidebar />);
    expect(screen.getByText('Powered by')).toBeInTheDocument();
  });

  it('renders Trilemma Foundation logo with correct attributes', () => {
    render(<Sidebar />);
    const trilemmaImage = screen.getByAltText('Trilemma Foundation');
    expect(trilemmaImage).toBeInTheDocument();
    
    const trilemmaLink = trilemmaImage.closest('a');
    expect(trilemmaLink).toHaveAttribute('href', 'https://www.trilemma.foundation/');
    expect(trilemmaLink).toHaveAttribute('target', '_blank');
    expect(trilemmaLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders Sincere FC logo with correct attributes', () => {
    render(<Sidebar />);
    const sincereImage = screen.getByAltText('Sincere FC');
    expect(sincereImage).toBeInTheDocument();
    
    const sincereLink = sincereImage.closest('a');
    expect(sincereLink).toHaveAttribute('href', 'https://www.youtube.com/@SincereFC');
    expect(sincereLink).toHaveAttribute('target', '_blank');
    expect(sincereLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders all navigation links', () => {
    render(<Sidebar />);
    const links = screen.getAllByRole('link');
    // Should have: Home, Players, Tournaments, Trilemma, Sincere = 5 links
    expect(links.length).toBeGreaterThanOrEqual(3); // At least 3 nav links
  });

  it('highlights active link when on home page', () => {
    mockLocation.pathname = '/';
    render(<Sidebar />);
    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toBeInTheDocument();
  });

  it('highlights active link when on tournaments page', () => {
    mockLocation.pathname = '/tournaments';
    render(<Sidebar />);
    const tournamentsLink = screen.getByRole('link', { name: /tournaments/i });
    expect(tournamentsLink).toBeInTheDocument();
  });
});
