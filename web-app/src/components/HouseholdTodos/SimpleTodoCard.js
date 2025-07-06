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
      <div style={styles.taskHeader}>
        <div style={styles.taskProfile}>
          <div style={styles.profilePic}>
            {getUserInitials('Au Pair')}
          </div>
          <div style={styles.taskInfo}>
            <div style={{
              ...styles.taskTitle,
              ...(isCompleted ? styles.taskTitleCompleted : {})
            }}>
              {todo.title}
            </div>
            {todo.description && (
              <div style={styles.taskDescription}>
                {todo.description}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Progress bar area - keeping space but no progress bar as requested */}
      <div style={styles.progressArea}>
        {todo.category && (
          <span style={styles.categoryBadge}>
            {todo.category}
          </span>
        )}
        {todo.dueDate && (
          <span style={styles.dueDateBadge}>
            {formatDueDate(todo.dueDate)}
          </span>
        )}
      </div>
      
      {/* Done toggle button at bottom left as requested */}
      <div style={styles.bottomRow}>
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
        
        {todo.estimatedTime && (
          <span style={styles.timeEstimate}>
            {formatEstimatedTime(todo.estimatedTime)}
          </span>
        )}
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
  taskProfile: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-3)'
  },
  profilePic: {
    width: '32px',
    height: '32px',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-semibold)',
    flexShrink: 0
  },
  taskInfo: {
    flex: 1,
    minWidth: 0
  },
  taskTitle: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)',
    lineHeight: 'var(--line-height-tight)',
    marginBottom: 'var(--space-1)'
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
  progressArea: {
    display: 'flex',
    gap: 'var(--space-2)',
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
    fontWeight: 'var(--font-weight-medium)'
  },
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
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