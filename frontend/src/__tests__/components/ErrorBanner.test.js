/**
 * Tests for ErrorBanner component
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBanner from '../../components/ErrorBanner';

describe('ErrorBanner', () => {
  it('renders nothing when error is not provided', () => {
    const { container } = render(<ErrorBanner error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when error is empty string', () => {
    const { container } = render(<ErrorBanner error="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders error message when error is provided', () => {
    render(<ErrorBanner error="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders close button with correct aria-label', () => {
    render(<ErrorBanner error="Test error" />);
    const closeButton = screen.getByLabelText('Dismiss error');
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveTextContent('×');
  });

  it('calls onClose when close button is clicked', async () => {
    const handleClose = jest.fn();
    
    render(<ErrorBanner error="Test error" onClose={handleClose} />);
    
    const closeButton = screen.getByLabelText('Dismiss error');
    await userEvent.click(closeButton);
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('displays multiple error messages correctly', () => {
    const errorMessage = "Failed to load match data. Please try again.";
    render(<ErrorBanner error={errorMessage} />);
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('handles long error messages', () => {
    const longError = "This is a very long error message that might wrap to multiple lines and should still be displayed correctly in the error banner component.";
    render(<ErrorBanner error={longError} />);
    
    expect(screen.getByText(longError)).toBeInTheDocument();
  });
});

