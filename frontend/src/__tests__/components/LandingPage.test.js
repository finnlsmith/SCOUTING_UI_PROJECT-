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

  it('renders RoarStats logo', () => {
    renderLandingPage();
    const logo = screen.getByAltText('RoarStats Logo');
    expect(logo).toBeInTheDocument();
  });

  it('renders title with beta text', () => {
    renderLandingPage();
    expect(screen.getByText(/RoarStats - Nov 2025 Beta/i)).toBeInTheDocument();
  });

  it('renders Tournaments button', () => {
    renderLandingPage();
    const tournamentsButton = screen.getByRole('button', { name: /tournaments/i });
    expect(tournamentsButton).toBeInTheDocument();
  });

  it('renders Players (coming soon) button as disabled', () => {
    renderLandingPage();
    const playersButton = screen.getByRole('button', { name: /players.*coming soon/i });
    expect(playersButton).toBeInTheDocument();
    expect(playersButton).toBeDisabled();
  });

  it('navigates to tournaments when Tournaments button is clicked', async () => {
    renderLandingPage();
    const tournamentsButton = screen.getByRole('button', { name: /tournaments/i });
    await userEvent.click(tournamentsButton);
    expect(mockNavigate).toHaveBeenCalledWith('/tournaments');
  });
});
