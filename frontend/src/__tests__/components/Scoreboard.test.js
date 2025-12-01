/**
 * Tests for Scoreboard component
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import Scoreboard from '../../components/Scoreboard';

describe('Scoreboard', () => {
  const defaultProps = {
    home: 'Italy',
    away: 'England',
    score: '1 - 1',
    shots: '19 - 6',
    shotsOnTarget: '6 - 2',
    xg: '1.2 - 0.5',
    stage: 'Final'
  };

  it('renders nothing when home team is missing', () => {
    const { container } = render(<Scoreboard {...defaultProps} home={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when away team is missing', () => {
    const { container } = render(<Scoreboard {...defaultProps} away={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders team names correctly', () => {
    render(<Scoreboard {...defaultProps} />);
    expect(screen.getByText('Italy')).toBeInTheDocument();
    expect(screen.getByText('England')).toBeInTheDocument();
  });

  it('renders stage when provided', () => {
    render(<Scoreboard {...defaultProps} stage="Final" />);
    expect(screen.getByText('Final')).toBeInTheDocument();
  });

  it('does not render stage when not provided', () => {
    render(<Scoreboard {...defaultProps} stage={null} />);
    expect(screen.queryByText('Final')).not.toBeInTheDocument();
  });

  it('renders score correctly', () => {
    render(<Scoreboard {...defaultProps} score="2 - 1" />);
    expect(screen.getByText('Goals')).toBeInTheDocument();
    // Use getAllByText since numbers appear multiple times
    const scores = screen.getAllByText('2');
    const ones = screen.getAllByText('1');
    expect(scores.length).toBeGreaterThan(0);
    expect(ones.length).toBeGreaterThan(0);
  });

  it('displays "-" when score is not provided', () => {
    render(<Scoreboard {...defaultProps} score={null} />);
    const dashElements = screen.getAllByText('-');
    expect(dashElements.length).toBeGreaterThan(0);
  });

  it('renders shots statistics', () => {
    render(<Scoreboard {...defaultProps} shots="19 - 6" />);
    expect(screen.getByText('Shots')).toBeInTheDocument();
    // Use getAllByText since numbers appear multiple times
    const nineteens = screen.getAllByText('19');
    const sixes = screen.getAllByText('6');
    expect(nineteens.length).toBeGreaterThan(0);
    expect(sixes.length).toBeGreaterThan(0);
  });

  it('renders shots on target statistics', () => {
    render(<Scoreboard {...defaultProps} shotsOnTarget="6 - 2" />);
    expect(screen.getByText('Shots on Target')).toBeInTheDocument();
    // Use getAllByText since numbers appear multiple times
    const sixes = screen.getAllByText('6');
    const twos = screen.getAllByText('2');
    expect(sixes.length).toBeGreaterThan(0);
    expect(twos.length).toBeGreaterThan(0);
  });

  it('renders xG statistics', () => {
    render(<Scoreboard {...defaultProps} xg="1.2 - 0.5" />);
    expect(screen.getByText('xG')).toBeInTheDocument();
    expect(screen.getByText('1.2')).toBeInTheDocument();
    expect(screen.getByText('0.5')).toBeInTheDocument();
  });

  it('renders big chances statistics', () => {
    render(<Scoreboard {...defaultProps} bigChances="3 - 1" />);
    expect(screen.getByText('Big Chances (≥ 0.27 xG)')).toBeInTheDocument();
    // Use getAllByText since numbers appear multiple times
    const threes = screen.getAllByText('3');
    const ones = screen.getAllByText('1');
    expect(threes.length).toBeGreaterThan(0);
    expect(ones.length).toBeGreaterThan(0);
  });

  it('renders OK chances statistics', () => {
    render(<Scoreboard {...defaultProps} okChances="5 - 2" />);
    expect(screen.getByText('OK Chances (0.08–0.27 xG)')).toBeInTheDocument();
    // Use getAllByText since numbers appear multiple times
    const fives = screen.getAllByText('5');
    const twos = screen.getAllByText('2');
    expect(fives.length).toBeGreaterThan(0);
    expect(twos.length).toBeGreaterThan(0);
  });

  it('renders box entries statistics', () => {
    render(<Scoreboard {...defaultProps} boxEntries="12 - 8" />);
    expect(screen.getByText('Opp. Box Entries')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders fouls statistics', () => {
    render(<Scoreboard {...defaultProps} fouls="10 - 8" />);
    expect(screen.getByText('Fouls Committed')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders cards statistics', () => {
    render(<Scoreboard {...defaultProps} cardsLeft="2 (1/1)" cardsRight="1 (1/0)" />);
    expect(screen.getByText('Cards (yellow/red)')).toBeInTheDocument();
    expect(screen.getByText('2 (1/1)')).toBeInTheDocument();
    expect(screen.getByText('1 (1/0)')).toBeInTheDocument();
  });

  it('displays "-" for cards when not provided', () => {
    render(<Scoreboard {...defaultProps} cardsLeft={null} cardsRight={null} />);
    const dashElements = screen.getAllByText('-');
    expect(dashElements.length).toBeGreaterThan(0);
  });

  it('handles all statistics together', () => {
    const fullProps = {
      ...defaultProps,
      bigChances: '3 - 1',
      okChances: '5 - 2',
      boxEntries: '12 - 8',
      fouls: '10 - 8',
      cardsLeft: '2 (1/1)',
      cardsRight: '1 (1/0)'
    };
    
    render(<Scoreboard {...fullProps} />);
    
    // Verify all sections are present
    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('Shots')).toBeInTheDocument();
    expect(screen.getByText('Shots on Target')).toBeInTheDocument();
    expect(screen.getByText('xG')).toBeInTheDocument();
    expect(screen.getByText('Big Chances (≥ 0.27 xG)')).toBeInTheDocument();
    expect(screen.getByText('OK Chances (0.08–0.27 xG)')).toBeInTheDocument();
    expect(screen.getByText('Opp. Box Entries')).toBeInTheDocument();
    expect(screen.getByText('Fouls Committed')).toBeInTheDocument();
    expect(screen.getByText('Cards (yellow/red)')).toBeInTheDocument();
  });
});

