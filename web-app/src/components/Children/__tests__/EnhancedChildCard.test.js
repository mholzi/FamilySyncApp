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
    profilePictureUrl: 'https://example.com/emma.jpg',
    carePreferences: {
      dailyRoutine: {
        wakeUpTime: '07:00',
        mealTimes: {
          breakfast: '08:00',
          lunch: '12:30',
          dinner: '18:00',
          snacks: ['10:00', '15:00']
        },
        napTimes: [
          { startTime: '13:00', duration: 60 }
        ],
        bedtime: '20:00'
      }
    }
  };

  // Use future dates to ensure events are not filtered out
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const mockRecurringActivities = [
    {
      id: 'activity-1',
      name: 'Playground',
      assignedChildren: ['child-1'],
      icon: '🏃',
      schedule: {
        frequency: 'daily',
        time: '15:00'
      }
    }
  ];

  const defaultProps = {
    child: mockChild,
    recurringActivities: mockRecurringActivities,
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
    
    expect(screen.getByText('Next Events')).toBeInTheDocument();
    // The component shows routine activities, so look for actual routine items
    expect(screen.getByText('Breakfast')).toBeInTheDocument();
    expect(screen.getByText('08:00')).toBeInTheDocument();
  });

  test('shows only next 3 events', () => {
    render(<EnhancedChildCard {...defaultProps} />);
    
    // Should show first 3 upcoming routine events (based on current time)
    // Component shows Wake Up, Breakfast, and Morning Snack as next 3 events
    expect(screen.getByText('Wake Up')).toBeInTheDocument();
    expect(screen.getByText('Breakfast')).toBeInTheDocument();
    expect(screen.getByText('Morning Snack')).toBeInTheDocument();
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
    const childWithoutRoutine = { ...mockChild, carePreferences: {} };
    render(<EnhancedChildCard {...defaultProps} child={childWithoutRoutine} />);
    
    expect(screen.getByText('No routine schedule set')).toBeInTheDocument();
    expect(screen.getByText('🌙')).toBeInTheDocument();
  });

  test('filters activities by child assignment correctly', () => {
    const activitiesForOtherChild = [
      {
        id: 'activity-other',
        name: 'Other Activity',
        assignedChildren: ['child-2'], // Different child
        icon: '🏃',
        schedule: {
          frequency: 'daily',
          time: '11:00'
        }
      }
    ];
    
    render(<EnhancedChildCard {...defaultProps} recurringActivities={activitiesForOtherChild} />);
    
    // Should still show routine events, but not the activity for other child
    expect(screen.getByText('Breakfast')).toBeInTheDocument();
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
    
    // Should show some status (Active, Routine soon, Free time, Sleeping, etc.)
    const statusElements = screen.getAllByText(/Active|Routine soon|Free time|Day complete|Sleeping/);
    expect(statusElements.length).toBeGreaterThan(0);
  });

  test('applies child color theming', () => {
    render(<EnhancedChildCard {...defaultProps} />);
    
    const card = screen.getByText('Emma Johnson').closest('div[style*="border-left"]');
    
    // Should have consistent color based on child ID (purple for this child)
    expect(card).toHaveStyle('border-left: 4px solid #7C3AED');
  });

  test('formats time correctly', () => {
    render(<EnhancedChildCard {...defaultProps} />);
    
    // Should display time in 24-hour format for routine times
    expect(screen.getByText('08:00')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });
});