import React, { useState, useEffect, useMemo } from 'react';
import CalendarQuickAdd from './CalendarQuickAdd';
import CalendarChildSelector from './CalendarChildSelector';
import EditEventModal from '../Dashboard/EditEventModal';
import { getAllEventsForDate } from '../../utils/calendarEventHelpers';

// Import child color utilities
const CHILD_COLORS = [
  { primary: '#7C3AED', light: '#EDE9FE' }, // Purple
  { primary: '#EC4899', light: '#FCE7F3' }, // Pink
  { primary: '#F59E0B', light: '#FEF3C7' }, // Amber
  { primary: '#10B981', light: '#D1FAE5' }, // Emerald
  { primary: '#3B82F6', light: '#DBEAFE' }, // Blue
  { primary: '#06B6D4', light: '#E0F2FE' }, // Cyan
  { primary: '#8B5CF6', light: '#F3E8FF' }, // Violet
  { primary: '#F97316', light: '#FED7AA' }, // Orange
];

const getChildColorFromId = (childId, index = 0) => {
  if (!childId) return CHILD_COLORS[index % CHILD_COLORS.length];
  
  let hash = 0;
  for (let i = 0; i < childId.length; i++) {
    hash = ((hash << 5) - hash) + childId.charCodeAt(i);
    hash = hash & hash;
  }
  
  const colorIndex = Math.abs(hash) % CHILD_COLORS.length;
  return CHILD_COLORS[colorIndex];
};

