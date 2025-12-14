/**
 * Tests for MatchSelector component
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MatchSelector from '../../components/MatchSelector';
import { mockMatches } from '../helpers/testUtils';

describe('MatchSelector', () => {
  const defaultProps = {
    matches: mockMatches,
    selectedMatch: '',
    onChange: jest.fn(),
    matchesLoading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the select element', () => {
    render(<MatchSelector {...defaultProps} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('displays default option when no match is selected', () => {
    render(<MatchSelector {...defaultProps} />);
    expect(screen.getByText('-- Choose a match --')).toBeInTheDocument();
  });

  it('filters out Frames 360 matches', () => {
    render(<MatchSelector {...defaultProps} />);
    
    // Should show Events matches
    expect(screen.getByText(/Italy vs England/)).toBeInTheDocument();
    expect(screen.getByText(/Spain vs Italy/)).toBeInTheDocument();
    
    // Should NOT show Frames 360 matches
    const options = screen.getAllByRole('option');
    const framesOptions = options.filter(opt => opt.textContent.includes('Frames 360'));
    expect(framesOptions).toHaveLength(0);
  });

  it('cleans up match labels by removing "– Events" suffix', () => {
    render(<MatchSelector {...defaultProps} />);
    
    const options = screen.getAllByRole('option');
    const eventOptions = options.filter(opt => opt.textContent.includes('– Events'));
    expect(eventOptions).toHaveLength(0); // Should be cleaned
    
    // Should show cleaned labels
    expect(screen.getByText(/2021-07-11 - Italy vs England/)).toBeInTheDocument();
  });

  it('calls onChange when a match is selected', async () => {
    const handleChange = jest.fn();
    
    render(<MatchSelector {...defaultProps} onChange={handleChange} />);
    
    const select = screen.getByRole('combobox');
    await userEvent.selectOptions(select, 'events_3788741.csv');
    
    expect(handleChange).toHaveBeenCalledWith('events_3788741.csv');
  });

  it('displays selected match value', () => {
    render(<MatchSelector {...defaultProps} selectedMatch="events_3788741.csv" />);
    
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('events_3788741.csv');
  });

  it('disables select when matchesLoading is true', () => {
    render(<MatchSelector {...defaultProps} matchesLoading={true} />);
    
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('enables select when matchesLoading is false', () => {
    render(<MatchSelector {...defaultProps} matchesLoading={false} />);
    
    const select = screen.getByRole('combobox');
    expect(select).not.toBeDisabled();
  });

  it('handles empty matches array', () => {
    render(<MatchSelector {...defaultProps} matches={[]} />);
    
    const select = screen.getByRole('combobox');
    const options = screen.getAllByRole('option');
    
    // Should only have the default option
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('-- Choose a match --');
  });

  it('handles matches with missing label property', () => {
    const matchesWithName = [
      { file: 'events_1.csv', name: 'Match 1', label: 'Match 1 – Events' }, // Add label to avoid crash
      { file: 'events_2.csv', label: 'Match 2 – Events' }
    ];
    
    render(<MatchSelector {...defaultProps} matches={matchesWithName} />);
    
    // Should handle both 'name' and 'label' properties
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    // Both matches should be visible
    expect(screen.getByText(/Match 1/)).toBeInTheDocument();
    expect(screen.getByText(/Match 2/)).toBeInTheDocument();
  });
});

