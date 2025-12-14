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

  it('renders Meyhar LinkedIn link', () => {
    render(<ContactUsPage />);
    const meyharLink = screen.getByRole('link', { name: /meyhar/i });
    expect(meyharLink).toBeInTheDocument();
    expect(meyharLink).toHaveAttribute('href', 'https://www.linkedin.com/in/meyhar-sharma-b97a78211');
    expect(meyharLink).toHaveAttribute('target', '_blank');
    expect(meyharLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders Stacy LinkedIn link', () => {
    render(<ContactUsPage />);
    const stacyLink = screen.getByRole('link', { name: /stacy/i });
    expect(stacyLink).toBeInTheDocument();
    expect(stacyLink).toHaveAttribute('href', 'https://www.linkedin.com/in/stacyjchang/');
    expect(stacyLink).toHaveAttribute('target', '_blank');
    expect(stacyLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders Zubair LinkedIn link', () => {
    render(<ContactUsPage />);
    const zubairLink = screen.getByRole('link', { name: /zubair/i });
    expect(zubairLink).toBeInTheDocument();
    expect(zubairLink).toHaveAttribute('href', 'https://www.linkedin.com/in/zubair-atha/');
    expect(zubairLink).toHaveAttribute('target', '_blank');
    expect(zubairLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders Finn LinkedIn link', () => {
    render(<ContactUsPage />);
    const finnLink = screen.getByRole('link', { name: /finn/i });
    expect(finnLink).toBeInTheDocument();
    expect(finnLink).toHaveAttribute('href', 'https://www.linkedin.com/in/finn-laister-smith/');
    expect(finnLink).toHaveAttribute('target', '_blank');
    expect(finnLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders all four LinkedIn links', () => {
    render(<ContactUsPage />);
    const links = screen.getAllByRole('link');
    // Should have 4 LinkedIn links
    expect(links.length).toBe(4);
  });

  it('contains message about leaving a message', () => {
    render(<ContactUsPage />);
    expect(screen.getByText(/You can also leave your message below/i)).toBeInTheDocument();
  });

  it('all links have proper security attributes', () => {
    render(<ContactUsPage />);
    const links = screen.getAllByRole('link');
    
    links.forEach(link => {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});