const getUserInitials = (name) => {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// Helper functions for getting different types of events
const getRoutineEvents = (child, date) => {
  const routine = child.carePreferences?.dailyRoutine;
  if (!routine) return [];

  const events = [];
  
  // Wake up
  if (routine.wakeUpTime) {
    events.push(createEvent({
      id: `routine-wakeup-${child.id}`,
      title: 'Wake Up',
      startTime: routine.wakeUpTime,
      duration: 30,
      type: 'routine',
      category: 'Daily Routines',
      childId: child.id,
      childName: child.name,
      icon: '☀️',
      responsibility: 'au_pair'
    }));
  }

  // Meals
  if (routine.mealTimes) {
    if (routine.mealTimes.breakfast) {
      events.push(createEvent({
        id: `routine-breakfast-${child.id}`,
        title: 'Breakfast',
        startTime: routine.mealTimes.breakfast,
        duration: 30,
        type: 'routine',
        category: 'Daily Routines',
        childId: child.id,
        childName: child.name,
        icon: '🥣',
        responsibility: 'parent'
      }));
    }
    
    if (routine.mealTimes.lunch) {
      const lunchTimes = Array.isArray(routine.mealTimes.lunch) 
        ? routine.mealTimes.lunch 
        : [routine.mealTimes.lunch];
      
      lunchTimes.forEach((time, index) => {
        events.push(createEvent({
          id: `routine-lunch-${index}-${child.id}`,
          title: lunchTimes.length > 1 ? `Lunch ${index + 1}` : 'Lunch',
          startTime: time,
          duration: 30,
          type: 'routine',
          category: 'Daily Routines',
          childId: child.id,
          childName: child.name,
          icon: '🥗',
          responsibility: 'au_pair'
        }));
      });
    }
    
    if (routine.mealTimes.dinner) {
      events.push(createEvent({
        id: `routine-dinner-${child.id}`,
        title: 'Dinner',
        startTime: routine.mealTimes.dinner,
        duration: 45,
        type: 'routine',
        category: 'Daily Routines',
        childId: child.id,
        childName: child.name,
        icon: '🍽️',
        responsibility: 'parent'
      }));
    }
  }

  // Naps
  if (routine.napTimes && routine.napTimes.length > 0) {
    routine.napTimes.forEach((nap, index) => {
      if (nap.startTime) {
        events.push(createEvent({
          id: `routine-nap-${index}-${child.id}`,
          title: routine.napTimes.length > 1 ? `Nap ${index + 1}` : 'Nap Time',
          startTime: nap.startTime,
          duration: nap.duration || 90,
          type: 'routine',
          category: 'Daily Routines',
          childId: child.id,
          childName: child.name,
          icon: '😴',
          responsibility: 'au_pair'
        }));
      }
    });
  }

  // Bedtime
  if (routine.bedtime) {
    events.push(createEvent({
      id: `routine-bedtime-${child.id}`,
      title: 'Bedtime',
      startTime: routine.bedtime,
      duration: 30,
      type: 'routine',
      category: 'Daily Routines',
      childId: child.id,
      childName: child.name,
      icon: '🌙',
      responsibility: 'parent'
    }));
  }

  return events;
};

const getSchoolEvents = (child, date) => {
  if (!child.schoolSchedule) return [];

  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const schedule = child.schoolSchedule[dayName];
  
  if (!schedule || schedule.length === 0) return [];

  const events = [];
  
  schedule.forEach((block, index) => {
    const duration = getTimeDifference(block.startTime, block.endTime);
    
    events.push(createEvent({
      id: `school-${index}-${child.id}`,
      title: 'School',
      startTime: block.startTime,
      duration: duration,
      type: 'school',
      category: 'School/Kindergarten',
      childId: child.id,
      childName: child.name,
      icon: '🏫',
      responsibility: 'school',
      location: child.schoolSchedule.schoolName || 'School'
    }));
  });

  return events;
};

const getRecurringActivityEvents = (child, date, recurringActivities) => {
  const events = [];
  
  recurringActivities.forEach(activity => {
    if (activity.assignedChildren && activity.assignedChildren.includes(child.id)) {
      // Check if activity occurs on this date using the recurrence pattern
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      // Check if this activity should occur on this date
      if (shouldActivityOccurOnDate(activity, date)) {
        
        events.push(createEvent({
          id: `activity-${activity.id}-${child.id}`,
          title: activity.name,
          startTime: activity.time,
          duration: activity.duration || 60,
          type: 'activity',
          category: 'Activities',
          childId: child.id,
          childName: child.name,
          icon: activity.icon || '🏃',
          responsibility: activity.transportation?.dropoff || 'au_pair',
          location: activity.location?.name || activity.location?.address,
          notes: activity.requirements?.notes || activity.notes,
          requiredItems: activity.requirements?.items || []
        }));
      }
    }
  });

  return events;
};

const shouldActivityOccurOnDate = (activity, date) => {
  try {
    if (!activity || !activity.recurrence || !date) {
      return false;
    }

    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    
    switch (activity.recurrence.type) {
      case 'weekly':
        return Array.isArray(activity.recurrence.days) && activity.recurrence.days.includes(dayName);
        
      case 'biweekly':
        // Check if it's the right week (need start date for this)
        if (!activity.recurrence.startDate && !activity.startDate) return false;
        try {
          const startDate = new Date(activity.recurrence.startDate || activity.startDate);
          const weeksDiff = Math.floor((date - startDate) / (7 * 24 * 60 * 60 * 1000));
          return weeksDiff % 2 === 0 && Array.isArray(activity.recurrence.days) && activity.recurrence.days.includes(dayName);
        } catch (error) {
          console.warn('Error calculating biweekly occurrence:', error);
          return false;
        }
        
      case 'monthly':
        if (activity.recurrence.monthType === 'same_date') {
          const startDate = activity.recurrence.startDate || activity.startDate;
          if (!startDate) return false;
          try {
            const start = new Date(startDate);
            return date.getDate() === start.getDate();
          } catch (error) {
            console.warn('Error calculating monthly occurrence:', error);
            return false;
          }
        }
        return false;
        
      default:
        return false;
    }
  } catch (error) {
    console.warn('Error checking activity occurrence:', error);
    return false;
  }
};

const createEvent = (eventData) => {
  const startMinutes = timeToMinutes(eventData.startTime);
  const endMinutes = startMinutes + eventData.duration;
  return {
    ...eventData,
    startMinutes,
    endMinutes
  };
};

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const getTimeDifference = (startTime, endTime) => {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return end - start;
};

const CalendarDayView = ({ 
  familyData, 
  children, 
  userData, 
  userRole,
  recurringActivities = [],
  selectedDate = new Date(),
  showQuickAdd = false,
  setShowQuickAdd,
  calendarEvents = []
}) => {
  const [selectedChildren, setSelectedChildren] = useState('all');
  const [timeRange, setTimeRange] = useState({ start: 7, end: 21 }); // Default 7 AM - 9 PM
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [quickAddTime, setQuickAddTime] = useState(null);

  // Get all events for the selected date and children
  const dayEvents = useMemo(() => {
    const allEvents = [];
    
    // Get children to show events for
    const childrenToShow = selectedChildren === 'all' 
      ? children 
      : children.filter(child => selectedChildren.includes(child.id));


    childrenToShow.forEach(child => {
      // Add routine events
      const routines = getRoutineEvents(child, selectedDate);
      allEvents.push(...routines);

      // Add school events  
      const schoolEvents = getSchoolEvents(child, selectedDate);
      allEvents.push(...schoolEvents);

      // Add recurring activities
      const activityEvents = getRecurringActivityEvents(child, selectedDate, recurringActivities);
      allEvents.push(...activityEvents);
    });

    // Add calendar events using the helper function
    const calendarDayEvents = getAllEventsForDate(childrenToShow, selectedDate, recurringActivities, calendarEvents);
    
    // Extract only calendar events to avoid duplicates
    const onlyCalendarEvents = calendarDayEvents.filter(event => event.type === 'calendar_event');
    allEvents.push(...onlyCalendarEvents);
    // Sort events by time
    return allEvents.sort((a, b) => a.startMinutes - b.startMinutes);
  }, [children, selectedChildren, selectedDate, recurringActivities, calendarEvents]);

  // Fixed time range from 6 to 24h
  useEffect(() => {
    setTimeRange({ start: 6, end: 24 });
  }, []);

  const formatHour = (hour) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  // Generate hour markers for the timeline
  const hourMarkers = useMemo(() => {
    const markers = [];
    for (let hour = timeRange.start; hour <= timeRange.end; hour++) {
      markers.push({
        hour,
        label: formatHour(hour),
        position: ((hour - timeRange.start) / (timeRange.end - timeRange.start)) * 100
      });
    }
    return markers;
  }, [timeRange]);

  const handleQuickAdd = (eventData) => {
    // This would save to database
    console.log('Adding event:', eventData);
    setShowQuickAdd && setShowQuickAdd(false);
    // Refresh events after adding
  };

  const handleEditEvent = (event) => {
    // Transform the calendar event to match the format expected by EditEventModal
    const transformedEvent = {
      ...event,
      children: event.childName ? [{ child: { id: event.childId, name: event.childName } }] : [],
      isToday: selectedDate.toDateString() === new Date().toDateString()
    };
    setEditingEvent(transformedEvent);
    setShowEditModal(true);
  };

  const handleDeleteEvent = (event) => {
    // For now, just show a confirmation - in a real app you'd implement deletion
    const confirmDelete = window.confirm(`Are you sure you want to delete "${event.title}"?`);
    if (confirmDelete) {
      if (event.type === 'activity') {
        // For recurring activities, you might want to delete the entire activity
        // or just create a cancellation override
        console.log('Deleting recurring activity:', event.id);
        // TODO: Implement activity deletion
      } else if (event.type === 'routine' || event.type === 'school') {
        // For routine/school events, create a cancellation override
        console.log('Cancelling routine/school event:', event.id);
        // TODO: Implement event cancellation via override
      }
    }
  };

  const handleSaveEventChanges = () => {
    // The component will re-render due to the event overrides subscription
    setShowEditModal(false);
    setEditingEvent(null);
    
    // Force a small delay to ensure Firestore has time to propagate the change
    setTimeout(() => {
      console.log('Event override saved');
    }, 100);
  };

  // Calculate layout for overlapping events
  const getEventLayout = useMemo(() => {
    const hourHeight = 80; // Height per hour in pixels
    const eventLayouts = [];
    
    // Group events by time overlap
    const sortedEvents = [...dayEvents].sort((a, b) => a.startMinutes - b.startMinutes);
    
    sortedEvents.forEach(event => {
      const startHour = (event.startMinutes / 60) - timeRange.start;
      const duration = event.duration / 60; // Convert to hours
      
      // Find overlapping events
      const overlappingEvents = sortedEvents.filter(otherEvent => 
        otherEvent.startMinutes < event.startMinutes + event.duration &&
        otherEvent.startMinutes + otherEvent.duration > event.startMinutes
      );
      
      // Calculate column position
      const columnIndex = overlappingEvents.findIndex(e => e.id === event.id);
      const totalColumns = overlappingEvents.length;
      const columnWidth = totalColumns > 1 ? 100 / totalColumns : 100;
      
      const layout = {
        eventId: event.id,
        top: startHour * hourHeight,
        height: Math.max(duration * hourHeight, 40), // Minimum 40px height
        left: `${columnIndex * columnWidth}%`,
        width: `${columnWidth - (totalColumns > 1 ? 2 : 0)}%`, // Small gap between columns
        zIndex: 10 + columnIndex
      };
      
      eventLayouts.push(layout);
    });
    
    return eventLayouts;
  }, [dayEvents, timeRange]);

  const getEventPosition = (event) => {
    const layout = getEventLayout.find(layout => layout.eventId === event.id);
    return layout || {
      top: 0,
      height: 40,
      left: '0%',
      width: '100%',
      zIndex: 10
    };
  };

  const hasConflicts = (event) => {
    // Only check conflicts for events that Aupair needs to manage
    if (event.responsibility !== 'au_pair' && event.responsibility !== 'aupair' && 
        event.dropOffResponsibility !== 'au_pair' && event.dropOffResponsibility !== 'aupair' &&
        event.pickUpResponsibility !== 'au_pair' && event.pickUpResponsibility !== 'aupair') {
      return false;
    }
    
    // Check for time overlaps with other Aupair-managed events
    return dayEvents.some(otherEvent => {
      if (otherEvent.id === event.id) return false;
      
      // Check if other event is also Aupair-managed
      const otherIsAupairManaged = 
        otherEvent.responsibility === 'au_pair' || otherEvent.responsibility === 'aupair' ||
        otherEvent.dropOffResponsibility === 'au_pair' || otherEvent.dropOffResponsibility === 'aupair' ||
        otherEvent.pickUpResponsibility === 'au_pair' || otherEvent.pickUpResponsibility === 'aupair';
      
      if (!otherIsAupairManaged) return false;
      
      // Check for time overlap
      return ((event.startMinutes < otherEvent.startMinutes + otherEvent.duration) &&
              (event.startMinutes + event.duration > otherEvent.startMinutes));
    });
  };

  return (
    <div style={styles.container}>
      {/* Child Selector */}
      <CalendarChildSelector
        children={children}
        selectedChildren={selectedChildren}
        onSelectionChange={setSelectedChildren}
        userRole={userRole}
      />

      {/* Timeline Card */}
      <div style={styles.timelineCard}>
        <div style={styles.timelineContainer}>
          {/* Hour markers */}
          <div style={styles.hourColumn}>
            {hourMarkers.map(marker => (
              <div key={marker.hour} style={styles.hourMarker}>
                <span style={styles.hourLabel}>{marker.label}</span>
              </div>
            ))}
          </div>

          {/* Events column */}
          <div style={styles.eventsColumn}>
            <div 
              style={{
                ...styles.eventsArea,
                height: (timeRange.end - timeRange.start) * 80, // 80px per hour
              }}
              onClick={(e) => {
                // Calculate clicked time based on position
                const rect = e.currentTarget.getBoundingClientRect();
                const relativeY = e.clientY - rect.top;
                const minutesFromStart = (relativeY / 80) * 60;
                const clickedHour = timeRange.start + Math.floor(minutesFromStart / 60);
                const clickedMinutes = Math.floor(minutesFromStart % 60);
                const roundedMinutes = Math.round(clickedMinutes / 15) * 15; // Round to 15-min intervals
                
                const clickedTime = `${clickedHour.toString().padStart(2, '0')}:${roundedMinutes.toString().padStart(2, '0')}`;
                
                // Visual feedback for tap with Material Design ripple effect
                e.currentTarget.style.backgroundColor = 'var(--md-sys-color-primary-container)';
                setTimeout(() => {
                  if (e.currentTarget) {
                    e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface)';
                  }
                }, 150);
                
                // Open quick add with pre-filled time
                setQuickAddTime(clickedTime);
                setShowQuickAdd && setShowQuickAdd(true);
              }}
            >
              {/* Hour grid lines */}
              {hourMarkers.map(marker => (
                <div 
                  key={`line-${marker.hour}`} 
                  style={{
                    ...styles.hourLine,
                    top: (marker.hour - timeRange.start) * 80,
                    pointerEvents: 'none' // Don't interfere with parent click
                  }}
                />
              ))}

              {/* Events */}
              {dayEvents.map(event => {
                const position = getEventPosition(event);
                const hasConflict = hasConflicts(event);
                const childColor = getChildColorFromId(event.childId);
                
                return (
                  <div
                    key={event.id}
                    style={{
                      ...styles.eventContainer,
                      ...position
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditEvent(event);
                    }}
                  >
                    <div style={{
                      ...styles.eventCard,
                      backgroundColor: childColor.light,
                      border: `1px solid ${childColor.primary}`,
                      ...(hasConflict ? styles.conflictCard : {})
                    }}>
                      <div style={styles.eventContentRow}>
                        <div style={{
                          ...styles.eventTime,
                          color: childColor.primary
                        }}>
                          {event.time || `${Math.floor(event.startMinutes / 60).toString().padStart(2, '0')}:${(event.startMinutes % 60).toString().padStart(2, '0')}`}
                        </div>
                        <div style={{
                          ...styles.eventTitle,
                          color: '#000000'
                        }}>{event.title}</div>
                      </div>
                      
                      {/* End time */}
                      <div style={{
                        ...styles.endTime,
                        color: childColor.primary
                      }}>
                        {`${Math.floor(event.endMinutes / 60).toString().padStart(2, '0')}:${(event.endMinutes % 60).toString().padStart(2, '0')}`}
                      </div>
                      
                      {/* Child indicator */}
                      {event.childName && (
                        <div style={styles.childIndicator}>
                          <div style={{
                            ...styles.childCircle,
                            backgroundColor: childColor.primary
                          }}>
                            {getUserInitials(event.childName)}
                          </div>
                        </div>
                      )}
                      
                      {/* Conflict warning */}
                      {hasConflict && (
                        <div style={styles.conflictBadge}>
                          ⚠️ Aupair Conflict
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Empty state */}
              {dayEvents.length === 0 && (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>📅</div>
                  <h3 style={styles.emptyText}>No events scheduled</h3>
                  <p style={styles.emptySubtext}>Tap anywhere on the timeline to add an event</p>
                  <button 
                    style={styles.emptyButton}
                    onClick={() => setShowQuickAdd && setShowQuickAdd(true)}
                  >
                    Add Event
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      {showQuickAdd && (
        <CalendarQuickAdd
          children={children}
          selectedDate={selectedDate}
          onSave={handleQuickAdd}
          onCancel={() => {
            setShowQuickAdd && setShowQuickAdd(false);
            setQuickAddTime(null);
          }}
          userRole={userRole}
          prefilledTime={quickAddTime}
        />
      )}

      {/* Edit Event Modal */}
      {showEditModal && editingEvent && (
        <EditEventModal
          event={editingEvent}
          familyId={familyData?.id}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEventChanges}
        />
      )}
    </div>
  );
};

const styles = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--md-sys-color-background)',
    padding: '16px',
    gap: '16px',
    marginBottom: '100px'
  },
  timelineCard: {
    backgroundColor: 'var(--md-sys-color-surface-container-lowest)',
    borderRadius: 'var(--md-sys-shape-corner-large)',
    overflow: 'hidden',
    boxShadow: 'var(--md-sys-elevation-level1)',
    flex: 1
  },
  timelineContainer: {
    display: 'flex',
    height: '100%',
    minHeight: '500px'
  },
  hourColumn: {
    width: '72px',
    borderRight: '1px solid var(--md-sys-color-outline-variant)',
    backgroundColor: 'var(--md-sys-color-surface-container-high)'
  },
  hourMarker: {
    height: '80px',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '8px 4px',
    borderBottom: '1px solid var(--md-sys-color-outline-variant)'
  },
  hourLabel: {
    font: 'var(--md-sys-typescale-label-small-font)',
    color: 'var(--md-sys-color-on-surface-variant)',
    textAlign: 'center'
  },
  eventsColumn: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'var(--md-sys-color-surface)'
  },
  eventsArea: {
    position: 'relative',
    minHeight: '100%',
    cursor: 'pointer'
  },
  hourLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '1px',
    backgroundColor: 'var(--md-sys-color-outline-variant)',
    zIndex: 1,
    opacity: 0.5
  },
  eventContainer: {
    position: 'absolute',
    paddingLeft: '8px',
    paddingRight: '8px',
    zIndex: 2
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    textAlign: 'center',
    padding: '32px'
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    opacity: 0.6
  },
  emptyText: {
    font: 'var(--md-sys-typescale-title-medium-font)',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginBottom: '8px'
  },
  emptySubtext: {
    font: 'var(--md-sys-typescale-body-medium-font)',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginBottom: '24px',
    opacity: 0.8
  },
  emptyButton: {
    padding: '12px 24px',
    backgroundColor: 'var(--md-sys-color-primary)',
    color: 'var(--md-sys-color-on-primary)',
    border: 'none',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    font: 'var(--md-sys-typescale-label-large-font)',
    cursor: 'pointer',
    boxShadow: 'var(--md-sys-elevation-level1)'
  },
  eventCard: {
    borderRadius: 'var(--md-sys-shape-corner-small)',
    padding: '4px 8px',
    paddingRight: '32px', // Space for the child circle
    height: '100%',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--md-sys-elevation-level1)'
  },
  conflictCard: {
    borderColor: 'var(--md-sys-color-error) !important',
    backgroundColor: 'var(--md-sys-color-error-container) !important'
  },
  eventContentRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '4px',
    width: '100%',
    marginTop: '2px'
  },
  eventTime: {
    fontSize: '11px',
    fontWeight: '600',
    fontFamily: 'var(--md-sys-typescale-label-small-font-family-name)',
    flexShrink: 0,
    minWidth: '35px'
  },
  eventTitle: {
    fontSize: '12px',
    fontWeight: '500',
    fontFamily: 'var(--md-sys-typescale-body-small-font-family-name)',
    flex: 1,
    textAlign: 'center',
    wordWrap: 'break-word',
    whiteSpace: 'normal',
    lineHeight: '1.2',
    overflow: 'hidden'
  },
  endTime: {
    fontSize: '10px',
    fontWeight: '500',
    fontFamily: 'var(--md-sys-typescale-label-small-font-family-name)',
    marginLeft: '35px',
    marginTop: '2px'
  },
  childIndicator: {
    position: 'absolute',
    top: '4px',
    right: '4px'
  },
  childCircle: {
    width: '24px',
    height: '24px',
    borderRadius: 'var(--md-sys-shape-corner-full)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: '700',
    color: 'white',
    boxShadow: 'var(--md-sys-elevation-level1)',
    border: '2px solid white'
  },
  conflictBadge: {
    position: 'absolute',
    bottom: '2px',
    left: '4px',
    fontSize: '9px',
    color: 'var(--md-sys-color-error)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '2px 4px',
    borderRadius: '4px',
    fontWeight: '600',
    border: '1px solid var(--md-sys-color-error)'
  }
};

export default CalendarDayView;