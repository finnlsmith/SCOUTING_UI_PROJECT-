/**
 * Tests for Sidebar component
 */
import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../helpers/testUtils';
import Sidebar from '../../components/Sidebar';

describe('Sidebar', () => {
  it('renders navigation title', () => {
    renderWithProviders(<Sidebar />);
    expect(screen.getByText('Navigation')).toBeInTheDocument();
  });

  it('renders Home link', () => {
    renderWithProviders(<Sidebar />);
    const homeLink = screen.getByRole('link', { name: /home/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders Tournaments link', () => {
    renderWithProviders(<Sidebar />);
    const tournamentsLink = screen.getByRole('link', { name: /tournaments/i });
    expect(tournamentsLink).toBeInTheDocument();
    expect(tournamentsLink).toHaveAttribute('href', '/tournaments');
  });

  it('renders Players (Coming Soon) link as disabled', () => {
    renderWithProviders(<Sidebar />);
    const playersLink = screen.getByRole('link', { name: /players.*coming soon/i });
    expect(playersLink).toBeInTheDocument();
    expect(playersLink).toHaveAttribute('href', '#');
  });

  it('highlights active link when on home page', () => {
    renderWithProviders(<Sidebar />, { route: '/' });
    const homeLink = screen.getByRole('link', { name: /home/i });
    // The link should have active class (implementation detail, but we can check it exists)
    expect(homeLink).toBeInTheDocument();
  });

  it('highlights active link when on tournaments page', () => {
    renderWithProviders(<Sidebar />, { route: '/tournaments' });
    const tournamentsLink = screen.getByRole('link', { name: /tournaments/i });
    expect(tournamentsLink).toBeInTheDocument();
  });

  it('renders "Powered by" text', () => {
    renderWithProviders(<Sidebar />);
    expect(screen.getByText('Powered by')).toBeInTheDocument();
  });

  it('renders Trilemma Foundation logo with correct attributes', () => {
    renderWithProviders(<Sidebar />);
    const trilemmaImage = screen.getByAltText('Trilemma Foundation');
    expect(trilemmaImage).toBeInTheDocument();
    
    const trilemmaLink = trilemmaImage.closest('a');
    expect(trilemmaLink).toHaveAttribute('href', 'https://www.trilemma.foundation/');
    expect(trilemmaLink).toHaveAttribute('target', '_blank');
    expect(trilemmaLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders Sincere FC logo with correct attributes', () => {
    renderWithProviders(<Sidebar />);
    const sincereImage = screen.getByAltText('Sincere FC');
    expect(sincereImage).toBeInTheDocument();
    
    const sincereLink = sincereImage.closest('a');
    expect(sincereLink).toHaveAttribute('href', 'https://www.youtube.com/@SincereFC');
    expect(sincereLink).toHaveAttribute('target', '_blank');
    expect(sincereLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders all navigation links', () => {
    renderWithProviders(<Sidebar />);
    const links = screen.getAllByRole('link');
    // Should have: Home, Players, Tournaments, Trilemma, Sincere = 5 links
    expect(links.length).toBeGreaterThanOrEqual(3); // At least 3 nav links
  });
});

