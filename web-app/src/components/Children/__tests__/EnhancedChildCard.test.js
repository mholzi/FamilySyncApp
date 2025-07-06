import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedChildCard from '../EnhancedChildCard';

// Mock Firebase Timestamp
const mockTimestamp = (date) => ({
  toDate: () => new Date(date)
});

describe('EnhancedChildCard', () => {
  const mockChild = {
    id: 'child-1',
    name: 'Emma Johnson',
    dateOfBirth: mockTimestamp('2021-03-15T10:00:00Z'), // ~2.5 years old
    profilePictureUrl: 'https://example.com/emma.jpg'
  };

  // Use future dates to ensure events are not filtered out
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const mockEvents = [
    {
      id: 'event-1',
      title: 'Lunch',
      startTime: mockTimestamp(new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 12, 30).toISOString()),
      childIds: ['child-1']
    },
    {
      id: 'event-2', 
      title: 'Nap Time',
      startTime: mockTimestamp(new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 13, 0).toISOString()),
      childIds: ['child-1']
    },
    {
      id: 'event-3',
      title: 'Playground',
      startTime: mockTimestamp(new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 15, 0).toISOString()),
      childIds: ['child-1', 'child-2']
    }
  ];

  const defaultProps = {
    child: mockChild,
    upcomingEvents: mockEvents,
    onEditChild: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders child information correctly', () => {
    render(<EnhancedChildCard {...defaultProps} />);
    
    expect(screen.getByText('Emma Johnson')).toBeInTheDocument();
    expect(screen.getByAltText('Emma Johnson profile')).toBeInTheDocument();
  });

  test('displays next activities in correct format', () => {
    render(<EnhancedChildCard {...defaultProps} />);
    
    expect(screen.getByText('Next Activities')).toBeInTheDocument();
    expect(screen.getByText('Lunch')).toBeInTheDocument();
    expect(screen.getByText('Nap Time')).toBeInTheDocument();
    expect(screen.getByText('12:30')).toBeInTheDocument();
    expect(screen.getByText('13:00')).toBeInTheDocument();
    
    // Should show arrow between activities
    expect(screen.getByText('→')).toBeInTheDocument();
  });

  test('shows only next 2 events', () => {
    render(<EnhancedChildCard {...defaultProps} />);
    
    // Should show Lunch and Nap Time, but not Playground
    expect(screen.getByText('Lunch')).toBeInTheDocument();
    expect(screen.getByText('Nap Time')).toBeInTheDocument();
    expect(screen.queryByText('Playground')).not.toBeInTheDocument();
  });

  test('handles child with no profile picture', () => {
    const childWithoutPhoto = { ...mockChild, profilePictureUrl: null };
    render(<EnhancedChildCard {...defaultProps} child={childWithoutPhoto} />);
    
    // Should show initials
    expect(screen.getByText('EJ')).toBeInTheDocument();
    expect(screen.queryByAltText('Emma Johnson profile')).not.toBeInTheDocument();
  });

  test('handles broken profile picture', () => {
    render(<EnhancedChildCard {...defaultProps} />);
    
    // Initially shows image
    const img = screen.getByAltText('Emma Johnson profile');
    expect(img).toBeInTheDocument();
    
    // Simulate image error
    fireEvent.error(img);
    
    // Should show initials after error
    expect(screen.getByText('EJ')).toBeInTheDocument();
    expect(screen.queryByAltText('Emma Johnson profile')).not.toBeInTheDocument();
  });

  test('displays no activities message when no events', () => {
    render(<EnhancedChildCard {...defaultProps} upcomingEvents={[]} />);
    
    expect(screen.getByText('No scheduled activities')).toBeInTheDocument();
    expect(screen.getByText('✨')).toBeInTheDocument();
  });

  test('filters events by childIds correctly', () => {
    const eventsForOtherChild = [
      {
        id: 'event-other',
        title: 'Other Activity',
        startTime: mockTimestamp(new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 11, 0).toISOString()),
        childIds: ['child-2'] // Different child
      }
    ];
    
    render(<EnhancedChildCard {...defaultProps} upcomingEvents={eventsForOtherChild} />);
    
    expect(screen.getByText('No scheduled activities')).toBeInTheDocument();
    expect(screen.queryByText('Other Activity')).not.toBeInTheDocument();
  });



  test('handles Edit button click', () => {
    render(<EnhancedChildCard {...defaultProps} />);
    
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);
    
    expect(defaultProps.onEditChild).toHaveBeenCalledWith(mockChild);
  });

  test('displays current status indicator', () => {
    render(<EnhancedChildCard {...defaultProps} />);
    
    // Should show some status (Active, Activity soon, etc.)
    const statusElements = screen.getAllByText(/Active|Activity soon|Free time/);
    expect(statusElements.length).toBeGreaterThan(0);
  });

  test('applies age-appropriate theming for toddlers', () => {
    render(<EnhancedChildCard {...defaultProps} />);
    
    const card = screen.getByText('Emma Johnson').closest('div[style*="border-left"]');
    
    // Should have orange-themed colors for toddlers (2-5 years)
    expect(card).toHaveStyle('border-left: 4px solid #FF9800');
  });

  test('formats time correctly', () => {
    render(<EnhancedChildCard {...defaultProps} />);
    
    // Should display time in 24-hour format
    expect(screen.getByText('12:30')).toBeInTheDocument();
    expect(screen.getByText('13:00')).toBeInTheDocument();
  });
});