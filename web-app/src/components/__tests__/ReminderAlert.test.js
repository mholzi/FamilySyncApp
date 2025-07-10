import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ReminderAlert from '../ReminderAlert';

const mockNotification = {
  id: 'test-reminder',
  eventTitle: 'Soccer Practice',
  eventTime: '15:00',
  childName: 'Emma',
  reminderTime: 15,
  leaveByTime: '14:30'
};

describe('ReminderAlert', () => {
  test('renders notification content correctly', () => {
    const onDismiss = jest.fn();
    const onSnooze = jest.fn();
    
    render(
      <ReminderAlert 
        notification={mockNotification}
        onDismiss={onDismiss}
        onSnooze={onSnooze}
      />
    );
    
    expect(screen.getByText('Soccer Practice')).toBeInTheDocument();
    expect(screen.getByText('Emma')).toBeInTheDocument();
    expect(screen.getByText('🚗 Leave by: 14:30')).toBeInTheDocument();
    expect(screen.getByText('Starting in 15 minutes')).toBeInTheDocument();
  });

  test('calls onDismiss when Got it button is clicked', () => {
    const onDismiss = jest.fn();
    const onSnooze = jest.fn();
    
    render(
      <ReminderAlert 
        notification={mockNotification}
        onDismiss={onDismiss}
        onSnooze={onSnooze}
      />
    );
    
    fireEvent.click(screen.getByText('Got it'));
    expect(onDismiss).toHaveBeenCalled();
  });

  test('calls onSnooze when snooze buttons are clicked', () => {
    const onDismiss = jest.fn();
    const onSnooze = jest.fn();
    
    render(
      <ReminderAlert 
        notification={mockNotification}
        onDismiss={onDismiss}
        onSnooze={onSnooze}
      />
    );
    
    fireEvent.click(screen.getByText('Snooze 5m'));
    expect(onSnooze).toHaveBeenCalledWith(5);
    
    fireEvent.click(screen.getByText('Snooze 10m'));
    expect(onSnooze).toHaveBeenCalledWith(10);
  });
});