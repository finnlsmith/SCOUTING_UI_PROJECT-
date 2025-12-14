/**
 * Tests for Layout component
 */
import React from 'react';
import { screen, render } from '@testing-library/react';
import { ThemeProvider } from '../../contexts/ThemeContext';
import Layout from '../../components/Layout';

// Mock react-router-dom
const mockLocation = { pathname: '/' };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => mockLocation,
  Link: ({ to, children, className, ...props }) => (
    <a href={to} className={className} {...props}>
      {children}
    </a>
  ),
}));

const renderLayout = (children) => {
  localStorage.setItem('theme', 'light');
  const Wrapper = ({ children: wrapperChildren }) => (
    <ThemeProvider>
      {wrapperChildren}
    </ThemeProvider>
  );
  return render(<Layout>{children}</Layout>, { wrapper: Wrapper });
};

describe('Layout', () => {
  beforeEach(() => {
    localStorage.clear();
    mockLocation.pathname = '/';
  });

  it('renders children content', () => {
    renderLayout(<div>Test Content</div>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders Sidebar component', () => {
    renderLayout(<div>Content</div>);
    // Sidebar should render Navigation title
    expect(screen.getByText('Navigation')).toBeInTheDocument();
  });

  it('renders ThemeToggle component', () => {
    renderLayout(<div>Content</div>);
    // ThemeToggle should render a button (there may be multiple buttons from Sidebar)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('renders footer with About link', () => {
    renderLayout(<div>Content</div>);
    const aboutLink = screen.getByRole('link', { name: /about/i });
    expect(aboutLink).toBeInTheDocument();
    expect(aboutLink).toHaveAttribute('href', '/about');
  });

  it('renders footer with Contact Us link', () => {
    renderLayout(<div>Content</div>);
    const contactLink = screen.getByRole('link', { name: /contact us/i });
    expect(contactLink).toBeInTheDocument();
    expect(contactLink).toHaveAttribute('href', '/contact');
  });

  it('renders both footer links', () => {
    renderLayout(<div>Content</div>);
    const footerLinks = screen.getAllByRole('link');
    const aboutLink = footerLinks.find(link => link.textContent === 'About');
    const contactLink = footerLinks.find(link => link.textContent === 'Contact Us');
    
    expect(aboutLink).toBeInTheDocument();
    expect(contactLink).toBeInTheDocument();
  });
});
