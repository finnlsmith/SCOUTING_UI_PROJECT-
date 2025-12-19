/**
 * Tests for AboutPage component
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import AboutPage from '../../components/AboutPage';

describe('AboutPage', () => {
  it('renders About title', () => {
    render(<AboutPage />);
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('renders project description paragraphs', () => {
    render(<AboutPage />);
    
    expect(screen.getByText(/Every match tells a story/i)).toBeInTheDocument();
    expect(screen.getByText(/Columbia University Data Science/i)).toBeInTheDocument();
    expect(screen.getByText(/Trilemma Foundation/i)).toBeInTheDocument();
    expect(screen.getByText(/beautiful game from a whole new perspective/i)).toBeInTheDocument();
  });

  it('renders UCI logo', () => {
    render(<AboutPage />);
    const uciLogo = screen.getByAltText('UCI');
    expect(uciLogo).toBeInTheDocument();
  });

  it('renders Columbia University logo', () => {
    render(<AboutPage />);
    const columbiaLogo = screen.getByAltText('Columbia University');
    expect(columbiaLogo).toBeInTheDocument();
  });

  it('renders NYU logo', () => {
    render(<AboutPage />);
    const nyuLogo = screen.getByAltText('NYU');
    expect(nyuLogo).toBeInTheDocument();
  });

  it('renders all three university logos', () => {
    render(<AboutPage />);
    const logos = screen.getAllByRole('img');
    expect(logos.length).toBe(3);
  });

  it('contains text about capstone project', () => {
    render(<AboutPage />);
    expect(screen.getByText(/capstone project/i)).toBeInTheDocument();
  });

  it('contains text about partnership', () => {
    render(<AboutPage />);
    expect(screen.getByText(/partnership with the Trilemma Foundation/i)).toBeInTheDocument();
  });
});

