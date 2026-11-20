/**
 * Tests for ContactUs component
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ContactUsPage from '../../components/ContactUs';

describe('ContactUsPage', () => {
  it('renders Contact Us title', () => {
    render(<ContactUsPage />);
    expect(screen.getByText('Contact Us')).toBeInTheDocument();
  });

  it('renders introductory paragraph', () => {
    render(<ContactUsPage />);
    expect(screen.getByText(/interested to learn more about football statistics/i)).toBeInTheDocument();
  });
});
