/**
 * Test utilities for React Testing Library
 */
import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../contexts/ThemeContext';

/**
 * Custom render function that includes all providers
 * Use this instead of the default render from @testing-library/react
 */
export function renderWithProviders(ui, { route = '/', theme = 'light', ...renderOptions } = {}) {
  // Clear and set theme in localStorage before rendering
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
    if (theme) {
      localStorage.setItem('theme', theme);
    }
  }
  
  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={[route]}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Render component with router only (no theme provider)
 */
export function renderWithRouter(ui, { route = '/' } = {}) {
  function Wrapper({ children }) {
    return <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>;
  }

  return render(ui, { wrapper: Wrapper });
}

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Mock match data for testing
 */
export const mockMatches = [
  {
    file: 'events_3788741.csv',
    label: '2021-07-11 - Italy vs England – Events'
  },
  {
    file: 'events_3788742.csv',
    label: '2021-07-07 - Spain vs Italy – Events'
  },
  {
    file: 'frames_360_3788741.csv',
    label: '2021-07-11 - Italy vs England – Frames 360'
  }
];

/**
 * Mock match stats for testing
 */
export const mockMatchStats = {
  home_team: 'Italy',
  away_team: 'England',
  home_score: 1,
  away_score: 1,
  competition_stage: 'Final',
  home_shots: 19,
  away_shots: 6,
  home_shots_on_target: 6,
  away_shots_on_target: 2,
  home_xg_sum: 1.2,
  away_xg_sum: 0.5
};

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

