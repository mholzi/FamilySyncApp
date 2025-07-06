import React, { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { createHouseholdTodo } from '../../utils/householdTodosUtils';
import './AddTodo.css';

const AddTodo = ({ 
  familyId, 
  userId, 
  onClose, 
  onSuccess,
  editTodo = null // If provided, we're editing an existing todo
}) => {
  const [formData, setFormData] = useState({
    title: editTodo?.title || '',
    description: editTodo?.description || '',
    priority: editTodo?.priority || 'medium',
    category: editTodo?.category || 'general',
    estimatedTime: editTodo?.estimatedTime || '',
    dueDate: editTodo?.dueDate ? formatDateForInput(editTodo.dueDate.toDate()) : '',
    isRecurring: editTodo?.isRecurring || false,
    recurringType: editTodo?.recurringType || 'weekly',
    recurringInterval: editTodo?.recurringInterval || 1,
    recurringDays: editTodo?.recurringDays || [1] // Default to Monday
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Helper functions for date/time formatting
  function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
  }

  // Helper functions for quick date selection
  const getToday = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required';
    } else {
      const selectedDate = new Date(`${formData.dueDate}T09:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today && !editTodo) {
        newErrors.dueDate = 'Due date cannot be in the past';
      }
    }
    
    if (formData.estimatedTime && (isNaN(formData.estimatedTime) || formData.estimatedTime < 1)) {
      newErrors.estimatedTime = 'Estimated time must be a positive number';
    }
    
    if (formData.isRecurring && formData.recurringDays.length === 0) {
      newErrors.recurringDays = 'Please select at least one day for recurring tasks';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Set default time to 9 AM for tasks
      const dueDateTime = new Date(`${formData.dueDate}T09:00:00`);
      
      const todoData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        category: formData.category,
        estimatedTime: formData.estimatedTime ? parseInt(formData.estimatedTime) : null,
        dueDate: Timestamp.fromDate(dueDateTime),
        isRecurring: formData.isRecurring,
        recurringType: formData.isRecurring ? formData.recurringType : null,
        recurringInterval: formData.isRecurring ? parseInt(formData.recurringInterval) : 1,
        recurringDays: formData.isRecurring ? formData.recurringDays : []
      };

      if (editTodo) {
        // TODO: Implement update functionality
        console.log('Update todo:', editTodo.id, todoData);
      } else {
        await createHouseholdTodo(familyId, todoData, userId);
      }
      
      onSuccess && onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving todo:', error);
      setErrors({ submit: 'Failed to save todo. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleRecurringDayToggle = (dayIndex) => {
    setFormData(prev => ({
      ...prev,
      recurringDays: prev.recurringDays.includes(dayIndex)
        ? prev.recurringDays.filter(d => d !== dayIndex)
        : [...prev.recurringDays, dayIndex].sort()
    }));
  };

  const handleQuickDateSelect = (dateType) => {
    const date = dateType === 'today' ? getToday() : getTomorrow();
    handleInputChange('dueDate', date);
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const categories = [
    { value: 'general', label: 'General', icon: '📋' },
    { value: 'cleaning', label: 'Cleaning', icon: '🧹' },
    { value: 'maintenance', label: 'Maintenance', icon: '🔧' },
    { value: 'organization', label: 'Organization', icon: '📦' }
  ];

  return (
    <div className="add-todo-overlay">
      <div className="add-todo-modal">
        <div className="modal-header">
          <h2>{editTodo ? 'Edit Task' : 'Add New Task'}</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="add-todo-form">
          {/* Title */}
          <div className="form-group">
            <label htmlFor="title">Task Title *</label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Empty dishwasher"
              className={errors.title ? 'error' : ''}
            />
            {errors.title && <span className="error-text">{errors.title}</span>}
          </div>

          {/* Quick Form Row */}
          <div className="form-row">
            {/* Priority */}
            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Category */}
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due Date with Quick Selection */}
          <div className="form-group">
            <label htmlFor="dueDate">Due Date *</label>
            <div className="date-input-row">
              <input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                className={errors.dueDate ? 'error' : ''}
              />
              <div className="quick-date-buttons">
                <button
                  type="button"
                  className={`quick-date-btn ${formData.dueDate === getToday() ? 'active' : ''}`}
                  onClick={() => handleQuickDateSelect('today')}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`quick-date-btn ${formData.dueDate === getTomorrow() ? 'active' : ''}`}
                  onClick={() => handleQuickDateSelect('tomorrow')}
                >
                  Tomorrow
                </button>
              </div>
            </div>
            {errors.dueDate && <span className="error-text">{errors.dueDate}</span>}
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            className="btn-toggle-advanced"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? '▼' : '▶'} Advanced Options
          </button>

          {showAdvanced && (
            <div className="advanced-options">
              {/* Description */}
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Additional details or instructions..."
                  rows={3}
                />
              </div>

              {/* Estimated Time */}
              <div className="form-group">
                <label htmlFor="estimatedTime">Estimated Time (minutes)</label>
                <input
                  id="estimatedTime"
                  type="number"
                  min="1"
                  value={formData.estimatedTime}
                  onChange={(e) => handleInputChange('estimatedTime', e.target.value)}
                  placeholder="e.g., 30"
                  className={errors.estimatedTime ? 'error' : ''}
                />
                {errors.estimatedTime && <span className="error-text">{errors.estimatedTime}</span>}
              </div>

              {/* Recurring Options */}
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
                  />
                  Make this a recurring task
                </label>
              </div>

              {formData.isRecurring && (
                <div className="recurring-options">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="recurringType">Repeat</label>
                      <select
                        id="recurringType"
                        value={formData.recurringType}
                        onChange={(e) => handleInputChange('recurringType', e.target.value)}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="recurringInterval">Every</label>
                      <input
                        id="recurringInterval"
                        type="number"
                        min="1"
                        max="30"
                        value={formData.recurringInterval}
                        onChange={(e) => handleInputChange('recurringInterval', e.target.value)}
                      />
                      <span className="interval-unit">
                        {formData.recurringType === 'daily' && 'day(s)'}
                        {formData.recurringType === 'weekly' && 'week(s)'}
                        {formData.recurringType === 'monthly' && 'month(s)'}
                      </span>
                    </div>
                  </div>

                  {formData.recurringType === 'weekly' && (
                    <div className="form-group">
                      <label>Repeat on</label>
                      <div className="day-selector">
                        {dayNames.map((day, index) => (
                          <button
                            key={index}
                            type="button"
                            className={`day-btn ${formData.recurringDays.includes(index) ? 'selected' : ''}`}
                            onClick={() => handleRecurringDayToggle(index)}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                      {errors.recurringDays && <span className="error-text">{errors.recurringDays}</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <div className="error-message">
              {errors.submit}
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (editTodo ? 'Update Task' : 'Assign to Au Pair')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTodo;