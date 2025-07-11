import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';
import { useFamily } from '../../hooks/useFamily';
import { notifyParentsOfEventChange, NOTIFICATION_TYPES } from '../../utils/notificationUtils';

const CalendarQuickAdd = ({ 
  children, 
  selectedDate, 
  onSave, 
  onCancel, 
  userRole,
  prefilledTime 
}) => {
  const [user] = useAuthState(auth);
  const { familyData } = useFamily();
  const [currentStep, setCurrentStep] = useState('category'); // 'category' -> 'details'
  const [selectedCategory, setSelectedCategory] = useState('');
  const [eventData, setEventData] = useState({
    title: '',
    childId: children.length > 0 ? children[0].id : '',
    startTime: prefilledTime || '09:00',
    duration: 60,
    location: '',
    notes: '',
    responsibility: userRole === 'parent' ? 'au_pair' : 'au_pair',
    dropOffResponsibility: '',
    pickUpResponsibility: '',
    travelTime: 0,
    requiredItems: [],
    isRecurring: false
  });
  const [suggestions, setSuggestions] = useState([]);

  const categories = [
    {
      id: 'routine',
      name: 'Daily Routines',
      icon: '🏠',
      color: '#3B82F6',
      description: 'Meals, naps, bedtime'
    },
    {
      id: 'school',
      name: 'School/Kindergarten',
      icon: '🏫',
      color: '#F59E0B',
      description: 'Classes, pickup, school events'
    },
    {
      id: 'activity',
      name: 'Activities',
      icon: '🏃',
      color: '#10B981',
      description: 'Sports, lessons, clubs'
    },
    {
      id: 'social',
      name: 'Social',
      icon: '👫',
      color: '#7C3AED',
      description: 'Playdates, parties, visits'
    },
    {
      id: 'medical',
      name: 'Medical',
      icon: '🏥',
      color: '#EF4444',
      description: 'Doctor, dentist, therapy'
    },
    {
      id: 'oneTime',
      name: 'One-time Event',
      icon: '🎯',
      color: '#6B7280',
      description: 'Special occasions, trips'
    }
  ];

  // Simple suggestions based on category
  const getSuggestions = (category, searchTerm) => {
    const categoryTemplates = {
      social: [
        'Playdate with friend',
        'Birthday party',
        'Family visit',
        'Park meetup'
      ],
      medical: [
        'Doctor checkup',
        'Dentist appointment', 
        'Therapy session',
        'Vaccination'
      ],
      activity: [
        'Soccer practice',
        'Swimming lesson',
        'Piano lesson',
        'Art class'
      ],
      oneTime: [
        'School event',
        'Family outing',
        'Movie night',
        'Shopping trip'
      ]
    };

    const templates = categoryTemplates[category] || [];
    
    if (!searchTerm) return templates;
    
    return templates.filter(template => 
      template.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  useEffect(() => {
    if (selectedCategory && eventData.title) {
      const newSuggestions = getSuggestions(selectedCategory, eventData.title);
      setSuggestions(newSuggestions);
    } else if (selectedCategory) {
      setSuggestions(getSuggestions(selectedCategory, ''));
    }
  }, [selectedCategory, eventData.title]);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category.id);
    
    // Set category-specific defaults
    const defaults = {
      social: { duration: 120, responsibility: 'au_pair' },
      medical: { duration: 60, responsibility: 'parent' },
      activity: { duration: 90, responsibility: 'au_pair' },
      routine: { duration: 30, responsibility: 'au_pair' },
      school: { duration: 60, responsibility: 'school' },
      oneTime: { duration: 60, responsibility: 'au_pair' }
    };

    setEventData({
      ...eventData,
      ...defaults[category.id],
      type: category.id,
      category: category.name
    });
    
    setCurrentStep('details');
  };

  const handleInputChange = (field, value) => {
    setEventData({
      ...eventData,
      [field]: value
    });
  };

  const handleSuggestionSelect = (suggestion) => {
    setEventData({
      ...eventData,
      title: suggestion
    });
    setSuggestions([]);
  };

  const handleSave = async () => {
    // Basic validation
    if (!eventData.title.trim()) {
      alert('Please enter an event title');
      return;
    }

    // Create the event
    const newEvent = {
      ...eventData,
      id: `temp-${Date.now()}`,
      date: selectedDate,
      startMinutes: timeToMinutes(eventData.startTime),
      endMinutes: timeToMinutes(eventData.startTime) + eventData.duration
    };

    // Save the event
    onSave(newEvent);

    // Send notification to parents if au pair created the event
    if (userRole === 'aupair' && familyData && user) {
      try {
        await notifyParentsOfEventChange(
          familyData.id,
          {
            ...newEvent,
            childName: children.find(c => c.id === newEvent.childId)?.name || ''
          },
          NOTIFICATION_TYPES.EVENT_CREATED,
          user
        );
      } catch (error) {
        console.error('Error sending notification:', error);
        // Don't block the save operation if notification fails
      }
    }
  };

  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const getEndTime = () => {
    const startMinutes = timeToMinutes(eventData.startTime);
    const endMinutes = startMinutes + eventData.duration;
    return formatTime(endMinutes);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            {currentStep === 'details' && (
              <button 
                style={styles.backButton}
                onClick={() => setCurrentStep('category')}
              >
                ←
              </button>
            )}
            <h2 style={styles.title}>
              {currentStep === 'category' ? 'Add New Event' : 'Event Details'}
            </h2>
          </div>
          <button style={styles.closeButton} onClick={onCancel}>
            ×
          </button>
        </div>

        {/* Category Selection */}
        {currentStep === 'category' && (
          <div style={styles.content}>
            <p style={styles.instruction}>What type of event would you like to add?</p>
            <div style={styles.categoryGrid}>
              {categories.map(category => (
                <button
                  key={category.id}
                  style={styles.categoryCard}
                  onClick={() => handleCategorySelect(category)}
                >
                  <div style={styles.categoryIcon}>{category.icon}</div>
                  <div style={styles.categoryName}>{category.name}</div>
                  <div style={styles.categoryDescription}>{category.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Event Details */}
        {currentStep === 'details' && (
          <div style={styles.content}>
            {/* Title with suggestions */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Event Title</label>
              <input
                type="text"
                style={styles.input}
                value={eventData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Type event name..."
                autoFocus
              />
              {suggestions.length > 0 && eventData.title && (
                <div style={styles.suggestions}>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      style={styles.suggestionItem}
                      onClick={() => handleSuggestionSelect(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Child selection */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Child</label>
              <select
                style={styles.select}
                value={eventData.childId}
                onChange={(e) => handleInputChange('childId', e.target.value)}
              >
                {children.map(child => (
                  <option key={child.id} value={child.id}>{child.name}</option>
                ))}
              </select>
            </div>

            {/* Date & Time */}
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Start Time</label>
                <input
                  type="time"
                  style={styles.input}
                  value={eventData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Duration</label>
                <select
                  style={styles.select}
                  value={eventData.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                  <option value={180}>3 hours</option>
                </select>
              </div>
            </div>

            <div style={styles.timePreview}>
              {eventData.startTime} - {getEndTime()}
            </div>

            {/* Location */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Location (optional)</label>
              <input
                type="text"
                style={styles.input}
                value={eventData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Where will this take place?"
              />
            </div>

            {/* Responsibility */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Who is responsible?</label>
              <select
                style={styles.select}
                value={eventData.responsibility}
                onChange={(e) => handleInputChange('responsibility', e.target.value)}
              >
                <option value="au_pair">Au Pair</option>
                <option value="parent">Parent</option>
                <option value="other_parent">Other Parent</option>
                <option value="grandparent">Grandparent</option>
                <option value="child_alone">Child Alone</option>
              </select>
            </div>

            {/* Transportation Fields - only show if location is set */}
            {eventData.location && (
              <>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Drop-off by</label>
                    <select
                      style={styles.select}
                      value={eventData.dropOffResponsibility}
                      onChange={(e) => handleInputChange('dropOffResponsibility', e.target.value)}
                    >
                      <option value="">Not needed</option>
                      <option value="Au pair">Au pair</option>
                      <option value="Parent">Parent</option>
                      <option value="Kid alone">Kid alone</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Pick-up by</label>
                    <select
                      style={styles.select}
                      value={eventData.pickUpResponsibility}
                      onChange={(e) => handleInputChange('pickUpResponsibility', e.target.value)}
                    >
                      <option value="">Not needed</option>
                      <option value="Au pair">Au pair</option>
                      <option value="Parent">Parent</option>
                      <option value="Kid alone">Kid alone</option>
                    </select>
                  </div>
                </div>

                {/* Travel Time - only show if drop-off is set */}
                {eventData.dropOffResponsibility && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Travel time (minutes)</label>
                    <input
                      type="number"
                      style={styles.input}
                      value={eventData.travelTime}
                      onChange={(e) => handleInputChange('travelTime', parseInt(e.target.value) || 0)}
                      placeholder="15"
                      min="0"
                      max="120"
                    />
                    {eventData.travelTime > 0 && (
                      <div style={styles.leaveByNote}>
                        Leave by: {(() => {
                          const [hours, minutes] = eventData.startTime.split(':');
                          const startDate = new Date();
                          startDate.setHours(parseInt(hours), parseInt(minutes));
                          startDate.setMinutes(startDate.getMinutes() - eventData.travelTime);
                          return startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Notes */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Notes (optional)</label>
              <textarea
                style={styles.textarea}
                value={eventData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any special instructions or notes..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div style={styles.actions}>
              <button style={styles.cancelButton} onClick={onCancel}>
                Cancel
              </button>
              <button style={styles.saveButton} onClick={handleSave}>
                Save Event
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 'var(--space-4)'
  },
  modal: {
    backgroundColor: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: 'var(--shadow-xl)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-5)',
    borderBottom: '1px solid var(--border-light)'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)'
  },
  backButton: {
    background: 'none',
    border: 'none',
    fontSize: 'var(--font-size-xl)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: 'var(--space-1)'
  },
  title: {
    margin: 0,
    fontSize: 'var(--font-size-xl)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: 'var(--font-size-2xl)',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    padding: 'var(--space-1)'
  },
  content: {
    padding: 'var(--space-5)'
  },
  instruction: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--text-secondary)',
    marginBottom: 'var(--space-5)',
    textAlign: 'center'
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 'var(--space-3)'
  },
  categoryCard: {
    padding: 'var(--space-4)',
    border: '2px solid var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    backgroundColor: 'var(--white)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-2)'
  },
  categoryIcon: {
    fontSize: 'var(--font-size-3xl)',
    lineHeight: 1
  },
  categoryName: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-semibold)',
    color: 'var(--text-primary)'
  },
  categoryDescription: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--text-tertiary)',
    lineHeight: 'var(--line-height-normal)'
  },
  formGroup: {
    marginBottom: 'var(--space-4)',
    position: 'relative'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 'var(--space-3)',
    marginBottom: 'var(--space-4)'
  },
  label: {
    display: 'block',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--text-primary)',
    marginBottom: 'var(--space-2)'
  },
  input: {
    width: '100%',
    padding: 'var(--space-3)',
    border: '1px solid var(--border-medium)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    transition: 'var(--transition-fast)',
    boxSizing: 'border-box'
  },
  select: {
    width: '100%',
    padding: 'var(--space-3)',
    border: '1px solid var(--border-medium)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    backgroundColor: 'var(--white)',
    cursor: 'pointer',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    padding: 'var(--space-3)',
    border: '1px solid var(--border-medium)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  suggestions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'var(--white)',
    border: '1px solid var(--border-medium)',
    borderTop: 'none',
    borderRadius: '0 0 var(--radius-md) var(--radius-md)',
    boxShadow: 'var(--shadow-md)',
    zIndex: 10,
    maxHeight: '200px',
    overflow: 'auto'
  },
  suggestionItem: {
    width: '100%',
    padding: 'var(--space-3)',
    border: 'none',
    backgroundColor: 'transparent',
    textAlign: 'left',
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  timePreview: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    padding: 'var(--space-2)',
    backgroundColor: 'var(--gray-50)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-4)'
  },
  leaveByNote: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--primary-purple)',
    marginTop: 'var(--space-2)',
    fontStyle: 'italic'
  },
  actions: {
    display: 'flex',
    gap: 'var(--space-3)',
    marginTop: 'var(--space-6)'
  },
  cancelButton: {
    flex: 1,
    padding: 'var(--space-3) var(--space-4)',
    border: '1px solid var(--border-medium)',
    backgroundColor: 'var(--white)',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  },
  saveButton: {
    flex: 2,
    padding: 'var(--space-3) var(--space-4)',
    border: 'none',
    backgroundColor: 'var(--primary-purple)',
    color: 'var(--white)',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)'
  }
};

export default CalendarQuickAdd;