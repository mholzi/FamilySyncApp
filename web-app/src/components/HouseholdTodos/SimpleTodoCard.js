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
  // Check if task is overdue - only if date has passed (not including today)
  const isOverdue = todo.status === 'overdue' || 
    (todo.dueDate && todo.status === 'pending' && (() => {
      const dueDate = todo.dueDate.toDate();
      const today = new Date();
      // Set both dates to start of day for comparison
      dueDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      return dueDate < today; // Only overdue if due date is before today
    })());


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
        
        {/* Category badge at top right */}
        {todo.category && (
          <span style={{
            ...getCategoryBadgeStyle(todo.category, todo.priority),
            position: 'absolute',
            top: '12px',
            right: '12px'
          }}>
            {todo.category.charAt(0).toUpperCase() + todo.category.slice(1)}
          </span>
        )}
        
        {/* Time section on the left */}
        <div style={styles.timeSection}>
          {todo.dueDate && (
            <>
              <div style={styles.timeDisplay}>
                {formatDueDate(todo.dueDate)}
              </div>
              {(() => {
                const dueDate = todo.dueDate.toDate();
                const today = new Date();
                // Set both dates to start of day for comparison
                const dueDateStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
                const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const isDueToday = dueDateStart.getTime() === todayStart.getTime();
                
                // Only show indicator if due today or overdue
                if (isOverdue || isDueToday) {
                  return (
                    <div style={{
                      ...styles.dayIndicator,
                      ...(isOverdue ? { backgroundColor: '#ffebee', color: 'var(--md-sys-color-error)' } : {})
                    }}>
                      {isOverdue ? 'Overdue' : 'Due'}
                    </div>
                  );
                }
                return null;
              })()}
              {todo.estimatedTime && (
                <div style={styles.timeEstimate}>
                  {formatEstimatedTime(todo.estimatedTime)}
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Main content section */}
        <div style={styles.taskContent}>
          <div style={styles.taskHeader}>
            <div style={{
              ...styles.taskTitle,
              ...(isCompleted ? styles.taskTitleCompleted : {})
            }}>
              {todo.title}
            </div>
          </div>
          
          {/* Description */}
          {todo.description && (
            <div style={styles.taskDescription}>
              {todo.description.length > 300 
                ? `${todo.description.substring(0, 300)}...` 
                : todo.description
              }
            </div>
          )}
          
        </div>
        
        {/* Bottom buttons */}
        <div style={styles.buttonContainer}>
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent card click
              setShowDetailModal(true);
            }}
            style={styles.detailsButton}
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
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
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
    backgroundColor: 'var(--md-sys-color-surface-container-low)',
    borderRadius: 'var(--md-sys-shape-corner-medium)',
    padding: '16px',
    paddingBottom: '80px', // Increased by 30px for larger card
    boxShadow: 'var(--md-sys-elevation-level1)',
    border: '1px solid var(--md-sys-color-outline-variant)',
    transition: 'var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard)',
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
    position: 'relative',
    width: '100%',
    boxSizing: 'border-box',
    minHeight: '180px', // Fixed height for consistency
    height: '180px' // Fixed height
  },
  taskCardCompleted: {
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    opacity: 0.8
  },
  taskCardOverdue: {
    borderLeft: '4px solid var(--md-sys-color-error)',
    backgroundColor: '#ffebee33' // Very subtle red background with transparency
  },
  timeSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    minWidth: '70px',
    textAlign: 'left'
  },
  timeDisplay: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--md-sys-color-primary)',
    lineHeight: '1.3'
  },
  dayIndicator: {
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface)',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    padding: '4px 8px',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)',
    marginTop: '4px',
    fontWeight: '500'
  },
  timeEstimate: {
    fontSize: '12px',
    color: 'var(--md-sys-color-on-surface)',
    backgroundColor: 'var(--md-sys-color-tertiary-container)',
    padding: '4px 8px',
    borderRadius: 'var(--md-sys-shape-corner-extra-small)',
    marginTop: '8px',
    fontWeight: '500'
  },
  taskContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: 0,
    alignItems: 'flex-start' // Align content to the left
  },
  taskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px'
  },
  taskTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--md-sys-color-on-surface)',
    lineHeight: '1.3',
    flex: 1,
    textAlign: 'left' // Ensure left alignment
  },
  taskTitleCompleted: {
    textDecoration: 'line-through',
    color: 'var(--md-sys-color-on-surface-variant)'
  },
  taskDescription: {
    fontSize: '14px',
    color: 'var(--md-sys-color-on-surface)',
    lineHeight: '1.4',
    marginBottom: '4px',
    textAlign: 'left', // Ensure left alignment
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 3, // Limit to 3 lines
    WebkitBoxOrient: 'vertical',
    maxHeight: '63px' // 3 lines * 1.4 line-height * 14px font-size
  },
  buttonContainer: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    display: 'flex',
    gap: '8px'
  },
  categoryBadge: {
    fontSize: '12px',
    color: 'var(--md-sys-color-primary)',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    padding: '2px 8px',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    fontWeight: '500',
    minWidth: '80px',
    textAlign: 'center',
    border: '1px solid transparent',
    cursor: 'default',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    height: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  detailsButton: {
    border: '1px solid var(--md-sys-color-outline-variant)',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    minWidth: '80px',
    backgroundColor: 'var(--md-sys-color-surface-container-highest)',
    color: 'var(--md-sys-color-on-surface)'
  },
  doneButton: {
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-small)',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'var(--md-sys-motion-duration-short2) var(--md-sys-motion-easing-standard)',
    minWidth: '80px'
  },
  doneButtonPending: {
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)'
  },
  doneButtonCompleted: {
    backgroundColor: 'var(--md-sys-color-tertiary)',
    color: 'var(--md-sys-color-on-tertiary)'
  },
  helpRequestBadge: {
    position: 'absolute',
    bottom: '16px',
    left: '16px',
    backgroundColor: 'var(--md-sys-color-error)',
    color: 'var(--md-sys-color-on-error)',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    minWidth: '24px',
    height: '24px',
    padding: '0 6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    boxShadow: 'var(--md-sys-elevation-level1)',
    zIndex: 1
  },
  helpRequestCount: {
    lineHeight: 1
  }
};

export default SimpleTodoCard;