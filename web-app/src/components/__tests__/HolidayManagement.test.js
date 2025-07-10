import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HolidayManagement from '../HolidayManagement';

const mockHolidays = [
  {
    id: 'holiday-1',
    name: 'Summer Holidays',
    startDate: '2025-07-01',
    endDate: '2025-08-31',
    type: 'school',
    childId: 'child-1'
  }
];

describe('HolidayManagement', () => {
  test('renders existing holidays correctly', () => {
    const onSave = jest.fn();
    
    render(
      <HolidayManagement 
        childId="child-1"
        holidays={mockHolidays}
        onSave={onSave}
      />
    );
    
    expect(screen.getByText('Summer Holidays')).toBeInTheDocument();
    expect(screen.getByText('Jul 1 - Aug 31, 2025')).toBeInTheDocument();
    expect(screen.getByText('62 days')).toBeInTheDocument();
  });

  test('shows empty state when no holidays', () => {
    const onSave = jest.fn();
    
    render(
      <HolidayManagement 
        childId="child-1"
        holidays={[]}
        onSave={onSave}
      />
    );
    
    expect(screen.getByText('No holidays added yet')).toBeInTheDocument();
    expect(screen.getByText('+ Add Holiday')).toBeInTheDocument();
  });

  test('shows add form when add button is clicked', () => {
    const onSave = jest.fn();
    
    render(
      <HolidayManagement 
        childId="child-1"
        holidays={[]}
        onSave={onSave}
      />
    );
    
    fireEvent.click(screen.getByText('+ Add Holiday'));
    
    expect(screen.getByText('Add School Holiday')).toBeInTheDocument();
    expect(screen.getByLabelText('Holiday Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
  });

  test('adds new holiday when form is submitted', () => {
    const onSave = jest.fn();
    
    render(
      <HolidayManagement 
        childId="child-1"
        holidays={[]}
        onSave={onSave}
      />
    );
    
    // Open add form
    fireEvent.click(screen.getByText('+ Add Holiday'));
    
    // Fill form
    fireEvent.change(screen.getByLabelText('Holiday Name'), {
      target: { value: 'Christmas Break' }
    });
    fireEvent.change(screen.getByLabelText('Start Date'), {
      target: { value: '2025-12-20' }
    });
    fireEvent.change(screen.getByLabelText('End Date'), {
      target: { value: '2025-01-06' }
    });
    
    // Submit form
    fireEvent.click(screen.getByText('Add Holiday'));
    
    expect(onSave).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Christmas Break',
          startDate: '2025-12-20',
          endDate: '2025-01-06',
          type: 'school',
          childId: 'child-1'
        })
      ])
    );
  });
});