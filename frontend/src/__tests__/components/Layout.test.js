/**
 * Tests for Layout component
 */
import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../helpers/testUtils';
import Layout from '../../components/Layout';

describe('Layout', () => {
  it('renders children content', () => {
    renderWithProviders(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders Sidebar component', () => {
    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    // Sidebar should render Navigation title
    expect(screen.getByText('Navigation')).toBeInTheDocument();
  });

  it('renders ThemeToggle component', () => {
    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    // ThemeToggle should render a button (there may be multiple buttons from Sidebar)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders footer with About link', () => {
    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    const aboutLink = screen.getByRole('link', { name: /about/i });
    expect(aboutLink).toBeInTheDocument();
    expect(aboutLink).toHaveAttribute('href', '/about');
  });

  it('renders footer with Contact Us link', () => {
    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    const contactLink = screen.getByRole('link', { name: /contact us/i });
    expect(contactLink).toBeInTheDocument();
    expect(contactLink).toHaveAttribute('href', '/contact');
  });

  it('renders both footer links', () => {
    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    const footerLinks = screen.getAllByRole('link');
    const aboutLink = footerLinks.find(link => link.textContent === 'About');
    const contactLink = footerLinks.find(link => link.textContent === 'Contact Us');
    
    expect(aboutLink).toBeInTheDocument();
    expect(contactLink).toBeInTheDocument();
  });
});

