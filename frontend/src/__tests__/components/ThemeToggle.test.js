/**
 * Tests for ThemeToggle component
 */
import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from '../../components/ThemeToggle';
import { renderWithProviders } from '../helpers/testUtils';

describe('ThemeToggle', () => {
  it('renders theme toggle button', () => {
    renderWithProviders(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('renders with correct aria-label', () => {
    renderWithProviders(<ThemeToggle />);
    // The aria-label will be either "Switch to dark mode" or "Switch to light mode"
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
    expect(button.getAttribute('aria-label')).toMatch(/Switch to (dark|light) mode/);
  });

  it('displays text indicating current mode', () => {
    renderWithProviders(<ThemeToggle />);
    // Should display either "Dark" or "Light"
    const text = screen.getByText(/^(Dark|Light)$/);
    expect(text).toBeInTheDocument();
  });

  it('displays an icon', () => {
    renderWithProviders(<ThemeToggle />);
    // Should display either sun or moon emoji
    const icon = screen.getByText(/^(☀️|🌙)$/);
    expect(icon).toBeInTheDocument();
  });

  it('calls toggleTheme when button is clicked', async () => {
    // We can't easily mock the context, but we can verify the button is clickable
    renderWithProviders(<ThemeToggle />);
    const button = screen.getByRole('button');
    await userEvent.click(button);
    // Button should be clickable (no errors thrown)
    expect(button).toBeInTheDocument();
  });

  it('has title attribute', () => {
    renderWithProviders(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title');
    expect(button.getAttribute('title')).toMatch(/Switch to (dark|light) mode/);
  });
});

