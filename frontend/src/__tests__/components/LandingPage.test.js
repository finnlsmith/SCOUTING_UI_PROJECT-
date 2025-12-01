/**
 * Tests for LandingPage component
 */
import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../helpers/testUtils';

// Mock useNavigate before importing component
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

import LandingPage from '../../components/LandingPage';

describe('LandingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders RoarStats logo', () => {
    renderWithProviders(<LandingPage />);
    const logo = screen.getByAltText('RoarStats Logo');
    expect(logo).toBeInTheDocument();
  });

  it('renders title with beta text', () => {
    renderWithProviders(<LandingPage />);
    expect(screen.getByText(/RoarStats - Nov 2025 Beta/i)).toBeInTheDocument();
  });

  it('renders Tournaments button', () => {
    renderWithProviders(<LandingPage />);
    const tournamentsButton = screen.getByRole('button', { name: /tournaments/i });
    expect(tournamentsButton).toBeInTheDocument();
  });

  it('renders Players (coming soon) button as disabled', () => {
    renderWithProviders(<LandingPage />);
    const playersButton = screen.getByRole('button', { name: /players.*coming soon/i });
    expect(playersButton).toBeInTheDocument();
    expect(playersButton).toBeDisabled();
  });

  it('navigates to tournaments when Tournaments button is clicked', async () => {
    renderWithProviders(<LandingPage />);
    
    const tournamentsButton = screen.getByRole('button', { name: /tournaments/i });
    await userEvent.click(tournamentsButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/tournaments');
  });
});

