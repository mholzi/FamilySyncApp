import React, { useState, useRef, useEffect } from 'react';
import { updateHouseholdTodo } from '../../utils/householdTodosUtils';
import './TodoCard.css';

const TodoCard = ({ 
  todo, 
  onComplete, 
  onEdit, 
  onDelete, 
  userRole,
  showActions = true,
  familyId,
  isSelected = false,
  onSelect,
  showSelection = false
}) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  
  // Inline editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(todo.title);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(todo.description || '');
  
  // Swipe gesture states
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeAction, setSwipeAction] = useState(null); // 'complete', 'delete', 'edit'
  
  const cardRef = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const titleInputRef = useRef(null);
  const descriptionInputRef = useRef(null);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444'; // red
      case 'medium': return '#f97316'; // orange
      case 'low': return '#22c55e'; // green
      default: return '#6b7280'; // gray
    }
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

  const handleCompleteClick = () => {
    if (userRole === 'aupair') {
      setShowCompletionForm(true);
    }
  };

  const handleSubmitCompletion = async () => {
    setIsCompleting(true);
    try {
      await onComplete(todo.id, {
        notes: completionNotes,
        photos: [] // TODO: Add photo upload functionality
      });
      setShowCompletionForm(false);
      setCompletionNotes('');
    } catch (error) {
      console.error('Error completing todo:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  // Inline editing handlers
  const handleTitleEdit = () => {
    if (userRole === 'parent' && todo.status === 'pending') {
      setIsEditingTitle(true);
      setTimeout(() => titleInputRef.current?.focus(), 0);
    }
  };

  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== todo.title) {
      try {
        await updateHouseholdTodo(familyId, todo.id, { title: editedTitle.trim() });
      } catch (error) {
        console.error('Error updating title:', error);
        setEditedTitle(todo.title); // Revert on error
      }
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditedTitle(todo.title);
    setIsEditingTitle(false);
  };

  const handleDescriptionEdit = () => {
    if (userRole === 'parent' && todo.status === 'pending') {
      setIsEditingDescription(true);
      setTimeout(() => descriptionInputRef.current?.focus(), 0);
    }
  };

  const handleDescriptionSave = async () => {
    if (editedDescription !== todo.description) {
      try {
        await updateHouseholdTodo(familyId, todo.id, { description: editedDescription });
      } catch (error) {
        console.error('Error updating description:', error);
        setEditedDescription(todo.description || ''); // Revert on error
      }
    }
    setIsEditingDescription(false);
  };

  const handleDescriptionCancel = () => {
    setEditedDescription(todo.description || '');
    setIsEditingDescription(false);
  };

  // Swipe gesture handlers
  const handleTouchStart = (e) => {
    if (showSelection || isEditingTitle || isEditingDescription) return;
    
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    currentX.current = touch.clientX;
    setIsDragging(false);
  };

  const handleTouchMove = (e) => {
    if (showSelection || isEditingTitle || isEditingDescription) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX.current;
    const deltaY = touch.clientY - startY.current;
    
    // Only start horizontal swipe if movement is primarily horizontal
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault();
      setIsDragging(true);
      currentX.current = touch.clientX;
      
      const offset = Math.max(-150, Math.min(150, deltaX));
      setDragOffset(offset);
      
      // Determine swipe action based on direction and user role
      if (offset > 60) {
        if (userRole === 'aupair' && todo.status === 'pending') {
          setSwipeAction('complete');
        } else if (userRole === 'parent') {
          setSwipeAction('edit');
        }
      } else if (offset < -60) {
        if (userRole === 'parent') {
          setSwipeAction('delete');
        }
      } else {
        setSwipeAction(null);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isDragging && swipeAction) {
      // Execute the swipe action
      switch (swipeAction) {
        case 'complete':
          handleCompleteClick();
          break;
        case 'edit':
          onEdit(todo);
          break;
        case 'delete':
          onDelete(todo.id);
          break;
        default:
          break;
      }
    }
    
    // Reset swipe state
    setDragOffset(0);
    setIsDragging(false);
    setSwipeAction(null);
  };

  // Selection handler for batch operations
  const handleSelectionToggle = (e) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(todo.id, !isSelected);
    }
  };

  // Auto-focus and blur handlers for inline editing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        if (isEditingTitle) {
          e.preventDefault();
          handleTitleSave();
        } else if (isEditingDescription) {
          e.preventDefault();
          handleDescriptionSave();
        }
      } else if (e.key === 'Escape') {
        if (isEditingTitle) {
          handleTitleCancel();
        } else if (isEditingDescription) {
          handleDescriptionCancel();
        }
      }
    };

    if (isEditingTitle || isEditingDescription) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isEditingTitle, isEditingDescription, handleTitleSave, handleTitleCancel, handleDescriptionSave, handleDescriptionCancel]);

  const isOverdue = todo.status === 'overdue' || 
    (todo.dueDate && todo.dueDate.toDate() < new Date() && todo.status === 'pending');

  return (
    <div 
      ref={cardRef}
      className={`todo-card ${todo.status} ${isOverdue ? 'overdue' : ''} ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
      style={{ transform: `translateX(${dragOffset}px)` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe Action Indicators */}
      {isDragging && swipeAction && (
        <div className={`swipe-indicator ${swipeAction}`}>
          {swipeAction === 'complete' && '✓ Complete'}
          {swipeAction === 'edit' && '✏️ Edit'}
          {swipeAction === 'delete' && '🗑️ Delete'}
        </div>
      )}

      {/* Selection Checkbox */}
      {showSelection && (
        <div className="selection-checkbox" onClick={handleSelectionToggle}>
          <div className={`checkbox ${isSelected ? 'checked' : ''}`}>
            {isSelected && '✓'}
          </div>
        </div>
      )}

      <div 
        className="todo-priority-bar" 
        style={{ backgroundColor: getPriorityColor(todo.priority) }}
      />
      
      <div className="todo-content">
        <div className="todo-header">
          <div className="todo-title-section">
            {isEditingTitle ? (
              <div className="inline-edit-title">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  className="title-input"
                />
                <div className="inline-edit-actions">
                  <button onClick={handleTitleSave} className="save-btn">✓</button>
                  <button onClick={handleTitleCancel} className="cancel-btn">✕</button>
                </div>
              </div>
            ) : (
              <h3 
                className={`todo-title ${userRole === 'parent' && todo.status === 'pending' ? 'editable' : ''}`}
                onClick={handleTitleEdit}
              >
                {todo.title}
                {userRole === 'parent' && todo.status === 'pending' && (
                  <span className="edit-hint">✏️</span>
                )}
              </h3>
            )}
            {todo.category && (
              <span className={`todo-category ${todo.category}`}>
                {todo.category}
              </span>
            )}
          </div>
          
          <div className="todo-meta">
            {todo.dueDate && (
              <span className={`todo-due-date ${isOverdue ? 'overdue' : ''}`}>
                {formatDueDate(todo.dueDate)}
              </span>
            )}
            {todo.estimatedTime && (
              <span className="todo-estimated-time">
                {formatEstimatedTime(todo.estimatedTime)}
              </span>
            )}
            {todo.isRecurring && (
              <span className="todo-recurring">
                🔄 {todo.recurringType}
              </span>
            )}
          </div>
        </div>

        {(todo.description || isEditingDescription) && (
          <div className="todo-description-section">
            {isEditingDescription ? (
              <div className="inline-edit-description">
                <textarea
                  ref={descriptionInputRef}
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  onBlur={handleDescriptionSave}
                  className="description-input"
                  placeholder="Add description..."
                  rows={2}
                />
                <div className="inline-edit-actions">
                  <button onClick={handleDescriptionSave} className="save-btn">✓</button>
                  <button onClick={handleDescriptionCancel} className="cancel-btn">✕</button>
                </div>
              </div>
            ) : (
              <p 
                className={`todo-description ${userRole === 'parent' && todo.status === 'pending' ? 'editable' : ''}`}
                onClick={handleDescriptionEdit}
              >
                {todo.description || (userRole === 'parent' && todo.status === 'pending' && (
                  <span className="add-description">+ Add description</span>
                ))}
                {userRole === 'parent' && todo.status === 'pending' && todo.description && (
                  <span className="edit-hint">✏️</span>
                )}
              </p>
            )}
          </div>
        )}

        {todo.status === 'completed' && todo.completedAt && (
          <div className="todo-completion-info">
            <span className="completion-time">
              ✅ Completed {todo.completedAt.toDate().toLocaleDateString()}
            </span>
            {todo.completionNotes && (
              <p className="completion-notes">{todo.completionNotes}</p>
            )}
          </div>
        )}

        {showActions && todo.status === 'pending' && (
          <div className="todo-actions">
            {userRole === 'aupair' && (
              <button 
                className="btn-complete"
                onClick={handleCompleteClick}
                disabled={isCompleting}
              >
                Mark Complete
              </button>
            )}
            
            {userRole === 'parent' && (
              <div className="parent-actions">
                <button 
                  className="btn-edit"
                  onClick={() => onEdit(todo)}
                >
                  Edit
                </button>
                <button 
                  className="btn-delete"
                  onClick={() => onDelete(todo.id)}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showCompletionForm && (
        <div className="completion-form-overlay">
          <div className="completion-form">
            <h4>Complete Task</h4>
            <textarea
              placeholder="Add notes about completion (optional)"
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              rows={3}
            />
            <div className="form-actions">
              <button 
                className="btn-cancel"
                onClick={() => setShowCompletionForm(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-submit"
                onClick={handleSubmitCompletion}
                disabled={isCompleting}
              >
                {isCompleting ? 'Completing...' : 'Complete Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodoCard;