import React, { useState } from 'react';
import { completeHouseholdTodo, confirmHouseholdTodo } from '../../utils/householdTodosUtils';
import TaskDetailModal from './TaskDetailModal';

const SimpleTodoCard = ({ 
  todo, 
  userRole,
  familyId,
  userId,
  onToggleComplete,
  onEdit 
}) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleToggleComplete = async () => {
    if (isCompleting) return;
    
    setIsCompleting(true);
    try {
      if (todo.status === 'completed' && userRole === 'parent') {
        // Parent confirming au pair's completion
        await confirmHouseholdTodo(familyId, todo.id, userId);
      } else if (todo.status === 'pending') {
        if (userRole === 'parent') {
          // Parent marking task as done - directly confirm it
          await confirmHouseholdTodo(familyId, todo.id, userId);
        } else {
          // Au pair marking task as done - needs parent confirmation
          await completeHouseholdTodo(familyId, todo.id, {
            notes: 'Completed via dashboard'
          }, userId);
        }
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


  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444'; // red
      case 'medium': return '#f97316'; // orange
      case 'low': return '#22c55e'; // green
      default: return '#6b7280'; // gray
    }
  };

  const getCategoryBadgeStyle = (category, priority) => {
    const priorityColor = getPriorityColor(priority);
    return {
      ...styles.categoryBadge,
      backgroundColor: `${priorityColor}15`, // 15% opacity of priority color
      color: priorityColor
    };
  };

  const getButtonText = () => {
    if (isCompleted) {
      return userRole === 'parent' ? 'Confirm Done' : '✓ Done';
    }
    return 'Mark Done';
  };

  return (
    <>
      <div 
        style={{
          ...styles.taskCard, 
          ...(isCompleted ? styles.taskCardCompleted : {}),
          ...(isOverdue ? styles.taskCardOverdue : {}),
          cursor: 'pointer',
          position: 'relative'
        }}
        onClick={() => setShowDetailModal(true)}
        title="Click to view task details"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowDetailModal(true);
          }
        }}
      >
        {/* Help Request Badge */}
        {todo.helpRequests?.length > 0 && (
          <div style={styles.helpRequestBadge}>
            <span style={styles.helpRequestCount}>
              {todo.helpRequests.length}
            </span>
          </div>
        )}
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
          {/* Category below title */}
          {todo.category && (
            <span style={{...getCategoryBadgeStyle(todo.category, todo.priority), marginTop: '8px', display: 'inline-block'}}>
              {todo.category.charAt(0).toUpperCase() + todo.category.slice(1)}
            </span>
          )}
          {todo.description && (
            <div style={{...styles.taskDescription, marginTop: '10px'}}>
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
        
        {/* Bottom row with both buttons */}
        <div style={styles.bottomRow}>
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click
              setShowDetailModal(true);
            }}
            style={{
              ...styles.taskButton
            }}
          >
            Details
          </button>
          <button 
            style={{
              ...styles.doneButton,
              ...(isCompleted ? styles.doneButtonCompleted : styles.doneButtonPending)
            }}
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click
              handleToggleComplete();
            }}
            disabled={isCompleting}
          >
            {isCompleting ? '...' : getButtonText()}
          </button>
        </div>
      </div>

      {/* Enhanced Task Detail Modal */}
      {showDetailModal && (
        <TaskDetailModal
          task={todo}
          familyId={familyId}
          userRole={userRole}
          onClose={() => setShowDetailModal(false)}
          onTaskUpdate={onToggleComplete}
          onEdit={(task) => {
            setShowDetailModal(false);
            if (onEdit) {
              onEdit(task);
            }
          }}
        />
      )}
    </>
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
  if (minutes < 60) return `${minutes} Min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes} Min` : `${hours}h`;
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
    minWidth: '240px',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '120px'
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
    flex: 1,
    textAlign: 'left'
  },
  taskTitleCompleted: {
    textDecoration: 'line-through',
    color: 'var(--text-tertiary)'
  },
  taskDescription: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-secondary)',
    lineHeight: 'var(--line-height-normal)',
    textAlign: 'left'
  },
  spacerArea: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: 'var(--space-3)',
    minHeight: '20px',
    flex: 1
  },
  categoryBadge: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--primary-purple)',
    backgroundColor: '#f3f4f6',
    padding: '2px var(--space-2)',
    borderRadius: 'var(--radius-md)',
    fontWeight: 'var(--font-weight-medium)',
    minWidth: '80px',
    textAlign: 'center',
    border: '1px solid transparent',
    cursor: 'default',
    transition: 'var(--transition-fast)',
    height: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
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
    gap: 'var(--space-2)',
    marginTop: 'auto'
  },
  leftBottomSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)'
  },
  taskButton: {
    border: '1px solid #e2e8f0',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-3)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    minWidth: '80px',
    backgroundColor: '#f8fafc',
    color: '#475569'
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
  },
  helpRequestBadge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    backgroundColor: '#ef4444',
    color: 'white',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 'bold',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    zIndex: 1
  },
  helpRequestCount: {
    lineHeight: 1
  }
};

export default SimpleTodoCard;