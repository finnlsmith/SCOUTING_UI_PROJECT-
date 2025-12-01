/**
 * Tests for TournamentsPage component
 */
import React from 'react';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../../contexts/ThemeContext';
import TournamentsPage from '../../components/TournamentsPage';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderTournamentsPage = () => {
  localStorage.setItem('theme', 'light');
  const Wrapper = ({ children }) => (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
  return render(<TournamentsPage />, { wrapper: Wrapper });
};

describe('TournamentsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders page title', () => {
    renderTournamentsPage();
    expect(screen.getByText('Select a Tournament')).toBeInTheDocument();
  });

  it('renders Euro 2020 button', () => {
    renderTournamentsPage();
    const euroButton = screen.getByRole('button', { name: /euro 2020/i });
    expect(euroButton).toBeInTheDocument();
  });

  it('renders "More tournaments coming soon" text', () => {
    renderTournamentsPage();
    expect(screen.getByText(/More tournaments coming soon/i)).toBeInTheDocument();
  });

  it('renders Euro 2020 image', () => {
    renderTournamentsPage();
    const euroImage = screen.getByAltText('Euro 2020');
    expect(euroImage).toBeInTheDocument();
  });

  it('navigates to euro-2020 when Euro 2020 button is clicked', async () => {
    renderTournamentsPage();
    const euroButton = screen.getByRole('button', { name: /euro 2020/i });
    await userEvent.click(euroButton);
    expect(mockNavigate).toHaveBeenCalledWith('/euro-2020');
  });
});
