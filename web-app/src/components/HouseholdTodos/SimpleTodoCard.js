import React, { useState } from 'react';
import { completeHouseholdTodo } from '../../utils/householdTodosUtils';

const SimpleTodoCard = ({ 
  todo, 
  userRole,
  familyId,
  userId,
  onToggleComplete 
}) => {
  const [isCompleting, setIsCompleting] = useState(false);

  const handleToggleComplete = async () => {
    if (isCompleting) return;
    
    setIsCompleting(true);
    try {
      if (todo.status === 'completed') {
        // For now, we don't support uncompleting todos
        // Could be added later if needed
        console.log('Uncompleting todos not supported yet');
      } else {
        await completeHouseholdTodo(familyId, todo.id, {
          notes: 'Completed via dashboard'
        }, userId);
      }
      
      if (onToggleComplete) {
        onToggleComplete(todo.id, todo.status === 'completed' ? 'pending' : 'completed');
      }
    } catch (error) {
      console.error('Error toggling todo completion:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const isCompleted = todo.status === 'completed';
  const isOverdue = todo.status === 'overdue' || 
    (todo.dueDate && todo.dueDate.toDate() < new Date() && todo.status === 'pending');

  const getUserInitials = (name) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div style={{
      ...styles.taskCard, 
      ...(isCompleted ? styles.taskCardCompleted : {}),
      ...(isOverdue ? styles.taskCardOverdue : {})
    }}>
      {/* Header with title and due date on the right */}
      <div style={styles.taskHeader}>
        <div style={styles.titleRow}>
          <div style={{
            ...styles.taskTitle,
            ...(isCompleted ? styles.taskTitleCompleted : {})
          }}>
            {todo.title}
          </div>
          {todo.dueDate && (
            <span style={styles.dueDateBadge}>
              {formatDueDate(todo.dueDate)}
            </span>
          )}
        </div>
        {todo.description && (
          <div style={styles.taskDescription}>
            {todo.description}
          </div>
        )}
      </div>
      
      {/* Spacer area */}
      <div style={styles.spacerArea}>
        {todo.estimatedTime && (
          <span style={styles.timeEstimate}>
            {formatEstimatedTime(todo.estimatedTime)}
          </span>
        )}
      </div>
      
      {/* Bottom row with category tag on left and done button on right */}
      <div style={styles.bottomRow}>
        <div style={styles.leftBottomSection}>
          {todo.category && (
            <span style={styles.categoryBadge}>
              {todo.category}
            </span>
          )}
        </div>
        <button 
          style={{
            ...styles.doneButton,
            ...(isCompleted ? styles.doneButtonCompleted : styles.doneButtonPending)
          }}
          onClick={handleToggleComplete}
          disabled={isCompleting}
        >
          {isCompleting ? '...' : (isCompleted ? '✓ Done' : 'Mark Done')}
        </button>
      </div>
    </div>
  );
};

const formatDueDate = (dueDate) => {
  if (!dueDate) return '';
  
  const date = dueDate.toDate();
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
};

const formatEstimatedTime = (minutes) => {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const styles = {
  taskCard: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-4)',
    marginBottom: 'var(--space-3)',
    boxShadow: 'var(--shadow-sm)',
    border: '1px solid var(--border-light)',
    transition: 'var(--transition-normal)',
    minWidth: '240px'
  },
  taskCardCompleted: {
    backgroundColor: '#f8f9fa',
    opacity: 0.8
  },
  taskCardOverdue: {
    borderLeft: '4px solid #ef4444',
    backgroundColor: '#fef2f2'
  },
  taskHeader: {
    marginBottom: 'var(--space-3)'
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 'var(--space-2)',
    marginBottom: 'var(--space-1)'
  },
  taskTitle: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    lineHeight: 'var(--line-height-tight)',
    flex: 1
  },
  taskTitleCompleted: {
    textDecoration: 'line-through',
    color: 'var(--text-tertiary)'
  },
  taskDescription: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-secondary)',
    lineHeight: 'var(--line-height-normal)'
  },
  spacerArea: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: 'var(--space-3)',
    minHeight: '20px'
  },
  categoryBadge: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--primary-purple)',
    backgroundColor: '#f3f4f6',
    padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 'var(--font-weight-medium)'
  },
  dueDateBadge: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)',
    backgroundColor: '#fef3c7',
    padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 'var(--font-weight-medium)',
    flexShrink: 0,
    whiteSpace: 'nowrap'
  },
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 'var(--space-2)'
  },
  leftBottomSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)'
  },
  doneButton: {
    border: 'none',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    minWidth: '80px'
  },
  doneButtonPending: {
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)'
  },
  doneButtonCompleted: {
    backgroundColor: 'var(--secondary-green)',
    color: 'var(--white)'
  },
  timeEstimate: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)',
    backgroundColor: '#f3f4f6',
    padding: 'var(--space-1) var(--space-2)',
    borderRadius: 'var(--radius-sm)'
  }
};

export default SimpleTodoCard;