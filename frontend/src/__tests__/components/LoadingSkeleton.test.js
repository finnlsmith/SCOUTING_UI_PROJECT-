/**
 * Tests for LoadingSkeleton component
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSkeleton, { PlotSkeleton, TextSkeleton, ButtonSkeleton, CardSkeleton } from '../../components/LoadingSkeleton';

describe('LoadingSkeleton', () => {
  describe('Default LoadingSkeleton', () => {
    it('renders TextSkeleton by default', () => {
      const { container } = render(<LoadingSkeleton />);
      const skeleton = container.querySelector('.skeleton-text');
      expect(skeleton).toBeInTheDocument();
    });

    it('renders PlotSkeleton when type is "plot"', () => {
      render(<LoadingSkeleton type="plot" />);
      expect(screen.getByText('Loading visualization...')).toBeInTheDocument();
    });

    it('renders ButtonSkeleton when type is "button"', () => {
      const { container } = render(<LoadingSkeleton type="button" />);
      const skeleton = container.querySelector('.skeleton-button');
      expect(skeleton).toBeInTheDocument();
    });

    it('renders CardSkeleton when type is "card"', () => {
      const { container } = render(<LoadingSkeleton type="card" />);
      const skeleton = container.querySelector('.skeleton-card');
      expect(skeleton).toBeInTheDocument();
    });

    it('renders TextSkeleton when type is "text"', () => {
      const { container } = render(<LoadingSkeleton type="text" />);
      const skeleton = container.querySelector('.skeleton-text');
      expect(skeleton).toBeInTheDocument();
    });

    it('passes props to TextSkeleton', () => {
      const { container } = render(
        <LoadingSkeleton type="text" width="200px" height="20px" />
      );
      const skeleton = container.querySelector('.skeleton-text');
      expect(skeleton).toHaveStyle({ width: '200px', height: '20px' });
    });
  });

  describe('PlotSkeleton', () => {
    it('renders plot skeleton with loading message', () => {
      render(<PlotSkeleton />);
      expect(screen.getByText('Loading visualization...')).toBeInTheDocument();
    });

    it('has correct CSS classes', () => {
      const { container } = render(<PlotSkeleton />);
      const skeleton = container.querySelector('.skeleton-plot');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('TextSkeleton', () => {
    it('renders with default dimensions', () => {
      const { container } = render(<TextSkeleton />);
      const skeleton = container.querySelector('.skeleton-text');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveStyle({ width: '100%', height: '1em' });
    });

    it('renders with custom width and height', () => {
      const { container } = render(
        <TextSkeleton width="50%" height="2em" />
      );
      const skeleton = container.querySelector('.skeleton-text');
      expect(skeleton).toHaveStyle({ width: '50%', height: '2em' });
    });
  });

  describe('ButtonSkeleton', () => {
    it('renders button skeleton', () => {
      const { container } = render(<ButtonSkeleton />);
      const skeleton = container.querySelector('.skeleton-button');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('CardSkeleton', () => {
    it('renders card skeleton with multiple text skeletons', () => {
      const { container } = render(<CardSkeleton />);
      const cardSkeleton = container.querySelector('.skeleton-card');
      expect(cardSkeleton).toBeInTheDocument();
      
      // Should contain multiple TextSkeleton components
      const textSkeletons = container.querySelectorAll('.skeleton-text');
      expect(textSkeletons.length).toBeGreaterThan(0);
    });
  });
});

