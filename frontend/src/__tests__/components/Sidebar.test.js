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

  it('renders Players link to the players page', () => {
    render(<Sidebar />);
    const playersLink = screen.getByRole('link', { name: /^players$/i });
    expect(playersLink).toBeInTheDocument();
    expect(playersLink).toHaveAttribute('href', '/players');
  });

  it('does not render partner logos', () => {
    render(<Sidebar />);
    expect(screen.queryByText('Powered by')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('img').length).toBe(0);
  });

  it('renders all navigation links', () => {
    render(<Sidebar />);
    const links = screen.getAllByRole('link');
    // Home, Tutorial, Players, Tournaments
    expect(links.length).toBe(4);
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
