/**
 * Tests for LandingPage component
 */
import React from 'react';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../../contexts/ThemeContext';
import LandingPage from '../../components/LandingPage';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderLandingPage = () => {
  localStorage.setItem('theme', 'light');
  const Wrapper = ({ children }) => (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
  return render(<LandingPage />, { wrapper: Wrapper });
};

describe('LandingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders the app title', () => {
    renderLandingPage();
    expect(screen.getByText('Sincere FC Scouting UI')).toBeInTheDocument();
  });

  it('renders Tournaments button', () => {
    renderLandingPage();
    const tournamentsButton = screen.getByRole('button', { name: /tournaments/i });
    expect(tournamentsButton).toBeInTheDocument();
  });

  it('renders Players button and navigates to the players page', async () => {
    renderLandingPage();
    const playersButton = screen.getByRole('button', { name: /^players$/i });
    expect(playersButton).toBeEnabled();
    await userEvent.click(playersButton);
    expect(mockNavigate).toHaveBeenCalledWith('/players');
  });

  it('navigates to tournaments when Tournaments button is clicked', async () => {
    renderLandingPage();
    const tournamentsButton = screen.getByRole('button', { name: /tournaments/i });
    await userEvent.click(tournamentsButton);
    expect(mockNavigate).toHaveBeenCalledWith('/tournaments');
  });
});
