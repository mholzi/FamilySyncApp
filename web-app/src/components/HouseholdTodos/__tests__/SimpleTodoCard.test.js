import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimpleTodoCard from '../SimpleTodoCard';
import { completeHouseholdTodo } from '../../../utils/householdTodosUtils';

// Mock the Firebase utilities
jest.mock('../../../utils/householdTodosUtils', () => ({
  completeHouseholdTodo: jest.fn()
}));

// Mock Firebase Timestamp
const mockTimestamp = {
  toDate: () => new Date('2023-12-25T10:00:00Z')
};

describe('SimpleTodoCard', () => {
  const mockTodo = {
    id: 'test-todo-1',
    title: 'Test Todo',
    description: 'This is a test todo',
    status: 'pending',
    category: 'cleaning',
    dueDate: mockTimestamp,
    estimatedTime: 30
  };

  const defaultProps = {
    todo: mockTodo,
    userRole: 'aupair',
    familyId: 'test-family',
    userId: 'test-user',
    onToggleComplete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders todo card with basic information', () => {
    render(<SimpleTodoCard {...defaultProps} />);
    
    expect(screen.getByText('Test Todo')).toBeInTheDocument();
    expect(screen.getByText('This is a test todo')).toBeInTheDocument();
    expect(screen.getByText('cleaning')).toBeInTheDocument();
    expect(screen.getByText('30m')).toBeInTheDocument();
    expect(screen.getByText('Mark Done')).toBeInTheDocument();
  });

  test('displays completed todo correctly', () => {
    const completedTodo = { ...mockTodo, status: 'completed' };
    render(<SimpleTodoCard {...defaultProps} todo={completedTodo} />);
    
    expect(screen.getByText('✓ Done')).toBeInTheDocument();
    // The title should have line-through styling when completed
    const title = screen.getByText('Test Todo');
    expect(title).toHaveStyle('text-decoration: line-through');
  });

  test('displays overdue todo with proper styling', () => {
    const overdueTodo = {
      ...mockTodo,
      status: 'overdue',
      dueDate: { toDate: () => new Date('2023-12-20T10:00:00Z') } // Past date
    };
    render(<SimpleTodoCard {...defaultProps} todo={overdueTodo} />);
    
    // Find the outermost card container
    const cardContainer = screen.getByText('Test Todo').closest('div[style*="border-left"]');
    expect(cardContainer).toHaveStyle('border-left: 4px solid #ef4444');
  });

  test('handles todo completion', async () => {
    completeHouseholdTodo.mockResolvedValue();
    
    render(<SimpleTodoCard {...defaultProps} />);
    
    const doneButton = screen.getByText('Mark Done');
    fireEvent.click(doneButton);
    
    await waitFor(() => {
      expect(completeHouseholdTodo).toHaveBeenCalledWith(
        'test-family',
        'test-todo-1',
        { notes: 'Completed via dashboard' },
        'test-user'
      );
    });
    
    expect(defaultProps.onToggleComplete).toHaveBeenCalledWith('test-todo-1', 'completed');
  });

  test('shows loading state when completing todo', async () => {
    completeHouseholdTodo.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<SimpleTodoCard {...defaultProps} />);
    
    const doneButton = screen.getByText('Mark Done');
    fireEvent.click(doneButton);
    
    expect(screen.getByText('...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Mark Done')).toBeInTheDocument();
    });
  });

  test('formats due dates correctly', () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayTodo = {
      ...mockTodo,
      dueDate: { toDate: () => today }
    };
    
    const { rerender } = render(<SimpleTodoCard {...defaultProps} todo={todayTodo} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    
    const tomorrowTodo = {
      ...mockTodo,
      dueDate: { toDate: () => tomorrow }
    };
    
    rerender(<SimpleTodoCard {...defaultProps} todo={tomorrowTodo} />);
    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
  });

  test('formats estimated time correctly', () => {
    const { rerender } = render(<SimpleTodoCard {...defaultProps} />);
    expect(screen.getByText('30m')).toBeInTheDocument();
    
    const longTodo = { ...mockTodo, estimatedTime: 90 };
    rerender(<SimpleTodoCard {...defaultProps} todo={longTodo} />);
    expect(screen.getByText('1h 30m')).toBeInTheDocument();
    
    const hourTodo = { ...mockTodo, estimatedTime: 120 };
    rerender(<SimpleTodoCard {...defaultProps} todo={hourTodo} />);
    expect(screen.getByText('2h')).toBeInTheDocument();
  });

  test('handles error during todo completion', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    completeHouseholdTodo.mockRejectedValue(new Error('Firebase error'));
    
    render(<SimpleTodoCard {...defaultProps} />);
    
    const doneButton = screen.getByText('Mark Done');
    fireEvent.click(doneButton);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error toggling todo completion:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });
});