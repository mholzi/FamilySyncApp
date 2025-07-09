import React, { useState, useRef, useEffect } from 'react';
import { updateHouseholdTodo } from '../../utils/householdTodosUtils';
import TaskDetailModal from './TaskDetailModal';
import DifficultyBadge from './TaskGuidance/DifficultyBadge';
import '../../styles/DesignSystem.css';

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
  const [showDetailModal, setShowDetailModal] = useState(false);
  
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

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'high': return 'badge-pink';
      case 'medium': return 'badge-orange';
      case 'low': return 'badge-green';
      default: return 'badge-blue';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return 'High Priority';
      case 'medium': return 'Medium Priority'; 
      case 'low': return 'Low Priority';
      default: return 'Normal Priority';
    }
  };

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'cleaning': return 'badge-blue';
      case 'maintenance': return 'badge-orange';
      case 'organization': return 'badge-purple';
      default: return 'badge-green';
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

  // Build card classes
  const cardClasses = [
    'card',
    'relative',
    'mb-3',
    'transition-all',
    isDragging && 'shadow-lg',
    isSelected && 'border-primary-purple',
    todo.status === 'completed' && 'opacity-70',
    isOverdue && 'bg-red-50'
  ].filter(Boolean).join(' ');

  // Custom styles that can't be replaced with utility classes
  const cardStyle = {
    transform: `translateX(${dragOffset}px)`,
    borderLeft: `4px solid ${getPriorityColor(todo.priority)}`
  };

  return (
    <div 
      ref={cardRef}
      className={cardClasses}
      style={{...cardStyle, position: 'relative'}}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe Action Indicators */}
      {isDragging && swipeAction && (
        <div 
          className={`absolute top-0 bottom-0 w-32 flex items-center justify-center text-sm font-semibold text-white ${
            swipeAction === 'complete' ? 'left-0 bg-green-500' :
            swipeAction === 'edit' ? 'left-0 bg-blue-500' :
            'right-0 bg-red-500'
          }`}
          style={{
            background: swipeAction === 'complete' ? 'linear-gradient(90deg, #22c55e, rgba(34, 197, 94, 0.8))' :
                       swipeAction === 'edit' ? 'linear-gradient(90deg, #3b82f6, rgba(59, 130, 246, 0.8))' :
                       'linear-gradient(-90deg, #ef4444, rgba(239, 68, 68, 0.8))'
          }}
        >
          {swipeAction === 'complete' && '✓ Complete'}
          {swipeAction === 'edit' && '✏️ Edit'}
          {swipeAction === 'delete' && '🗑️ Delete'}
        </div>
      )}

      {/* Help Request Badge */}
      {todo.helpRequests?.length > 0 && (
        <div style={{
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
          zIndex: 10
        }}>
          <span style={{ lineHeight: 1 }}>
            {todo.helpRequests.length}
          </span>
        </div>
      )}

      {/* Selection Checkbox */}
      {showSelection && (
        <div 
          className="absolute top-2 right-2 cursor-pointer"
          onClick={handleSelectionToggle}
          style={{ zIndex: 20 }}
        >
          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center text-sm font-semibold transition-all ${
            isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-300'
          }`}>
            {isSelected && '✓'}
          </div>
        </div>
      )}

      <div className="card-body">
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 space-y-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  className="form-input text-lg font-semibold"
                />
                <div className="flex gap-1">
                  <button 
                    onClick={handleTitleSave} 
                    className="btn btn-icon btn-sm bg-green-500 text-white hover:bg-green-600"
                  >
                    ✓
                  </button>
                  <button 
                    onClick={handleTitleCancel} 
                    className="btn btn-icon btn-sm bg-red-500 text-white hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-2">
                  <h3 
                    className={`text-lg font-semibold text-primary mb-0 flex-1 ${
                      userRole === 'parent' && todo.status === 'pending' ? 'cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors' : ''
                    }`}
                    onClick={handleTitleEdit}
                  >
                    {todo.title}
                    {userRole === 'parent' && todo.status === 'pending' && (
                      <span className="text-xs text-tertiary ml-2 opacity-0 hover:opacity-60 transition-opacity">✏️</span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2">
                    {todo.difficulty && (
                      <DifficultyBadge difficulty={todo.difficulty} showLabel={false} size="small" />
                    )}
                    <div 
                      className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                      style={{ 
                        backgroundColor: `${getPriorityColor(todo.priority)}15`,
                        color: getPriorityColor(todo.priority)
                      }}
                      title={getPriorityLabel(todo.priority)}
                    >
                      <span className="text-sm">{getPriorityIcon(todo.priority)}</span>
                      <span className="capitalize">{todo.priority || 'normal'}</span>
                    </div>
                  </div>
                </div>
                {/* Category badge moved below title and aligned left */}
                {todo.category && (
                  <div className="mt-2">
                    <span 
                      className={`badge ${getCategoryBadgeClass(todo.category)}`}
                      style={{ fontSize: 'calc(var(--font-size-sm) * 0.8)' }}
                    >
                      {todo.category}
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-2">
          </div>
          
          <div className="flex flex-col items-end gap-1">
            {todo.dueDate && (
              <span className={`badge ${isOverdue ? 'badge-pink' : ''} text-xs`}>
                {formatDueDate(todo.dueDate)}
              </span>
            )}
            {todo.estimatedTime && (
              <span className="text-xs text-tertiary bg-gray-100 px-2 py-1 rounded">
                {formatEstimatedTime(todo.estimatedTime)}
              </span>
            )}
            {todo.isRecurring && (
              <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                🔄 {todo.recurringType}
              </span>
            )}
          </div>
        </div>

        {(todo.description || isEditingDescription) && (
          <div className="mt-3">
            {isEditingDescription ? (
              <div className="space-y-2">
                <textarea
                  ref={descriptionInputRef}
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  onBlur={handleDescriptionSave}
                  className="form-input"
                  placeholder="Add description..."
                  rows={2}
                />
                <div className="flex gap-1">
                  <button 
                    onClick={handleDescriptionSave} 
                    className="btn btn-icon btn-sm bg-green-500 text-white hover:bg-green-600"
                  >
                    ✓
                  </button>
                  <button 
                    onClick={handleDescriptionCancel} 
                    className="btn btn-icon btn-sm bg-red-500 text-white hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <p 
                className={`text-sm text-secondary mb-0 ${
                  userRole === 'parent' && todo.status === 'pending' ? 'cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors' : ''
                }`}
                onClick={handleDescriptionEdit}
              >
                {todo.description || (userRole === 'parent' && todo.status === 'pending' && (
                  <span className="text-tertiary italic">+ Add description</span>
                ))}
                {userRole === 'parent' && todo.status === 'pending' && todo.description && (
                  <span className="text-xs text-tertiary ml-2 opacity-0 hover:opacity-60 transition-opacity">✏️</span>
                )}
              </p>
            )}
          </div>
        )}

        {todo.status === 'completed' && todo.completedAt && (
          <div className="mt-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
            <span className="text-sm text-green-700 font-medium">
              ✅ Completed {todo.completedAt.toDate().toLocaleDateString()}
            </span>
            {todo.completionNotes && (
              <p className="text-sm text-gray-700 mt-1 italic">{todo.completionNotes}</p>
            )}
          </div>
        )}

        {/* Task Details and Actions */}
        <div className="mt-3 flex gap-2 justify-end">
          <button
            onClick={() => setShowDetailModal(true)}
            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors text-sm font-medium"
          >
            Details
          </button>
          
          {showActions && todo.status === 'pending' && (
            <>
              {userRole === 'aupair' && (
                <button 
                  className="btn btn-primary"
                  onClick={handleCompleteClick}
                  disabled={isCompleting}
                >
                  Mark Complete
                </button>
              )}
              
              {userRole === 'parent' && (
                <>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => onEdit(todo)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn btn-sm bg-red-500 text-white hover:bg-red-600"
                    onClick={() => onDelete(todo.id)}
                  >
                    Delete
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {showCompletionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-5" style={{ zIndex: 1000 }}>
          <div className="card animate-scale-in w-full max-w-md">
            <div className="card-body">
              <h4 className="text-lg font-semibold text-primary mb-4">Complete Task</h4>
              <textarea
                placeholder="Add notes about completion (optional)"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={3}
                className="form-input mb-4"
              />
              <div className="flex gap-3 justify-end">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowCompletionForm(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleSubmitCompletion}
                  disabled={isCompleting}
                >
                  {isCompleting ? 'Completing...' : 'Complete Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Task Detail Modal */}
      {showDetailModal && (
        <TaskDetailModal
          task={todo}
          familyId={familyId}
          userRole={userRole}
          onClose={() => setShowDetailModal(false)}
          onTaskUpdate={onComplete}
          onEdit={onEdit}
        />
      )}
    </div>
  );
};

export default TodoCard;